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

/** r = request detail (hotel_name, reservations, total_cost, ...); to = [{ email, name }] */
export async function sendBookingConfirmed(r, to) {
  const link = `${appUrl()}/business/requests/${r.id}`;
  const rooms = (r.reservations || []).map((res, i) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#555">Room ${i + 1}${res.guest_name ? ` · ${esc(res.guest_name)}` : ''}</td><td style="padding:4px 0;font-family:monospace;font-weight:bold">${esc(res.booking_reference)}</td></tr>`).join('');
  const html = layout(`Booking confirmed at ${r.hotel_name}`, `
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Reference', r.reference)}
      ${row('Hotel', `${r.hotel_name}${r.room_type_name ? ` · ${r.room_type_name}` : ''}`)}
      ${row('Dates', `${fmt(r.check_in)} – ${fmt(r.check_out)} (${r.nights} night${r.nights === 1 ? '' : 's'})`)}
      ${r.project ? row('Project', r.project) : ''}
      ${row('Total paid', naira(r.total_cost))}
    </table>
    <p style="margin:18px 0 6px;font-size:14px;font-weight:600">Booking references (show at the front desk)</p>
    <table style="font-size:14px;border-collapse:collapse">${rooms}</table>`, { href: link, label: 'View booking' });
  const text = `Booking confirmed at ${r.hotel_name}\n${r.reference} · ${fmt(r.check_in)} – ${fmt(r.check_out)}\nTotal paid: ${naira(r.total_cost)}\n\n${(r.reservations || []).map((res, i) => `Room ${i + 1}: ${res.booking_reference}`).join('\n')}\n\n${link}`;
  await Promise.all(to.map((p) => sendMail({ to: p.email, toName: p.name, subject: `Booking confirmed · ${r.hotel_name} · ${r.reference}`, html, text })));
}

export async function sendBookingCancelled(r, to, { refunded }) {
  const link = `${appUrl()}/business/requests/${r.id}`;
  const html = layout(`Booking cancelled${r.hotel_name ? ` at ${r.hotel_name}` : ''}`, `
    <table style="font-size:14px;border-collapse:collapse">
      ${row('Reference', r.reference)}
      ${row('Dates', `${fmt(r.check_in)} – ${fmt(r.check_out)}`)}
      ${r.cancelled_reason ? row('Reason', r.cancelled_reason) : ''}
    </table>
    ${refunded ? '<p style="font-size:14px">Your payment is being refunded to the original payment method. Refunds usually arrive within a few working days.</p>' : ''}`,
  { href: link, label: 'View request' });
  await Promise.all(to.map((p) => sendMail({
    to: p.email, toName: p.name, subject: `Booking cancelled · ${r.reference}`, html,
    text: `Booking ${r.reference} was cancelled.${refunded ? ' Your payment is being refunded.' : ''}\n${link}`,
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
