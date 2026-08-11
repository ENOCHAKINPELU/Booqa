import { getPartnerAccessToken, hotelOpsBaseUrl } from '../../lib/partnerAuth.js';
import { fail } from '../../lib/respond.js';

// Passes straight through to HotelOps' own GET /api/v1/auth/me rather than
// decoding the JWT locally — Booqa never holds HotelOps' JWT_ACCESS_SECRET,
// so it can't verify the token itself, and shouldn't need to: HotelOps is
// the authority on whether this token is still valid.
export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const accessToken = getPartnerAccessToken(req);
  if (!accessToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await upstream.json().catch(() => null);
    res.status(upstream.status).json(payload ?? { success: false, data: null, error: { message: 'Invalid response from HotelOps', code: 'BAD_UPSTREAM_RESPONSE' } });
  } catch (err) {
    console.error('[partner/me]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}
