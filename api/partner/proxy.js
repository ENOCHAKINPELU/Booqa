import { getPartnerAccessToken, hotelOpsBaseUrl } from '../../lib/partnerAuth.js';
import { fail } from '../../lib/respond.js';

// The partner-dashboard equivalent of api/proxy.js, but for the staff JWT
// surface (Bearer token) instead of the HMAC booking-api channel, and
// deliberately narrower: it will only ever forward into
// /api/v1/marketplace/*, not the whole HotelOps staff API. A hotel partner
// signed in through Booqa gets exactly the marketplace surface (apply,
// profile, analytics, settlements) — nothing about rooms, guests, or other
// operational HotelOps data is reachable through this door, even though
// the underlying access token would technically be accepted there too.
//
// Flat file (not a catch-all route) for the same `vercel dev` routing
// reason as api/proxy.js — the real sub-path travels as a `path` query
// param, mirrored by src/services/partnerApi.js's request interceptor.
export default async function handler(req, res) {
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : (req.query.path || '');
  const subPath = String(rawPath).replace(/^\/+/, '');
  // Belt-and-suspenders on top of the hardcoded prefix below — refuses
  // anything that isn't a bare marketplace sub-route, e.g. no "../" tricks.
  if (!/^[a-zA-Z0-9/_-]*$/.test(subPath)) return fail(res, 400, 'Invalid path', 'VALIDATION_ERROR');

  const accessToken = getPartnerAccessToken(req);
  if (!accessToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  const method = (req.method || 'GET').toUpperCase();
  const params = new URLSearchParams(req.query);
  params.delete('path');
  const qs = params.toString();
  const targetPath = `/api/v1/marketplace/${subPath}${qs ? `?${qs}` : ''}`;

  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}${targetPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: hasBody ? JSON.stringify(req.body || {}) : undefined,
    });
    const data = await upstream.json().catch(() => null);
    res.status(upstream.status).json(data ?? { success: false, data: null, error: { message: 'Invalid response from HotelOps', code: 'BAD_UPSTREAM_RESPONSE' } });
  } catch (err) {
    console.error('[partner/proxy]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}
