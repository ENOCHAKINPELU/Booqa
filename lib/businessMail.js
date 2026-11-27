import { sendMail } from './mail.js';

/*
 * Booqa for Business emails. One summary per booking - never one per
 * room. Failures are logged by sendMail and never break the action that
 * triggered them.
 */

const appUrl = () => process.env.PUBLIC_APP_URL || 'https://booqa.vercel.app';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const fmt = (iso) => new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function layout(title, bodyHtml, cta) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <p style="color:#10308F;font-weight:bold;font-size:18px;margin:0 0 20px">Booqa</p>
    <h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
    ${bodyHtml}
    ${cta ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#10308F;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;font-size:14px">${esc(cta.label)}</a></p>` : ''}
    <p style="color:#999;font-size:12px;margin-top:28px">Booqa · Business accommodation, managed in one place.</p>
  </div>`;
}

const row = (k, v) => `<tr><td style="padding:5px 12px 5px 0;color:#777;vertical-align:top">${esc(k)}</td><td style="padding:5px 0;font-weight:600">${esc(v)}</td></tr>`;

/** A room category's cancellation policy in words (same wording as the app). */
export function policyText(hours, feePercent) {
  if (hours == null || !Number(feePercent)) return 'Free cancellation any time';
  return `Free cancellation until ${hours} hours before check-in. After that the hotel keeps ${Number(feePercent)}% of the room price and the Booqa fee is not refunded.`;
}

// One line per distinct policy in a booking (rooms may be in different categories).
const policyLines = (reservations) => [...new Set((reservations || []).map((res) => {
  const text = policyText(res.free_cancellation_hours, res.cancellation_fee_percent);
  return res.room_type_name ? `${res.room_type_name}: ${text}` : text;
}))];

/** r = request detail (hotel_name, reservations, total_cost, ...); to = [{ email, name }] */
export async function sendBookingConfirmed(r, to) {
  const link = `${appUrl()}/business/requests/${r.id}`;
  const companyFee = (r.reservations || []).reduce((sum, res) => sum + Number(res.company_fee || 0), 0);
  const rooms = (r.reservations || []).map((res, i) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#555">Room ${esc(res.room_number || i + 1)}${res.room_type_name ? ` · ${esc(res.room_type_name)}` : ''}${res.guest_name ? ` · ${esc(res.guest_name)}` : ''}</td><td style="padding:4px 0;font-family:monospace;font-weight:bold">${esc(res.booking_reference)}</td></tr>`).join('');
  const html = layout(`Booking confirmed at ${r.hotel_name}`, `
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Reference', r.reference)}
      ${row('Hotel', `${r.hotel_name}${r.room_type_name ? ` · ${r.room_type_name}` : ''}`)}
      ${row('Dates', `${fmt(r.check_in)} – ${fmt(r.check_out)} (${r.nights} night${r.nights === 1 ? '' : 's'})`)}
      ${r.project ? row('Project', r.project) : ''}
      ${companyFee ? row('Booqa company fee', naira(companyFee)) : ''}
      ${row('Total paid', naira(r.total_cost))}
    </table>
    <p style="margin:18px 0 6px;font-size:14px;font-weight:600">Booking references (show at the front desk)</p>
    <table style="font-size:14px;border-collapse:collapse">${rooms}</table>
    <p style="margin:18px 0 6px;font-size:14px;font-weight:600">Cancellation policy</p>
    ${policyLines(r.reservations).map((l) => `<p style="font-size:13px;color:#555;margin:2px 0">${esc(l)}</p>`).join('')}
    <p style="font-size:13px;margin-top:14px"><a href="${link}/receipt" style="color:#10308F">Download the receipt</a></p>`, { href: link, label: 'View booking' });
  const text = `Booking confirmed at ${r.hotel_name}\n${r.reference} · ${fmt(r.check_in)} – ${fmt(r.check_out)}${companyFee ? `\nBooqa company fee: ${naira(companyFee)}` : ''}\nTotal paid: ${naira(r.total_cost)}\n\n${(r.reservations || []).map((res, i) => `Room ${res.room_number || i + 1}: ${res.booking_reference}`).join('\n')}\n\n${link}`;
  await Promise.all(to.map((p) => sendMail({ to: p.email, toName: p.name, subject: `Booking confirmed · ${r.hotel_name} · ${r.reference}`, html, text })));
}

/** To one travelling guest: where they're staying and their own reference. */
export async function sendGuestStay(r, hotel, guest, reservation) {
  const address = [hotel?.address, hotel?.area, hotel?.city || r.city, hotel?.state].filter(Boolean).join(', ');
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.hotel_name}, ${address}`)}`;
  const times = [hotel?.check_in_time && `Check-in from ${hotel.check_in_time}`, hotel?.check_out_time && `check-out by ${hotel.check_out_time}`].filter(Boolean).join(', ');
  const html = layout(`Your stay at ${r.hotel_name}`, `
    <p style="font-size:14px;line-height:1.5">Hello ${esc(guest.name)}, ${esc(r.org_name)} has booked a room for you.</p>
    <p style="font-size:14px;margin:16px 0 4px;color:#555">Show this reference at the front desk</p>
    <p style="font-size:26px;font-family:monospace;font-weight:bold;margin:0 0 16px;color:#10308F">${esc(reservation.booking_reference)}</p>
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Hotel', `${r.hotel_name}${reservation.room_type_name || r.room_type_name ? ` · ${reservation.room_type_name || r.room_type_name}` : ''}`)}
      ${reservation.room_number ? row('Room number', reservation.room_number) : ''}
      ${address ? row('Address', address) : ''}
      ${row('Dates', `${fmt(r.check_in)} – ${fmt(r.check_out)} (${r.nights} night${r.nights === 1 ? '' : 's'})`)}
      ${times ? row('Times', times) : ''}
      ${hotel?.phone ? row('Hotel phone', hotel.phone) : ''}
    </table>
    <p style="font-size:13px;color:#555;margin-top:16px">Your room is paid for by ${esc(r.org_name)}. You may be asked for ID at check-in.</p>`,
  { href: map, label: 'Open in Google Maps' });
  const text = `Your stay at ${r.hotel_name}\nBooking reference: ${reservation.booking_reference}\n${address}\n${fmt(r.check_in)} – ${fmt(r.check_out)}\n${times}\nBooked and paid by ${r.org_name}.\nMap: ${map}`;
  await sendMail({ to: guest.email, toName: guest.name, subject: `Your stay at ${r.hotel_name} · ${fmt(r.check_in)}`, html, text });
}

export async function sendGuestCancelled(r, guest, reservation) {
  const html = layout(`Your stay at ${r.hotel_name} is cancelled`, `
    <p style="font-size:14px;line-height:1.5">Hello ${esc(guest.name)}, ${esc(r.org_name)} has cancelled your room at ${esc(r.hotel_name)} for ${esc(fmt(r.check_in))} – ${esc(fmt(r.check_out))} (reference ${esc(reservation.booking_reference)}).</p>
    <p style="font-size:14px;line-height:1.5">If you weren't expecting this, please check with your company.</p>`);
  await sendMail({
    to: guest.email, toName: guest.name, subject: `Cancelled: your stay at ${r.hotel_name}`, html,
    text: `${r.org_name} cancelled your room at ${r.hotel_name} (${fmt(r.check_in)} – ${fmt(r.check_out)}, ref ${reservation.booking_reference}).`,
  });
}

/** refund (optional) = { refund_amount, hotel_fee, booqa_fee_kept, late } from HotelOps. */
export async function sendBookingCancelled(r, to, { refunded, refund = null }) {
  const link = `${appUrl()}/business/requests/${r.id}`;
  let refundHtml = '';
  let refundText = '';
  if (refunded && refund) {
    const lines = refund.late
      ? [row('Refund', naira(refund.refund_amount)), row('Hotel cancellation fee', naira(refund.hotel_fee)), row('Booqa fee (not refunded)', naira(refund.booqa_fee_kept))]
      : [row('Refund', `${naira(refund.refund_amount)} (full refund)`)];
    refundHtml = `<table style="font-size:14px;border-collapse:collapse;margin-top:12px">${lines.join('')}</table>
      ${refund.refund_amount > 0 ? '<p style="font-size:14px">The refund goes back to the original payment method and usually arrives within a few working days.</p>' : '<p style="font-size:14px">This booking was cancelled inside the hotel\'s cancellation window, so there is nothing to refund.</p>'}`;
    refundText = refund.refund_amount > 0 ? ` Refund: ${naira(refund.refund_amount)}${refund.late ? ` (hotel cancellation fee ${naira(refund.hotel_fee)}, Booqa fee ${naira(refund.booqa_fee_kept)} not refunded)` : ''}.` : ' Nothing to refund (cancelled inside the hotel cancellation window).';
  } else if (refunded) {
    refundHtml = '<p style="font-size:14px">Your payment is being refunded to the original payment method. Refunds usually arrive within a few working days.</p>';
    refundText = ' Your payment is being refunded.';
  }
  const html = layout(`Booking cancelled${r.hotel_name ? ` at ${r.hotel_name}` : ''}`, `
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Reference', r.reference)}
      ${row('Dates', `${fmt(r.check_in)} – ${fmt(r.check_out)}`)}
      ${r.cancelled_reason ? row('Reason', r.cancelled_reason) : ''}
    </table>
    ${refundHtml}`,
  { href: link, label: 'View request' });
  await Promise.all(to.map((p) => sendMail({
    to: p.email, toName: p.name, subject: `Booking cancelled · ${r.reference}`, html,
    text: `Booking ${r.reference} was cancelled.${refundText}\n${link}`,
  })));
}

export async function sendTeamInvite({ email, orgName, inviterName, role }) {
  const link = `${appUrl()}/signup?redirect=${encodeURIComponent('/business')}`;
  const html = layout(`Join ${orgName} on Booqa`, `
    <p style="font-size:14px;line-height:1.5">${esc(inviterName || 'A colleague')} has invited you to ${esc(orgName)}'s Booqa workspace${role === 'admin' ? ' as an admin' : ''}, where your company books and tracks business accommodation.</p>
    <p style="font-size:14px;line-height:1.5">Create your account with <strong>${esc(email)}</strong> and verify your email - you'll be added to the team automatically.</p>`,
  { href: link, label: 'Create your account' });
  await sendMail({ to: email, subject: `Join ${orgName} on Booqa`, html, text: `${inviterName || 'A colleague'} invited you to ${orgName} on Booqa. Sign up with ${email}: ${link}` });
}
