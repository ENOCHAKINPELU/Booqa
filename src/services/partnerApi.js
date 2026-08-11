import axios from 'axios';

// Hotel-partner side of Booqa (Phase 4) — entirely separate session from
// the guest-facing `api`/`authApi` in ./api.js. See api/partner/*.js and
// lib/partnerAuth.js: the partner "session" is just HotelOps' own
// owner/manager JWT, held in Booqa-domain httpOnly cookies.

// Direct hits to Booqa's own partner auth endpoints (login/logout/refresh/me).
export const partnerAuthApi = axios.create({
  baseURL: '/api/partner',
  timeout: 30000,
  withCredentials: true,
});

// Marketplace calls (application, profile, analytics, settlements) — routed
// through api/partner/proxy.js, which forwards into HotelOps'
// /api/v1/marketplace/* using the partner's stored access token. Same
// `?path=` rewrite as the guest `api` client in ./api.js, and for the same
// `vercel dev` routing reason (see api/proxy.js's comment).
export const partnerApi = axios.create({
  baseURL: '/api/partner/proxy',
  timeout: 30000,
  withCredentials: true,
});

partnerApi.interceptors.request.use((config) => {
  const targetPath = (config.url || '').replace(/^\/+/, '');
  config.params = { ...(config.params || {}), path: targetPath };
  config.url = '';
  return config;
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

// Same "401 → silent refresh → retry once" shape as services/api.js's
// authApi, adapted for the partner cookie pair. Only attached to
// `partnerApi` (marketplace calls) — the auth endpoints themselves
// (login/refresh/logout) never retry through this path.
let refreshPromise = null;

partnerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config._retried) return Promise.reject(error);
    config._retried = true;

    if (!refreshPromise) {
      refreshPromise = partnerAuthApi.post('/refresh').finally(() => { refreshPromise = null; });
    }
    try {
      await refreshPromise;
      return partnerApi(config);
    } catch {
      return Promise.reject(error); // refresh itself failed — truly signed out
    }
  }
);

attachFriendlyErrors(partnerAuthApi);
attachFriendlyErrors(partnerApi);
