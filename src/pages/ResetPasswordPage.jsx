import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader, KeyRound } from 'lucide-react';
import { authApi } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setError('Missing reset token.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await authApi.post('/auth/reset-password', { token, password });
      navigate('/login');
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to reset your password. The link may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Set a new password</h1>
      <p className="text-sm text-gray-500 mb-6">Choose something you haven't used before.</p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">New password</span>
          <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          <span className="block text-xs text-gray-400 mt-1">At least 8 characters</span>
        </label>
        <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
          {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Resetting…</> : <><KeyRound className="w-4 h-4" /> Reset password</>}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        <Link to="/login" className="text-primary-700 font-medium hover:text-primary-800">Back to sign in</Link>
      </p>
    </div>
  );
}
