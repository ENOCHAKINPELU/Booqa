import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import * as db from './db.js';

// Two cookies, mirroring backend/modules/auth/auth.service.js's staff-auth
// shape exactly: a short-lived signed access token for routine requests,
// and a separate, DB-backed, revocable refresh token for staying signed
// in. A single long-lived JWT (Slice 1's original design) can't be
// revoked server-side at all — logout could only ever clear the browser's
// copy, not invalidate a captured one. This can.
const ACCESS_COOKIE = 'booqa_session';
const REFRESH_COOKIE = 'booqa_refresh';
const ACCESS_EXPIRES = '15m';
const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_EXPIRES_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function secret() {
  const s = process.env.BOOQA_GUEST_JWT_SECRET;
  if (!s) throw new Error('BOOQA_GUEST_JWT_SECRET is not configured');
  return s;
}

function signAccessToken(guest) {
  return jwt.sign({ sub: guest.id, email: guest.email }, secret(), { expiresIn: ACCESS_EXPIRES });
}

// Returns { sub, email } or null — never throws, callers treat an invalid/
// missing/expired token as "not logged in", not an error.
function verifyAccessToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

// Same "${id}.${rawSecret}" shape as backend's refresh_tokens: the id
// prefix supports an indexed lookup by guest_id instead of a full-table
// bcrypt scan, and the token itself is bcrypt-hashed — deliberately slow,
// appropriate for a long-lived bearer credential (unlike the sha256
// exact-match tokens in booqa_auth_tokens, which are single-use).
async function createRefreshToken(guestId) {
  const raw = crypto.randomUUID() + crypto.randomUUID();
  const hash = await bcrypt.hash(raw, 10);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS).toISOString();
  await db.query(
    `INSERT INTO booqa_refresh_tokens (guest_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [guestId, hash, expiresAt]
  );
  return `${guestId}.${raw}`;
}

// Verifies and rotates in one step (consumes the matched token, marks it
// revoked) — a refresh token is single-use, same as HotelOps' own
// refreshAccessToken(). Returns the guest_id on success, or null.
async function consumeRefreshToken(rawCombined) {
  if (!rawCombined || !rawCombined.includes('.')) return null;
  const dot = rawCombined.indexOf('.');
  const guestId = rawCombined.slice(0, dot);
  const raw = rawCombined.slice(dot + 1);
  if (!guestId || !raw) return null;

  const result = await db.query(
    `SELECT id, token_hash FROM booqa_refresh_tokens
     WHERE guest_id = $1 AND revoked = false AND expires_at > now()
     ORDER BY created_at DESC LIMIT 5`,
    [guestId]
  );
  for (const row of result.rows) {
    if (await bcrypt.compare(raw, row.token_hash)) {
      await db.query(`UPDATE booqa_refresh_tokens SET revoked = true WHERE id = $1`, [row.id]);
      return guestId;
    }
  }
  return null;
}

// Logout scope matches HotelOps' own logout() — revokes every active
// session for this guest, not just the one that called it.
async function revokeAllRefreshTokens(guestId) {
  await db.query(`UPDATE booqa_refresh_tokens SET revoked = true WHERE guest_id = $1 AND revoked = false`, [guestId]);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

// Access-token check only — synchronous, no DB round trip. Used for
// routine requests (GET /api/me, the booking-api proxy's guest-identity
// binding). An expired access token here just means "not logged in for
// this request"; the frontend's silent-refresh interceptor (services/api.js)
// is what recovers a still-valid session transparently.
function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  return verifyAccessToken(cookies[ACCESS_COOKIE]);
}

function getRefreshTokenFromRequest(req) {
  return parseCookies(req)[REFRESH_COOKIE] || null;
}

function setSessionCookies(res, accessToken, refreshToken) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const accessCookie = `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; Max-Age=${ACCESS_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  // Scoped to /api/auth only — the refresh token is the most powerful,
  // longest-lived credential in this system, so it's never sent to
  // routine requests (/api/me, /api/proxy/*) that don't need it, only to
  // the one endpoint that does (/api/auth/refresh, /api/auth/logout).
  const refreshCookie = `${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/api/auth; Max-Age=${REFRESH_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
  res.setHeader('Set-Cookie', [accessCookie, refreshCookie]);
}

function clearSessionCookies(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    `${REFRESH_COOKIE}=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Lax${secure}`,
  ]);
}

// For booqa_auth_tokens (email verification / password reset): the raw
// value goes in the emailed link, only its sha256 hash is stored — a
// deterministic-lookup pattern, appropriate here because these are
// single-use random tokens, not a repeatedly-presented bearer credential
// like the refresh token above.
function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  signAccessToken,
  verifyAccessToken,
  createRefreshToken,
  consumeRefreshToken,
  revokeAllRefreshTokens,
  parseCookies,
  getSessionFromRequest,
  getRefreshTokenFromRequest,
  setSessionCookies,
  clearSessionCookies,
  generateRawToken,
  sha256Hex,
};
