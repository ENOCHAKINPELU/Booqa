import crypto from 'crypto';

// Server-side calls from Booqa to HotelOps' booking-api, signed exactly
// like api/proxy.js does for the browser (HotelOps middleware/bookingAuth.js
// checks X-Booqa-Key + an HMAC of timestamp.method.path.body).

export class HotelOpsError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sign(secret, timestamp, method, path, body) {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${method.toUpperCase()}.${path}.${body || ''}`).digest('hex');
}

export async function hotelops(method, path, { query, body, idempotencyKey } = {}) {
  const { HOTELOPS_API_BASE_URL, BOOQA_API_KEY, BOOQA_HMAC_SECRET } = process.env;
  if (!HOTELOPS_API_BASE_URL || !BOOQA_API_KEY || !BOOQA_HMAC_SECRET) {
    throw new HotelOpsError(500, 'Booking service is not configured', 'PROXY_NOT_CONFIGURED');
  }
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== '')).toString() : '';
  const fullPath = `/booking-api/v1/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
  const bodyString = body ? JSON.stringify(body) : '';
  const timestamp = Date.now().toString();
  const headers = {
    'Content-Type': 'application/json',
    'X-Booqa-Key': BOOQA_API_KEY,
    'X-Booqa-Timestamp': timestamp,
    'X-Booqa-Signature': sign(BOOQA_HMAC_SECRET, timestamp, method, fullPath, bodyString),
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  let res;
  try {
    res = await fetch(`${HOTELOPS_API_BASE_URL}${fullPath}`, { method, headers, body: body ? bodyString : undefined });
  } catch {
    throw new HotelOpsError(502, 'Could not reach the booking service. Please try again.', 'UPSTREAM_UNREACHABLE');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new HotelOpsError(res.status || 502, json?.error?.message || 'Booking service error', json?.error?.code || 'UPSTREAM_ERROR');
  }
  return json.data;
}
