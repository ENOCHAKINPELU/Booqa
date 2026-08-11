// Same { success, data, error } envelope as backend/utils/apiResponse.js -
// api/proxy already passes HotelOps' responses through in that shape, so
// the frontend's error handling (services/api.js reads error.friendlyMessage
// from response.data.error.message) works identically for Booqa's own
// auth endpoints.
function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data, error: null });
}

function fail(res, status, message, code = 'ERROR') {
  res.status(status).json({ success: false, data: null, error: { message, code } });
}

export { ok, fail };
