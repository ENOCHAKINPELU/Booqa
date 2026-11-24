import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Loader2, Inbox } from 'lucide-react';
import WorkspaceShell, { PageTitle } from '../../components/business/WorkspaceShell';
import { StatusPill } from '../../components/business/DashboardMock';
import { biz, errorMessage } from '../../services/businessApi';
import { dateRange, naira } from './bizFormat';

export const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'requested', label: 'Requested' },
  { key: 'pending', label: 'Awaiting approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'Checked in' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function StatusTabs({ value, onChange, tabs = STATUS_TABS }) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Filter by status">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={`text-sm font-medium rounded-lg px-3 py-1.5 whitespace-nowrap ${value === t.key ? 'bg-navy text-white' : 'text-gray-600 hover:bg-white'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Content() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    biz.requests(status).then(setRows).catch((err) => setError(errorMessage(err)));
  }, [status]);

  return (
    <>
      <PageTitle
        title="Requests"
        action={(
          <Link to="/business/requests/new" className="inline-flex items-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl px-5 py-2.5">
            <Plus className="w-4 h-4" /> New request
          </Link>
        )}
      />
      <StatusTabs value={status} onChange={(s) => setParams(s ? { status: s } : {})} />
      {error && <p className="text-red-700">{error}</p>}
      {!rows && !error && <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {rows && rows.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white py-14 text-center text-gray-500">
          <Inbox className="w-8 h-8 mx-auto text-gray-300" />
          <p className="mt-2">No requests here.</p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">
                <th className="font-semibold px-5 py-3">Reference</th>
                <th className="font-semibold px-3 py-3">Where</th>
                <th className="font-semibold px-3 py-3">Dates</th>
                <th className="font-semibold px-3 py-3">Rooms</th>
                <th className="font-semibold px-3 py-3">Project</th>
                <th className="font-semibold px-3 py-3 text-right">Cost</th>
                <th className="font-semibold px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5"><Link to={`/business/requests/${r.id}`} className="font-mono font-semibold text-navy hover:underline">{r.reference}</Link></td>
                  <td className="px-3 py-3.5 text-gray-800">{r.city}{r.area ? `, ${r.area}` : ''}</td>
                  <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap">{dateRange(r.check_in, r.check_out)}</td>
                  <td className="px-3 py-3.5 text-gray-600">{r.rooms}</td>
                  <td className="px-3 py-3.5 text-gray-600">{r.project || '—'}</td>
                  <td className="px-3 py-3.5 text-right tabular-nums text-gray-800">{r.total_cost ? naira(r.total_cost) : '—'}</td>
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

export default function RequestsPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
