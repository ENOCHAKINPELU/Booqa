import bcrypt from 'bcryptjs';
import * as db from '../../lib/db.js';
import { signAccessToken, createRefreshToken, setSessionCookies, generateRawToken, sha256Hex } from '../../lib/auth.js';
import { sendVerificationEmail } from '../../lib/mail.js';
import { ok, fail } from '../../lib/respond.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { email, password, full_name, phone } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password || !full_name) {
    return fail(res, 400, 'Email, password, and full name are required', 'VALIDATION_ERROR');
  }
  if (password.length < 8) {
    return fail(res, 400, 'Password must be at least 8 characters', 'VALIDATION_ERROR');
  }

  try {
    const existing = await db.query('SELECT id FROM booqa_guests WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length) {
      return fail(res, 409, 'An account with this email already exists', 'EMAIL_IN_USE');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await db.query(
      `INSERT INTO booqa_guests (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone, email_verified, created_at`,
      [normalizedEmail, passwordHash, full_name, phone || null]
    );
    const guest = inserted.rows[0];

    // Account is usable immediately - verification is a nudge, not a gate
    // (see the Slice 1 plan for why: minimal friction on signup/booking).
    const rawToken = generateRawToken();
    await db.query(
      `INSERT INTO booqa_auth_tokens (guest_id, purpose, token_hash, expires_at)
       VALUES ($1, 'verify_email', $2, now() + interval '24 hours')`,
      [guest.id, sha256Hex(rawToken)]
    );
    sendVerificationEmail(guest, rawToken).catch((err) => console.error('[signup] verification email failed:', err.message));

    const accessToken = signAccessToken(guest);
    const refreshToken = await createRefreshToken(guest.id);
    setSessionCookies(res, accessToken, refreshToken);
    ok(res, { guest }, 201);
  } catch (err) {
    console.error('[signup]', err);
    fail(res, 500, 'Unable to create your account right now. Please try again.', 'SIGNUP_FAILED');
  }
}
