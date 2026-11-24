import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import WorkspaceShell, { useWorkspace } from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { inputCls } from './bizFormat';
import { tomorrowISO, defaultCheckOut } from '../../utils/dates';

function Field({ label, optional, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex justify-between text-sm font-medium text-gray-800 mb-1.5">
        {label}{optional && <span className="font-normal text-gray-400">Optional</span>}
      </span>
      {children}
    </label>
  );
}

function Content() {
  const { org } = useWorkspace();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    city: 'Port Harcourt', area: '', check_in: tomorrowISO(), check_out: defaultCheckOut(tomorrowISO()),
    rooms: 1, project: '', budget_per_night: '', preferences: '',
  });
  const [guests, setGuests] = useState([{ name: '', phone: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (!org) return <p className="text-gray-600">Set up your company first. <Link to="/business" className="text-navy underline">Go to setup</Link></p>;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await biz.createRequest({ ...form, guests: guests.filter((g) => g.name.trim()) });
      navigate(`/business/requests/${created.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Link to="/business" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Back</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-950">New accommodation request</h1>
      <p className="mt-1 text-gray-600">We'll come back with suitable options and corporate rates for you to approve.</p>

      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-950">Where and when</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="City"><input value={form.city} onChange={set('city')} className={inputCls} required /></Field>
            <Field label="Area" optional><input value={form.area} onChange={set('area')} className={inputCls} placeholder="e.g. GRA, Trans-Amadi" /></Field>
            <Field label="Check-in"><input type="date" value={form.check_in} min={tomorrowISO()} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value, check_out: f.check_out > e.target.value ? f.check_out : defaultCheckOut(e.target.value) }))} className={inputCls} required /></Field>
            <Field label="Check-out"><input type="date" value={form.check_out} min={form.check_in} onChange={set('check_out')} className={inputCls} required /></Field>
            <Field label="Rooms"><input type="number" min="1" max="200" value={form.rooms} onChange={set('rooms')} className={inputCls} required /></Field>
            <Field label="Project or cost centre" optional><input value={form.project} onChange={set('project')} className={inputCls} placeholder="e.g. Onne Base Upgrade" /></Field>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-950">Who is staying <span className="text-sm font-normal text-gray-400">Optional</span></h2>
            <button type="button" onClick={() => setGuests((g) => [...g, { name: '', phone: '' }])} className="text-sm font-medium text-navy flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add guest
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {guests.map((g, i) => (
              <div key={i} className="flex gap-2">
                <input value={g.name} onChange={(e) => setGuests((all) => all.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} className={inputCls} placeholder="Full name" aria-label={`Guest ${i + 1} name`} />
                <input value={g.phone} onChange={(e) => setGuests((all) => all.map((x, n) => (n === i ? { ...x, phone: e.target.value } : x)))} className={`${inputCls} max-w-[170px]`} placeholder="Phone" aria-label={`Guest ${i + 1} phone`} />
                {guests.length > 1 && (
                  <button type="button" onClick={() => setGuests((all) => all.filter((_, n) => n !== i))} aria-label={`Remove guest ${i + 1}`} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-950">Preferences</h2>
          <Field label="Budget per room per night (₦)" optional>
            <input type="number" min="0" value={form.budget_per_night} onChange={set('budget_per_night')} className={`${inputCls} max-w-xs`} placeholder="e.g. 50000" />
          </Field>
          <Field label="Anything else" optional>
            <textarea rows={3} value={form.preferences} onChange={set('preferences')} className={`${inputCls} resize-none`} placeholder="e.g. Close to Onne port, 24-hour power, breakfast included" />
          </Field>
        </section>

        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={saving} className="bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3">
            {saving ? 'Sending…' : 'Send request'}
          </button>
          <Link to="/business" className="font-semibold text-gray-700 rounded-xl px-6 py-3 hover:bg-white">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
