import * as db from '../../lib/db.js';
import { getRefreshTokenFromRequest, consumeRefreshToken, signAccessToken, createRefreshToken, setSessionCookies, clearSessionCookies } from '../../lib/auth.js';
import { ok, fail } from '../../lib/respond.js';

// Called by the frontend's silent-refresh interceptor (services/api.js)
// whenever a routine request comes back 401 because the 15-minute access
// token expired. Rotates the refresh token on every use (the consumed one
// is marked revoked, a new one issued) — a stolen refresh token is only
// ever valid for a single silent refresh before it stops working, not for
// its entire 30-day lifetime.
export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const rawRefresh = getRefreshTokenFromRequest(req);
  if (!rawRefresh) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const guestId = await consumeRefreshToken(rawRefresh);
    if (!guestId) {
      clearSessionCookies(res);
      return fail(res, 401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
    }

    const result = await db.query('SELECT id, email, full_name, phone, email_verified FROM booqa_guests WHERE id = $1', [guestId]);
    const guest = result.rows[0];
    if (!guest) {
      clearSessionCookies(res);
      return fail(res, 401, 'Account not found', 'NOT_FOUND');
    }

    const accessToken = signAccessToken(guest);
    const refreshToken = await createRefreshToken(guest.id);
    setSessionCookies(res, accessToken, refreshToken);
    ok(res, { guest });
  } catch (err) {
    console.error('[refresh]', err);
    fail(res, 500, 'Unable to refresh your session right now.', 'REFRESH_FAILED');
  }
}
