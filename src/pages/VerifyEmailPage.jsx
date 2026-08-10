import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refresh } = useAuth();

  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Missing verification token.'); return; }
    authApi.post('/auth/verify-email', { token })
      .then(() => { setStatus('success'); refresh(); })
      .catch((err) => { setStatus('error'); setError(err.friendlyMessage || 'This link is invalid or has expired.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
      {status === 'verifying' && (
        <>
          <Loader className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Verifying your email…</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Email verified</h1>
          <Link to="/" className="btn-primary inline-block">Continue to Booqa</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h1>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <Link to="/" className="btn-secondary inline-block">Back to Booqa</Link>
        </>
      )}
    </div>
  );
}
