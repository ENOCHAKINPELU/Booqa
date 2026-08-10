import bcrypt from 'bcryptjs';
import * as db from '../../lib/db.js';
import { sha256Hex } from '../../lib/auth.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { token, password } = req.body || {};
  if (!token || !password) return fail(res, 400, 'Token and new password are required', 'VALIDATION_ERROR');
  if (password.length < 8) return fail(res, 400, 'Password must be at least 8 characters', 'VALIDATION_ERROR');

  try {
    const result = await db.query(
      `SELECT id, guest_id FROM booqa_auth_tokens
       WHERE token_hash = $1 AND purpose = 'reset_password' AND used_at IS NULL AND expires_at > now()`,
      [sha256Hex(token)]
    );
    const row = result.rows[0];
    if (!row) return fail(res, 400, 'This reset link is invalid or has expired', 'INVALID_OR_EXPIRED_TOKEN');

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query('UPDATE booqa_guests SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, row.guest_id]);
    await db.query('UPDATE booqa_auth_tokens SET used_at = now() WHERE id = $1', [row.id]);

    ok(res, { message: 'Password reset. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    fail(res, 500, 'Unable to reset your password right now. Please try again.', 'RESET_FAILED');
  }
}
