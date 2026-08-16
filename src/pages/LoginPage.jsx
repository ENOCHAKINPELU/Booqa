import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { loginSubtitle } from '../utils/redirectContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate(redirectTo);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Sign in</h1>
      <p className="text-sm text-gray-500 mb-6">{loginSubtitle(redirectTo)}</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Email</span>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="block text-sm">
          <span className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
            Password
            <Link to="/forgot-password" className="text-primary-700 font-normal hover:text-primary-800">Forgot?</Link>
          </span>
          <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </label>

        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Signing in…</> : <><LogIn className="w-4 h-4" /> Sign in</>}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        New to Booqa? <Link to={`/signup?redirect=${encodeURIComponent(redirectTo)}`} className="text-primary-700 font-medium hover:text-primary-800">Create an account</Link>
      </p>
    </div>
  );
}
