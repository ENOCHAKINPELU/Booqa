import crypto from 'crypto';
import { getSessionFromRequest } from '../lib/auth.js';

// The one piece of "backend" Booqa has. The browser never holds
// BOOQA_HMAC_SECRET or talks to HotelOps directly - it calls this
// same-origin serverless function, which signs the request the way
// HotelOps' middleware/bookingAuth.js expects and forwards it. See the
// architecture doc §13 and the Phase 2 plan for why this exists at all.
//
// A flat file, not api/proxy/[...path].js - that catch-all shape was
// dropped after confirming (with a fresh, minimal repro route) that this
// `vercel dev` version 404s any catch-all request with more than one path
// segment, e.g. GET /api/proxy/hotels/:id/room-types, while a single
// segment like /api/proxy/hotels worked. Rather than depend on Vercel's
// catch-all path matching at all, the real HotelOps path now travels as a
// `path` query param to this one static function (see services/api.js's
// request interceptor, which is the only other half of this change) - a
// plain query string never touches route matching, in dev or in
// production, so there's nothing left for that bug to trip over.
function sign(secret, timestamp, method, path, body) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${method.toUpperCase()}.${path}.${body || ''}`)
    .digest('hex');
}

export default async function handler(req, res) {
  const { HOTELOPS_API_BASE_URL, BOOQA_API_KEY, BOOQA_HMAC_SECRET } = process.env;
  if (!HOTELOPS_API_BASE_URL || !BOOQA_API_KEY || !BOOQA_HMAC_SECRET) {
    res.status(500).json({ success: false, error: { message: 'Booking proxy is not configured', code: 'PROXY_NOT_CONFIGURED' } });
    return;
  }

  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : (req.query.path || '');
  const targetPath = `/booking-api/v1/${String(rawPath).replace(/^\/+/, '')}`;
  const method = (req.method || 'GET').toUpperCase();

  // Every other query param is the real request's own query string
  // (check_in/check_out/adults/... for availability calls) - `path` is
  // the only one that exists purely to get the target path here and must
  // not be forwarded on to HotelOps or included in the signature.
  const params = new URLSearchParams(req.query);
  params.delete('path');

  // A specific hotel's full details (profile, room types, live pricing,
  // media, reviews) require a signed-in guest - only the bare list
  // (/hotels, with or without a city/state filter) stays public, so a
  // guest can still browse and decide it's worth creating an account.
  // Enforced here, not just as a frontend redirect: a signed-out browser
  // hitting these paths directly never even reaches HotelOps, so there's
  // no way to read the data out of the network tab by skipping the UI.
  if (method === 'GET' && /^\/booking-api\/v1\/hotels\/[^/]+/.test(targetPath)) {
    const session = getSessionFromRequest(req);
    if (!session?.sub) {
      res.status(401).json({ success: false, data: null, error: { message: 'Sign in to view hotel details', code: 'UNAUTHENTICATED' } });
      return;
    }
  }

  // Guest-identity binding happens HERE, not in the browser, for the same
  // reason as the POST /reservations case below: the booking-api trusts
  // the channel (this proxy, via HMAC), not individual guests, and has no
  // way to verify a client-supplied guest id itself. "mine" makes no
  // sense as an anonymous call, so a missing/invalid session is rejected
  // right here - HotelOps is never even asked.
  if (method === 'GET' && targetPath === '/booking-api/v1/reservations/mine') {
    const session = getSessionFromRequest(req);
    if (!session?.sub) {
      res.status(401).json({ success: false, data: null, error: { message: 'Not signed in', code: 'UNAUTHENTICATED' } });
      return;
    }
    params.set('guest_id', session.sub);
  }

  const qs = params.toString();
  const fullPath = qs ? `${targetPath}?${qs}` : targetPath;

  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? { ...(req.body || {}) } : null;

  // Same binding, mirrored for the write side: whatever the browser sent
  // for booqa_guest_id on reservation creation is discarded and replaced
  // with whatever the verified session says (or null, if not logged in).
  // This is the only place that can make that claim honestly. See the
  // Slice 1 plan.
  if (method === 'POST' && targetPath === '/booking-api/v1/reservations' && body) {
    const session = getSessionFromRequest(req);
    body.booqa_guest_id = session?.sub || null;
  }

  // Same binding for review submission - a review can only ever be
  // attributed to whoever is actually signed in on this browser, never
  // to a client-supplied id. submit_review (029) independently
  // re-verifies this guest owns the reservation being reviewed; this is
  // just the one place that can honestly assert who's asking.
  if (method === 'POST' && /^\/booking-api\/v1\/reservations\/[^/]+\/review$/.test(targetPath) && body) {
    const session = getSessionFromRequest(req);
    if (!session?.sub) {
      res.status(401).json({ success: false, data: null, error: { message: 'Sign in to leave a review', code: 'UNAUTHENTICATED' } });
      return;
    }
    body.booqa_guest_id = session.sub;
  }

  const bodyString = hasBody ? JSON.stringify(body || {}) : '';
  const timestamp = Date.now().toString();
  const signature = sign(BOOQA_HMAC_SECRET, timestamp, method, fullPath, bodyString);

  const headers = {
    'Content-Type': 'application/json',
    'X-Booqa-Key': BOOQA_API_KEY,
    'X-Booqa-Timestamp': timestamp,
    'X-Booqa-Signature': signature,
  };
  // Passed through unchanged - HotelOps' idempotency store keys on it directly.
  if (req.headers['idempotency-key']) headers['Idempotency-Key'] = req.headers['idempotency-key'];

  try {
    const upstream = await fetch(`${HOTELOPS_API_BASE_URL}${fullPath}`, {
      method,
      headers,
      body: hasBody ? bodyString : undefined,
    });
    const data = await upstream.json().catch(() => null);
    res.status(upstream.status).json(
      data ?? { success: false, error: { message: 'Invalid response from HotelOps', code: 'BAD_UPSTREAM_RESPONSE' } }
    );
  } catch (err) {
    res.status(502).json({ success: false, error: { message: 'Unable to reach HotelOps. Please try again.', code: 'UPSTREAM_UNREACHABLE' } });
  }
}
