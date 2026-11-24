// End-to-end check of lib/business.js against the REAL database schema
// (HotelOps migrations 046/047), inside one transaction that is always
// rolled back - nothing is saved. HotelOps itself is replaced by an
// in-memory fake, so no real rooms are held or paid for.
//
//   TEST_DATABASE_URL=postgres://... npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import pg from 'pg';
import * as biz from '../lib/business.js';
import { HotelOpsError } from '../lib/hotelops.js';

const url = process.env.TEST_DATABASE_URL;
const skip = !url && 'TEST_DATABASE_URL not set';
let client;
let db;
const s = {};

const GRA = '11111111-1111-4111-8111-111111111111';
const TA = '22222222-2222-4222-8222-222222222222';
const GRA_STD = '33333333-3333-4333-8333-333333333333';
const TA_STD = '44444444-4444-4444-8444-444444444444';

// ── fake HotelOps ──────────────────────────────────────────────────────────
const HOTELS = [
  { id: GRA, name: 'GRA Suites', city: 'Port Harcourt', state: 'Rivers', area: 'GRA' },
  { id: TA, name: 'Trans-Amadi Inn', city: 'Port Harcourt', state: 'Rivers', area: 'Trans-Amadi' },
];
let free = {};        // room type -> rooms free
let reservations = {};
let paymentOk = true;
const calls = [];
function fakeHotelOps(method, path, { query, body } = {}) {
  calls.push(`${method} ${path}`);
  if (method === 'GET' && path === 'hotels') return Promise.resolve(HOTELS);
  let m = path.match(/^hotels\/([^/]+)$/);
  if (method === 'GET' && m) return Promise.resolve(HOTELS.find((h) => h.id === m[1]));
  m = path.match(/^hotels\/([^/]+)\/availability$/);
  if (m) {
    const nights = 3;
    const rate = m[1] === GRA ? 60000 : 40000;
    const std = m[1] === GRA ? GRA_STD : TA_STD;
    return Promise.resolve([{ room_type_id: std, name: 'Standard', capacity_adults: 2, available_count: free[std] ?? 0, nights, total_amount: rate * nights, guest_fee_amount: rate * nights * 0.075 }]);
  }
  if (method === 'POST' && path === 'reservations') {
    if ((free[body.room_type_id] || 0) < 1) return Promise.reject(new HotelOpsError(409, 'Sold out', 'ROOM_TYPE_SOLD_OUT'));
    free[body.room_type_id] -= 1;
    const id = crypto.randomUUID();
    reservations[id] = { id, status: 'pending_payment', room_type_id: body.room_type_id };
    return Promise.resolve({ id, booking_reference: `HTL-${id.slice(0, 6)}`, guest_name: body.guest_name, total_amount: 120000, guest_fee_amount: 9000, expires_at: new Date(Date.now() + 30 * 60000).toISOString() });
  }
  if (path === 'reservations/confirm-group-payment') {
    if (!paymentOk) return Promise.reject(new HotelOpsError(400, 'Payment status is "pending"', 'PAYMENT_NOT_SUCCESSFUL'));
    body.reservation_ids.forEach((id) => { reservations[id].status = 'confirmed'; });
    return Promise.resolve([]);
  }
  m = path.match(/^reservations\/([^/]+)\/cancel$/);
  if (m) { reservations[m[1]].status = 'cancelled'; free[reservations[m[1]].room_type_id] += 1; return Promise.resolve({}); }
  m = path.match(/^reservations\/([^/]+)\/status$/);
  if (m) return Promise.resolve({ status: reservations[m[1]].status });
  return Promise.reject(new Error(`unexpected ${method} ${path}`));
}

before(async () => {
  if (!url) return;
  client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('BEGIN');
  db = { query: (text, params) => client.query(text, params) };
  biz._setHotelOps(fakeHotelOps);
  const mk = async (key, email, name) => {
    const { rows } = await client.query("INSERT INTO booqa_guests (email, password_hash, full_name, email_verified) VALUES ($1, 'x', $2, true) RETURNING id", [email, name]);
    s[key] = { sub: rows[0].id, email };
  };
  await mk('admin', 'zz-test-admin@example.com', 'Ada Admin');
  await mk('member', 'zz-test-member@example.com', 'Mo Member');
  await mk('outsider', 'zz-test-out@example.com', 'Olu Outsider');
  await biz.createOrganization(db, s.admin, { name: 'Test Marine Ltd' });
  await biz.addMember(db, s.admin, { email: 'zz-test-member@example.com', role: 'member' });
});

after(async () => {
  biz._setHotelOps(null);
  if (!client) return;
  await client.query('ROLLBACK');
  await client.end();
});

const inDays = (n) => {
  const d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const newRequest = (extra = {}) => biz.createRequest(db, s.member, {
  city: 'Port Harcourt', check_in: inDays(5), check_out: inDays(8), rooms: 2, project: 'Onne Base',
  guests: [{ name: 'Chinedu' }, { name: 'Amaka' }], ...extra,
});

test('match -> book every room -> pay -> follow the hotel to completed', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 5 };
  const created = await newRequest({ budget_per_night: 50000 });

  // Only the hotel within budget fits.
  const { fits, close } = await biz.findMatches(db, s.member, created.id);
  assert.deepEqual(fits.map((f) => f.hotel.id), [TA]);
  assert.equal(close.length, 0);

  let r = await biz.bookHotel(db, s.member, created.id, { hotel_id: TA, room_type_id: TA_STD });
  assert.equal(r.status, 'pending');
  assert.equal(r.reservations.length, 2);
  assert.equal(Number(r.amount_due), 2 * 129000);
  assert.equal(free[TA_STD], 3);

  // Can't book twice; outsiders can't see it.
  await assert.rejects(biz.bookHotel(db, s.member, created.id, { hotel_id: TA, room_type_id: TA_STD }), { code: 'NOT_OPEN' });
  await assert.rejects(biz.getRequest(db, s.outsider, created.id), { code: 'NO_ORGANIZATION' });

  const pay = await biz.startPayment(db, s.member, created.id);
  assert.match(pay.tx_ref, /^BOOQA-G-AR-[A-Z2-9]{6}-\d+$/);
  assert.equal(pay.amount, 258000);

  paymentOk = false;
  await assert.rejects(biz.confirmPayment(db, s.member, created.id), { code: 'PAYMENT_PENDING' });
  paymentOk = true;
  r = await biz.confirmPayment(db, s.member, created.id);
  assert.equal(r.status, 'confirmed');
  assert.equal(Number(r.total_cost), 258000);

  // Status follows the hotel's check-in / check-out.
  Object.values(reservations).forEach((x) => { if (x.status === 'confirmed') x.status = 'checked_in'; });
  r = await biz.getRequest(db, s.member, created.id);
  assert.equal(r.status, 'checked_in');
  Object.values(reservations).forEach((x) => { if (x.status === 'checked_in') x.status = 'checked_out'; });
  r = await biz.getRequest(db, s.member, created.id);
  assert.equal(r.status, 'completed');
  assert.deepEqual(r.events.map((e) => e.action), ['submitted', 'booked', 'paid', 'status:checked_in', 'status:completed']);

  const dash = await biz.dashboard(db, s.admin);
  assert.equal(dash.spend_by_project[0].project, 'Onne Base');
  assert.equal(dash.spend_by_project[0].spend, 258000);
});

test('nothing fits -> closest hotels with reasons; partial booking holds what is free', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 1 };
  const created = await newRequest({ area: 'Trans-Amadi', budget_per_night: 50000 });
  const { fits, close } = await biz.findMatches(db, s.member, created.id);
  assert.equal(fits.length, 0);
  assert.deepEqual(close.map((c) => c.hotel.id), [TA, GRA]);
  assert.deepEqual(close[0].reasons, ['Only 1 of 2 rooms free']);
  const r = await biz.bookHotel(db, s.member, created.id, { hotel_id: TA, room_type_id: TA_STD });
  assert.equal(r.reservations.length, 1);
});

test('cancelling releases held rooms; members cancel only their own', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 5 };
  const created = await newRequest();
  await biz.bookHotel(db, s.member, created.id, { hotel_id: GRA, room_type_id: GRA_STD });
  assert.equal(free[GRA_STD], 3);
  const mine = await biz.createRequest(db, s.admin, { city: 'Port Harcourt', check_in: inDays(2), check_out: inDays(3), rooms: 1 });
  await assert.rejects(biz.cancelRequest(db, s.member, mine.id, {}), { code: 'FORBIDDEN' });
  const r = await biz.cancelRequest(db, s.member, created.id, { reason: 'Trip postponed' });
  assert.equal(r.status, 'cancelled');
  assert.equal(free[GRA_STD], 5);
});

test('a hold that runs out sends the request back to choosing a hotel', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 5 };
  const created = await newRequest();
  await biz.bookHotel(db, s.member, created.id, { hotel_id: GRA, room_type_id: GRA_STD });
  await client.query("UPDATE booqa_accommodation_requests SET hold_expires_at = now() - interval '1 minute' WHERE id = $1", [created.id]);
  const r = await biz.getRequest(db, s.member, created.id);
  assert.equal(r.status, 'requested');
  assert.equal(r.reservations.length, 0);
  await assert.rejects(biz.startPayment(db, s.member, created.id), { code: 'NOT_PENDING' });
});
