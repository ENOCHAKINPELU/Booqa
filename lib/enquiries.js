import * as db from './db.js';
import { sendMail } from './mail.js';
import { ok, fail } from './respond.js';

// POST /api/business?path=enquiries - "Request a Corporate Demo" and "Become an
// Accommodation Partner" from the corporate landing page.
//
// Saved first (booqa_enquiries, HotelOps migration 045), THEN emailed to
// the Booqa team at BOOQA_ENQUIRY_EMAIL - so a failed or unconfigured
// email never loses an enquiry; the row's `emailed` flag says which ones
// still need following up from the database.

const KINDS = {
  corporate: {
    label: 'Corporate demo request',
    org: 'organization',
    fields: { industry: 'Industry', requirements: 'Estimated accommodation requirements' },
  },
  partner: {
    label: 'Accommodation partner enquiry',
    org: 'property_name',
    fields: { location: 'Property location', property_type: 'Accommodation type', room_capacity: 'Available room capacity' },
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max = 300) => (v == null ? '' : String(v).trim().slice(0, max));
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Best-effort flood guard per warm instance: 5 enquiries / 10 min / IP.
const recent = global.__booqaEnquiryHits || (global.__booqaEnquiryHits = new Map());
function tooMany(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > 5;
}

export async function handleEnquiry(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  const body = req.body || {};

  // Honeypot: a hidden field people never see. Bots fill it; pretend success.
  if (clean(body.website)) return ok(res, { received: true });

  const kind = KINDS[body.kind] ? body.kind : null;
  if (!kind) return fail(res, 400, 'Unknown enquiry type', 'VALIDATION_ERROR');
  const spec = KINDS[kind];

  const organization = clean(body[spec.org], 200);
  const contact_name = clean(body.contact_name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 3000);
  const details = Object.fromEntries(Object.keys(spec.fields).map((k) => [k, clean(body[k], 300)]).filter(([, v]) => v));

  const missing = [];
  if (!organization) missing.push(kind === 'partner' ? 'hotel or property name' : 'organization name');
  if (!contact_name) missing.push('your name');
  if (!EMAIL_RE.test(email)) missing.push('a valid business email');
  if (!phone) missing.push('phone number');
  if (missing.length) return fail(res, 400, `Please add ${missing.join(', ')}.`, 'VALIDATION_ERROR');

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (tooMany(ip)) return fail(res, 429, 'Too many enquiries from this connection. Please try again shortly.', 'RATE_LIMITED');

  let id;
  try {
    const { rows } = await db.query(
      `INSERT INTO booqa_enquiries (kind, organization, contact_name, email, phone, details, message, source_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [kind, organization, contact_name, email, phone, JSON.stringify(details), message || null, ip || null]
    );
    id = rows[0].id;
  } catch (err) {
    console.error('[enquiries] save failed:', err.message);
    return fail(res, 500, 'We could not send your enquiry right now. Please try again or email us directly.', 'SAVE_FAILED');
  }

  const to = process.env.BOOQA_ENQUIRY_EMAIL;
  // sendMail() quietly skips when no provider is configured - only claim
  // "emailed" when one actually is.
  const canEmail = !!(process.env.MAILERSEND_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
  if (to && canEmail) {
    const rowsHtml = [
      [kind === 'partner' ? 'Property' : 'Organization', organization],
      ['Contact', contact_name], ['Email', email], ['Phone', phone],
      ...Object.entries(details).map(([k, v]) => [spec.fields[k], v]),
      ['Message', message || '-'],
    ].map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`).join('');
    try {
      await sendMail({
        to,
        toName: 'Booqa team',
        subject: `${spec.label}: ${organization}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a"><p style="color:#10308F;font-weight:bold">New ${escapeHtml(spec.label.toLowerCase())}</p><table>${rowsHtml}</table><p style="color:#999;font-size:12px">Reference ${id}</p></div>`,
        text: `${spec.label}\n\n${organization}\n${contact_name} · ${email} · ${phone}\n${Object.entries(details).map(([k, v]) => `${spec.fields[k]}: ${v}`).join('\n')}\n\n${message || ''}\n\nRef ${id}`,
      });
      await db.query('UPDATE booqa_enquiries SET emailed = true WHERE id = $1', [id]).catch(() => {});
    } catch (err) {
      console.error('[enquiries] email failed (enquiry saved):', id, err.message);
    }
  } else {
    console.warn('[enquiries] BOOQA_ENQUIRY_EMAIL or mail provider not set - enquiry saved, not emailed:', id);
  }

  return ok(res, { received: true, reference: String(id).slice(0, 8).toUpperCase() }, 201);
}
