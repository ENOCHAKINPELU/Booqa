// All-in pricing: what a guest will actually pay - the hotel's room price
// plus Booqa's guest service fee (half the commission, migration 034).
//
// HotelOps returns the fee per hotel (guest_fee_percent on GET /hotels)
// and per room (guest_fee_amount on availability), computed with the same
// formula create_reservation charges, so a price shown here equals the
// amount on the payment page. When the fee isn't known (an older backend),
// these return null for the fee and callers say "+ service fee" rather
// than quietly showing a lower number as if it were final.

export function feeOn(amount, feePercent) {
  if (feePercent == null || amount == null) return null;
  return Math.round(Number(amount) * Number(feePercent)) / 100;
}

// One room type from the availability endpoint.
export function roomPricing(rt) {
  const room = Number(rt.total_amount || 0);
  const fee = rt.guest_fee_amount != null ? Number(rt.guest_fee_amount) : null;
  const nights = Number(rt.nights) || 1;
  const total = fee != null ? room + fee : room;
  return {
    room,
    fee,
    includesFee: fee != null,
    total,
    // Rounded to the naira: a per-night figure is for comparison; the
    // stay total is the exact amount charged.
    perNight: Math.round(total / nights),
  };
}

// Exact all-in cost of the cheapest room for a whole stay - the same sum
// the payment page will show, not perNight × nights (which can drift by
// a naira or two through rounding).
export function hotelStayTotal(hotel, nights) {
  if (hotel.from_price == null || !nights) return null;
  const room = Number(hotel.from_price) * nights;
  const fee = feeOn(room, hotel.guest_fee_percent);
  return fee != null ? room + fee : null;
}

// A hotel from GET /hotels: cheapest room per night, all-in when known.
export function hotelFromPrice(hotel) {
  if (hotel.from_price == null) return null;
  const fee = feeOn(hotel.from_price, hotel.guest_fee_percent);
  return {
    perNight: fee != null ? Math.round(Number(hotel.from_price) + fee) : Number(hotel.from_price),
    includesFee: fee != null,
  };
}
