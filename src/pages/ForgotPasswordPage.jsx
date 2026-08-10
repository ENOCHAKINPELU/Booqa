import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Mail, CheckCircle2 } from 'lucide-react';
import { authApi } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await authApi.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.friendlyMessage || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-sm text-gray-500 mb-6">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
        <Link to="/login" className="btn-secondary inline-block">Back to sign in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
      <p className="text-sm text-gray-500 mb-6">We'll email you a link to reset it.</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Email</span>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Sending…</> : <><Mail className="w-4 h-4" /> Send reset link</>}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        <Link to="/login" className="text-primary-700 font-medium hover:text-primary-800">Back to sign in</Link>
      </p>
    </div>
  );
}
