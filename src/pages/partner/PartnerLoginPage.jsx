import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader, LogIn, Building2 } from 'lucide-react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

// Federated against the same owner/manager account a hotel already uses to
// sign in to HotelOps itself — there is no separate Booqa-partner password
// to create. See lib/partnerAuth.js.
export default function PartnerLoginPage() {
  const { login } = usePartnerAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/partner/dashboard';

  const [form, setForm] = useState({ email: '', password: '', role: 'owner' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password, form.role);
      navigate(redirectTo);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-primary-700" />
        <h1 className="text-xl font-bold text-gray-900">Hotel partner sign in</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Use the same email and password you use to sign in to HotelOps. Your Booqa marketplace listing lives on top of your existing hotel account.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">I sign in as</span>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="owner">Hotel owner</option>
            <option value="manager">Hotel manager</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Email</span>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Password</span>
          <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Signing in…</> : <><LogIn className="w-4 h-4" /> Sign in</>}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Not on Booqa yet? Register your hotel with HotelOps first, then come back here to list it. <Link to="/" className="text-primary-700 font-medium hover:text-primary-800">Back to Booqa</Link>
      </p>
    </div>
  );
}
