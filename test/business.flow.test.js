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
const mails = [];
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
  biz._setMailer({
    sendBookingConfirmed: async (r, to) => { mails.push({ type: 'confirmed', ref: r.reference, to: to.map((x) => x.email).sort() }); },
    sendBookingCancelled: async (r, to, opts) => { mails.push({ type: 'cancelled', ref: r.reference, refunded: opts.refunded }); },
    sendTeamInvite: async (i) => { mails.push({ type: 'invite', email: i.email }); },
    sendGuestStay: async (r, hotel, guest, res) => { mails.push({ type: 'guest-stay', to: guest.email, ref: res.booking_reference, hotel: hotel?.name }); },
    sendGuestCancelled: async (r, guest) => { mails.push({ type: 'guest-cancelled', to: guest.email }); },
  });
  const mk = async (key, email, name) => {
    const { rows } = await client.query("INSERT INTO booqa_guests (email, password_hash, full_name, email_verified) VALUES ($1, 'x', $2, true) RETURNING id", [email, name]);
    s[key] = { sub: rows[0].id, email };
  };
  await mk('admin', 'zz-test-admin@example.com', 'Ada Admin');
  await mk('member', 'zz-test-member@example.com', 'Mo Member');
  await mk('outsider', 'zz-test-out@example.com', 'Olu Outsider');
  await biz.createOrganization(db, s.admin, COMPANY);
  await biz.addMember(db, s.admin, { email: 'zz-test-member@example.com', role: 'member' });
});

after(async () => {
  biz._setHotelOps(null);
  biz._setMailer(null);
  if (!client) return;
  await client.query('ROLLBACK');
  await client.end();
});

const COMPANY = {
  name: 'Test Marine Ltd', industry: 'Logistics, Maritime & Transport', size: '51-200',
  city: 'Port Harcourt', state: 'Rivers', phone: '0803 000 0000', billing_email: 'zz-accounts@example.com', job_title: 'HR Manager',
};

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

test('one confirmation email per booking, to the booker and the admins; cancelling a paid booking says refunded', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 5 };
  mails.length = 0;
  const created = await newRequest();
  await biz.bookHotel(db, s.member, created.id, { hotel_id: TA, room_type_id: TA_STD });
  await biz.startPayment(db, s.member, created.id);
  await biz.confirmPayment(db, s.member, created.id);
  assert.deepEqual(mails, [{ type: 'confirmed', ref: created.reference, to: ['zz-accounts@example.com', 'zz-test-admin@example.com', 'zz-test-member@example.com'] }]);
  await biz.cancelRequest(db, s.member, created.id, { reason: 'Project moved' });
  assert.deepEqual(mails[1], { type: 'cancelled', ref: created.reference, refunded: true });

  // A request still choosing a hotel is cancelled without an email.
  const other = await newRequest();
  await biz.cancelRequest(db, s.member, other.id, {});
  assert.equal(mails.length, 2);
});

test('inviting someone without an account: they join once they sign up and verify their email', { skip }, async () => {
  mails.length = 0;
  const team = await biz.addMember(db, s.admin, { email: 'ZZ-New-Hire@Example.com', role: 'member' });
  assert.equal(team.result, 'invited');
  assert.deepEqual(team.invites.map((i) => i.email), ['zz-new-hire@example.com']);
  assert.deepEqual(mails, [{ type: 'invite', email: 'zz-new-hire@example.com' }]);
  await assert.rejects(biz.addMember(db, s.member, { email: 'x@example.com' }), { code: 'FORBIDDEN' });

  const { rows } = await client.query("INSERT INTO booqa_guests (email, password_hash, full_name, email_verified) VALUES ('zz-new-hire@example.com', 'x', 'New Hire', false) RETURNING id");
  const hire = { sub: rows[0].id, email: 'zz-new-hire@example.com' };
  assert.equal((await biz.me(db, hire)).membership, null, 'not before the email is verified');
  await client.query('UPDATE booqa_guests SET email_verified = true WHERE id = $1', [hire.sub]);
  const joined = await biz.me(db, hire);
  assert.equal(joined.membership.org_name, 'Test Marine Ltd');
  assert.equal(joined.membership.role, 'requester');
  assert.equal((await biz.listMembers(db, s.admin)).invites.length, 0);
});

test('anyone can browse hotels without signing in; the workspace list still needs a company', { skip }, async () => {
  const pub = await biz.publicHotels({});
  assert.deepEqual(pub.hotels.map((h) => h.name).sort(), ['GRA Suites', 'Trans-Amadi Inn']);
  const one = await biz.publicHotels({ where: 'trans' });
  assert.deepEqual(one.hotels.map((h) => h.name), ['Trans-Amadi Inn'], 'a hotel name matches first');
  await assert.rejects(biz.listHotels(db, s.outsider, {}), { code: 'NO_ORGANIZATION' });
});

test('company account needs its details; admins edit them, members only their own job title', { skip }, async () => {
  const me = await biz.getMembership(db, s.admin);
  assert.equal(me.size, '51-200');
  assert.equal(me.city, 'Port Harcourt');
  assert.equal(me.billing_email, 'zz-accounts@example.com');
  assert.equal(me.job_title, 'HR Manager');

  // A new company without size, phone or billing email is refused.
  await assert.rejects(biz.createOrganization(db, s.outsider, { name: 'Half Ltd' }), { code: 'VALIDATION_ERROR' });
  await assert.rejects(biz.createOrganization(db, s.outsider, { ...COMPANY, phone: 'call me' }), /phone/);
  await assert.rejects(biz.createOrganization(db, s.outsider, { ...COMPANY, billing_email: 'nope' }), /billing email/);

  const updated = await biz.updateOrganization(db, s.admin, { ...COMPANY, name: 'Test Marine Nigeria Ltd', size: '201-1000' });
  assert.equal(updated.org_name, 'Test Marine Nigeria Ltd');
  assert.equal(updated.size, '201-1000');

  await assert.rejects(biz.updateOrganization(db, s.member, { ...COMPANY, name: 'Hijack' }), { code: 'FORBIDDEN' });
  const mine = await biz.updateOrganization(db, s.member, { job_title: 'Site engineer' });
  assert.equal(mine.job_title, 'Site engineer');
  assert.equal(mine.org_name, 'Test Marine Nigeria Ltd');
});

test('booking from a hotel page: request + held rooms in one step; if the rooms are gone the request stays open', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 1 };
  const booked = await biz.createAndBook(db, s.member, {
    city: 'Port Harcourt', area: 'GRA', check_in: inDays(5), check_out: inDays(8), rooms: 2,
    hotel_id: GRA, room_type_id: GRA_STD, guests: [{ name: 'Chinedu' }, { name: 'Amaka' }],
  });
  assert.equal(booked.booked, true);
  const r = await biz.getRequest(db, s.member, booked.id);
  assert.equal(r.status, 'pending');
  assert.equal(r.hotel_id, GRA);
  assert.equal(r.reservations.length, 2);

  // Two rooms wanted, one free: nothing is held, the request shows other options.
  const short = await biz.createAndBook(db, s.member, {
    city: 'Port Harcourt', check_in: inDays(5), check_out: inDays(8), rooms: 2, hotel_id: TA, room_type_id: TA_STD,
  });
  assert.equal(short.booked, false);
  assert.match(short.booking_error, /Only 1 of 2/);
  assert.equal(free[TA_STD], 1);
  assert.equal((await biz.getRequest(db, s.member, short.id)).status, 'requested');
});

test('each guest with an email gets their own stay details and room reference; told again if cancelled', { skip }, async () => {
  free = { [GRA_STD]: 5, [TA_STD]: 5 };
  await assert.rejects(newRequest({ guests: [{ name: 'Bad', email: 'not-an-email' }] }), /Check the email for Bad/);
  mails.length = 0;
  const created = await newRequest({ guests: [{ name: 'Chinedu', email: 'zz-chinedu@example.com' }, { name: 'Amaka' }] });
  const held = await biz.bookHotel(db, s.member, created.id, { hotel_id: TA, room_type_id: TA_STD });
  await biz.startPayment(db, s.member, created.id);
  await biz.confirmPayment(db, s.member, created.id);
  const guestMails = mails.filter((m) => m.type === 'guest-stay');
  assert.deepEqual(guestMails, [{ type: 'guest-stay', to: 'zz-chinedu@example.com', ref: held.reservations[0].booking_reference, hotel: 'Trans-Amadi Inn' }]);
  await biz.cancelRequest(db, s.member, created.id, {});
  assert.deepEqual(mails.filter((m) => m.type === 'guest-cancelled'), [{ type: 'guest-cancelled', to: 'zz-chinedu@example.com' }]);
});

test('live availability for a hotel page: rooms free and all-in prices for the dates', { skip }, async () => {
  free = { [GRA_STD]: 3 };
  const rows = await biz.publicAvailability(GRA, { check_in: inDays(5), check_out: inDays(8) });
  assert.deepEqual(rows.map((x) => [x.room_type_id, x.available_count, x.per_night]), [[GRA_STD, 3, 64500]]);
  await assert.rejects(biz.publicAvailability(GRA, { check_in: inDays(8), check_out: inDays(5) }), { code: 'VALIDATION_ERROR' });
});
