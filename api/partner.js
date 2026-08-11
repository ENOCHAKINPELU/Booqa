import { getPartnerAccessToken, getPartnerRefreshToken, setPartnerCookies, clearPartnerCookies, hotelOpsBaseUrl } from '../lib/partnerAuth.js';
import { ok, fail } from '../lib/respond.js';

// A single flat function for the entire hotel-partner surface — login,
// logout, refresh, me, and the marketplace proxy — instead of five
// separate files under api/partner/. Two reasons, not one:
//
// 1. Vercel's Hobby plan caps a deployment at 12 Serverless Functions.
//    Five small partner files pushed this project's count from 11 to 16
//    and the production deploy failed outright at the "Deploying
//    outputs" step (discovered live: booqa.vercel.app kept serving the
//    pre-Phase-4 build with no visible error until `vercel inspect` was
//    checked directly). One file keeps the total at 12.
// 2. Same `vercel dev` routing quirk noted in api/proxy.js's own
//    comment — multi-segment catch-all paths don't reliably resolve
//    locally, so dispatching on a query param instead of the URL path
//    was already this codebase's established pattern before Phase 4.
//
// Dispatch: ?action=login|logout|refresh|me for Booqa's own partner auth
// endpoints; anything else (a `path` param, mirroring api/proxy.js) is
// forwarded into HotelOps' /api/v1/marketplace/*.
export default async function handler(req, res) {
  const action = req.query.action;
  switch (action) {
    case 'login': return handleLogin(req, res);
    case 'logout': return handleLogout(req, res);
    case 'refresh': return handleRefresh(req, res);
    case 'me': return handleMe(req, res);
    default: return handleProxy(req, res);
  }
}

async function handleLogin(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const { email, password, role } = req.body || {};
  if (!email || !password) return fail(res, 400, 'Email and password are required', 'VALIDATION_ERROR');
  if (role !== 'owner' && role !== 'manager') return fail(res, 400, 'role must be "owner" or "manager"', 'VALIDATION_ERROR');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/${role}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.success) {
      const message = payload?.error?.message || 'Invalid email or password';
      const code = payload?.error?.code || 'INVALID_CREDENTIALS';
      return fail(res, upstream.status || 401, message, code);
    }
    const { access_token, refresh_token, user } = payload.data;
    setPartnerCookies(res, access_token, refresh_token);
    ok(res, { partner: user });
  } catch (err) {
    console.error('[partner/login]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const accessToken = getPartnerAccessToken(req);
  if (accessToken) {
    try {
      await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error('[partner/logout] upstream revocation failed:', err.message);
    }
  }
  clearPartnerCookies(res);
  ok(res, { message: 'Signed out' });
}

async function handleRefresh(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const refreshToken = getPartnerRefreshToken(req);
  if (!refreshToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload?.success) {
      clearPartnerCookies(res);
      return fail(res, 401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
    }
    setPartnerCookies(res, payload.data.access_token, payload.data.refresh_token);
    ok(res, { message: 'Refreshed' });
  } catch (err) {
    console.error('[partner/refresh]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}

async function handleMe(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');

  const accessToken = getPartnerAccessToken(req);
  if (!accessToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload = await upstream.json().catch(() => null);
    res.status(upstream.status).json(payload ?? { success: false, data: null, error: { message: 'Invalid response from HotelOps', code: 'BAD_UPSTREAM_RESPONSE' } });
  } catch (err) {
    console.error('[partner/me]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}

async function handleProxy(req, res) {
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : (req.query.path || '');
  const subPath = String(rawPath).replace(/^\/+/, '');
  if (!/^[a-zA-Z0-9/_-]*$/.test(subPath)) return fail(res, 400, 'Invalid path', 'VALIDATION_ERROR');

  const accessToken = getPartnerAccessToken(req);
  if (!accessToken) return fail(res, 401, 'Not signed in', 'UNAUTHENTICATED');

  const method = (req.method || 'GET').toUpperCase();
  const params = new URLSearchParams(req.query);
  params.delete('path');
  params.delete('action');
  const qs = params.toString();
  const targetPath = `/api/v1/marketplace/${subPath}${qs ? `?${qs}` : ''}`;

  const hasBody = method !== 'GET' && method !== 'HEAD';

  try {
    const upstream = await fetch(`${hotelOpsBaseUrl()}${targetPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: hasBody ? JSON.stringify(req.body || {}) : undefined,
    });
    const data = await upstream.json().catch(() => null);
    res.status(upstream.status).json(data ?? { success: false, data: null, error: { message: 'Invalid response from HotelOps', code: 'BAD_UPSTREAM_RESPONSE' } });
  } catch (err) {
    console.error('[partner/proxy]', err);
    fail(res, 502, 'Unable to reach HotelOps. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
}
