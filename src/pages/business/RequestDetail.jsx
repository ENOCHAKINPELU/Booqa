import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, BedDouble, Users, Briefcase, Wallet, Check, CircleDot, Hotel, FileText } from 'lucide-react';
import StatusPill from '../../components/business/RequestStatus';
import { naira, dateRange, when, EVENT_LABELS } from './bizFormat';

/*
 * Parts of a request shown the same way to the company and to the Booqa
 * operations team.
 */

const STEPS = ['requested', 'pending', 'confirmed', 'checked_in', 'completed'];
const STEP_LABEL = { requested: 'Choose hotel', pending: 'Pay', confirmed: 'Confirmed', checked_in: 'Checked in', completed: 'Completed' };

export function Progress({ status }) {
  if (status === 'cancelled') return null;
  const at = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-1 flex-shrink-0">
          <span className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1
            ${i < at ? 'text-navy' : i === at ? 'bg-navy text-white' : 'text-gray-400'}`}>
            {i < at ? <Check className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />} {STEP_LABEL[s]}
          </span>
          {i < STEPS.length - 1 && <span className={`w-4 h-px ${i < at ? 'bg-navy' : 'bg-gray-200'}`} aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

export function RequestHeader({ r, showOrg = false }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {r.hotel_logo_url && <img src={r.hotel_logo_url} alt={`${r.hotel_name} logo`} className="w-14 h-14 rounded-xl border border-gray-200 bg-white object-contain p-1.5 mb-2" />}
          <p className="font-mono text-sm font-semibold text-gray-500">{r.reference}{showOrg && ` · ${r.org_name}`}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-950">{r.city}{r.area ? `, ${r.area}` : ''}</h1>
        </div>
        <StatusPill status={r.status} />
      </div>
      <div className="mt-4"><Progress status={r.status} /></div>
      <dl className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <Fact icon={CalendarDays} label="Dates" value={`${dateRange(r.check_in, r.check_out)} · ${r.nights} night${r.nights === 1 ? '' : 's'}`} />
        <Fact icon={BedDouble} label="Rooms" value={r.rooms} />
        <Fact icon={Briefcase} label="Project" value={r.project || '—'} />
        <Fact icon={Wallet} label="Budget / room / night" value={r.budget_per_night ? naira(r.budget_per_night) : 'Any'} />
        <Fact icon={Users} label="Requested by" value={r.requested_by_name || '—'} />
        {r.hotel_name && <Fact icon={Hotel} label="Hotel" value={`${r.hotel_name}${r.room_type_name ? ` · ${r.room_type_name}` : ''}`} />}
      </dl>
      {r.guests?.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Guests</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {r.guests.map((g, i) => (
              <li key={i} className="text-sm bg-gray-50 rounded-lg px-3 py-1.5">{g.name}{g.phone && <span className="text-gray-500"> · {g.phone}</span>}{g.email && <span className="text-gray-500"> · {g.email}</span>}</li>
            ))}
          </ul>
        </div>
      )}
      {r.preferences && <p className="mt-5 text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{r.preferences}</p>}
      {r.status === 'cancelled' && r.cancelled_reason && <p className="mt-5 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">Cancelled: {r.cancelled_reason}</p>}
    </div>
  );
}

function Fact({ icon: Icon, label, value }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-gray-500"><Icon className="w-3.5 h-3.5" /> {label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export function BookingSummary({ r, receipt = false }) {
  if (!r.reservations?.length || !['confirmed', 'checked_in', 'completed'].includes(r.status)) return null;
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {r.hotel_logo_url && <img src={r.hotel_logo_url} alt="" className="w-9 h-9 rounded-lg border border-gray-100 object-contain p-1" />}
          <h2 className="font-semibold text-gray-950">Booking at {r.hotel_name}</h2>
        </div>
        <p className="text-sm text-gray-600">Paid <strong className="text-gray-950">{naira(r.total_cost)}</strong>{r.paid_at && ` · ${when(r.paid_at)}`}</p>
      </div>
      <p className="text-sm text-gray-500 mt-1">Each guest can show their booking reference at the front desk.</p>
      {receipt && (
        <Link to={`/business/requests/${r.id}/receipt`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline">
          <FileText className="w-4 h-4" /> Receipt
        </Link>
      )}
      <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-xl">
        {r.reservations.map((res, i) => (
          <li key={res.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-gray-700">Room {res.room_number || i + 1}{res.room_type_name ? ` · ${res.room_type_name}` : ''}{res.guest_name ? ` · ${res.guest_name}` : ''}</span>
            <span className="font-mono font-semibold text-gray-950">{res.booking_reference}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Timeline({ events }) {
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <h2 className="font-semibold text-gray-950">Activity</h2>
      <ol className="mt-4 space-y-4 border-l border-gray-200 ml-1.5">
        {events.map((e, i) => (
          <li key={i} className="pl-4 relative">
            <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${e.actor_side === 'booqa' ? 'bg-accent' : 'bg-navy'}`} aria-hidden="true" />
            <p className="text-sm font-medium text-gray-900">{EVENT_LABELS[e.action] || e.action}</p>
            {e.note && <p className="text-sm text-gray-600">{e.note}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{e.actor_side === 'booqa' ? 'Booqa' : e.actor_name || 'Your team'} · {when(e.created_at)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
