import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import StatusPill from '../../components/business/RequestStatus';
import { biz, errorMessage } from '../../services/businessApi';
import { RequestHeader, Timeline, BookingSummary } from './RequestDetail';
import { StatusTabs, STATUS_TABS } from './RequestsPage';
import { naira, dateRange, when } from './bizFormat';

/*
 * Booqa operations console - a read-only view of every company's requests
 * and bookings. Booking itself is automatic (matching + online payment),
 * so this is for oversight and support. Only accounts in
 * BOOQA_ADMIN_EMAILS get past the API; this page mirrors that.
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
      <PageTitle title="All company requests" subtitle="Every request and booking across Booqa companies." />
      <StatusTabs value={status} onChange={(s) => setParams({ status: s })} tabs={OPS_TABS} />
      {error && <p className="text-red-700">{error}</p>}
      {!rows && !error && <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {rows && rows.length === 0 && <p className="rounded-2xl border border-gray-200 bg-white py-14 text-center text-gray-500">Nothing here.</p>}
      {rows && rows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="font-semibold px-5 py-3">Reference</th>
                <th className="font-semibold px-3 py-3">Company</th>
                <th className="font-semibold px-3 py-3">Where</th>
                <th className="font-semibold px-3 py-3">Hotel</th>
                <th className="font-semibold px-3 py-3">Dates</th>
                <th className="font-semibold px-3 py-3 text-right">Value</th>
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
                  <td className="px-3 py-3.5 text-gray-600">{r.hotel_name || '—'}</td>
                  <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap">{dateRange(r.check_in, r.check_out)}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-gray-800">{r.total_cost ? naira(r.total_cost) : r.amount_due ? naira(r.amount_due) : '—'}</td>
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
  useEffect(() => { biz.ops.request(id).then(setR).catch((err) => setError(errorMessage(err))); }, [id]);

  if (!r && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!r) return <p className="text-red-700">{error}</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/ops" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> All requests</Link>
      <RequestHeader r={r} showOrg />
      {r.status === 'pending' && (
        <p className="rounded-2xl bg-white border border-gray-200 p-5 text-sm text-gray-700">
          {r.reservations.length} room{r.reservations.length === 1 ? '' : 's'} held at <strong>{r.hotel_name}</strong>, waiting for {naira(r.amount_due)} payment.
        </p>
      )}
      <BookingSummary r={r} />
      <Timeline events={r.events} />
    </div>
  );
}

export function OpsQueuePage() {
  return <WorkspaceShell ops><OpsOnly><QueueContent /></OpsOnly></WorkspaceShell>;
}

export function OpsRequestPage() {
  return <WorkspaceShell ops><OpsOnly><RequestContent /></OpsOnly></WorkspaceShell>;
}
