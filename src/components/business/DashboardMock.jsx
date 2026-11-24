import React from 'react';
import {
  LayoutDashboard, Inbox, CalendarCheck, Users, Building2, BarChart3, Search, Bell, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

/*
 * The corporate dashboard concept, built as real interface rather than a
 * picture, so it stays sharp at any size. All figures are illustrative
 * (labelled on screen) - not Booqa customer data.
 */

export const STATUS = {
  requested: { label: 'Requested', cls: 'bg-gray-100 text-gray-700' },
  pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'Approved', cls: 'bg-sky-50 text-sky-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-primary-50 text-primary-800' },
  checked_in: { label: 'Checked in', cls: 'bg-emerald-50 text-emerald-800' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
};

export function StatusPill({ status }) {
  const s = STATUS[status];
  return <span className={`inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

const KPIS = [
  { label: 'Total bookings', value: '148', delta: '+12%', up: true, note: 'this quarter' },
  { label: 'Upcoming stays', value: '23', delta: '7 this week', note: '' },
  { label: 'Pending requests', value: '6', delta: '2 need approval', note: '', warn: true },
  { label: 'Spend this month', value: '₦18.4M', delta: '-4%', up: false, note: 'vs last month' },
];

const RESERVATIONS = [
  { guest: 'Chinedu Okafor', role: 'Field engineer', project: 'Bonny LNG T7', property: 'Harbour Executive Suites', dates: '12–19 Mar', status: 'checked_in' },
  { guest: 'Amaka Eze', role: 'HSE consultant', project: 'Onne Base Upgrade', property: 'Trans-Amadi Residency', dates: '14–16 Mar', status: 'confirmed' },
  { guest: '3 × Marine crew', role: 'Vessel rotation', project: 'MV Rivers Star', property: 'GRA Serviced Apartments', dates: '15–29 Mar', status: 'approved' },
  { guest: 'David Mensah', role: 'Visiting director', project: 'Head office', property: 'Rivoli Suites', dates: '18–20 Mar', status: 'pending' },
  { guest: 'Ngozi Bello', role: 'Trainer', project: 'Q1 Safety Training', property: '—', dates: '22–24 Mar', status: 'requested' },
];

const SPEND = [
  { name: 'Bonny LNG T7', value: 7.2 },
  { name: 'Onne Base Upgrade', value: 4.9 },
  { name: 'Marine operations', value: 3.6 },
  { name: 'Head office visits', value: 1.8 },
  { name: 'Training & events', value: 0.9 },
];

const NAV = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: Inbox, label: 'Requests', badge: 6 },
  { icon: CalendarCheck, label: 'Reservations' },
  { icon: Users, label: 'Guests' },
  { icon: Building2, label: 'Suppliers' },
  { icon: BarChart3, label: 'Reports' },
];

function Kpi({ k, compact }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-[10px] font-medium text-gray-500">{k.label}</p>
      <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-gray-900 tabular-nums mt-0.5`}>{k.value}</p>
      <p className={`text-[10px] mt-0.5 flex items-center gap-0.5 ${k.warn ? 'text-amber-700' : k.up === false ? 'text-emerald-700' : k.up ? 'text-primary-700' : 'text-gray-500'}`}>
        {k.up === true && <ArrowUpRight className="w-3 h-3" />}
        {k.up === false && <ArrowDownRight className="w-3 h-3" />}
        {k.delta} {k.note && <span className="text-gray-400">{k.note}</span>}
      </p>
    </div>
  );
}

function SpendChart() {
  const max = Math.max(...SPEND.map((s) => s.value));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-900">Spend by project</p>
        <p className="text-[10px] text-gray-400">March · ₦M</p>
      </div>
      <ul className="mt-3 space-y-2.5">
        {SPEND.map((s, i) => (
          <li key={s.name}>
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span>{s.name}</span><span className="tabular-nums font-medium text-gray-900">₦{s.value.toFixed(1)}M</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div className={`h-full rounded-full ${i === 0 ? 'bg-primary-700' : 'bg-primary-400'}`} style={{ width: `${(s.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReservationsTable({ rows = RESERVATIONS, showProject = true }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-900">Recent reservations</p>
        <p className="text-[10px] font-medium text-primary-700">View all</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-[9px] uppercase tracking-wide text-gray-400">
            <th className="font-semibold px-4 py-2">Guest</th>
            {showProject && <th className="font-semibold px-2 py-2 hidden md:table-cell">Project</th>}
            <th className="font-semibold px-2 py-2 hidden sm:table-cell">Property</th>
            <th className="font-semibold px-2 py-2">Dates</th>
            <th className="font-semibold px-4 py-2 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r) => (
            <tr key={r.guest} className="text-[11px]">
              <td className="px-4 py-2.5">
                <p className="font-semibold text-gray-900">{r.guest}</p>
                <p className="text-[10px] text-gray-400">{r.role}</p>
              </td>
              {showProject && <td className="px-2 py-2.5 text-gray-600 hidden md:table-cell">{r.project}</td>}
              <td className="px-2 py-2.5 text-gray-600 hidden sm:table-cell">{r.property}</td>
              <td className="px-2 py-2.5 text-gray-600 whitespace-nowrap">{r.dates}</td>
              <td className="px-4 py-2.5 text-right"><StatusPill status={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * variant="hero": compact window for the hero composition.
 * variant="full": the large dashboard section, with sidebar and chart.
 */
export default function DashboardMock({ variant = 'full' }) {
  const hero = variant === 'hero';
  return (
    <div className="rounded-2xl bg-gray-50 border border-gray-200 shadow-[0_30px_80px_-20px_rgba(8,28,87,0.35)] overflow-hidden text-left" aria-label="Illustration of the Booqa corporate dashboard" role="img">
      {/* window bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-200" /><span className="w-2.5 h-2.5 rounded-full bg-gray-200" /><span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        </div>
        <div className="flex-1 flex items-center gap-2 max-w-xs rounded-md bg-gray-50 border border-gray-200 px-2.5 py-1 text-[10px] text-gray-400">
          <Search className="w-3 h-3" /> Search guests, projects, properties
        </div>
        <Bell className="w-3.5 h-3.5 text-gray-400 ml-auto" />
        <span className="w-6 h-6 rounded-full bg-primary-700 text-white text-[9px] font-bold flex items-center justify-center">TO</span>
      </div>

      <div className="flex">
        {!hero && (
          <aside className="hidden lg:block w-44 flex-shrink-0 bg-white border-r border-gray-200 p-3">
            <p className="text-[10px] font-bold text-primary-800 px-2 mb-2">Delta Marine Services</p>
            <ul className="space-y-0.5">
              {NAV.map(({ icon: Icon, label, active, badge }) => (
                <li key={label} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] ${active ? 'bg-primary-50 text-primary-800 font-semibold' : 'text-gray-600'}`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                  {badge && <span className="ml-auto text-[9px] font-bold bg-accent text-primary-900 rounded-full px-1.5">{badge}</span>}
                </li>
              ))}
            </ul>
          </aside>
        )}

        <div className="flex-1 min-w-0 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-900">Accommodation overview</p>
              <p className="text-[10px] text-gray-400">All projects · March</p>
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Illustrative data</span>
          </div>

          <div className={`grid gap-2 ${hero ? 'grid-cols-2' : 'grid-cols-2 xl:grid-cols-4'}`}>
            {KPIS.map((k) => <Kpi key={k.label} k={k} compact={hero} />)}
          </div>

          {hero ? (
            <ReservationsTable rows={RESERVATIONS.slice(0, 4)} showProject={false} />
          ) : (
            <div className="grid xl:grid-cols-[1fr_260px] gap-3">
              <ReservationsTable />
              <SpendChart />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
