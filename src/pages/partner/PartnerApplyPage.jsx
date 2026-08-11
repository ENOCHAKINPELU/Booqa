import React, { useEffect, useState } from 'react';
import { Loader, Send, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { partnerApi } from '../../services/partnerApi';

const STATUS_META = {
  submitted: { label: 'Submitted', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Under review', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  info_required: { label: 'Info needed', icon: AlertTriangle, className: 'bg-orange-50 text-orange-700 border-orange-200' },
  approved: { label: 'Approved — live on Booqa', icon: CheckCircle2, className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  suspended: { label: 'Suspended', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  archived: { label: 'Archived', icon: Clock, className: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const CAN_REAPPLY = new Set([undefined, null, 'rejected', 'archived']);

export default function PartnerApplyPage() {
  const [application, setApplication] = useState(undefined); // undefined = loading, null = none yet
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    partnerApi.get('application')
      .then((r) => setApplication(r.data.data))
      .catch((err) => setError(err.friendlyMessage || 'Unable to load your application.'));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await partnerApi.post('application', { business_name: businessName || undefined });
      setApplication(data.data);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (application === undefined) {
    return <div className="flex justify-center py-12 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }

  const meta = application ? STATUS_META[application.status] : null;

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Marketplace application</h2>
      <p className="text-sm text-gray-500 mb-6">
        Get your hotel reviewed for the Booqa marketplace. This is separate from your HotelOps subscription — it's specifically about being listed and bookable on Booqa.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {application && meta && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 mb-4 ${meta.className}`}>
          <meta.icon className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{meta.label}</span>
        </div>
      )}

      {application?.status === 'info_required' && application.info_requested && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 text-sm text-orange-800">
          <p className="font-semibold mb-1">Our team needs more information:</p>
          <p>{application.info_requested}</p>
        </div>
      )}

      {application?.status === 'rejected' && application.rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Reason:</p>
          <p>{application.rejection_reason}</p>
        </div>
      )}

      {CAN_REAPPLY.has(application?.status) ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Business / trading name (optional)</span>
            <input
              className="input"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Defaults to your HotelOps hotel name"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : <><Send className="w-4 h-4" /> {application ? 'Re-apply' : 'Submit application'}</>}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">
          {application?.status === 'approved'
            ? "You're approved — finish setting up your hotel profile so guests see a complete listing."
            : 'An application is already in progress. Check back once our team has reviewed it.'}
        </p>
      )}
    </div>
  );
}
