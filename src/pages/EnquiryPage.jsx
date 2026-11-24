import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Building2, Hotel } from 'lucide-react';
import { authApi } from '../services/api';
import BizNav from '../components/business/BizNav';
import BizFooter from '../components/business/BizFooter';
import { track } from '../utils/analytics';

/*
 * The two conversion paths from the corporate landing page:
 *   kind="corporate" - Request a Demo -> team follow-up -> demo -> onboarding
 *   kind="partner"   - Become a Partner -> property verification -> rates -> onboarding
 * Submits to POST /api/enquiries (saved, then emailed to the Booqa team).
 */

const INDUSTRIES = ['Oil & Gas', 'Marine & Logistics', 'Engineering & Construction', 'EPC & Oilfield Services', 'Consulting & Professional Services', 'Corporate Organization', 'Training & Event Management', 'Other'];
const REQUIREMENTS = ['1–10 room nights a month', '11–50 room nights a month', '51–200 room nights a month', 'More than 200 room nights a month', 'Project-based / not sure yet'];
const PROPERTY_TYPES = ['Hotel', 'Serviced apartments', 'Guest house', 'Short-let apartments', 'Other'];

const CONFIG = {
  corporate: {
    icon: Building2,
    eyebrow: 'Request a corporate demo',
    title: 'See how Booqa can manage your organization\'s accommodation.',
    intro: 'Tell us a little about your organization. A member of the Booqa team will contact you to arrange a demonstration.',
    next: ['We review your requirements', 'A Booqa specialist contacts you', 'Product demonstration', 'Corporate onboarding'],
    submit: 'Request a Demo',
    done: 'Thank you. The Booqa team will contact you shortly to arrange your demonstration.',
  },
  partner: {
    icon: Hotel,
    eyebrow: 'Become an accommodation partner',
    title: 'Serve organizations looking for reliable business accommodation.',
    intro: 'Share your property details. Our partnerships team will get in touch about verification, rates and services.',
    next: ['Property verification', 'Rate and service discussion', 'Partner onboarding', 'Receive corporate requests'],
    submit: 'Submit enquiry',
    done: 'Thank you. Our partnerships team will contact you about the next steps.',
  },
};

function Field({ label, required, error, children, hint }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-800 mb-1.5">
        {label}{required && <span className="text-red-600" aria-hidden="true"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1" role="alert">{error}</span>}
    </label>
  );
}

const inputCls = (bad) => `w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors
  focus:outline-none focus:ring-4 focus:ring-primary-500/15 ${bad ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary-600'}`;

export default function EnquiryPage({ kind }) {
  const cfg = CONFIG[kind];
  const [params] = useSearchParams();
  const empty = useMemo(() => (kind === 'corporate'
    ? { organization: '', contact_name: '', email: '', phone: '', industry: '', requirements: '', message: '' }
    : { property_name: '', contact_name: '', email: '', phone: '', location: '', property_type: '', room_capacity: '', message: '' }), [kind]);
  // "Talk to Our Team" lands here too (?topic=talk) - same form, warmer heading.
  const talk = params.get('topic') === 'talk';
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState('');
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    document.title = kind === 'corporate' ? 'Request a Demo — Booqa' : 'Become a Partner — Booqa';
    window.scrollTo(0, 0);
  }, [kind]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    const orgKey = kind === 'corporate' ? 'organization' : 'property_name';
    if (!form[orgKey].trim()) e[orgKey] = kind === 'corporate' ? 'Enter your organization name' : 'Enter the hotel or property name';
    if (!form.contact_name.trim()) e.contact_name = 'Enter your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'Enter a valid business email';
    if (form.phone.replace(/\D/g, '').length < 7) e.phone = 'Enter a phone number we can reach you on';
    if (kind === 'partner' && !form.location.trim()) e.location = 'Enter the property location';
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
      const { data } = await authApi.post('/enquiries', { kind, ...form, website: honeypot });
      setReference(data.data?.reference || '');
      setStatus('sent');
      track('enquiry_submitted', { kind });
    } catch (err) {
      setStatus('error');
      setServerError(err.friendlyMessage || err.response?.data?.error?.message || 'Something went wrong. Please try again.');
    }
  };

  const Icon = cfg.icon;

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <BizNav />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-20">
          <aside>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Back to Booqa</Link>
            <span className="mt-8 w-12 h-12 rounded-xl bg-primary-50 text-navy flex items-center justify-center"><Icon className="w-6 h-6" strokeWidth={1.75} /></span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">{talk ? 'Talk to our team' : cfg.eyebrow}</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-950 leading-[1.15] text-balance">{cfg.title}</h1>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">{cfg.intro}</p>
            <div className="mt-10">
              <p className="text-sm font-semibold text-gray-950">What happens next</p>
              <ol className="mt-4 space-y-4">
                {cfg.next.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm text-gray-700">
                    <span className="w-7 h-7 rounded-full border border-gray-300 text-xs font-semibold text-gray-600 flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-[0_20px_60px_-25px_rgba(8,28,87,0.25)] p-6 sm:p-10">
            {status === 'sent' ? (
              <div className="py-10 text-center" role="status">
                <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto" strokeWidth={1.5} />
                <h2 className="mt-5 text-2xl font-bold text-gray-950">Enquiry received</h2>
                <p className="mt-3 text-gray-600 max-w-md mx-auto">{cfg.done}</p>
                {reference && <p className="mt-4 text-sm text-gray-500">Reference <span className="font-mono font-semibold text-gray-800">{reference}</span></p>}
                <Link to="/" className="mt-8 inline-flex items-center gap-2 bg-navy text-white font-semibold rounded-lg px-6 py-3">Back to Booqa</Link>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-5">
                {kind === 'corporate' ? (
                  <>
                    <Field label="Organization name" required error={errors.organization}>
                      <input name="organization" value={form.organization} onChange={set('organization')} className={inputCls(errors.organization)} autoComplete="organization" />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Your name" required error={errors.contact_name}>
                        <input name="contact_name" value={form.contact_name} onChange={set('contact_name')} className={inputCls(errors.contact_name)} autoComplete="name" />
                      </Field>
                      <Field label="Phone number" required error={errors.phone}>
                        <input name="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputCls(errors.phone)} autoComplete="tel" placeholder="+234" />
                      </Field>
                    </div>
                    <Field label="Business email" required error={errors.email}>
                      <input name="email" type="email" value={form.email} onChange={set('email')} className={inputCls(errors.email)} autoComplete="email" placeholder="name@company.com" />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Industry">
                        <select name="industry" value={form.industry} onChange={set('industry')} className={inputCls(false)}>
                          <option value="">Select industry</option>
                          {INDUSTRIES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </Field>
                      <Field label="Estimated accommodation needs">
                        <select name="requirements" value={form.requirements} onChange={set('requirements')} className={inputCls(false)}>
                          <option value="">Select an estimate</option>
                          {REQUIREMENTS.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Hotel or property name" required error={errors.property_name}>
                      <input name="property_name" value={form.property_name} onChange={set('property_name')} className={inputCls(errors.property_name)} autoComplete="organization" />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Contact person" required error={errors.contact_name}>
                        <input name="contact_name" value={form.contact_name} onChange={set('contact_name')} className={inputCls(errors.contact_name)} autoComplete="name" />
                      </Field>
                      <Field label="Phone number" required error={errors.phone}>
                        <input name="phone" type="tel" value={form.phone} onChange={set('phone')} className={inputCls(errors.phone)} autoComplete="tel" placeholder="+234" />
                      </Field>
                    </div>
                    <Field label="Business email" required error={errors.email}>
                      <input name="email" type="email" value={form.email} onChange={set('email')} className={inputCls(errors.email)} autoComplete="email" />
                    </Field>
                    <Field label="Property location" required error={errors.location}>
                      <input name="location" value={form.location} onChange={set('location')} className={inputCls(errors.location)} placeholder="Area, city" />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Accommodation type">
                        <select name="property_type" value={form.property_type} onChange={set('property_type')} className={inputCls(false)}>
                          <option value="">Select type</option>
                          {PROPERTY_TYPES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      </Field>
                      <Field label="Available room capacity" hint="Rooms or units you could offer">
                        <input name="room_capacity" inputMode="numeric" value={form.room_capacity} onChange={set('room_capacity')} className={inputCls(false)} placeholder="e.g. 40" />
                      </Field>
                    </div>
                  </>
                )}

                <Field label={kind === 'corporate' ? 'Message' : 'Additional information'}>
                  <textarea name="message" rows={4} value={form.message} onChange={set('message')} className={`${inputCls(false)} resize-none`}
                    placeholder={kind === 'corporate' ? 'Locations, typical guests, current process…' : 'Facilities, corporate experience, anything else…'} />
                </Field>

                {/* Hidden from people; bots fill it in and are quietly ignored. */}
                <input type="text" name="website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                {serverError && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2" role="alert">{serverError}</p>}

                <button type="submit" disabled={status === 'sending'}
                  className="w-full inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 disabled:opacity-60 text-white font-semibold rounded-lg px-6 py-3.5 transition-colors">
                  {status === 'sending' ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : cfg.submit}
                </button>
                <p className="text-xs text-gray-500 text-center">
                  We'll only use these details to respond to your enquiry. See our <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
      <BizFooter />
    </div>
  );
}
