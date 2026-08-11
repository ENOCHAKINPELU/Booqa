import { getPartnerRefreshToken, setPartnerCookies, clearPartnerCookies, hotelOpsBaseUrl } from '../../lib/partnerAuth.js';
import { ok, fail } from '../../lib/respond.js';

// Called by the partner-side axios interceptor (mirrors services/api.js's
// guest silent-refresh) whenever a marketplace call comes back 401 because
// the 15-minute HotelOps access token expired.
export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const refreshToken = getPartnerRefreshToken(req);
  if (!refreshToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.success) {
      clearPartnerCookies(res);
      return fail(res, 401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
    }
    setPartnerCookies(res, payload.data.access_token, payload.data.refresh_token);
    ok(res, { message: 'Refreshed' });
  } catch (err) {
    console.error('[partner/refresh]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}
