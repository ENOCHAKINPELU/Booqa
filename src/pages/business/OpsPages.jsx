import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, Building2 } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import { StatusPill } from '../../components/business/DashboardMock';
import { biz, errorMessage } from '../../services/businessApi';
import { RequestHeader, Timeline } from './RequestDetail';
import { StatusTabs, STATUS_TABS } from './RequestsPage';
import { naira, dateRange, inputCls, when } from './bizFormat';

/*
 * Booqa operations console - the team that sources accommodation.
 * Only accounts in BOOQA_ADMIN_EMAILS get past the API; this page just
 * mirrors that so others see a clear message instead of errors.
 */

function OpsOnly({ children }) {
  const { me } = useWorkspace();
  if (!me?.ops) return <p className="text-gray-600">This area is for the Booqa operations team.</p>;
  return children;
}

const OPS_TABS = [{ key: 'open', label: 'Open' }, ...STATUS_TABS.filter((t) => t.key)];

function QueueContent() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'open';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    biz.ops.requests(status).then(setRows).catch((err) => setError(errorMessage(err)));
  }, [status]);

  return (
    <>
      <PageTitle title="Accommodation requests" subtitle="Every client request. Add options, then confirm with the hotel once approved." />
      <StatusTabs value={status} onChange={(s) => setParams({ status: s })} tabs={OPS_TABS} />
      {error && <p className="text-red-700">{error}</p>}
      {!rows && !error && <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {rows && rows.length === 0 && <p className="rounded-2xl border border-gray-200 bg-white py-14 text-center text-gray-500">Nothing here.</p>}
      {rows && rows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="font-semibold px-5 py-3">Reference</th>
                <th className="font-semibold px-3 py-3">Company</th>
                <th className="font-semibold px-3 py-3">Where</th>
                <th className="font-semibold px-3 py-3">Dates</th>
                <th className="font-semibold px-3 py-3">Rooms</th>
                <th className="font-semibold px-3 py-3">Received</th>
                <th className="font-semibold px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5"><Link to={`/ops/requests/${r.id}`} className="font-mono font-semibold text-navy hover:underline">{r.reference}</Link></td>
                  <td className="px-3 py-3.5 text-gray-800">{r.org_name}</td>
                  <td className="px-3 py-3.5 text-gray-700">{r.city}{r.area ? `, ${r.area}` : ''}</td>
                  <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap">{dateRange(r.check_in, r.check_out)}</td>
                  <td className="px-3 py-3.5 text-gray-600">{r.rooms}</td>
                  <td className="px-3 py-3.5 text-gray-500 whitespace-nowrap">{when(r.created_at)}</td>
                  <td className="px-5 py-3.5 text-right"><StatusPill status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function RequestContent() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [option, setOption] = useState({ property_name: '', address: '', rate_per_night: '', notes: '' });
  const [confirmRef, setConfirmRef] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => biz.ops.request(id).then(setR).catch((err) => setError(errorMessage(err))), [id]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, after) => {
    setBusy(true);
    setError('');
    try { setR(await fn()); after?.(); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (!r && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!r) return <p className="text-red-700">{error}</p>;

  const canEditOptions = ['requested', 'pending'].includes(r.status);
  const open = ['requested', 'pending', 'approved', 'confirmed'].includes(r.status);
  const selected = r.options.find((o) => o.id === r.selected_option_id);

  return (
    <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
      <div className="space-y-6">
        <Link to="/ops" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> All requests</Link>
        <RequestHeader r={r} showOrg />
        <Timeline events={r.events} />
      </div>

      <div className="space-y-6 lg:sticky lg:top-24">
        <section className="rounded-2xl bg-white border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-950">Options for the client</h2>
          {r.options.length === 0 && <p className="text-sm text-gray-500 mt-2">None yet. Add at least one to send it for approval.</p>}
          <ul className="mt-3 space-y-2">
            {r.options.map((o) => (
              <li key={o.id} className={`rounded-xl border px-3 py-2.5 flex items-center gap-3 ${o.id === r.selected_option_id ? 'border-navy bg-primary-50/50' : 'border-gray-200'}`}>
                <Building2 className="w-4 h-4 text-navy flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{o.property_name}{o.id === r.selected_option_id && ' · approved'}</p>
                  <p className="text-xs text-gray-500">{naira(o.rate_per_night)} / night{o.address ? ` · ${o.address}` : ''}</p>
                </div>
                {canEditOptions && (
                  <button onClick={() => act(() => biz.ops.removeOption(r.id, o.id))} disabled={busy} aria-label={`Remove ${o.property_name}`} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canEditOptions && (
            <form className="mt-4 space-y-2.5" onSubmit={(e) => {
              e.preventDefault();
              act(() => biz.ops.addOption(r.id, option), () => setOption({ property_name: '', address: '', rate_per_night: '', notes: '' }));
            }}>
              <input value={option.property_name} onChange={(e) => setOption({ ...option, property_name: e.target.value })} className={inputCls} placeholder="Hotel / property name" required />
              <div className="grid grid-cols-2 gap-2">
                <input value={option.address} onChange={(e) => setOption({ ...option, address: e.target.value })} className={inputCls} placeholder="Area / address" />
                <input type="number" min="1" value={option.rate_per_night} onChange={(e) => setOption({ ...option, rate_per_night: e.target.value })} className={inputCls} placeholder="Rate / night (₦)" required />
              </div>
              <input value={option.notes} onChange={(e) => setOption({ ...option, notes: e.target.value })} className={inputCls} placeholder="Notes for the client (optional)" />
              <button disabled={busy} className="w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5">
                Add option{r.status === 'requested' ? ' and send for approval' : ''}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-950">Next step</h2>
          {r.status === 'requested' && <p className="text-sm text-gray-600">Add options above. The client approves one.</p>}
          {r.status === 'pending' && <p className="text-sm text-gray-600">Waiting for the client to approve an option.</p>}
          {r.status === 'approved' && (
            <>
              <p className="text-sm text-gray-600">Client approved <strong>{selected?.property_name}</strong>. Book it with the hotel, then record their confirmation.</p>
              <input value={confirmRef} onChange={(e) => setConfirmRef(e.target.value)} className={inputCls} placeholder="Hotel's confirmation reference" />
              <button onClick={() => act(() => biz.ops.setStatus(r.id, { status: 'confirmed', confirmation_ref: confirmRef, note }))} disabled={busy || !confirmRef.trim()}
                className="w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5">Mark as confirmed</button>
            </>
          )}
          {r.status === 'confirmed' && (
            <button onClick={() => act(() => biz.ops.setStatus(r.id, { status: 'checked_in', note }))} disabled={busy}
              className="w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5">Guests checked in</button>
          )}
          {r.status === 'checked_in' && (
            <button onClick={() => act(() => biz.ops.setStatus(r.id, { status: 'completed', note }))} disabled={busy}
              className="w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-xl py-2.5">Stay completed</button>
          )}
          {['completed', 'cancelled'].includes(r.status) && <p className="text-sm text-gray-600">Nothing more to do.</p>}
          {open && (
            <>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} placeholder="Note for the timeline (optional)" />
              <button onClick={() => act(() => biz.ops.setStatus(r.id, { status: 'cancelled', note }))} disabled={busy}
                className="text-sm font-medium text-red-600 hover:text-red-700">Cancel this request</button>
            </>
          )}
        </section>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
      </div>
    </div>
  );
}

export function OpsQueuePage() {
  return <WorkspaceShell ops><OpsOnly><QueueContent /></OpsOnly></WorkspaceShell>;
}

export function OpsRequestPage() {
  return <WorkspaceShell ops><OpsOnly><RequestContent /></OpsOnly></WorkspaceShell>;
}
