import { authApi } from './api';

// Booqa for Business - every call goes to the single api/business.js
// function with the route in ?path= (see that file for the route list).
// Built on authApi so an expired session refreshes itself silently.
const call = (method, path, data, params) =>
  authApi.request({ method, url: '/business', data, params: { ...(params || {}), path } }).then((r) => r.data.data);

export const biz = {
  me: () => call('get', 'me'),
  createOrg: (body) => call('post', 'org', body),
  updateOrg: (body) => call('patch', 'org', body),
  dashboard: () => call('get', 'dashboard'),
  // No sign-in needed - the landing page and public /hotels pages.
  publicHotels: (params) => call('get', 'public/hotels', null, params),
  publicHotel: (id) => call('get', `public/hotels/${id}`),
  availability: (id, params) => call('get', `public/hotels/${id}/availability`, null, params),
  team: () => call('get', 'team'),
  addMember: (body) => call('post', 'team', body),
  updateMember: (id, body) => call('patch', `team/${id}`, body),
  removeMember: (id) => call('delete', `team/${id}`),
  cancelInvite: (id) => call('delete', `team/invites/${id}`),
  requests: (status) => call('get', 'requests', null, status ? { status } : null),
  createRequest: (body) => call('post', 'requests', body),
  request: (id) => call('get', `requests/${id}`),
  matches: (id) => call('get', `requests/${id}/matches`),
  book: (id, hotel_id, room_type_id) => call('post', `requests/${id}/book`, { hotel_id, room_type_id }),
  startPayment: (id) => call('post', `requests/${id}/pay`),
  confirmPayment: (id) => call('post', `requests/${id}/confirm-payment`),
  cancel: (id, reason) => call('post', `requests/${id}/cancel`, { reason }),
  cancelQuote: (id) => call('get', `requests/${id}/cancel-quote`),
  ops: {
    requests: (status) => call('get', 'ops/requests', null, status ? { status } : null),
    request: (id) => call('get', `ops/requests/${id}`),
  },
};

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error?.message || err?.friendlyMessage || fallback;

export const errorCode = (err) => err?.response?.data?.error?.code;
