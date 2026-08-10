import bcrypt from 'bcryptjs';
import * as db from '../../lib/db.js';
import { signAccessToken, createRefreshToken, setSessionCookies } from '../../lib/auth.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { email, password } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return fail(res, 400, 'Email and password are required', 'VALIDATION_ERROR');
  }

  try {
    const result = await db.query(
      'SELECT id, email, password_hash, full_name, phone, email_verified FROM booqa_guests WHERE email = $1',
      [normalizedEmail]
    );
    const row = result.rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return fail(res, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const guest = { id: row.id, email: row.email, full_name: row.full_name, phone: row.phone, email_verified: row.email_verified };
    const accessToken = signAccessToken(guest);
    const refreshToken = await createRefreshToken(guest.id);
    setSessionCookies(res, accessToken, refreshToken);
    ok(res, { guest });
  } catch (err) {
    console.error('[login]', err);
    fail(res, 500, 'Unable to sign you in right now. Please try again.', 'LOGIN_FAILED');
  }
}
