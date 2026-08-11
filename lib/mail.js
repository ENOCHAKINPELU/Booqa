import nodemailer from 'nodemailer';

// Two delivery paths, tried in order. MailerSend is preferred (REST API,
// no persistent connection), but a trial MailerSend account can reject
// sends to unverified recipients - confirmed live while testing Slice 1
// ("reached trial account unique recipients limit"). SMTP is a genuinely
// separate delivery path (HotelOps' own mail.hotelops.ng, not MailerSend's
// SMTP endpoint), so it's a real fallback, not the same limit through a
// different door. Ported from backend/config/mailer.js's dual-path shape.

const FROM_NAME = 'Booqa';
const FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || 'noreply@booqa.ng';

let smtpTransporter = null;
function getSmtpTransporter() {
  if (!smtpTransporter) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }
  return smtpTransporter;
}

async function sendWithMailerSend({ to, toName, subject, html, text }) {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to, name: toName || undefined }],
      subject,
      html,
      text,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const err = new Error(payload.message || `MailerSend HTTP ${response.status}`);
    err.provider = 'mailersend';
    throw err;
  }
}

async function sendWithSmtp({ to, toName, subject, html, text }) {
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  await getSmtpTransporter().sendMail({
    from: `"${FROM_NAME}" <${fromEmail}>`,
    to: toName ? `"${toName}" <${to}>` : to,
    subject,
    html,
    text,
  });
}

async function sendMail(options) {
  const hasMailerSend = !!process.env.MAILERSEND_API_KEY;
  const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!hasMailerSend && !hasSmtp) {
    console.warn('[mail] No email provider configured - skipped:', options.subject, '->', options.to);
    return;
  }

  if (hasMailerSend) {
    try {
      await sendWithMailerSend(options);
      return;
    } catch (err) {
      console.warn('[mail] MailerSend failed, falling back to SMTP:', err.message);
      if (!hasSmtp) { console.error('[mail] No SMTP fallback configured - email not sent.'); return; }
    }
  }

  try {
    await sendWithSmtp(options);
  } catch (err) {
    console.error('[mail] SMTP send also failed:', err.message);
  }
}

function appUrl() {
  return process.env.PUBLIC_APP_URL || 'http://localhost:5174';
}

function sendVerificationEmail(guest, rawToken) {
  const link = `${appUrl()}/verify-email?token=${rawToken}`;
  return sendMail({
    to: guest.email,
    toName: guest.full_name,
    subject: 'Verify your Booqa account',
    html: `<p>Hi ${guest.full_name.split(' ')[0]},</p><p>Confirm your email to finish setting up your Booqa account:</p><p><a href="${link}">${link}</a></p><p>This link expires in 24 hours.</p>`,
    text: `Confirm your email: ${link}`,
  });
}

function sendPasswordResetEmail(guest, rawToken) {
  const link = `${appUrl()}/reset-password?token=${rawToken}`;
  return sendMail({
    to: guest.email,
    toName: guest.full_name,
    subject: 'Reset your Booqa password',
    html: `<p>Hi ${guest.full_name.split(' ')[0]},</p><p>Reset your password here:</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email - this link expires in 1 hour.</p>`,
    text: `Reset your password: ${link}`,
  });
}

export { sendMail, sendVerificationEmail, sendPasswordResetEmail };
