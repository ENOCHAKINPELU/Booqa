import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, Clock } from 'lucide-react';
import WorkspaceShell from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { RequestHeader, Timeline } from './RequestDetail';
import { naira } from './bizFormat';
import { useAuth } from '../../context/AuthContext';

function Content() {
  const { id } = useParams();
  const { guest } = useAuth();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(() => biz.request(id).then(setR).catch((err) => setError(errorMessage(err))), [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (key, fn) => {
    setBusy(key);
    setError('');
    try { setR(await fn()); } catch (err) { setError(errorMessage(err)); } finally { setBusy(''); }
  };

  if (!r && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!r) return <p className="text-red-700">{error}</p>;

  const open = ['requested', 'pending', 'approved', 'confirmed'].includes(r.status);
  const canCancel = open && (r.can_approve || r.requested_by === guest?.id);
  const selected = r.options.find((o) => o.id === r.selected_option_id);

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/business/requests" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> All requests</Link>
      <RequestHeader r={r} />

      {r.status === 'requested' && (
        <div className="rounded-2xl bg-white border border-gray-200 p-5 flex items-center gap-3 text-gray-700">
          <Clock className="w-5 h-5 text-navy flex-shrink-0" />
          We're finding suitable options for you. You'll see them here to approve.
        </div>
      )}

      {r.options.length > 0 && (
        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
          <h2 className="font-semibold text-gray-950">
            {r.status === 'pending' ? (r.can_approve ? 'Choose an option to approve' : 'Options waiting for approval') : 'Options'}
          </h2>
          {r.status === 'pending' && !r.can_approve && <p className="text-sm text-gray-500 mt-1">An approver at your company will choose one.</p>}
          <ul className="mt-4 space-y-3">
            {r.options.map((o) => {
              const total = Number(o.rate_per_night) * r.nights * r.rooms;
              const isSelected = o.id === r.selected_option_id;
              return (
                <li key={o.id} className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${isSelected ? 'border-navy bg-primary-50/50' : 'border-gray-200'}`}>
                  <span className="w-10 h-10 rounded-lg bg-primary-50 text-navy flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-[180px]">
                    <p className="font-semibold text-gray-950">{o.property_name}{isSelected && <span className="ml-2 text-xs font-semibold text-navy">Selected</span>}</p>
                    {o.address && <p className="text-sm text-gray-500">{o.address}</p>}
                    {o.notes && <p className="text-sm text-gray-600 mt-1">{o.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-950 tabular-nums">{naira(o.rate_per_night)} <span className="text-xs font-normal text-gray-500">/ night</span></p>
                    <p className="text-xs text-gray-500">{naira(total)} for {r.rooms} room{r.rooms === 1 ? '' : 's'}, {r.nights} night{r.nights === 1 ? '' : 's'}</p>
                  </div>
                  {r.status === 'pending' && r.can_approve && (
                    <button onClick={() => act(`approve-${o.id}`, () => biz.approve(r.id, o.id))} disabled={!!busy}
                      className="bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2">
                      {busy === `approve-${o.id}` ? 'Approving…' : 'Approve'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          {r.status === 'approved' && selected && (
            <p className="mt-4 text-sm text-gray-600">Approved. Booqa is now confirming {selected.property_name} with the hotel.</p>
          )}
        </section>
      )}

      {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}

      <Timeline events={r.events} />

      {canCancel && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          {!cancelling ? (
            <button onClick={() => setCancelling(true)} className="text-sm font-medium text-red-600 hover:text-red-700">Cancel this request</button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">Cancel {r.reference}?</p>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => act('cancel', () => biz.cancel(r.id, reason))} disabled={!!busy} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg px-4 py-2">
                  {busy === 'cancel' ? 'Cancelling…' : 'Cancel request'}
                </button>
                <button onClick={() => setCancelling(false)} className="text-sm font-medium text-gray-600 px-4 py-2">Keep it</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
