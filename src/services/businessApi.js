import { authApi } from './api';

// Booqa for Business - every call goes to the single api/business.js
// function with the route in ?path= (see that file for the route list).
// Built on authApi so an expired session refreshes itself silently.
const call = (method, path, data, params) =>
  authApi.request({ method, url: '/business', data, params: { ...(params || {}), path } }).then((r) => r.data.data);

export const biz = {
  me: () => call('get', 'me'),
  createOrg: (body) => call('post', 'org', body),
  dashboard: () => call('get', 'dashboard'),
  team: () => call('get', 'team'),
  addMember: (body) => call('post', 'team', body),
  updateMember: (id, body) => call('patch', `team/${id}`, body),
  removeMember: (id) => call('delete', `team/${id}`),
  requests: (status) => call('get', 'requests', null, status ? { status } : null),
  createRequest: (body) => call('post', 'requests', body),
  request: (id) => call('get', `requests/${id}`),
  approve: (id, option_id) => call('post', `requests/${id}/approve`, { option_id }),
  cancel: (id, reason) => call('post', `requests/${id}/cancel`, { reason }),
  ops: {
    requests: (status) => call('get', 'ops/requests', null, status ? { status } : null),
    request: (id) => call('get', `ops/requests/${id}`),
    addOption: (id, body) => call('post', `ops/requests/${id}/options`, body),
    removeOption: (id, optionId) => call('delete', `ops/requests/${id}/options/${optionId}`),
    setStatus: (id, body) => call('post', `ops/requests/${id}/status`, body),
  },
};

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error?.message || err?.friendlyMessage || fallback;
