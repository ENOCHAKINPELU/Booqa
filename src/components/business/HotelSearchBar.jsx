import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, BedDouble, Search } from 'lucide-react';
import { tomorrowISO, defaultCheckOut } from '../../utils/dates';

/*
 * "Find hotels" search used on the landing page and the public /hotels
 * page. No sign-in needed: it opens the public hotel list, carrying the
 * dates and rooms through so "Book rooms here" can pre-fill the booking.
 */
export function readSearch(params) {
  const check_in = params.get('check_in') || tomorrowISO();
  return {
    city: params.get('city') || '',
    check_in,
    check_out: params.get('check_out') || defaultCheckOut(check_in),
    rooms: params.get('rooms') || '1',
  };
}

export function searchQuery(s) {
  return new URLSearchParams(Object.entries(s).filter(([, v]) => v)).toString();
}

const field = 'flex items-center gap-2.5 px-4 py-3 rounded-xl bg-white';
const input = 'w-full bg-transparent text-sm font-semibold text-gray-900 focus:outline-none';
const label = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500';

export default function HotelSearchBar({ initial, compact = false, onSearch }) {
  const navigate = useNavigate();
  const [s, setS] = useState(initial || { city: '', check_in: tomorrowISO(), check_out: defaultCheckOut(tomorrowISO()), rooms: '1' });
  const set = (k) => (e) => setS((x) => ({ ...x, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(s);
    else navigate(`/hotels?${searchQuery(s)}`);
  };

  return (
    <form onSubmit={submit}
      className={`grid gap-2 p-2 rounded-2xl bg-gray-100/80 border border-gray-200 ${compact ? 'sm:grid-cols-[1.3fr_1fr_1fr_0.6fr_auto]' : 'sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.6fr_auto]'}`}>
      <label className={field}>
        <MapPin className="w-5 h-5 text-navy flex-shrink-0" />
        <span className="flex-1 min-w-0"><span className={label}>Where</span>
          <input value={s.city} onChange={set('city')} className={input} placeholder="City or area" />
        </span>
      </label>
      <label className={field}>
        <CalendarDays className="w-5 h-5 text-navy flex-shrink-0" />
        <span className="flex-1 min-w-0"><span className={label}>Check-in</span>
          <input type="date" value={s.check_in} min={tomorrowISO()}
            onChange={(e) => setS((x) => ({ ...x, check_in: e.target.value, check_out: x.check_out > e.target.value ? x.check_out : defaultCheckOut(e.target.value) }))}
            className={input} />
        </span>
      </label>
      <label className={field}>
        <CalendarDays className="w-5 h-5 text-navy flex-shrink-0" />
        <span className="flex-1 min-w-0"><span className={label}>Check-out</span>
          <input type="date" value={s.check_out} min={s.check_in} onChange={set('check_out')} className={input} />
        </span>
      </label>
      <label className={field}>
        <BedDouble className="w-5 h-5 text-navy flex-shrink-0" />
        <span className="flex-1 min-w-0"><span className={label}>Rooms</span>
          <input type="number" min="1" max="20" value={s.rooms} onChange={set('rooms')} className={input} />
        </span>
      </label>
      <button className="group inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl px-6 py-3 transition-all duration-300 ease-out sm:col-span-2 lg:col-span-1">
        <Search className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" /> Find hotels
      </button>
    </form>
  );
}
