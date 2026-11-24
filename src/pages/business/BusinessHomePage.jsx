import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarCheck, Clock, Inbox, Wallet, Loader2, Building2, ArrowRight } from 'lucide-react';
import WorkspaceShell, { PageTitle, useWorkspace } from '../../components/business/WorkspaceShell';
import { StatusPill } from '../../components/business/DashboardMock';
import { biz, errorMessage } from '../../services/businessApi';
import { naira, dateRange, INDUSTRIES, inputCls } from './bizFormat';
import { useAuth } from '../../context/AuthContext';

function OrgSetup() {
  const { reload } = useWorkspace();
  const { guest } = useAuth();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await biz.createOrg({ name, industry });
      await reload();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <span className="w-12 h-12 rounded-xl bg-primary-50 text-navy flex items-center justify-center"><Building2 className="w-6 h-6" /></span>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-950">Set up your company</h1>
      <p className="mt-2 text-gray-600">Create your company workspace to start requesting accommodation. You can add colleagues next.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Company name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-gray-800 mb-1.5">Industry <span className="font-normal text-gray-400">(optional)</span></span>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={inputCls}>
            <option value="">Select</option>
            {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </label>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <button disabled={saving || !name.trim()} className="w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl py-3">
          {saving ? 'Creating…' : 'Create workspace'}
        </button>
      </form>
      <p className="mt-6 text-sm text-gray-500">
        Joining a colleague's workspace instead? Ask your company admin to add <strong className="text-gray-800">{guest?.email}</strong> to their team.
      </p>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone = 'default', to }) {
  const body = (
    <div className={`rounded-2xl border bg-white p-5 h-full ${tone === 'warn' && value ? 'border-amber-200' : 'border-gray-200'}`}>
      <Icon className={`w-5 h-5 ${tone === 'warn' && value ? 'text-amber-600' : 'text-navy'}`} />
      <p className="mt-4 text-2xl font-bold text-gray-950 tabular-nums">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
  return to ? <Link to={to} className="block hover:shadow-md rounded-2xl transition-shadow">{body}</Link> : body;
}

function Dashboard() {
  const { org } = useWorkspace();
  const [data, setData] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([biz.dashboard(), biz.requests()])
      .then(([d, r]) => { setData(d); setRecent(r.slice(0, 6)); })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const maxSpend = Math.max(1, ...data.spend_by_project.map((p) => p.spend));
  const empty = data.total === 0 && recent.length === 0;

  return (
    <>
      <PageTitle
        title={org.org_name}
        subtitle="Your company's accommodation at a glance."
        action={(
          <Link to="/business/requests/new" className="inline-flex items-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl px-5 py-2.5">
            <Plus className="w-4 h-4" /> New request
          </Link>
        )}
      />

      {empty ? (
        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white p-10 text-center">
          <CalendarCheck className="w-10 h-10 text-primary-300 mx-auto" />
          <h2 className="mt-4 text-lg font-semibold text-gray-950">No requests yet</h2>
          <p className="mt-1 text-gray-600 max-w-sm mx-auto">Tell us who needs a room, where and when. We'll find options at corporate rates for you to approve.</p>
          <Link to="/business/requests/new" className="mt-6 inline-flex items-center gap-2 bg-navy text-white font-semibold rounded-xl px-5 py-2.5">
            <Plus className="w-4 h-4" /> Make your first request
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi icon={Clock} label="Waiting for your approval" value={data.awaiting_approval} tone="warn" to="/business/requests?status=pending" />
            <Kpi icon={CalendarCheck} label="Upcoming stays" value={data.upcoming} />
            <Kpi icon={Inbox} label="Open requests" value={data.open_requests} to="/business/requests" />
            <Kpi icon={Wallet} label="Spend this month" value={naira(data.month_spend)} />
          </div>

          <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-6">
            <section className="rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-950">Recent requests</h2>
                <Link to="/business/requests" className="text-sm font-medium text-navy flex items-center gap-1">All <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
              <ul className="divide-y divide-gray-100">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link to={`/business/requests/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{r.city}{r.area ? `, ${r.area}` : ''} · {r.rooms} room{r.rooms === 1 ? '' : 's'}</p>
                        <p className="text-xs text-gray-500">{r.reference} · {dateRange(r.check_in, r.check_out)}{r.project ? ` · ${r.project}` : ''}</p>
                      </div>
                      <StatusPill status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
              <h2 className="font-semibold text-gray-950">Spend by project</h2>
              {data.spend_by_project.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Confirmed stays will appear here.</p>
              ) : (
                <ul className="mt-4 space-y-3.5">
                  {data.spend_by_project.map((p) => (
                    <li key={p.project}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 truncate">{p.project}</span>
                        <span className="font-semibold text-gray-900 tabular-nums">{naira(p.spend)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-navy" style={{ width: `${(p.spend / maxSpend) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {data.upcoming.length > 0 && (
                <>
                  <h2 className="mt-7 font-semibold text-gray-950">Next stays</h2>
                  <ul className="mt-3 space-y-2">
                    {data.upcoming.map((u) => (
                      <li key={u.id}>
                        <Link to={`/business/requests/${u.id}`} className="block rounded-xl bg-gray-50 px-3 py-2.5 hover:bg-primary-50">
                          <p className="text-sm font-medium text-gray-900">{u.property_name || u.city}</p>
                          <p className="text-xs text-gray-500">{dateRange(u.check_in, u.check_out)} · {u.rooms} room{u.rooms === 1 ? '' : 's'}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

function Content() {
  const { org, me } = useWorkspace();
  if (!org && me?.ops) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <p className="text-gray-700">You're on the Booqa operations team.</p>
        <Link to="/ops" className="mt-4 inline-flex bg-navy text-white font-semibold rounded-xl px-5 py-2.5">Open operations console</Link>
      </div>
    );
  }
  return org ? <Dashboard /> : <OrgSetup />;
}

export default function BusinessHomePage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
