import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { INDUSTRIES, COMPANY_SIZES, NIGERIAN_STATES, inputCls } from './bizFormat';

/*
 * The company details form: used when a company account is first set up
 * (OrgSetup) and on /business/company where admins keep it up to date.
 */

export const emptyCompany = (org = {}, fallbackEmail = '') => ({
  name: org.org_name || '',
  industry: org.industry || '',
  size: org.size || '',
  city: org.city || '',
  state: org.state || '',
  phone: org.phone || '',
  billing_email: org.billing_email || fallbackEmail,
});

function Field({ label, hint, optional, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-800 mb-1.5">
        {label} {optional && <span className="font-normal text-gray-400">(optional)</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

/** The company fields. `value` is the object from emptyCompany(). */
export function CompanyFields({ value, onChange, disabled }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <Field label="Company name">
        <input value={value.name} onChange={set('name')} className={inputCls} autoComplete="organization" required />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Industry">
          <select value={value.industry} onChange={set('industry')} className={inputCls} required>
            <option value="">Select</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </Field>
        <Field label="Company size">
          <select value={value.size} onChange={set('size')} className={inputCls} required>
            <option value="">Select</option>
            {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Head office city">
          <input value={value.city} onChange={set('city')} className={inputCls} placeholder="e.g. Port Harcourt" autoComplete="address-level2" required />
        </Field>
        <Field label="State">
          <select value={value.state} onChange={set('state')} className={inputCls} required>
            <option value="">Select</option>
            {NIGERIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Company phone">
        <input type="tel" value={value.phone} onChange={set('phone')} className={inputCls} placeholder="Main office line" pattern="\+?[\d\s()\-]{7,20}" title="Enter a valid phone number" required />
      </Field>
      <Field label="Billing email" hint="Booking summaries and payment receipts are sent here too. Often your finance or accounts team.">
        <input type="email" value={value.billing_email} onChange={set('billing_email')} className={inputCls} placeholder="accounts@company.com" required />
      </Field>
    </fieldset>
  );
}

function Content() {
  const { org, reload } = useWorkspace();
  const isAdmin = org?.role === 'admin';
  const [company, setCompany] = useState(() => emptyCompany(org));
  const [jobTitle, setJobTitle] = useState(org?.job_title || '');
  const [saving, setSaving] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const save = (which, body) => async (e) => {
    e.preventDefault();
    setSaving(which);
    setSaved('');
    setError('');
    try {
      await biz.updateOrg(body);
      await reload();
      setSaved(which);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving('');
    }
  };

  const savedNote = (which) => saved === which && (
    <span className="flex items-center gap-1 text-sm text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Saved</span>
  );

  return (
    <div className="max-w-2xl">
      <PageTitle title="Company" subtitle={isAdmin ? 'Your company details. Keep them current so hotels and receipts reach the right people.' : 'Your company details, managed by your admin.'} />
      {error && <p className="mb-4 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

      <form onSubmit={save('company', company)} className="rounded-2xl border border-gray-200 bg-white p-6">
        <CompanyFields value={company} onChange={setCompany} disabled={!isAdmin || saving === 'company'} />
        {isAdmin && (
          <div className="mt-6 flex items-center gap-4">
            <button disabled={saving === 'company'} className="bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-2.5">
              {saving === 'company' ? 'Saving…' : 'Save company details'}
            </button>
            {savedNote('company')}
          </div>
        )}
      </form>

      <form onSubmit={save('me', { job_title: jobTitle })} className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <Field label="Your job title" optional>
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls} placeholder="e.g. HR Manager, Travel desk" autoComplete="organization-title" />
        </Field>
        <div className="mt-4 flex items-center gap-4">
          <button disabled={saving === 'me'} className="border border-gray-300 hover:border-navy text-gray-800 font-semibold rounded-xl px-5 py-2.5">
            {saving === 'me' ? 'Saving…' : 'Save'}
          </button>
          {savedNote('me')}
        </div>
      </form>
    </div>
  );
}

export default function CompanyPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
