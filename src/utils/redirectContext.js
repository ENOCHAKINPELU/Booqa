// A guest can land on /login or /signup two ways: they clicked "Sign in"
// on purpose, or they got bounced here mid-task (viewing a hotel, booking,
// checking their bookings) by a page-level auth gate. The second case reads
// as a wall with no explanation unless the page says why they're there -
// this turns the `redirect` path into that one-line reason.
function reasonFor(path) {
  if (!path) return null;
  if (/^\/hotels\/[^/]+\/book/.test(path)) return 'to complete your booking';
  if (/^\/hotels\/[^/]+/.test(path)) return 'to see rooms, pricing and book your stay';
  if (path.startsWith('/account/bookings')) return 'to view your bookings';
  if (path.startsWith('/account/saved')) return 'to view your saved hotels';
  if (path.startsWith('/account')) return 'to view your account';
  return null;
}

export function loginSubtitle(redirectTo) {
  const reason = reasonFor(redirectTo);
  return reason ? `Sign in ${reason}.` : 'Welcome back.';
}

export function signupSubtitle(redirectTo) {
  const reason = reasonFor(redirectTo);
  return reason ? `Create an account ${reason}.` : 'Faster checkout and a place to manage every booking.';
}
