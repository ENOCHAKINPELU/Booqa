import axios from 'axios';

// Same-origin - the browser only ever talks to our own serverless proxy
// (api/proxy/[...path].js), never to HotelOps directly. No auth token to
// attach here: the proxy is what's credentialed against HotelOps.
// 30s, not 15s: `vercel dev`'s local function sandbox serializes concurrent
// invocations instead of running them in parallel (confirmed - 4 concurrent
// requests to this same proxy took up to ~14s total locally), so a burst of
// calls on page load (e.g. React StrictMode's double-effect) can comfortably
// exceed 15s even though each individual call is fast. Real deployed Vercel
// functions run pre-built and in true parallel (tens of ms, not seconds), so
// this is headroom for local dev, not a production concern.
const api = axios.create({
  baseURL: '/api/proxy',
  timeout: 30000,
});

// api/proxy.js is a flat file, not a [...path].js catch-all - `vercel dev`
// (this version, confirmed with a minimal repro route) 404s any catch-all
// request with more than one path segment, so nothing here can rely on
// the URL path to carry the target HotelOps route. Every call site still
// writes `api.get('/hotels/:id/room-types')` exactly as before; this
// interceptor is the only place that knows the real path travels as a
// `path` query param instead.
api.interceptors.request.use((config) => {
  const targetPath = (config.url || '').replace(/^\/+/, '');
  config.params = { ...(config.params || {}), path: targetPath };
  config.url = '';
  return config;
});

// Booqa's own account endpoints (api/auth/*, api/me.js) - separate base
// path from the HotelOps proxy above. Session is an httpOnly cookie, so
// there's no token to attach here either; withCredentials is defensive
// (same-origin requests already send cookies) rather than load-bearing.
export const authApi = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
});

function networkErrorMessage(error) {
  if (error.code === 'ECONNABORTED') return 'That took too long. Please try again.';
  return 'No internet connection. Please check your connection and try again.';
}

function attachFriendlyErrors(instance) {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      error.friendlyMessage = !error.response
        ? networkErrorMessage(error)
        : error.response.data?.error?.message || 'Something went wrong. Please try again.';
      return Promise.reject(error);
    }
  );
}

// Mirrors frontend/src/services/api.js's "handle 401 - refresh token,
// retry once" pattern for HotelOps staff, adapted for Booqa's guest
// sessions: the access-token cookie expires every 15 minutes by design
// (lib/auth.js), so a routine request hitting that boundary shouldn't
// interrupt the guest - it silently exchanges the refresh cookie for a
// fresh access token and retries, once. A concurrent burst of requests
// hitting 401 at the same moment shares a single in-flight refresh rather
// than each firing their own.
let refreshPromise = null;

function attachSilentRefresh(instance) {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      const isAuthEndpoint = config?.url?.startsWith('/auth/');
      if (response?.status !== 401 || isAuthEndpoint || config._retried) {
        return Promise.reject(error);
      }
      config._retried = true;

      if (!refreshPromise) {
        refreshPromise = instance.post('/auth/refresh').finally(() => { refreshPromise = null; });
      }
      try {
        await refreshPromise;
        return instance(config);
      } catch {
        return Promise.reject(error); // refresh itself failed - truly signed out
      }
    }
  );
}

attachSilentRefresh(authApi);
attachFriendlyErrors(api);
attachFriendlyErrors(authApi);

// A booking attempt (create reservation, confirm payment) needs the same
// key on every retry of that same attempt - generate once when the guest
// starts the step, not per HTTP call.
export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export default api;
