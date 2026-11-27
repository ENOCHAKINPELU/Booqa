import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Search, MapPin, Building2, X } from 'lucide-react';
import WorkspaceShell, { PageTitle } from '../../components/business/WorkspaceShell';
import PhotoCarousel from '../../components/PhotoCarousel';
import { biz, errorMessage } from '../../services/businessApi';
import { facilityIcon, FACILITY_LABELS, byFacilityPriority } from '../../utils/facilities';
import { naira, inputCls } from './bizFormat';

/*
 * Hotel directory for companies: every hotel Booqa companies can book,
 * with the photos and facilities each hotel set up in HotelOps. Filters
 * are built from what the hotels actually offer, with counts.
 */

function Content() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const selected = (params.get('facility') || '').split(',').filter(Boolean);
  const [hotels, setHotels] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(q);

  useEffect(() => {
    biz.hotels().then(setHotels).catch((err) => setError(errorMessage(err)));
  }, []);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const facilityOptions = useMemo(() => {
    const counts = new Map();
    (hotels || []).forEach((h) => new Set(h.facilities.map((f) => f.key)).forEach((k) => counts.set(k, (counts.get(k) || 0) + 1)));
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: FACILITY_LABELS[key] || hotels.flatMap((h) => h.facilities).find((f) => f.key === key)?.name || key }))
      .sort((a, b) => byFacilityPriority(a, b))
      .slice(0, 10);
  }, [hotels]);

  const visible = useMemo(() => (hotels || []).filter((h) => {
    const term = q.trim().toLowerCase();
    if (term && ![h.name, h.area, h.city, h.state].some((x) => String(x || '').toLowerCase().includes(term))) return false;
    return selected.every((k) => h.facilities.some((f) => f.key === k));
  }), [hotels, q, selected]);

  const toggle = (key) => set({ facility: (selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]).join(',') });

  return (
    <>
      <PageTitle title="Hotels" subtitle="Browse the hotels your team can book, with their rooms and facilities." />

      <form onSubmit={(e) => { e.preventDefault(); set({ q: query.trim() }); }} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputCls} pl-10`} placeholder="Search by hotel, area or city" aria-label="Search hotels" />
        </div>
        <button className="bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl px-5">Search</button>
      </form>

      {facilityOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by facility">
          {facilityOptions.map((f) => {
            const Icon = facilityIcon(f);
            const on = selected.includes(f.key);
            return (
              <button key={f.key} onClick={() => toggle(f.key)} aria-pressed={on}
                className={`flex items-center gap-1.5 text-sm font-medium rounded-full border px-3 py-1.5 transition-colors
                  ${on ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'}`}>
                <Icon className="w-4 h-4" /> {f.label} <span className={on ? 'text-primary-100' : 'text-gray-400'}>{f.count}</span>
              </button>
            );
          })}
          {(selected.length > 0 || q) && (
            <button onClick={() => { setQuery(''); set({ q: '', facility: '' }); }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2">
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-6 text-red-700">{error}</p>}
      {!hotels && !error && <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>}
      {hotels && visible.length === 0 && (
        <div className="mt-8 rounded-2xl border border-gray-200 bg-white py-14 text-center text-gray-500">
          <Building2 className="w-8 h-8 mx-auto text-gray-300" />
          <p className="mt-2">{hotels.length ? 'No hotels match. Try clearing a filter.' : 'No hotels are available on Booqa yet.'}</p>
        </div>
      )}

      {hotels && visible.length > 0 && (
        <>
          <p className="mt-6 text-sm text-gray-500">{visible.length} hotel{visible.length === 1 ? '' : 's'}</p>
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((h) => (
              <li key={h.id}>
                <Link to={`/business/hotels/${h.id}`} className="group block h-full rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all duration-300">
                  <PhotoCarousel photos={h.photos} alt={h.name} className="h-48" />
                  <div className="p-4">
                    <h3 className="font-display text-lg font-bold text-gray-950 group-hover:text-navy transition-colors">{h.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" /> {[h.area, h.city].filter(Boolean).join(', ') || h.state}</p>
                    {h.facilities.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {[...h.facilities].sort(byFacilityPriority).slice(0, 4).map((f) => {
                          const Icon = facilityIcon(f);
                          return <li key={f.key} className="flex items-center gap-1 text-xs font-medium text-primary-800 bg-primary-50 rounded-full px-2 py-1"><Icon className="w-3.5 h-3.5" /> {FACILITY_LABELS[f.key] || f.name}</li>;
                        })}
                        {h.facilities.length > 4 && <li className="text-xs text-gray-500 px-1 py-1">+{h.facilities.length - 4} more</li>}
                      </ul>
                    )}
                    {h.from_per_night && (
                      <p className="mt-3 pt-3 border-t border-gray-100 text-sm">
                        <span className="text-gray-500">From </span>
                        <span className="font-bold text-gray-950">{naira(h.from_per_night)}</span>
                        <span className="text-gray-500"> / room / night</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function HotelsPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}

