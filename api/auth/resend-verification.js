import * as db from '../../lib/db.js';
import { getSessionFromRequest, generateRawToken, sha256Hex } from '../../lib/auth.js';
import { sendVerificationEmail } from '../../lib/mail.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const session = getSessionFromRequest(req);
  if (!session) return fail(res, 401, 'Please sign in first', 'UNAUTHORIZED');

  try {
    const guestResult = await db.query('SELECT id, email, full_name, email_verified FROM booqa_guests WHERE id = $1', [session.sub]);
    const guest = guestResult.rows[0];
    if (!guest) return fail(res, 404, 'Account not found', 'NOT_FOUND');
    if (guest.email_verified) return ok(res, { message: 'Your email is already verified' });

    const recent = await db.query(
      `SELECT created_at FROM booqa_auth_tokens
       WHERE guest_id = $1 AND purpose = 'verify_email'
       ORDER BY created_at DESC LIMIT 1`,
      [guest.id]
    );
    if (recent.rows[0] && Date.now() - new Date(recent.rows[0].created_at).getTime() < 60_000) {
      return fail(res, 429, 'Please wait a moment before requesting another email', 'RATE_LIMITED');
    }

    const rawToken = generateRawToken();
    await db.query(
      `INSERT INTO booqa_auth_tokens (guest_id, purpose, token_hash, expires_at)
       VALUES ($1, 'verify_email', $2, now() + interval '24 hours')`,
      [guest.id, sha256Hex(rawToken)]
    );
    await sendVerificationEmail(guest, rawToken);

    ok(res, { message: 'Verification email sent' });
  } catch (err) {
    console.error('[resend-verification]', err);
    fail(res, 500, 'Unable to send a verification email right now.', 'RESEND_FAILED');
  }
}
