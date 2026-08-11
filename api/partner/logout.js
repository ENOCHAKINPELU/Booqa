import { getPartnerAccessToken, clearPartnerCookies, hotelOpsBaseUrl } from '../../lib/partnerAuth.js';
import { ok } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, data: null, error: { message: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' } });

  const accessToken = getPartnerAccessToken(req);
  if (accessToken) {
    try {
      await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error('[partner/logout] upstream revocation failed:', err.message);
      // Still clear the Booqa-side cookies below — a failed upstream call
      // shouldn't leave this browser looking logged in.
    }
  }
  clearPartnerCookies(res);
  ok(res, { message: 'Signed out' });
}
