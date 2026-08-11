import * as db from '../../lib/db.js';
import { generateRawToken, sha256Hex } from '../../lib/auth.js';
import { sendPasswordResetEmail } from '../../lib/mail.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return fail(res, 400, 'Email is required', 'VALIDATION_ERROR');

  // Always responds success - never reveals whether an account exists for
  // this email.
  try {
    const result = await db.query('SELECT id, email, full_name FROM booqa_guests WHERE email = $1', [normalizedEmail]);
    const guest = result.rows[0];
    if (guest) {
      const rawToken = generateRawToken();
      await db.query(
        `INSERT INTO booqa_auth_tokens (guest_id, purpose, token_hash, expires_at)
         VALUES ($1, 'reset_password', $2, now() + interval '1 hour')`,
        [guest.id, sha256Hex(rawToken)]
      );
      sendPasswordResetEmail(guest, rawToken).catch((err) => console.error('[forgot-password] email failed:', err.message));
    }
  } catch (err) {
    console.error('[forgot-password]', err);
    // Fall through to the generic success response regardless.
  }

  ok(res, { message: 'If an account exists for that email, a reset link is on its way.' });
}
