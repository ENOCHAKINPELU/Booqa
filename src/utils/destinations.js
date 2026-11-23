// Booqa covers Nigeria; which cities appear is decided by where hotels
// are actually live, not by a hard-coded list. A new city shows up in the
// "Where" pickers and Destinations the moment its first hotel goes live.

const norm = (s) => String(s || '').trim().toLowerCase();

// The place a hotel is in, for grouping: its city, else its state.
export const placeOf = (hotel) => (hotel.city || hotel.state || '').trim();

/** [{ name, state, count }] - most hotels first. */
export function destinationsFrom(hotels) {
  const byPlace = new Map();
  for (const h of hotels) {
    const name = placeOf(h);
    if (!name) continue;
    const key = norm(name);
    const entry = byPlace.get(key) || { name, state: h.state && norm(h.state) !== key ? h.state : null, count: 0 };
    entry.count += 1;
    byPlace.set(key, entry);
  }
  return [...byPlace.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Does this hotel match a chosen place? Matches the city or the state. */
export function inPlace(hotel, place) {
  if (!place) return true;
  const p = norm(place);
  return norm(hotel.city) === p || norm(hotel.state) === p;
}

/** "Port Harcourt" / "Port Harcourt and Lagos" / "Port Harcourt, Lagos and Abuja". */
export function listPlaces(names) {
  if (names.length <= 1) return names[0] || '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
