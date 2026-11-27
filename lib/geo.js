/*
 * Location search for "Where": turns what someone types ("peter odili
 * port harcourt") into a point on the map, then ranks hotels by distance.
 *
 * Lookups use OpenStreetMap Nominatim and are cached in
 * booqa_geocode_cache (HotelOps migration 049), so each phrase is looked up
 * once. Hotel coordinates come from HotelOps (worked out from each hotel's
 * own address).
 */

const UA = process.env.GEOCODER_USER_AGENT || 'Booqa/1.0 (+https://booqa.vercel.app)';
const CITY_KINDS = ['city', 'town', 'village', 'county', 'state', 'municipality', 'administrative', 'region'];
const normalise = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s,-]/gu, ' ').replace(/\s+/g, ' ').trim();

export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function nominatim(text) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ng&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const hit = (await res.json())[0];
    if (!hit) return { notFound: true };
    return {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      label: hit.display_name.split(',').slice(0, 3).join(',').trim(),
      kind: hit.addresstype || hit.type || null,
    };
  } catch {
    return null; // map service unreachable - caller falls back to text search
  }
}

/**
 * @returns { latitude, longitude, label, isCity } or null when the place
 * can't be found (or the map service is down).
 */
export async function resolvePlace(db, text) {
  const query = normalise(text);
  if (query.length < 3) return null;
  try {
    const { rows } = await db.query('SELECT latitude, longitude, label, kind, created_at FROM booqa_geocode_cache WHERE query = $1', [query]);
    const hit = rows[0];
    // A "not found" is retried after a week; a found place is kept.
    if (hit && (hit.latitude != null || Date.now() - new Date(hit.created_at) < 7 * 86400000)) {
      return hit.latitude == null ? null : { latitude: Number(hit.latitude), longitude: Number(hit.longitude), label: hit.label, isCity: CITY_KINDS.includes(hit.kind) };
    }
  } catch { /* cache unavailable - just look it up */ }

  const found = await nominatim(query);
  if (!found) return null;
  await db.query(
    `INSERT INTO booqa_geocode_cache (query, latitude, longitude, label, kind) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (query) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, label = EXCLUDED.label, kind = EXCLUDED.kind, created_at = now()`,
    [query, found.latitude ?? null, found.longitude ?? null, found.label ?? null, found.kind ?? null]
  ).catch(() => {});
  if (found.notFound) return null;
  return { latitude: found.latitude, longitude: found.longitude, label: found.label, isCity: CITY_KINDS.includes(found.kind) };
}

/**
 * Hotels near a place, nearest first, each with distance_km.
 * A street/area search widens 3 -> 6 -> 10 -> 20 km until it has at least
 * three hotels; a city search takes everything within 30 km. If nothing is
 * within the search radius, no hotels are returned. Distant hotels are not
 * included because they are misleading results for a place search.
 * Hotels whose map position is only city-level get `approximate: true`.
 */
export function nearby(hotels, place) {
  const located = hotels
    .filter((h) => h.latitude != null && h.longitude != null)
    .map((h) => ({ ...h, distance_km: Math.round(distanceKm(place, { latitude: Number(h.latitude), longitude: Number(h.longitude) }) * 10) / 10, approximate: h.geo_precision === 'city' }))
    .sort((a, b) => a.distance_km - b.distance_km);
  const steps = place.isCity ? [30] : [3, 6, 10, 20];
  let within = [];
  for (const r of steps) {
    within = located.filter((h) => h.distance_km <= r);
    if (within.length >= 3) break;
  }
  if (within.length) return { hotels: within, far: false };
  return { hotels: [], far: located.length > 0 };
}
