import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, MapPin, Building2, X } from 'lucide-react';
import HotelSearchBar, { readSearch } from '../../components/business/HotelSearchBar';
import PhotoCarousel from '../../components/PhotoCarousel';
import { biz, errorMessage } from '../../services/businessApi';
import { facilityIcon, FACILITY_LABELS, byFacilityPriority } from '../../utils/facilities';
import { naira } from './bizFormat';

const HIDDEN_FACILITY_FILTERS = new Set(['power', 'wifi', 'pool', 'restaurant', 'gym']);

/*
 * Hotel directory: every hotel Booqa companies can book, with the photos
 * and facilities each hotel set up in HotelOps. Filters come from what the
 * hotels actually offer, with counts.
 *
 *   /hotels   anyone, signed in or not, with the search bar
 * Dates and rooms from the search travel along to the hotel page so
 * "Book rooms here" can pre-fill the booking.
 */


export function HotelCard({ h, href }) {
  return (
    <Link to={href} className="group block h-full rounded-2xl bg-white border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 hover:border-primary-200 transition-all duration-500 ease-out">
      <PhotoCarousel photos={h.photos} alt={h.name} className="h-52" />
      <div className="p-5">
        <div className="flex items-center gap-2.5">
          {h.logo_url && <img src={h.logo_url} alt="" className="w-9 h-9 rounded-lg border border-gray-100 object-contain bg-white p-1 flex-shrink-0" loading="lazy" />}
          <h3 className="font-display text-lg font-bold text-gray-950 group-hover:text-navy transition-colors">{h.name}</h3>
        </div>
        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5 min-w-0"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate min-w-0">{[h.address, h.area, h.city].filter(Boolean).join(', ') || h.state}</span></p>
        {h.distance_km != null && (
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy bg-primary-50 rounded-full px-2.5 py-1">
            {h.distance_km < 0.5 ? 'Right here' : `${h.approximate ? 'About ' : ''}${h.distance_km} km away`}
          </p>
        )}
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
          <p className="mt-4 pt-3 border-t border-gray-100 text-sm">
            <span className="text-gray-500">From </span>
            <span className="font-bold text-gray-950">{naira(h.from_per_night)}</span>
            <span className="text-gray-500"> / room / night</span>
          </p>
        )}
      </div>
    </Link>
  );
}

function Directory() {
  const [params, setParams] = useSearchParams();
  const search = readSearch(params);
  const text = params.get('city') || params.get('q') || '';
  const selected = (params.get('facility') || '').split(',').filter(Boolean);
  const [hotels, setHotels] = useState(null);
  const [error, setError] = useState('');

  // The server does the search: a hotel name, or a place ranked by real
  // distance ("peter odili port harcourt").
  const [place, setPlace] = useState(null);
  const [far, setFar] = useState(false);
  useEffect(() => {
    setHotels(null);
    setError('');
    const params = text ? { where: text } : undefined;
    biz.publicHotels(params)
      .then((r) => { setHotels(r.hotels); setPlace(r.place); setFar(r.far); })
      .catch((err) => setError(errorMessage(err)));
  }, [text]);

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const facilityOptions = useMemo(() => {
    const counts = new Map();
    (hotels || []).forEach((h) => new Set(h.facilities.map((f) => f.key)).forEach((k) => counts.set(k, (counts.get(k) || 0) + 1)));
    return [...counts.entries()]
      .filter(([key]) => !HIDDEN_FACILITY_FILTERS.has(key))
      .map(([key, count]) => ({ key, count, label: FACILITY_LABELS[key] || hotels.flatMap((h) => h.facilities).find((f) => f.key === key)?.name || key }))
      .sort(byFacilityPriority)
      .slice(0, 10);
  }, [hotels]);

  const visible = useMemo(() => (hotels || [])
    .filter((h) => selected.every((k) => h.facilities.some((f) => f.key === k)))
    .map((hotel, index) => ({ hotel, index }))
    .sort((a, b) => (b.hotel.facilities?.length || 0) - (a.hotel.facilities?.length || 0) || a.index - b.index)
    .map(({ hotel }) => hotel), [hotels, selected]);

  const toggle = (key) => set({ facility: (selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]).join(',') });
  // Carry the search to the hotel page.
  const carry = new URLSearchParams(Object.entries({ city: params.get('city'), check_in: params.get('check_in'), check_out: params.get('check_out'), rooms: params.get('rooms') }).filter(([, v]) => v)).toString();
  const hrefFor = (h) => `/hotels/${h.id}${carry ? `?${carry}` : ''}`;

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-950">Find hotels for your team</h1>
        <p className="mt-2 text-gray-600">Browse hotels, rooms and facilities. Sign in only when you're ready to book.</p>
        <div className="mt-6">
          <HotelSearchBar compact initial={search} onSearch={(s) => set({ city: s.city, q: '', check_in: s.check_in, check_out: s.check_out, rooms: s.rooms })} />
        </div>
      </div>

      {facilityOptions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Filter by facility">
          {facilityOptions.map((f) => {
            const Icon = facilityIcon(f);
            const on = selected.includes(f.key);
            return (
              <button key={f.key} onClick={() => toggle(f.key)} aria-pressed={on}
                className={`flex items-center gap-1.5 text-sm font-medium rounded-full border px-3 py-1.5 transition-colors duration-300
                  ${on ? 'bg-navy border-navy text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-primary-300'}`}>
                <Icon className="w-4 h-4" /> {f.label} <span className={on ? 'text-primary-100' : 'text-gray-400'}>{f.count}</span>
              </button>
            );
          })}
          {(selected.length > 0 || text) && (
            <button onClick={() => set({ q: '', city: '', facility: '' })} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2">
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
          <p className="mt-2">{place && far ? `No Booqa hotels are near ${place.label} yet.` : hotels.length ? `No hotels match${text ? ` "${text}"` : ''}. Try another city or clear a filter.` : 'No hotels are available on Booqa yet.'}</p>
        </div>
      )}
      {hotels && visible.length > 0 && (
        <>
          <p className="mt-6 text-sm text-gray-600">
            {place
              ? (far
                ? <>No hotels within the search area of <strong className="text-gray-900">{place.label}</strong> yet.</>
                : <>{visible.length} hotel{visible.length === 1 ? '' : 's'} near <strong className="text-gray-900">{place.label}</strong>, most facilities first</>)
              : <>{visible.length} hotel{visible.length === 1 ? '' : 's'}{text ? ` for "${text}"` : ''}, most facilities first</>}
          </p>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map((h) => <li key={h.id} className="min-w-0"><HotelCard h={h} href={hrefFor(h)} /></li>)}
          </ul>
        </>
      )}
    </>
  );
}

/** /hotels - no sign-in. Rendered inside the site's normal header/footer. */
export function PublicHotelsPage() {
  useEffect(() => { document.title = 'Find hotels — Booqa'; }, []);
  return (
    <div className="bg-gray-50 min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"><Directory /></div>
    </div>
  );
}
