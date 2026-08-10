import { getRefreshTokenFromRequest, consumeRefreshToken, revokeAllRefreshTokens, clearSessionCookies } from '../../lib/auth.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  // Actually revokes something server-side now — not just a client-side
  // cookie clear. consumeRefreshToken both verifies and marks the
  // presented token revoked; revokeAllRefreshTokens then closes every
  // other active session for the same guest too (matches HotelOps' own
  // logout() scope — "sign out everywhere", not just this device).
  const rawRefresh = getRefreshTokenFromRequest(req);
  if (rawRefresh) {
    try {
      const guestId = await consumeRefreshToken(rawRefresh);
      if (guestId) await revokeAllRefreshTokens(guestId);
    } catch (err) {
      console.error('[logout] token revocation failed:', err.message);
      // Still clear the cookies below — a failed revocation shouldn't
      // leave the browser looking logged in.
    }
  }

  clearSessionCookies(res);
  ok(res, { message: 'Signed out' });
}
