const KEY = 'booqa_recently_viewed';
const MAX_ITEMS = 6;

// Client-side only, on purpose - this is browsing history, not booking
// data, and doesn't need an account or a server round trip to be useful.
export function addRecentlyViewed(hotel) {
  if (!hotel?.id) return;
  try {
    const existing = getRecentlyViewed().filter((h) => h.id !== hotel.id);
    const next = [{ id: hotel.id, name: hotel.name, city: hotel.city, state: hotel.state, logo_url: hotel.logo_url }, ...existing].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing / storage disabled - recently-viewed just won't persist.
  }
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
