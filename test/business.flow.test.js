// End-to-end check of lib/business.js against the REAL database schema
// (HotelOps migration 046), inside one transaction that is always rolled
// back - nothing is saved. Needs TEST_DATABASE_URL; skipped without it.
//
//   TEST_DATABASE_URL=postgres://... node --test test/business.flow.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import * as biz from '../lib/business.js';

const url = process.env.TEST_DATABASE_URL;
let client;
let db;
const s = {}; // sessions

before(async () => {
  if (!url) return;
  client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('BEGIN');
  db = { query: (text, params) => client.query(text, params) };
  const mk = async (key, email, name) => {
    const { rows } = await client.query(
      "INSERT INTO booqa_guests (email, password_hash, full_name, email_verified) VALUES ($1, 'x', $2, true) RETURNING id",
      [email, name]
    );
    s[key] = { sub: rows[0].id, email };
  };
  await mk('admin', 'zz-test-admin@example.com', 'Ada Admin');
  await mk('requester', 'zz-test-req@example.com', 'Rex Requester');
  await mk('outsider', 'zz-test-out@example.com', 'Olu Outsider');
  await mk('ops', 'zz-test-ops@example.com', 'Booqa Ops');
  process.env.BOOQA_ADMIN_EMAILS = 'zz-test-ops@example.com';
});

after(async () => {
  if (!client) return;
  await client.query('ROLLBACK');
  await client.end();
});

const skip = !url && 'TEST_DATABASE_URL not set';
const inDays = (n) => {
  const d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

test('full request lifecycle with permissions', { skip }, async () => {
  // organization + team
  const org = await biz.createOrganization(db, s.admin, { name: 'Test Marine Ltd', industry: 'Marine & Logistics' });
  assert.equal(org.role, 'admin');
  await assert.rejects(biz.createOrganization(db, s.admin, { name: 'Second' }), { code: 'ALREADY_MEMBER' });
  await biz.addMember(db, s.admin, { email: 'zz-test-req@example.com', role: 'requester' });
  await assert.rejects(biz.addMember(db, s.requester, { email: 'zz-test-out@example.com' }), { code: 'FORBIDDEN' });
  await assert.rejects(biz.updateMember(db, s.admin, s.admin.sub, { role: 'requester' }), { code: 'LAST_ADMIN' });

  // request
  await assert.rejects(biz.createRequest(db, s.requester, { city: 'Port Harcourt', check_in: inDays(5), check_out: inDays(3), rooms: 2 }));
  const created = await biz.createRequest(db, s.requester, {
    city: 'Port Harcourt', area: 'GRA', project: 'Onne Base', check_in: inDays(5), check_out: inDays(8), rooms: 2,
    guests: [{ name: 'Chinedu', phone: '0800' }, { name: '' }],
  });
  assert.match(created.reference, /^AR-[A-Z2-9]{6}$/);
  let r = await biz.getRequest(db, s.requester, created.id);
  assert.equal(r.status, 'requested');
  assert.equal(r.guests.length, 1);
  assert.equal(r.can_approve, false);

  // outsiders and non-ops can't see or act
  await assert.rejects(biz.getRequest(db, s.outsider, created.id), { code: 'NO_ORGANIZATION' });
  await assert.rejects(biz.opsAddOption(db, s.admin, created.id, { property_name: 'X', rate_per_night: 1 }), { code: 'FORBIDDEN' });

  // ops proposes options -> pending
  r = await biz.opsAddOption(db, s.ops, created.id, { property_name: 'Harbour Suites', rate_per_night: 50000 });
  r = await biz.opsAddOption(db, s.ops, created.id, { property_name: 'GRA Apartments', rate_per_night: 45000 });
  assert.equal(r.status, 'pending');
  const cheaper = r.options.find((o) => o.property_name === 'GRA Apartments');

  // requester can't approve; approver can't confirm before approval
  await assert.rejects(biz.approveRequest(db, s.requester, created.id, { option_id: cheaper.id }), { code: 'FORBIDDEN' });
  await assert.rejects(biz.opsSetStatus(db, s.ops, created.id, { status: 'confirmed', confirmation_ref: 'X' }), { code: 'BAD_TRANSITION' });

  r = await biz.approveRequest(db, s.admin, created.id, { option_id: cheaper.id });
  assert.equal(r.status, 'approved');
  await assert.rejects(biz.opsAddOption(db, s.ops, created.id, { property_name: 'Late', rate_per_night: 1 }), { code: 'NOT_OPEN' });

  // confirmation needs the provider's reference; total = rate x nights x rooms
  await assert.rejects(biz.opsSetStatus(db, s.ops, created.id, { status: 'confirmed' }));
  r = await biz.opsSetStatus(db, s.ops, created.id, { status: 'confirmed', confirmation_ref: 'GRA-55812' });
  assert.equal(r.status, 'confirmed');
  assert.equal(Number(r.total_cost), 45000 * 3 * 2);

  r = await biz.opsSetStatus(db, s.ops, created.id, { status: 'checked_in' });
  r = await biz.opsSetStatus(db, s.ops, created.id, { status: 'completed' });
  assert.equal(r.status, 'completed');
  await assert.rejects(biz.cancelRequest(db, s.admin, created.id, {}), { code: 'NOT_CANCELLABLE' });

  // timeline recorded every step
  const actions = r.events.map((e) => e.action);
  assert.deepEqual(actions, ['submitted', 'option_added', 'option_added', 'approved', 'status:confirmed', 'status:checked_in', 'status:completed']);

  // dashboard reflects it
  const dash = await biz.dashboard(db, s.admin);
  assert.equal(dash.total, 1);
  assert.equal(dash.spend_by_project[0].project, 'Onne Base');
  assert.equal(dash.spend_by_project[0].spend, 270000);
});

test('requester can cancel own open request; ops can cancel too', { skip }, async () => {
  const a = await biz.createRequest(db, s.requester, { city: 'Lagos', check_in: inDays(2), check_out: inDays(3), rooms: 1 });
  const r = await biz.cancelRequest(db, s.requester, a.id, { reason: 'Trip postponed' });
  assert.equal(r.status, 'cancelled');
  const b = await biz.createRequest(db, s.requester, { city: 'Abuja', check_in: inDays(2), check_out: inDays(4), rooms: 1 });
  const r2 = await biz.opsSetStatus(db, s.ops, b.id, { status: 'cancelled', note: 'No availability' });
  assert.equal(r2.status, 'cancelled');
});
