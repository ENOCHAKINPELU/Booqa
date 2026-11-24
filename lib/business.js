import crypto from 'crypto';

/*
 * Booqa for Business - the request -> approve -> confirm -> stay loop.
 * Tables: HotelOps migration 046. Every function takes the db module and
 * the caller's verified session ({ sub, email }) and enforces who may do
 * what here, in one place:
 *
 *   client side   members of one organization
 *     requester   create requests, see the organization's requests,
 *                 cancel their own requests while still open
 *     approver    + approve an option, cancel any open request
 *     admin       + manage the team
 *   booqa side    accounts listed in BOOQA_ADMIN_EMAILS (the operations
 *                 team): see every request, propose options, record the
 *                 provider's confirmation and move stays along
 *
 * Status lifecycle (also the CHECK in 046):
 *   requested -> pending -> approved -> confirmed -> checked_in -> completed
 *   cancelled from requested / pending / approved / confirmed
 * "confirmed" only ever happens when Booqa records the provider's own
 * confirmation reference - availability is never assumed.
 */

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

export const ROLES = ['admin', 'approver', 'requester'];
export const OPEN_STATUSES = ['requested', 'pending', 'approved', 'confirmed'];
const OPS_TRANSITIONS = {
  confirmed: ['approved'],
  checked_in: ['confirmed'],
  completed: ['checked_in'],
};

const clean = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
export const nightsBetween = (a, b) => Math.round((new Date(`${String(b).slice(0, 10)}T00:00:00Z`) - new Date(`${String(a).slice(0, 10)}T00:00:00Z`)) / 86_400_000);

export function isBooqaOps(session) {
  const list = String(process.env.BOOQA_ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return !!session?.email && list.includes(String(session.email).toLowerCase());
}

function newReference() {
  // AR- + 6 chars without look-alikes (0/O, 1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return `AR-${[...bytes].map((b) => alphabet[b % alphabet.length]).join('')}`;
}

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
    `SELECT m.role, o.id AS org_id, o.name AS org_name, o.industry
       FROM booqa_org_members m JOIN booqa_organizations o ON o.id = m.org_id
      WHERE m.guest_id = $1`,
    [session.sub]
  );
  return rows[0] || null;
}

async function requireMember(db, session, roles = ROLES) {
  const m = await getMembership(db, session);
  if (!m) throw new BizError(403, 'Set up your organization first.', 'NO_ORGANIZATION');
  if (!roles.includes(m.role)) throw forbidden();
  return m;
}

export async function me(db, session) {
  const membership = await getMembership(db, session);
  return { membership, ops: isBooqaOps(session) };
}

export async function createOrganization(db, session, body) {
  if (await getMembership(db, session)) throw bad('Your account already belongs to an organization.', 'ALREADY_MEMBER');
  const name = clean(body.name, 160);
  if (!name) throw bad('Enter your organization name.');
  const { rows } = await db.query(
    'INSERT INTO booqa_organizations (name, industry, created_by) VALUES ($1, $2, $3) RETURNING id, name, industry',
    [name, clean(body.industry, 80) || null, session.sub]
  );
  await db.query("INSERT INTO booqa_org_members (org_id, guest_id, role) VALUES ($1, $2, 'admin')", [rows[0].id, session.sub]);
  return getMembership(db, session);
}

// ── team ─────────────────────────────────────────────────────────────────
export async function listMembers(db, session) {
  const m = await requireMember(db, session);
  const { rows } = await db.query(
    `SELECT g.id, g.full_name, g.email, mem.role, mem.added_at
       FROM booqa_org_members mem JOIN booqa_guests g ON g.id = mem.guest_id
      WHERE mem.org_id = $1 ORDER BY mem.added_at`,
    [m.org_id]
  );
  return rows;
}

export async function addMember(db, session, body) {
  const m = await requireMember(db, session, ['admin']);
  const email = clean(body.email, 200).toLowerCase();
  const role = ROLES.includes(body.role) ? body.role : 'requester';
  const { rows } = await db.query('SELECT id FROM booqa_guests WHERE lower(email) = $1', [email]);
  if (!rows[0]) throw bad('No Booqa account uses that email yet. Ask your colleague to sign up first, then add them.', 'NO_ACCOUNT');
  const { rows: existing } = await db.query('SELECT org_id FROM booqa_org_members WHERE guest_id = $1', [rows[0].id]);
  if (existing[0]) throw bad(existing[0].org_id === m.org_id ? 'They are already on your team.' : 'That account already belongs to another organization.', 'ALREADY_MEMBER');
  await db.query('INSERT INTO booqa_org_members (org_id, guest_id, role) VALUES ($1, $2, $3)', [m.org_id, rows[0].id, role]);
  return listMembers(db, session);
}

async function assertNotLastAdmin(db, orgId, guestId) {
  const { rows } = await db.query("SELECT guest_id FROM booqa_org_members WHERE org_id = $1 AND role = 'admin'", [orgId]);
  if (rows.length === 1 && rows[0].guest_id === guestId) throw bad('Your organization needs at least one admin.', 'LAST_ADMIN');
}

export async function updateMember(db, session, guestId, body) {
  const m = await requireMember(db, session, ['admin']);
  if (!ROLES.includes(body.role)) throw bad('Choose a valid role.');
  if (body.role !== 'admin') await assertNotLastAdmin(db, m.org_id, guestId);
  const { rowCount } = await db.query('UPDATE booqa_org_members SET role = $1 WHERE org_id = $2 AND guest_id = $3', [body.role, m.org_id, guestId]);
  if (!rowCount) throw notFound('Team member not found.');
  return listMembers(db, session);
}

export async function removeMember(db, session, guestId) {
  const m = await requireMember(db, session, ['admin']);
  await assertNotLastAdmin(db, m.org_id, guestId);
  await db.query('DELETE FROM booqa_org_members WHERE org_id = $1 AND guest_id = $2', [m.org_id, guestId]);
  return listMembers(db, session);
}

// ── requests (client) ────────────────────────────────────────────────────
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
  if (!(rooms >= 1 && rooms <= 200)) throw bad('Rooms must be between 1 and 200.');
  const guests = (Array.isArray(body.guests) ? body.guests : [])
    .map((g) => ({ name: clean(g?.name, 120), phone: clean(g?.phone, 40) }))
    .filter((g) => g.name)
    .slice(0, 200);
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

const REQUEST_COLUMNS = `r.id, r.reference, r.project, r.city, r.area, r.check_in::text AS check_in, r.check_out::text AS check_out, r.rooms, r.guests, r.preferences,
  r.budget_per_night, r.status, r.selected_option_id, r.approved_at, r.confirmation_ref, r.total_cost, r.cancelled_reason,
  r.created_at, r.updated_at, r.requested_by, rg.full_name AS requested_by_name, ag.full_name AS approved_by_name`;

export async function listRequests(db, session, { status } = {}) {
  const m = await requireMember(db, session);
  const params = [m.org_id];
  let where = 'r.org_id = $1';
  if (status) { params.push(status); where += ` AND r.status = $${params.length}`; }
  const { rows } = await db.query(
    `SELECT ${REQUEST_COLUMNS}
       FROM booqa_accommodation_requests r
       LEFT JOIN booqa_guests rg ON rg.id = r.requested_by
       LEFT JOIN booqa_guests ag ON ag.id = r.approved_by
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
       LEFT JOIN booqa_guests ag ON ag.id = r.approved_by
      WHERE ${where}`,
    params
  );
  if (!rows[0]) throw notFound('Request not found.');
  const [{ rows: options }, { rows: events }] = await Promise.all([
    db.query('SELECT id, property_name, address, rate_per_night, notes, created_at FROM booqa_request_options WHERE request_id = $1 ORDER BY rate_per_night', [requestId]),
    db.query('SELECT actor_name, actor_side, action, note, created_at FROM booqa_request_events WHERE request_id = $1 ORDER BY created_at', [requestId]),
  ]);
  return { ...rows[0], nights: nightsBetween(rows[0].check_in, rows[0].check_out), options, events };
}

export async function getRequest(db, session, requestId) {
  const m = await requireMember(db, session);
  const detail = await loadRequestDetail(db, requestId, m.org_id);
  return { ...detail, can_approve: ['admin', 'approver'].includes(m.role) };
}

export async function approveRequest(db, session, requestId, body) {
  const m = await requireMember(db, session, ['admin', 'approver']);
  const detail = await loadRequestDetail(db, requestId, m.org_id);
  if (detail.status !== 'pending') throw bad('This request is not waiting for approval.', 'NOT_PENDING');
  const option = detail.options.find((o) => o.id === body.option_id);
  if (!option) throw bad('Choose one of the options.');
  await db.query(
    `UPDATE booqa_accommodation_requests SET status = 'approved', selected_option_id = $1, approved_by = $2, approved_at = now(), updated_at = now()
      WHERE id = $3 AND status = 'pending'`,
    [option.id, session.sub, requestId]
  );
  await logEvent(db, requestId, session, 'client', 'approved', `${option.property_name} at ₦${Number(option.rate_per_night).toLocaleString()} / night`);
  return getRequest(db, session, requestId);
}

export async function cancelRequest(db, session, requestId, body) {
  const m = await requireMember(db, session);
  const detail = await loadRequestDetail(db, requestId, m.org_id);
  const canCancelAny = ['admin', 'approver'].includes(m.role);
  if (!canCancelAny && detail.requested_by !== session.sub) throw forbidden('Only the person who made the request, or an approver, can cancel it.');
  if (!OPEN_STATUSES.includes(detail.status)) throw bad('This request can no longer be cancelled.', 'NOT_CANCELLABLE');
  const reason = clean(body.reason, 500) || null;
  await db.query("UPDATE booqa_accommodation_requests SET status = 'cancelled', cancelled_reason = $1, updated_at = now() WHERE id = $2", [reason, requestId]);
  await logEvent(db, requestId, session, 'client', 'cancelled', reason);
  return getRequest(db, session, requestId);
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
         count(*) FILTER (WHERE status IN ('requested', 'pending')) AS open_requests,
         count(*) FILTER (WHERE status = 'pending') AS awaiting_approval,
         count(*) FILTER (WHERE status IN ('confirmed') AND check_in >= $2) AS upcoming,
         count(*) FILTER (WHERE status = 'checked_in') AS staying_now
       FROM booqa_accommodation_requests WHERE org_id = $1`,
      [m.org_id, today]
    ),
    db.query(
      `SELECT COALESCE(sum(total_cost), 0) AS month_spend FROM booqa_accommodation_requests
        WHERE org_id = $1 AND status IN ('confirmed', 'checked_in', 'completed') AND check_in >= $2`,
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
      `SELECT r.id, r.reference, r.city, r.check_in::text AS check_in, r.check_out::text AS check_out, r.rooms, r.status, o.property_name
         FROM booqa_accommodation_requests r LEFT JOIN booqa_request_options o ON o.id = r.selected_option_id
        WHERE r.org_id = $1 AND r.status IN ('confirmed', 'checked_in') ORDER BY r.check_in LIMIT 5`,
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

// ── Booqa operations ─────────────────────────────────────────────────────
function requireOps(session) {
  if (!session?.sub) throw new BizError(401, 'Please sign in.', 'UNAUTHENTICATED');
  if (!isBooqaOps(session)) throw forbidden('Booqa operations team only.');
}

export async function opsListRequests(db, session, { status } = {}) {
  requireOps(session);
  const params = [];
  let where = 'TRUE';
  if (status === 'open') where = "r.status IN ('requested', 'pending', 'approved', 'confirmed', 'checked_in')";
  else if (status) { params.push(status); where = `r.status = $${params.length}`; }
  const { rows } = await db.query(
    `SELECT ${REQUEST_COLUMNS}, o.name AS org_name
       FROM booqa_accommodation_requests r
       JOIN booqa_organizations o ON o.id = r.org_id
       LEFT JOIN booqa_guests rg ON rg.id = r.requested_by
       LEFT JOIN booqa_guests ag ON ag.id = r.approved_by
      WHERE ${where} ORDER BY r.created_at DESC LIMIT 300`,
    params
  );
  return rows;
}

export async function opsGetRequest(db, session, requestId) {
  requireOps(session);
  return loadRequestDetail(db, requestId);
}

export async function opsAddOption(db, session, requestId, body) {
  requireOps(session);
  const detail = await loadRequestDetail(db, requestId);
  if (!['requested', 'pending'].includes(detail.status)) throw bad('Options can only be added before the client approves.', 'NOT_OPEN');
  const property_name = clean(body.property_name, 160);
  const rate = Number(body.rate_per_night);
  if (!property_name) throw bad('Enter the property name.');
  if (!(rate > 0)) throw bad('Enter the rate per night.');
  await db.query(
    'INSERT INTO booqa_request_options (request_id, property_name, address, rate_per_night, notes) VALUES ($1, $2, $3, $4, $5)',
    [requestId, property_name, clean(body.address, 200) || null, rate, clean(body.notes, 500) || null]
  );
  if (detail.status === 'requested') {
    await db.query("UPDATE booqa_accommodation_requests SET status = 'pending', updated_at = now() WHERE id = $1", [requestId]);
  }
  await logEvent(db, requestId, session, 'booqa', 'option_added', `${property_name} at ₦${rate.toLocaleString()} / night`);
  return loadRequestDetail(db, requestId);
}

export async function opsRemoveOption(db, session, requestId, optionId) {
  requireOps(session);
  const detail = await loadRequestDetail(db, requestId);
  if (!['requested', 'pending'].includes(detail.status)) throw bad('Options can only be changed before the client approves.', 'NOT_OPEN');
  await db.query('DELETE FROM booqa_request_options WHERE id = $1 AND request_id = $2', [optionId, requestId]);
  const remaining = detail.options.filter((o) => o.id !== optionId);
  if (!remaining.length && detail.status === 'pending') {
    await db.query("UPDATE booqa_accommodation_requests SET status = 'requested', updated_at = now() WHERE id = $1", [requestId]);
  }
  await logEvent(db, requestId, session, 'booqa', 'option_removed');
  return loadRequestDetail(db, requestId);
}

export async function opsSetStatus(db, session, requestId, body) {
  requireOps(session);
  const detail = await loadRequestDetail(db, requestId);
  const next = body.status;
  const note = clean(body.note, 500) || null;

  if (next === 'cancelled') {
    if (!OPEN_STATUSES.includes(detail.status)) throw bad('This request can no longer be cancelled.', 'NOT_CANCELLABLE');
    await db.query("UPDATE booqa_accommodation_requests SET status = 'cancelled', cancelled_reason = $1, updated_at = now() WHERE id = $2", [note, requestId]);
    await logEvent(db, requestId, session, 'booqa', 'cancelled', note);
    return loadRequestDetail(db, requestId);
  }

  const from = OPS_TRANSITIONS[next];
  if (!from) throw bad('Unknown status.');
  if (!from.includes(detail.status)) throw bad(`A ${detail.status} request cannot move to ${next}.`, 'BAD_TRANSITION');

  if (next === 'confirmed') {
    const ref = clean(body.confirmation_ref, 80);
    if (!ref) throw bad("Enter the provider's confirmation reference.");
    const option = detail.options.find((o) => o.id === detail.selected_option_id);
    const total = option ? Number(option.rate_per_night) * detail.nights * Number(detail.rooms) : null;
    if (total != null && !Number.isFinite(total)) throw new BizError(500, 'Could not work out the stay total.', 'BAD_TOTAL');
    await db.query(
      "UPDATE booqa_accommodation_requests SET status = 'confirmed', confirmation_ref = $1, total_cost = $2, updated_at = now() WHERE id = $3",
      [ref, total, requestId]
    );
    await logEvent(db, requestId, session, 'booqa', 'status:confirmed', `Provider reference ${ref}${note ? ` · ${note}` : ''}`);
  } else {
    await db.query('UPDATE booqa_accommodation_requests SET status = $1, updated_at = now() WHERE id = $2', [next, requestId]);
    await logEvent(db, requestId, session, 'booqa', `status:${next}`, note);
  }
  return loadRequestDetail(db, requestId);
}
