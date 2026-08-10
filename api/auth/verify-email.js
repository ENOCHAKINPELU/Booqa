import * as db from '../../lib/db.js';
import { sha256Hex } from '../../lib/auth.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { token } = req.body || {};
  if (!token) return fail(res, 400, 'A verification token is required', 'VALIDATION_ERROR');

  try {
    const result = await db.query(
      `SELECT id, guest_id FROM booqa_auth_tokens
       WHERE token_hash = $1 AND purpose = 'verify_email' AND used_at IS NULL AND expires_at > now()`,
      [sha256Hex(token)]
    );
    const row = result.rows[0];
    if (!row) return fail(res, 400, 'This verification link is invalid or has expired', 'INVALID_OR_EXPIRED_TOKEN');

    await db.query('UPDATE booqa_guests SET email_verified = true, updated_at = now() WHERE id = $1', [row.guest_id]);
    await db.query('UPDATE booqa_auth_tokens SET used_at = now() WHERE id = $1', [row.id]);

    ok(res, { message: 'Email verified' });
  } catch (err) {
    console.error('[verify-email]', err);
    fail(res, 500, 'Unable to verify your email right now. Please try again.', 'VERIFY_FAILED');
  }
}
