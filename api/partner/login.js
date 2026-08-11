import { setPartnerCookies, hotelOpsBaseUrl } from '../../lib/partnerAuth.js';
import { ok, fail } from '../../lib/respond.js';

// Federated login: no local password check, no local account — this calls
// HotelOps' real owner/manager login and wraps whatever it returns. See
// lib/partnerAuth.js for why.
export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { email, password, role } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required', 'VALIDATION_ERROR');
  if (role !== 'owner' && role !== 'manager') return fail(res, 400, 'role must be "owner" or "manager"', 'VALIDATION_ERROR');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/${role}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.success) {
      const message = payload?.error?.message || 'Invalid email or password';
      const code = payload?.error?.code || 'INVALID_CREDENTIALS';
      return fail(res, upstream.status || 401, message, code);
    }

    const { access_token, refresh_token, user } = payload.data;
    setPartnerCookies(res, access_token, refresh_token);
    // Tokens never go to the browser — only the profile HotelOps returned
    // alongside them, same shape the partner dashboard needs to render a
    // name/hotel without a second round trip.
    ok(res, { partner: user });
  } catch (err) {
    console.error('[partner/login]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}
