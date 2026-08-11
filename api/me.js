import * as db from '../lib/db.js';
import { getSessionFromRequest } from '../lib/auth.js';
import { ok, fail } from '../lib/respond.js';

// Returns 401 when not authenticated - standard REST convention, and what
// lets the frontend's silent-refresh interceptor (services/api.js) detect
// "access token expired, worth trying a refresh" versus every other kind
// of failure. AuthContext catches the 401 itself and just sets guest to
// null; nothing surfaces to the guest as an error for a routine session
// check.
export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const session = getSessionFromRequest(req);
  if (!session) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const result = await db.query(
      'SELECT id, email, full_name, phone, email_verified FROM booqa_guests WHERE id = $1',
      [session.sub]
    );
    if (!result.rows[0]) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');
    ok(res, result.rows[0]);
  } catch (err) {
    console.error('[me]', err);
    fail(res, 500, 'Unable to load your session right now.', 'ME_FAILED');
  }
}
