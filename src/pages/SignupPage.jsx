import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signupSubtitle } from '../utils/redirectContext';

// Personal mailboxes: we suggest a work email so colleagues can find the
// company, but never block sign-up.
const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'ymail.com', 'protonmail.com', 'proton.me'];
const isPersonalEmail = (email) => PERSONAL_DOMAINS.includes(String(email).split('@')[1]?.trim().toLowerCase());

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/business';

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signup(form);
      navigate(redirectTo);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Create your account</h1>
      <p className="text-sm text-gray-500 mb-6">{signupSubtitle(redirectTo)}</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Full name</span>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Work email</span>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@company.com" autoComplete="email" required />
          {isPersonalEmail(form.email) && (
            <span className="block text-xs text-amber-700 mt-1">Tip: use your work email so colleagues and receipts are linked to your company. You can still continue with this one.</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Phone number</span>
          <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0803 000 0000" autoComplete="tel" pattern="\+?[\d\s()\-]{7,20}" title="Enter a valid phone number" required />
          <span className="block text-xs text-gray-400 mt-1">So hotels and our team can reach you about a booking</span>
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Password</span>
          <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required />
          <span className="block text-xs text-gray-400 mt-1">At least 8 characters</span>
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Creating account…</> : <><UserPlus className="w-4 h-4" /> Create account</>}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account? <Link to={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-primary-700 font-medium hover:text-primary-800">Sign in</Link>
      </p>
    </div>
  );
}
