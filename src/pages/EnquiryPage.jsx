import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { authApi } from '../services/api';
import BizNav from '../components/business/BizNav';
import { BIZ_IMAGES } from '../data/businessImages';
import { track } from '../utils/analytics';

/*
 * The two enquiry forms from the corporate landing page, kept short:
 *   kind="corporate" - Request a demo
 *   kind="partner"   - Become a partner (hotels / serviced apartments)
 * Only what's needed to get back to someone; anything else (rooms needed,
 * property size...) goes in the optional message. Submits to
 * POST /api/enquiries, which saves it and then emails the Booqa team.
 */

const CONFIG = {
  corporate: {
    title: 'Request a demo',
    talkTitle: 'Talk to our team',
    subtitle: 'Leave your details and we\'ll get back to you shortly.',
    image: BIZ_IMAGES.steps.request,
    imageAlt: 'Two professionals planning at a laptop',
    orgKey: 'organization',
    orgLabel: 'Company name',
    extraKey: 'industry',
    extraLabel: 'Industry',
    extraOptions: ['Oil & Gas', 'Marine & Logistics', 'Engineering & Construction', 'Consulting & Professional Services', 'Training & Events', 'Other'],
    messagePlaceholder: 'e.g. About 20 rooms a month in Port Harcourt for project staff',
    submit: 'Request a demo',
    done: 'Thanks! We\'ll be in touch shortly to arrange your demo.',
  },
  partner: {
    title: 'Become a partner',
    subtitle: 'Tell us about your property and we\'ll get back to you shortly.',
    image: BIZ_IMAGES.steps.arrange,
    imageAlt: 'Business hotel room with a city view',
    orgKey: 'property_name',
    orgLabel: 'Hotel or property name',
    extraKey: 'location',
    extraLabel: 'Location',
    extraPlaceholder: 'e.g. GRA, Port Harcourt',
    messagePlaceholder: 'e.g. 40 rooms, serviced apartments, conference hall',
    submit: 'Send',
    done: 'Thanks! Our partnerships team will be in touch shortly.',
  },
};

const inputCls = (bad) => `w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors
  focus:outline-none focus:ring-4 focus:ring-primary-500/15 ${bad ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-primary-600'}`;

function Field({ label, error, optional, children }) {
  return (
    <label className="block">
      <span className="flex justify-between text-sm font-medium text-gray-800 mb-1.5">
        {label}
        {optional && <span className="font-normal text-gray-400">Optional</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1" role="alert">{error}</span>}
    </label>
  );
}

export default function EnquiryPage({ kind }) {
  const cfg = CONFIG[kind];
  const [params] = useSearchParams();
  const talk = kind === 'corporate' && params.get('topic') === 'talk';
  const [form, setForm] = useState({ [cfg.orgKey]: '', contact_name: '', email: '', phone: '', [cfg.extraKey]: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [serverError, setServerError] = useState('');
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    document.title = `${talk ? cfg.talkTitle : cfg.title} — Booqa`;
    window.scrollTo(0, 0);
  }, [cfg, talk]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form[cfg.orgKey].trim()) e[cfg.orgKey] = 'Required';
    if (!form.contact_name.trim()) e.contact_name = 'Required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a valid phone number';
    if (kind === 'partner' && !form.location.trim()) e.location = 'Required';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector(`[name="${Object.keys(e)[0]}"]`)?.focus();
      return;
    }
    setStatus('sending');
    setServerError('');
    try {
      await authApi.post('/business', { kind, ...form, website: honeypot }, { params: { path: 'enquiries' } });
      setStatus('sent');
      track('enquiry_submitted', { kind });
    } catch (err) {
      setStatus('idle');
      setServerError(err.response?.data?.error?.message || err.friendlyMessage || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <BizNav />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
        <div className="hidden lg:block rounded-3xl overflow-hidden aspect-[4/5] sticky top-24">
          <img src={cfg.image} alt={cfg.imageAlt} className="w-full h-full object-cover" />
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0 lg:pt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>

          {status === 'sent' ? (
            <div className="mt-16 text-center lg:text-left" role="status">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto lg:mx-0" strokeWidth={1.5} />
              <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-950">Thank you</h1>
              <p className="mt-3 text-gray-600">{cfg.done}</p>
              <Link to="/" className="mt-8 inline-flex bg-navy text-white font-semibold rounded-xl px-6 py-3">Back to Booqa</Link>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight text-gray-950">{talk ? cfg.talkTitle : cfg.title}</h1>
              <p className="mt-2 text-gray-600">{cfg.subtitle}</p>

              <form onSubmit={submit} noValidate className="mt-8 space-y-4">
                <Field label={cfg.orgLabel} error={errors[cfg.orgKey]}>
                  <input name={cfg.orgKey} value={form[cfg.orgKey]} onChange={set(cfg.orgKey)} className={inputCls(errors[cfg.orgKey])} autoComplete="organization" />
                </Field>
                <Field label="Your name" error={errors.contact_name}>
                  <input name="contact_name" value={form.contact_name} onChange={set('contact_name')} className={inputCls(errors.contact_name)} autoComplete="name" />
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Work email" error={errors.email}>
                    <input name="email" type="email" value={form.email} onChange={set('email')} className={inputCls(errors.email)} autoComplete="email" />
                  </Field>
                  <Field label="Phone" error={errors.phone}>
                    <input name="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputCls(errors.phone)} autoComplete="tel" placeholder="+234" />
                  </Field>
                </div>

                {cfg.extraOptions ? (
                  <Field label={cfg.extraLabel} optional>
                    <select name={cfg.extraKey} value={form[cfg.extraKey]} onChange={set(cfg.extraKey)} className={inputCls(false)}>
                      <option value="">Select</option>
                      {cfg.extraOptions.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </Field>
                ) : (
                  <Field label={cfg.extraLabel} error={errors[cfg.extraKey]}>
                    <input name={cfg.extraKey} value={form[cfg.extraKey]} onChange={set(cfg.extraKey)} className={inputCls(errors[cfg.extraKey])} placeholder={cfg.extraPlaceholder} />
                  </Field>
                )}

                <Field label="Message" optional>
                  <textarea name="message" rows={3} value={form.message} onChange={set('message')} className={`${inputCls(false)} resize-none`} placeholder={cfg.messagePlaceholder} />
                </Field>

                {/* Hidden from people; bots fill it in and are quietly ignored. */}
                <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                {serverError && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{serverError}</p>}

                <button type="submit" disabled={status === 'sending'}
                  className="w-full inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 disabled:opacity-60 text-white font-semibold rounded-xl px-6 py-3.5 transition-colors">
                  {status === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : cfg.submit}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  We only use your details to reply. <Link to="/privacy" className="underline">Privacy Policy</Link>
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
