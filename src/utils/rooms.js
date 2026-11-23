// Small, honest summaries of a room type's facts - shared by the room
// comparison table and the room cards so the two never disagree. Each
// returns null when the hotel hasn't told us, and the UI shows "Not
// listed" instead of guessing (the opposite of a booking site that
// invents a "Free cancellation" badge).

export function sleepsLabel(rt) {
  const a = Number(rt.capacity_adults || 0);
  const c = Number(rt.capacity_children || 0);
  if (!a) return null;
  return `${a} adult${a === 1 ? '' : 's'}${c ? ` + ${c} child${c === 1 ? '' : 'ren'}` : ''}`;
}

// Breakfast only counts as included when the hotel listed it as a room
// amenity - there's no separate meal-plan field to read yet.
export function includesBreakfast(rt) {
  return (rt.amenities || []).some((a) => /breakfast/i.test(String(a)));
}

export function cancellationLabel(rt) {
  const hours = Number(rt.free_cancellation_hours);
  if (Number.isFinite(hours) && hours > 0) {
    return hours % 24 === 0
      ? `Free cancellation up to ${hours / 24} day${hours === 24 ? '' : 's'} before check-in`
      : `Free cancellation up to ${hours}h before check-in`;
  }
  return rt.cancellation_policy || null;
}

export function isFreeCancellation(rt) {
  const hours = Number(rt.free_cancellation_hours);
  return Number.isFinite(hours) && hours > 0;
}
