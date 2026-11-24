/*
 * Matches a company's accommodation request against hotels' LIVE
 * availability from HotelOps.
 *
 * A hotel FITS when it is in the requested city, in the requested area
 * (when both sides name one), has enough rooms of one room type free for
 * the whole stay, and costs no more than the budget per room per night.
 * Prices are all-in (room + Booqa service fee), the same amount paid.
 *
 * If nothing fits, the closest hotels are returned instead, each with the
 * plain-language reasons it falls short ("₦6,000 over budget", "Only 2 of
 * 4 rooms free"), so the company can decide whether to adjust.
 *
 * Pure function: no I/O - the caller supplies hotels and availability.
 */

const norm = (s) => String(s || '').trim().toLowerCase();
const naira = (n) => `₦${Math.round(n).toLocaleString('en-NG')}`;

function sameCity(hotel, city) {
  const c = norm(city);
  return !!c && (norm(hotel.city) === c || norm(hotel.state) === c);
}

function areaStatus(hotel, area) {
  if (!norm(area)) return 'any';
  if (!norm(hotel.area)) return 'unknown';
  const a = norm(area);
  const h = norm(hotel.area);
  return h.includes(a) || a.includes(h) ? 'match' : 'mismatch';
}

// One room type's all-in price per room per night, from the availability
// endpoint's total_amount + guest_fee_amount for the whole stay.
export function perNightAllIn(roomType) {
  const nights = Number(roomType.nights) || 1;
  const stay = Number(roomType.total_amount || 0) + Number(roomType.guest_fee_amount || 0);
  return Math.round((stay / nights) * 100) / 100;
}

export function stayAllIn(roomType) {
  return Number(roomType.total_amount || 0) + Number(roomType.guest_fee_amount || 0);
}

function bestRoomType(roomTypes, rooms) {
  const enough = roomTypes.filter((rt) => rt.available_count >= rooms);
  const pool = enough.length ? enough : roomTypes;
  return [...pool].sort((a, b) => (enough.length
    ? perNightAllIn(a) - perNightAllIn(b)
    : b.available_count - a.available_count || perNightAllIn(a) - perNightAllIn(b)))[0];
}

/**
 * @param request  { city, area, rooms, budget_per_night }
 * @param hotels   GET /hotels rows
 * @param availability  Map hotelId -> availability rows (room types)
 * @returns { fits: Match[], close: Match[] }
 */
export function matchHotels(request, hotels, availability) {
  const rooms = Number(request.rooms) || 1;
  const budget = request.budget_per_night ? Number(request.budget_per_night) : null;
  const candidates = [];

  for (const hotel of hotels) {
    const roomTypes = (availability.get(hotel.id) || []).filter((rt) => rt.available_count > 0);
    if (!roomTypes.length) continue;
    const rt = bestRoomType(roomTypes, rooms);
    const perNight = perNightAllIn(rt);
    const city = sameCity(hotel, request.city);
    const area = areaStatus(hotel, request.area);
    const short = Math.max(0, rooms - rt.available_count);
    const over = budget ? Math.max(0, perNight - budget) : 0;

    const reasons = [];
    let score = 0;
    if (!city) { reasons.push(`In ${hotel.city || hotel.state || 'another city'}, not ${request.city}`); score += 100; }
    if (area === 'mismatch') { reasons.push(`In ${hotel.area}, not ${request.area}`); score += 15; }
    if (short) { reasons.push(`Only ${rt.available_count} of ${rooms} rooms free`); score += 40 * (short / rooms); }
    if (over) { reasons.push(`${naira(over)} over budget per night`); score += Math.min(100, (over / budget) * 100); }

    const notes = [];
    if (area === 'unknown') notes.push('Hotel has not listed its area');

    candidates.push({
      fits: city && area !== 'mismatch' && !short && !over,
      score,
      reasons,
      notes,
      hotel: {
        id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        state: hotel.state,
        area: hotel.area || null,
        address: hotel.address || null,
        photo: hotel.photos?.[0] || hotel.cover_image_url || null,
        facilities: (hotel.facilities || []).map((f) => f.name || f.key),
        avg_rating: hotel.avg_rating ?? null,
      },
      room_type: {
        id: rt.room_type_id,
        name: rt.name,
        capacity_adults: rt.capacity_adults,
        bed_type: rt.bed_type || null,
        available_count: rt.available_count,
      },
      per_night: perNight,
      total: stayAllIn(rt) * Math.min(rooms, rt.available_count),
      rooms_bookable: Math.min(rooms, rt.available_count),
    });
  }

  const fits = candidates.filter((c) => c.fits).sort((a, b) => a.per_night - b.per_night);
  const close = fits.length ? [] : candidates.sort((a, b) => a.score - b.score || a.per_night - b.per_night).slice(0, 5);
  return { fits, close };
}
