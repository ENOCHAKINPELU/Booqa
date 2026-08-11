// Federated auth for the hotel-partner side of Booqa (Phase 4). Deliberately
// NOT a new identity system: a hotel owner/manager already has a real
// account in HotelOps (`owners`/`managers`), and that's the credential that
// should govern who can manage a hotel's marketplace listing. Booqa never
// stores a partner password or issues its own partner JWT — it calls
// HotelOps' existing POST /api/v1/auth/owner|manager/login directly (the
// staff JWT surface, not the HMAC-signed booking-api channel guests use —
// different trust boundary, same reasoning as why bookingAuth.js and the
// staff `authenticate` middleware are two separate things in the backend),
// then simply holds HotelOps' own access_token/refresh_token in
// Booqa-domain httpOnly cookies and forwards them as a Bearer token on
// every partner API call. HotelOps remains the sole source of truth for
// "who is this owner/manager and which hotel do they run."
//
// Separate cookie names from the guest session (lib/auth.js) — a browser
// signed in as both a guest and a hotel partner (plausible: an owner
// checking their own hotel's guest-facing page) must not have one identity
// bleed into the other.
const ACCESS_COOKIE = 'booqa_partner_access';
const REFRESH_COOKIE = 'booqa_partner_refresh';
// Mirrors the lifetimes HotelOps itself issues (auth.service.js:
// ACCESS_EXPIRES default 15m, REFRESH_EXPIRES_MS 7 days) — these cookies
// just carry HotelOps' own tokens, so their Max-Age shouldn't outlive them.
const ACCESS_MAX_AGE_SECONDS = 15 * 60;
const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

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

function getPartnerAccessToken(req) {
  return parseCookies(req)[ACCESS_COOKIE] || null;
}

function getPartnerRefreshToken(req) {
  return parseCookies(req)[REFRESH_COOKIE] || null;
}

function setPartnerCookies(res, accessToken, refreshToken) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const cookies = [
    `${ACCESS_COOKIE}=${encodeURIComponent(accessToken)}; HttpOnly; Path=/; Max-Age=${ACCESS_MAX_AGE_SECONDS}; SameSite=Lax${secure}`,
  ];
  // Scoped to /api/partner only, same reasoning as the guest refresh
  // cookie — the longest-lived credential here only travels to the one
  // endpoint that needs it.
  if (refreshToken) {
    cookies.push(`${REFRESH_COOKIE}=${encodeURIComponent(refreshToken)}; HttpOnly; Path=/api/partner; Max-Age=${REFRESH_MAX_AGE_SECONDS}; SameSite=Lax${secure}`);
  }
  res.setHeader('Set-Cookie', cookies);
}

function clearPartnerCookies(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', [
    `${ACCESS_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    `${REFRESH_COOKIE}=; HttpOnly; Path=/api/partner; Max-Age=0; SameSite=Lax${secure}`,
  ]);
}

function hotelOpsBaseUrl() {
  const base = process.env.HOTELOPS_API_BASE_URL;
  if (!base) throw new Error('HOTELOPS_API_BASE_URL is not configured');
  return base;
}

export {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  getPartnerAccessToken,
  getPartnerRefreshToken,
  setPartnerCookies,
  clearPartnerCookies,
  hotelOpsBaseUrl,
};
