import crypto from 'crypto';
import { hotelops as defaultHotelOps } from './hotelops.js';
import { matchHotels, stayAllIn, perNightAllIn } from './matching.js';
import * as defaultMailer from './businessMail.js';
import { resolvePlace, nearby, distanceKm } from './geo.js';

/*
 * Booqa for Business - request -> matched hotels -> book & pay -> stay.
 * Tables: HotelOps migrations 046/047. Every function takes the db module
 * and the caller's verified session ({ sub, email }) and enforces who may
 * do what here, in one place:
 *
 *   members of one organization   create requests, see the organization's
 *                                 requests, book and pay, cancel their own
 *   admin                         + cancel any request, manage the team
 *   Booqa operations team         (accounts in BOOQA_ADMIN_EMAILS) see
 *                                 every request, read-only
 *
 * Lifecycle (migration 047):
 *   requested  submitted; the company chooses from matched hotels
 *   pending    rooms held as HotelOps reservations, awaiting payment
 *              (hold expires -> back to requested)
 *   confirmed  paid; every reservation confirmed in HotelOps
 *   checked_in / completed  follow the hotel's own check-in / check-out
 *   cancelled  reservations cancelled in HotelOps (paid ones refunded)
 *
 * Availability comes only from HotelOps, live, at the moment of matching
 * and again at booking - never assumed.
 */

let hotelops = defaultHotelOps;
/** Tests swap in a fake HotelOps client. */
export function _setHotelOps(fn) { hotelops = fn || defaultHotelOps; }

let mailer = defaultMailer;
/** Tests swap in a fake mailer. */
export function _setMailer(m) { mailer = m || defaultMailer; }

// Emails must never break the action that triggered them.
const quietly = (p) => Promise.resolve(p).catch((err) => console.error('[business] email failed:', err.message));

/** The person who made the request plus the company's admins, once each. */
async function bookingRecipients(db, r) {
  const { rows } = await db.query(
    `SELECT DISTINCT g.email, g.full_name AS name FROM booqa_guests g
      WHERE g.id = $1 OR g.id IN (SELECT guest_id FROM booqa_org_members WHERE org_id = $2 AND role = 'admin')`,
    [r.requested_by, r.org_id]
  );
  // The company's billing email gets the booking summary too (for receipts).
  const { rows: org } = await db.query('SELECT name, billing_email FROM booqa_organizations WHERE id = $1', [r.org_id]);
  const billing = org[0]?.billing_email;
  if (billing && !rows.some((p) => p.email.toLowerCase() === billing)) rows.push({ email: billing, name: `${org[0].name} accounts` });
  return rows;
}

/**
 * The people actually travelling (often not the booker) get their own
 * stay details: hotel, address, map link, dates and THEIR room's booking
 * reference. Guest n is in room n; guests without an email are skipped.
 */
async function notifyGuests(r, kind) {
  const stays = (r.reservations || [])
    .map((res, n) => ({ guest: r.guests?.[n], reservation: res }))
    .filter((x) => x.guest?.email);
  if (!stays.length) return;
  const hotel = kind === 'confirmed' ? await hotelops('GET', `hotels/${r.hotel_id}`).catch(() => null) : null;
  await Promise.all(stays.map(({ guest, reservation }) => (kind === 'confirmed'
    ? mailer.sendGuestStay(r, hotel, guest, reservation)
    : mailer.sendGuestCancelled(r, guest, reservation))));
}

export class BizError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const bad = (msg, code = 'VALIDATION_ERROR') => new BizError(400, msg, code);
const forbidden = (msg = 'You do not have permission to do that.') => new BizError(403, msg, 'FORBIDDEN');
const notFound = (msg = 'Not found.') => new BizError(404, msg, 'NOT_FOUND');

// 'requester' is the stored value of the "member" role.
export const ROLES = ['admin', 'requester'];
const roleFromInput = (r) => (r === 'admin' ? 'admin' : 'requester');
export const OPEN_STATUSES = ['requested', 'pending', 'confirmed'];
const MAX_ROOMS_PER_BOOKING = 20; // HotelOps confirm-group-payment limit

const clean = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
export const nightsBetween = (a, b) => Math.round((new Date(`${String(b).slice(0, 10)}T00:00:00Z`) - new Date(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86_400_000);

export function isBooqaOps(session) {
  const list = String(process.env.BOOQA_ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return !!session?.email && list.includes(String(session.email).toLowerCase());
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I look-alikes
const randomCode = (n) => [...crypto.randomBytes(n)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
const newReference = () => `AR-${randomCode(6)}`;
// HotelOps' webhook recognises BOOQA-G-* as a Booqa group payment.
const newTxRef = (reference) => `BOOQA-G-${reference}-${Date.now()}`;

async function guestName(db, id) {
  const { rows } = await db.query('SELECT full_name, email FROM booqa_guests WHERE id = $1', [id]);
  return rows[0]?.full_name || rows[0]?.email || null;
}

async function logEvent(db, requestId, session, side, action, note = null) {
  await db.query(
    'INSERT INTO booqa_request_events (request_id, actor_id, actor_name, actor_side, action, note) VALUES ($1, $2, $3, $4, $5, $6)',
    [requestId, session?.sub || null, session?.sub ? await guestName(db, session.sub) : null, side, action, note]
  );
}

// ── membership ───────────────────────────────────────────────────────────
export async function getMembership(db, session) {
  if (!session?.sub) throw new BizError(401, 'Please sign in.', 'UNAUTHENTICATED');
  const { rows } = await db.query(
    `SELECT m.role, m.job_title, o.id AS org_id, o.name AS org_name, o.industry,
            o.size, o.city, o.state, o.phone, o.billing_email
       FROM booqa_org_members m JOIN booqa_organizations o ON o.id = m.org_id
      WHERE m.guest_id = $1`,
    [session.sub]
  );
  return rows[0] || null;
}

async function requireMember(db, session, roles = ROLES) {
  const m = await getMembership(db, session);
  if (!m) throw new BizError(403, 'Set up your company first.', 'NO_ORGANIZATION');
  if (!roles.includes(m.role)) throw forbidden();
  return m;
}

// A colleague invited by email joins automatically on their first
// workspace visit - but only once they've verified that email, so nobody
// can claim an invite by signing up with someone else's address.
async function acceptInviteIfAny(db, session) {
  const { rows: guest } = await db.query('SELECT email, email_verified FROM booqa_guests WHERE id = $1', [session.sub]);
  if (!guest[0]?.email_verified) return null;
  const { rows: invites } = await db.query(
    'SELECT id, org_id, role FROM booqa_org_invites WHERE email = $1 AND accepted_at IS NULL ORDER BY created_at LIMIT 1',
    [String(guest[0].email).toLowerCase()]
  );
  if (!invites[0]) return null;
  await db.query('INSERT INTO booqa_org_members (org_id, guest_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [invites[0].org_id, session.sub, invites[0].role]);
  await db.query('UPDATE booqa_org_invites SET accepted_at = now() WHERE id = $1', [invites[0].id]);
  return getMembership(db, session);
}

export async function me(db, session) {
  let membership = await getMembership(db, session);
  if (!membership) membership = await acceptInviteIfAny(db, session);
  return { membership, ops: isBooqaOps(session) };
}

export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
const PHONE_RE = /^\+?[\d\s()-]{7,20}$/;

/** Validates the company details form; every field except industry is required. */
function companyDetails(body) {
  const d = {
    name: clean(body.name, 160),
    industry: clean(body.industry, 80) || null,
    size: clean(body.size, 20),
    city: clean(body.city, 80),
    state: clean(body.state, 80),
    phone: clean(body.phone, 40),
    billing_email: clean(body.billing_email, 200).toLowerCase(),
  };
  if (!d.name) throw bad('Enter your company name.');
  if (!COMPANY_SIZES.includes(d.size)) throw bad('Choose your company size.');
  if (!d.city || !d.state) throw bad('Enter the city and state of your head office.');
  if (!PHONE_RE.test(d.phone)) throw bad('Enter a valid company phone number.');
  if (!EMAIL_RE.test(d.billing_email)) throw bad('Enter a valid billing email.');
  return d;
}

export async function createOrganization(db, session, body) {
  if (await getMembership(db, session)) throw bad('Your account already belongs to a company.', 'ALREADY_MEMBER');
  const d = companyDetails(body);
  const { rows } = await db.query(
    `INSERT INTO booqa_organizations (name, industry, size, city, state, phone, billing_email, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [d.name, d.industry, d.size, d.city, d.state, d.phone, d.billing_email, session.sub]
  );
  await db.query(
    "INSERT INTO booqa_org_members (org_id, guest_id, role, job_title) VALUES ($1, $2, 'admin', $3)",
    [rows[0].id, session.sub, clean(body.job_title, 80) || null]
  );
  return getMembership(db, session);
}

/** Admins edit the company details; anyone can set their own job title. */
export async function updateOrganization(db, session, body) {
  const m = await requireMember(db, session);
  if ('job_title' in body) {
    await db.query('UPDATE booqa_org_members SET job_title = $1 WHERE org_id = $2 AND guest_id = $3', [clean(body.job_title, 80) || null, m.org_id, session.sub]);
  }
  if ('name' in body) {
    if (m.role !== 'admin') throw forbidden('Only an admin can change the company details.');
    const d = companyDetails(body);
    await db.query(
      `UPDATE booqa_organizations SET name = $1, industry = $2, size = $3, city = $4, state = $5, phone = $6, billing_email = $7 WHERE id = $8`,
      [d.name, d.industry, d.size, d.city, d.state, d.phone, d.billing_email, m.org_id]
    );
  }
  return getMembership(db, session);
}

// ── team ─────────────────────────────────────────────────────────────────
/** The team: members plus invitations not yet accepted. */
export async function listMembers(db, session) {
  const m = await requireMember(db, session);
  const [{ rows: members }, { rows: invites }] = await Promise.all([
    db.query(
      `SELECT g.id, g.full_name, g.email, mem.role, mem.added_at
         FROM booqa_org_members mem JOIN booqa_guests g ON g.id = mem.guest_id
        WHERE mem.org_id = $1 ORDER BY mem.added_at`,
      [m.org_id]
    ),
    db.query('SELECT id, email, role, created_at FROM booqa_org_invites WHERE org_id = $1 AND accepted_at IS NULL ORDER BY created_at', [m.org_id]),
  ]);
  return { members, invites };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Adds a colleague who already has an account, or invites them by email
 * if they don't (they join automatically once they sign up and verify).
 */
export async function addMember(db, session, body) {
  const m = await requireMember(db, session, ['admin']);
  const email = clean(body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) throw bad('Enter a valid email address.');
  const role = roleFromInput(body.role);
  const { rows } = await db.query('SELECT id FROM booqa_guests WHERE lower(email) = $1', [email]);
  if (rows[0]) {
    const { rows: existing } = await db.query('SELECT org_id FROM booqa_org_members WHERE guest_id = $1', [rows[0].id]);
    if (existing[0]) throw bad(existing[0].org_id === m.org_id ? 'They are already on your team.' : 'That account already belongs to another company.', 'ALREADY_MEMBER');
    await db.query('INSERT INTO booqa_org_members (org_id, guest_id, role) VALUES ($1, $2, $3)', [m.org_id, rows[0].id, role]);
    return { ...(await listMembers(db, session)), result: 'added' };
  }
  await db.query(
    `INSERT INTO booqa_org_invites (org_id, email, role, invited_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (org_id, email) WHERE accepted_at IS NULL DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by, created_at = now()`,
    [m.org_id, email, role, session.sub]
  );
  await quietly(mailer.sendTeamInvite({ email, orgName: m.org_name, inviterName: await guestName(db, session.sub), role }));
  return { ...(await listMembers(db, session)), result: 'invited' };
}

export async function cancelInvite(db, session, inviteId) {
  const m = await requireMember(db, session, ['admin']);
  await db.query('DELETE FROM booqa_org_invites WHERE id = $1 AND org_id = $2 AND accepted_at IS NULL', [inviteId, m.org_id]);
  return listMembers(db, session);
}

async function assertNotLastAdmin(db, orgId, guestId) {
  const { rows } = await db.query("SELECT guest_id FROM booqa_org_members WHERE org_id = $1 AND role = 'admin'", [orgId]);
  if (rows.length === 1 && rows[0].guest_id === guestId) throw bad('Your company needs at least one admin.', 'LAST_ADMIN');
}

export async function updateMember(db, session, guestId, body) {
  const m = await requireMember(db, session, ['admin']);
  const role = roleFromInput(body.role);
  if (role !== 'admin') await assertNotLastAdmin(db, m.org_id, guestId);
  const { rowCount } = await db.query('UPDATE booqa_org_members SET role = $1 WHERE org_id = $2 AND guest_id = $3', [role, m.org_id, guestId]);
  if (!rowCount) throw notFound('Team member not found.');
  return listMembers(db, session);
}

export async function removeMember(db, session, guestId) {
  const m = await requireMember(db, session, ['admin']);
  await assertNotLastAdmin(db, m.org_id, guestId);
  await db.query('DELETE FROM booqa_org_members WHERE org_id = $1 AND guest_id = $2', [m.org_id, guestId]);
  return listMembers(db, session);
}

// ── requests ─────────────────────────────────────────────────────────────
function validateRequest(body) {
  const city = clean(body.city, 80);
  const check_in = clean(body.check_in, 10);
  const check_out = clean(body.check_out, 10);
  const rooms = parseInt(body.rooms, 10);
  if (!city) throw bad('Enter the city.');
  if (!isDate(check_in) || !isDate(check_out)) throw bad('Choose check-in and check-out dates.');
  if (check_out <= check_in) throw bad('Check-out must be after check-in.');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  if (check_in < today) throw bad('Check-in cannot be in the past.');
  if (!(rooms >= 1 && rooms <= MAX_ROOMS_PER_BOOKING)) throw bad(`Rooms must be between 1 and ${MAX_ROOMS_PER_BOOKING}. For more, send two requests.`);
  const guests = (Array.isArray(body.guests) ? body.guests : [])
    .map((g) => ({ name: clean(g?.name, 120), phone: clean(g?.phone, 40), email: clean(g?.email, 200).toLowerCase() }))
    .filter((g) => g.name)
    .slice(0, 200);
  const badEmail = guests.find((g) => g.email && !EMAIL_RE.test(g.email));
  if (badEmail) throw bad(`Check the email for ${badEmail.name}.`);
  guests.forEach((g) => { if (!g.email) delete g.email; });
  const budget = body.budget_per_night === '' || body.budget_per_night == null ? null : Number(body.budget_per_night);
  if (budget != null && !(budget > 0)) throw bad('Budget must be a positive amount.');
  return {
    city, check_in, check_out, rooms, guests, budget,
    area: clean(body.area, 120) || null,
    project: clean(body.project, 160) || null,
    preferences: clean(body.preferences, 2000) || null,
  };
}

export async function createRequest(db, session, body) {
  const m = await requireMember(db, session);
  const r = validateRequest(body);
  let row;
  for (let attempt = 0; attempt < 5 && !row; attempt += 1) {
    try {
      const { rows } = await db.query(
        `INSERT INTO booqa_accommodation_requests
           (org_id, reference, requested_by, project, city, area, check_in, check_out, rooms, guests, preferences, budget_per_night)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, reference`,
        [m.org_id, newReference(), session.sub, r.project, r.city, r.area, r.check_in, r.check_out, r.rooms, JSON.stringify(r.guests), r.preferences, r.budget]
      );
      row = rows[0];
    } catch (err) {
      if (err.code !== '23505') throw err; // only retry a reference collision
    }
  }
  if (!row) throw new BizError(500, 'Could not create the request. Please try again.', 'REFERENCE_COLLISION');
  await logEvent(db, row.id, session, 'client', 'submitted');
  return row;
}

/**
 * Booking from a hotel's own page: the company already chose the hotel and
 * room type, so create the request and hold the rooms in one step. If the
 * rooms can't be held (sold out for those dates), the request is still
 * there and shows the other hotels that fit - nothing is lost.
 * @returns { id, reference, booked, booking_error? }
 */
export async function createAndBook(db, session, body) {
  const created = await createRequest(db, session, body);
  const hotelId = clean(body.hotel_id, 64);
  const roomTypeId = clean(body.room_type_id, 64);
  const roomTypeSelections = Array.isArray(body.room_type_selections) ? body.room_type_selections : null;
  if (!hotelId || (!roomTypeId && !roomTypeSelections?.length)) return { ...created, booked: false };
  try {
    await bookHotel(db, session, created.id, { hotel_id: hotelId, room_type_id: roomTypeId, room_type_selections: roomTypeSelections, require_all: true });
    return { ...created, booked: true };
  } catch (err) {
    if (!(err instanceof BizError)) throw err;
    return { ...created, booked: false, booking_error: err.message };
  }
}

const REQUEST_COLUMNS = `r.id, r.reference, r.project, r.city, r.area, r.check_in::text AS check_in, r.check_out::text AS check_out,
  r.rooms, r.guests, r.preferences, r.budget_per_night, r.status, r.confirmation_ref, r.total_cost, r.cancelled_reason,
  r.hotel_id, r.hotel_name, r.room_type_id, r.room_type_name, r.reservations, r.amount_due, r.tx_ref, r.hold_expires_at, r.paid_at,
  r.created_at, r.updated_at, r.requested_by, rg.full_name AS requested_by_name`;

export async function listRequests(db, session, { status } = {}) {
  const m = await requireMember(db, session);
  const params = [m.org_id];
  let where = 'r.org_id = $1';
  if (status) { params.push(status); where += ` AND r.status = $${params.length}`; }
  const { rows } = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM booqa_accommodation_requests r LEFT JOIN booqa_guests rg ON rg.id = r.requested_by
      WHERE ${where} ORDER BY r.created_at DESC LIMIT 200`,
    params
  );
  return rows;
}

async function loadRequestDetail(db, requestId, orgId = null) {
  const params = [requestId];
  let where = 'r.id = $1';
  if (orgId) { params.push(orgId); where += ' AND r.org_id = $2'; }
  const { rows } = await db.query(
    `SELECT ${REQUEST_COLUMNS}, r.org_id, o.name AS org_name
       FROM booqa_accommodation_requests r
       JOIN booqa_organizations o ON o.id = r.org_id
       LEFT JOIN booqa_guests rg ON rg.id = r.requested_by
      WHERE ${where}`,
    params
  );
  if (!rows[0]) throw notFound('Request not found.');
  const { rows: events } = await db.query(
    'SELECT actor_name, actor_side, action, note, created_at FROM booqa_request_events WHERE request_id = $1 ORDER BY created_at',
    [requestId]
  );
  return { ...rows[0], nights: nightsBetween(rows[0].check_in, rows[0].check_out), events };
}

// Rooms held but never paid: HotelOps releases them when the hold ends;
// the request goes back to choosing a hotel.
async function expireHoldIfNeeded(db, r) {
  if (r.status !== 'pending' || !r.hold_expires_at || new Date(r.hold_expires_at) > new Date()) return false;
  await db.query(
    `UPDATE booqa_accommodation_requests SET status = 'requested', hotel_id = NULL, hotel_name = NULL, room_type_id = NULL,
       room_type_name = NULL, reservations = '[]'::jsonb, amount_due = NULL, tx_ref = NULL, hold_expires_at = NULL, updated_at = now()
     WHERE id = $1 AND status = 'pending'`,
    [r.id]
  );
  await logEvent(db, r.id, null, 'booqa', 'hold_expired', 'Payment was not completed in time, so the rooms were released.');
  return true;
}

// Confirmed stays follow the hotel: checked in when the hotel checks the
// guests in, completed when it checks them out. Best effort - a HotelOps
// hiccup just leaves the status as it was.
async function syncStayStatus(db, r) {
  if (!['confirmed', 'checked_in'].includes(r.status) || !r.reservations?.length) return false;
  const statuses = await Promise.all(r.reservations.map((res) =>
    hotelops('GET', `reservations/${res.id}/status`, { query: { hotel_id: r.hotel_id } }).then((x) => x.status).catch(() => null)));
  if (statuses.some((s) => s == null)) return false;
  const live = statuses.filter((s) => s !== 'cancelled');
  let next = null;
  if (live.length && live.every((s) => s === 'checked_out')) next = 'completed';
  else if (live.some((s) => s === 'checked_in' || s === 'checked_out')) next = 'checked_in';
  if (!next || next === r.status) return false;
  await db.query('UPDATE booqa_accommodation_requests SET status = $1, updated_at = now() WHERE id = $2', [next, r.id]);
  await logEvent(db, r.id, null, 'booqa', `status:${next}`);
  return true;
}

export async function getRequest(db, session, requestId) {
  const m = await requireMember(db, session);
  let r = await loadRequestDetail(db, requestId, m.org_id);
  if ((await expireHoldIfNeeded(db, r)) || (await syncStayStatus(db, r))) r = await loadRequestDetail(db, requestId, m.org_id);
  const hotel = r.hotel_id ? await hotelops('GET', `hotels/${r.hotel_id}`).catch(() => null) : null;
  return { ...r, hotel_logo_url: hotel?.logo_url || null, can_cancel: OPEN_STATUSES.includes(r.status) && (m.role === 'admin' || r.requested_by === session.sub) };
}

function guestsPerRoom(r) {
  return Math.max(1, Math.ceil((r.guests?.length || r.rooms) / r.rooms));
}

async function availabilityFor(hotelId, r) {
  return hotelops('GET', `hotels/${hotelId}/availability`, {
    query: { check_in: r.check_in, check_out: r.check_out, adults: guestsPerRoom(r), children: 0, rooms: r.rooms },
  }).catch(() => []);
}

export async function findMatches(db, session, requestId) {
  const m = await requireMember(db, session);
  const r = await loadRequestDetail(db, requestId, m.org_id);
  if (r.status !== 'requested') return { fits: [], close: [], closed: true };
  const hotels = await hotelops('GET', 'hotels');
  // Same city first; cap the number of live availability checks.
  const norm = (s) => String(s || '').toLowerCase().trim();
  const ordered = [...hotels].sort((a, b) => (norm(b.city) === norm(r.city)) - (norm(a.city) === norm(r.city))).slice(0, 25);
  const availability = new Map(await Promise.all(ordered.map(async (h) => {
    const rows = await availabilityFor(h.id, r);
    // A partial match may end up holding only one room, which uses the
    // single-room rate even when the original request asked for more.
    rows.forEach((rt) => {
      const groupSize = Math.min(Number(r.rooms) || 1, Number(rt.available_count) || 0);
      const feePercent = groupSize > 1 ? 5 : 10;
      rt.guest_fee_percent = feePercent;
      rt.guest_fee_amount = Math.round(Number(rt.total_amount || 0) * feePercent) / 100;
    });
    return [h.id, rows];
  })));
  // An area ("Peter Odili", "GRA") is judged by real distance once the
  // place is found on the map and hotels have positions; otherwise by name.
  if (r.area && ordered.some((h) => h.latitude != null)) {
    const place = await resolvePlace(db, `${r.area}, ${r.city}`).catch(() => null);
    if (place && !place.isCity) {
      ordered.forEach((h) => {
        if (h.latitude == null || h.longitude == null) return;
        h.distance_km = Math.round(distanceKm(place, { latitude: Number(h.latitude), longitude: Number(h.longitude) }) * 10) / 10;
        h.approximate = h.geo_precision === 'city';
      });
    }
  }
  return matchHotels({ city: r.city, area: r.area, rooms: r.rooms, budget_per_night: r.budget_per_night }, ordered, availability);
}

export async function bookHotel(db, session, requestId, body) {
  const m = await requireMember(db, session);
  const r = await loadRequestDetail(db, requestId, m.org_id);
  if (r.status !== 'requested') throw bad('This request already has a booking in progress.', 'NOT_OPEN');

  const hotelId = clean(body.hotel_id, 64);
  const hotel = (await hotelops('GET', `hotels/${hotelId}`).catch(() => null));
  if (!hotel) throw bad('That hotel is not available.');
  const requested = Array.isArray(body.room_type_selections) && body.room_type_selections.length
    ? body.room_type_selections.map((x) => ({ room_type_id: clean(x.room_type_id, 64), rooms: Math.floor(Number(x.rooms)) }))
    : [{ room_type_id: clean(body.room_type_id, 64), rooms: r.rooms }];
  if (requested.some((x) => !x.room_type_id || !Number.isInteger(x.rooms) || x.rooms < 1)) throw bad('Choose at least one room in each selected category.');
  if (new Set(requested.map((x) => x.room_type_id)).size !== requested.length) throw bad('Each room category can only be selected once.');
  const requestedTotal = requested.reduce((sum, x) => sum + x.rooms, 0);
  if (body.require_all && requestedTotal !== r.rooms) throw bad(`Assign all ${r.rooms} rooms to room categories.`);
  if (requestedTotal > r.rooms) throw bad(`You can book at most ${r.rooms} rooms on this request.`);

  const availability = await availabilityFor(hotelId, r);
  const selections = requested.map((x) => {
    const roomType = availability.find((rt) => rt.room_type_id === x.room_type_id);
    if (!roomType || roomType.available_count < 1) throw bad(`${roomType?.name || 'That room category'} at ${hotel.name} is not free for these dates. Here are other hotels that fit.`, 'NO_LONGER_AVAILABLE');
    if (body.require_all && roomType.available_count < x.rooms) throw bad(`Only ${roomType.available_count} of the ${x.rooms} ${roomType.name} rooms you chose ${roomType.available_count === 1 ? 'is' : 'are'} free at ${hotel.name} for these dates. Here are other options.`, 'NOT_ENOUGH_ROOMS');
    const availableRooms = Array.isArray(roomType.available_rooms) ? roomType.available_rooms : [];
    if (body.require_all && availableRooms.length < x.rooms) throw bad(`HotelOps has not returned enough numbered rooms in ${roomType.name}. Refresh availability and choose again.`, 'NOT_ENOUGH_ROOMS');
    const count = Math.min(x.rooms, roomType.available_count, availableRooms.length);
    if (count < 1) throw bad(`No numbered rooms are currently available in ${roomType.name}. Refresh availability and choose again.`, 'ROOM_ASSIGNMENT_UNAVAILABLE');
    return { roomType, count, availableRooms };
  });
  const count = selections.reduce((sum, x) => sum + x.count, 0);

  // One HotelOps reservation per room, so each can be cancelled or refunded
  // on its own. All or nothing: if any room fails, release the rest.
  const attempt = crypto.randomUUID();
  const created = [];
  try {
    let n = 0;
    for (const selection of selections) {
      for (let i = 0; i < selection.count; i += 1, n += 1) {
        const guest = r.guests?.[n];
        const assignedRoom = selection.availableRooms[i];
        if (!assignedRoom?.id || !assignedRoom?.room_number) throw bad(`HotelOps has not returned a numbered room in ${selection.roomType.name}. Refresh availability and choose again.`, 'ROOM_ASSIGNMENT_UNAVAILABLE');
        const res = await hotelops('POST', 'reservations', {
          idempotencyKey: `${attempt}-${n}`,
          body: {
            hotel_id: hotelId,
            room_type_id: selection.roomType.room_type_id,
            room_id: assignedRoom.id,
            check_in: r.check_in,
            check_out: r.check_out,
            adults: guestsPerRoom(r),
            children: 0,
            guest_name: guest?.name || `${r.org_name} guest ${n + 1}`,
            guest_email: session.email,
            guest_phone: guest?.phone || undefined,
            company: r.org_name,
            special_requests: r.preferences || undefined,
            booqa_guest_id: session.sub,
            group_size: count,
          },
        });
        created.push({ ...res, room_type_name: selection.roomType.name, room_number: assignedRoom.room_number });
      }
    }
  } catch (err) {
    await Promise.all(created.map((res) => hotelops('POST', `reservations/${res.id}/cancel`, { body: { hotel_id: hotelId, reason: 'Group booking could not be completed' } }).catch(() => null)));
    throw new BizError(409, `Could not hold all the rooms (${err.message}). Please choose again.`, 'BOOKING_FAILED');
  }

  const amountDue = created.reduce((sum, res) => sum + stayAllIn(res), 0);
  const holdUntil = created.map((res) => res.expires_at).filter(Boolean).sort()[0] || null;
  const reservations = created.map((res) => ({
    id: res.id, booking_reference: res.booking_reference, guest_name: res.guest_name,
    room_type_name: res.room_type_name, room_number: res.room_number, room_amount: Number(res.total_amount || 0),
    company_fee: Number(res.guest_fee_amount || 0), amount_paid: stayAllIn(res),
  }));
  const roomTypeNames = [...new Set(selections.map((x) => x.roomType.name))];
  await db.query(
    `UPDATE booqa_accommodation_requests SET status = 'pending', hotel_id = $1, hotel_name = $2, room_type_id = $3, room_type_name = $4,
       reservations = $5, amount_due = $6, tx_ref = $7, hold_expires_at = $8, updated_at = now()
     WHERE id = $9 AND status = 'requested'`,
    [hotelId, hotel.name, selections[0].roomType.room_type_id, roomTypeNames.join(', '), JSON.stringify(reservations), amountDue, newTxRef(r.reference), holdUntil, requestId]
  );
  await logEvent(db, requestId, session, 'client', 'booked', `${count} room${count === 1 ? '' : 's'} across ${roomTypeNames.length} room categor${roomTypeNames.length === 1 ? 'y' : 'ies'} held at ${hotel.name}`);
  return getRequest(db, session, requestId);
}

// A fresh reference for each payment attempt (Flutterwave tx_refs are
// single-use); confirmPayment only ever trusts the one stored here.
export async function startPayment(db, session, requestId) {
  const m = await requireMember(db, session);
  let r = await loadRequestDetail(db, requestId, m.org_id);
  if (await expireHoldIfNeeded(db, r)) throw bad('The hold on these rooms has ended. Please choose a hotel again.', 'HOLD_EXPIRED');
  if (r.status !== 'pending') throw bad('There is nothing to pay for on this request.', 'NOT_PENDING');
  const txRef = newTxRef(r.reference);
  await db.query('UPDATE booqa_accommodation_requests SET tx_ref = $1, updated_at = now() WHERE id = $2', [txRef, requestId]);
  r = await loadRequestDetail(db, requestId, m.org_id);
  return { tx_ref: txRef, amount: Number(r.amount_due), currency: 'NGN', email: session.email, name: await guestName(db, session.sub), description: `${r.reference} · ${r.hotel_name}` };
}

const PAYMENT_FINAL_CODES = ['AMOUNT_MISMATCH', 'HOLD_EXPIRED', 'RESERVATION_NOT_PAYABLE', 'ROOM_NO_LONGER_AVAILABLE'];

export async function confirmPayment(db, session, requestId) {
  const m = await requireMember(db, session);
  const r = await loadRequestDetail(db, requestId, m.org_id);
  if (r.status === 'confirmed') return getRequest(db, session, requestId);
  if (r.status !== 'pending' || !r.tx_ref) throw bad('There is nothing to pay for on this request.', 'NOT_PENDING');
  try {
    await hotelops('POST', 'reservations/confirm-group-payment', {
      body: { hotel_id: r.hotel_id, reservation_ids: r.reservations.map((x) => x.id), tx_ref: r.tx_ref },
    });
  } catch (err) {
    if (PAYMENT_FINAL_CODES.includes(err.code)) {
      console.error('[business] payment problem', r.reference, r.tx_ref, err.code, err.message);
      throw new BizError(409, 'We could not confirm this payment. If you were charged, contact Booqa with your reference and we will sort it out.', err.code);
    }
    throw new BizError(409, 'Payment not received yet.', 'PAYMENT_PENDING');
  }
  await db.query(
    `UPDATE booqa_accommodation_requests SET status = 'confirmed', paid_at = now(), total_cost = amount_due, confirmation_ref = $1, updated_at = now()
      WHERE id = $2 AND status = 'pending'`,
    [r.reservations.map((x) => x.booking_reference).join(', '), requestId]
  );
  await logEvent(db, requestId, session, 'client', 'paid', `₦${Number(r.amount_due).toLocaleString('en-NG')} paid · ${r.hotel_name}`);
  const confirmed = await getRequest(db, session, requestId);
  await quietly(mailer.sendBookingConfirmed(confirmed, await bookingRecipients(db, r)));
  await quietly(notifyGuests(confirmed, 'confirmed'));
  return confirmed;
}

export async function cancelRequest(db, session, requestId, body) {
  const m = await requireMember(db, session);
  const r = await loadRequestDetail(db, requestId, m.org_id);
  if (m.role !== 'admin' && r.requested_by !== session.sub) throw forbidden('Only the person who made the request, or an admin, can cancel it.');
  if (!OPEN_STATUSES.includes(r.status)) throw bad('This request can no longer be cancelled.', 'NOT_CANCELLABLE');
  const reason = clean(body.reason, 500) || null;
  // Held or paid rooms are cancelled in HotelOps; paid ones are refunded there.
  const failed = [];
  for (const res of r.reservations || []) {
    try {
      await hotelops('POST', `reservations/${res.id}/cancel`, { body: { hotel_id: r.hotel_id, reason: reason || 'Cancelled by company' } });
    } catch (err) {
      if (err.code !== 'RESERVATION_ALREADY_TERMINAL') failed.push(res.booking_reference);
    }
  }
  if (failed.length) throw new BizError(502, `Could not cancel ${failed.join(', ')} with the hotel. Please try again.`, 'CANCEL_FAILED');
  await db.query("UPDATE booqa_accommodation_requests SET status = 'cancelled', cancelled_reason = $1, updated_at = now() WHERE id = $2", [reason, requestId]);
  await logEvent(db, requestId, session, 'client', 'cancelled', reason);
  const cancelled = await getRequest(db, session, requestId);
  // Only worth an email once something was booked; a request that was
  // still choosing a hotel just disappears from the list.
  if (r.status !== 'requested') {
    await quietly(mailer.sendBookingCancelled(cancelled, await bookingRecipients(db, r), { refunded: r.status === 'confirmed' }));
  }
  // Guests were only told about a paid booking, so only then tell them it's off.
  if (r.status === 'confirmed') await quietly(notifyGuests({ ...cancelled, reservations: r.reservations }, 'cancelled'));
  return cancelled;
}

// ── dashboard ────────────────────────────────────────────────────────────
export async function dashboard(db, session) {
  const m = await requireMember(db, session);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const monthStart = `${today.slice(0, 7)}-01`;
  const [{ rows: counts }, { rows: spend }, { rows: byProject }, { rows: upcoming }] = await Promise.all([
    db.query(
      `SELECT
         count(*) FILTER (WHERE status <> 'cancelled') AS total,
         count(*) FILTER (WHERE status = 'requested') AS choosing,
         count(*) FILTER (WHERE status = 'pending') AS awaiting_payment,
         count(*) FILTER (WHERE status = 'confirmed' AND check_in >= $2) AS upcoming,
         count(*) FILTER (WHERE status = 'checked_in') AS staying_now
       FROM booqa_accommodation_requests WHERE org_id = $1`,
      [m.org_id, today]
    ),
    db.query(
      `SELECT COALESCE(sum(total_cost), 0) AS month_spend FROM booqa_accommodation_requests
        WHERE org_id = $1 AND status IN ('confirmed', 'checked_in', 'completed') AND paid_at >= $2`,
      [m.org_id, monthStart]
    ),
    db.query(
      `SELECT COALESCE(project, 'No project') AS project, sum(total_cost) AS spend, count(*) AS stays
         FROM booqa_accommodation_requests
        WHERE org_id = $1 AND status IN ('confirmed', 'checked_in', 'completed') AND total_cost IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      [m.org_id]
    ),
    db.query(
      `SELECT id, reference, city, hotel_name, check_in::text AS check_in, check_out::text AS check_out, rooms, status
         FROM booqa_accommodation_requests
        WHERE org_id = $1 AND status IN ('confirmed', 'checked_in') ORDER BY check_in LIMIT 5`,
      [m.org_id]
    ),
  ]);
  return {
    ...Object.fromEntries(Object.entries(counts[0]).map(([k, v]) => [k, Number(v)])),
    month_spend: Number(spend[0].month_spend),
    spend_by_project: byProject.map((p) => ({ project: p.project, spend: Number(p.spend), stays: Number(p.stays) })),
    upcoming,
  };
}

// ── Booqa operations (read-only overview) ────────────────────────────────
function requireOps(session) {
  if (!session?.sub) throw new BizError(401, 'Please sign in.', 'UNAUTHENTICATED');
  if (!isBooqaOps(session)) throw forbidden('Booqa operations team only.');
}

export async function opsListRequests(db, session, { status } = {}) {
  requireOps(session);
  const params = [];
  let where = 'TRUE';
  if (status === 'open') where = "r.status IN ('requested', 'pending', 'confirmed', 'checked_in')";
  else if (status) { params.push(status); where = `r.status = $${params.length}`; }
  const { rows } = await db.query(
    `SELECT ${REQUEST_COLUMNS}, o.name AS org_name
       FROM booqa_accommodation_requests r
       JOIN booqa_organizations o ON o.id = r.org_id
       LEFT JOIN booqa_guests rg ON rg.id = r.requested_by
      WHERE ${where} ORDER BY r.created_at DESC LIMIT 300`,
    params
  );
  return rows;
}

export async function opsGetRequest(db, session, requestId) {
  requireOps(session);
  return loadRequestDetail(db, requestId);
}

// ── hotel directory (members) ────────────────────────────────────────────
// Every hotel Booqa companies can book (HotelOps decides visibility), with
// photos, facilities and an all-in "from" price - so companies can look
// around before or after making a request.
const allIn = (rate, feePercent) => Math.round(Number(rate) * (1 + (Number(feePercent) || 0) / 100));

// Public (no sign-in): anyone can browse hotels on the landing page;
// signing in is only needed to book.
const hotelSummary = (h) => ({
  id: h.id,
  name: h.name,
  logo_url: h.logo_url || null,
  address: h.address || null,
  area: h.area || null,
  city: h.city || null,
  state: h.state || null,
  hotel_type: h.hotel_type || null,
  description: h.description || null,
  photos: h.photos || [h.cover_image_url].filter(Boolean),
  facilities: h.facilities || [],
  amenities: h.amenities || [],
  avg_rating: h.avg_rating ?? null,
  from_per_night: h.from_price != null ? allIn(h.from_price, h.guest_fee_percent) : null,
  distance_km: h.distance_km ?? null,
  approximate: !!h.approximate,
});

const textOf = (h) => [h.name, h.address, h.area, h.city, h.state].join(' ').toLowerCase();

/**
 * Hotel search. `where` can be a hotel name ("Rivoli") or a place - a
 * street, area or city ("peter odili port harcourt") - in which case
 * hotels are ranked by real distance from it.
 * @returns { hotels, place: { label } | null, far }
 */
export async function publicHotels(query = {}, db = null) {
  const hotels = await hotelops('GET', 'hotels');
  const where = String(query.where || query.city || query.q || '').trim();
  if (!where) return { hotels: hotels.map(hotelSummary), place: null, far: false };

  // A hotel's own name wins ("Rivoli Suites").
  const lower = where.toLowerCase();
  const byName = hotels.filter((h) => h.name.toLowerCase().includes(lower));
  if (byName.length) return { hotels: byName.map(hotelSummary), place: null, far: false };

  // A place: rank by distance from it - once hotels have map positions
  // (HotelOps 049); until then, text matching below.
  const located = hotels.some((h) => h.latitude != null && h.longitude != null);
  const place = db && located ? await resolvePlace(db, where) : null;
  if (place) {
    const near = nearby(hotels, place);
    return { hotels: near.hotels.map(hotelSummary), place: { label: place.label }, far: near.far };
  }

  // Map service unavailable or place unknown: plain text match on every word.
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  const matched = hotels.filter((h) => words.every((w) => textOf(h).includes(w)));
  return { hotels: matched.map(hotelSummary), place: null, far: false };
}

export async function publicHotel(hotelId) {
  const [hotel, roomTypes, list] = await Promise.all([
    hotelops('GET', `hotels/${hotelId}`),
    hotelops('GET', `hotels/${hotelId}/room-types`),
    hotelops('GET', 'hotels'),
  ]);
  const feePercent = list.find((h) => h.id === hotelId)?.guest_fee_percent;
  return {
    ...hotel,
    room_types: roomTypes
      .filter((rt) => Number(rt.base_rate) > 0)
      .map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        capacity_adults: rt.capacity_adults,
        capacity_children: rt.capacity_children,
        bed_type: rt.bed_type || null,
        size_sqm: rt.size_sqm || null,
        amenities: rt.amenities || [],
        media: rt.media || [],
        per_night: allIn(rt.base_rate, feePercent),
      }))
      .sort((a, b) => a.per_night - b.per_night),
  };
}

/**
 * Live rooms free and all-in prices at one hotel for given dates - shown
 * while booking from a hotel's page. No sign-in needed (nothing is held).
 */
export async function publicAvailability(hotelId, query = {}) {
  const check_in = clean(query.check_in, 10);
  const check_out = clean(query.check_out, 10);
  if (!isDate(check_in) || !isDate(check_out) || check_out <= check_in) throw bad('Choose check-in and check-out dates.');
  const adults = Math.min(6, Math.max(1, parseInt(query.adults, 10) || 1));
  const rooms = Math.min(20, Math.max(1, parseInt(query.rooms, 10) || 1));
  const rows = await hotelops('GET', `hotels/${hotelId}/availability`, { query: { check_in, check_out, adults, children: 0, rooms } });
  return rows.map((rt) => ({
    room_type_id: rt.room_type_id,
    name: rt.name,
    available_count: Number(rt.available_count) || 0,
    nights: Number(rt.nights) || nightsBetween(check_in, check_out),
    per_night: perNightAllIn(rt),
    stay_per_room: stayAllIn(rt),
  }));
}

// Same data inside the company workspace.
export async function listHotels(db, session, query) {
  await requireMember(db, session);
  return publicHotels(query, db);
}

export async function getHotel(db, session, hotelId) {
  await requireMember(db, session);
  return publicHotel(hotelId);
}
