import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, WifiOff, RotateCcw, ChevronRight, SlidersHorizontal, X, Search, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import ResultCard from '../components/ResultCard';
import DateGuestPicker from '../components/DateGuestPicker';
import FilterPanel from '../components/FilterPanel';
import { tomorrowISO, defaultCheckOut, formatDisplay, nights as countNights } from '../utils/dates';
import { track } from '../utils/analytics';
import { hotelFromPrice } from '../utils/pricing';
import { FACILITY_LABELS, byFacilityPriority } from '../utils/facilities';
import { destinationsFrom, inPlace } from '../utils/destinations';
import WherePicker from '../components/WherePicker';

// Results only - the hero/search entry point lives on LandingPage ("/").
// Every filter and the sort live in the URL (facility=, area=, amenity=,
// max_price=, sort=) so a search can be bookmarked or shared and the home
// page's "Stay by what matters" shortcuts can link straight into one.
// Booqa covers Nigeria: city= narrows to one city (or state); without it
// the page shows every live hotel in the country. Which cities exist comes
// from the live hotels themselves (utils/destinations.js).

const SORTS = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price_asc', label: 'Lowest price' },
  { key: 'price_desc', label: 'Highest price' },
];

const listParam = (sp, key) => (sp.get(key) || '').split(',').map((s) => s.trim()).filter(Boolean);

function countBy(hotels, getValues) {
  const counts = new Map();
  for (const h of hotels) for (const v of new Set(getValues(h))) counts.set(v, (counts.get(v) || 0) + 1);
  return counts;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const checkIn = searchParams.get('check_in') || tomorrowISO();
  const checkOut = searchParams.get('check_out') || defaultCheckOut(checkIn);
  const adults = Number(searchParams.get('adults') || 2);
  const children = Number(searchParams.get('children') || 0);
  const sort = searchParams.get('sort') || 'recommended';
  const selectedFacilities = listParam(searchParams, 'facility');
  const selectedAreas = listParam(searchParams, 'area');
  const selectedAmenities = listParam(searchParams, 'amenity');
  const maxPriceParam = Number(searchParams.get('max_price')) || null;

  useEffect(() => {
    if (!searchParams.get('check_in') || !searchParams.get('check_out')) {
      const next = new URLSearchParams(searchParams);
      next.set('check_in', checkIn);
      next.set('check_out', checkOut);
      if (!next.get('adults')) next.set('adults', String(adults));
      if (!next.get('children')) next.set('children', String(children));
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchHotels = () => {
    setLoading(true);
    setError('');
    api.get('/hotels')
      .then(r => {
        // display_price = the all-in per-night price each card shows, so
        // the price filter and sort work on the same number the guest sees.
        const results = (r.data.data || []).map((h) => ({ ...h, display_price: hotelFromPrice(h)?.perNight ?? null }));
        setHotels(results);
        track('search_completed', { result_count: results.length, check_in: checkIn, check_out: checkOut });
      })
      .catch(err => setError(!err.response ? 'network' : (err.friendlyMessage || 'Unable to load hotels right now.')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchHotels, []);

  // Card links carry only the stay details, not the filters.
  const dateParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('check_in', checkIn);
    p.set('check_out', checkOut);
    p.set('adults', String(adults));
    p.set('children', String(children));
    return p;
  }, [checkIn, checkOut, adults, children]);

  const patchParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    setSearchParams(next, { replace: true });
  };

  const updateDates = (d) => patchParams({ check_in: d.checkIn, check_out: d.checkOut, adults: d.adults, children: d.children });
  const toggleIn = (key, list, value) => patchParams({ [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] });

  // The chosen city (city=) narrows everything below - results, price
  // range and filter counts. No city = all of Nigeria.
  const city = searchParams.get('city') || '';
  const destinations = useMemo(() => destinationsFrom(hotels), [hotels]);
  const placeHotels = useMemo(() => hotels.filter((h) => inPlace(h, city)), [hotels, city]);
  const placeName = city || 'Nigeria';

  const maxPrice = useMemo(
    () => placeHotels.reduce((max, h) => (h.display_price != null ? Math.max(max, h.display_price) : max), 0),
    [placeHotels]
  );
  const priceCap = maxPriceParam && maxPriceParam < maxPrice ? maxPriceParam : maxPrice;

  const facilityOptions = useMemo(() => {
    const counts = countBy(placeHotels, (h) => (h.facilities || []).map((f) => f.key));
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: FACILITY_LABELS[key] || placeHotels.flatMap((h) => h.facilities || []).find((f) => f.key === key)?.name || key }))
      .sort(byFacilityPriority)
      .slice(0, 8);
  }, [placeHotels]);
  const areaOptions = useMemo(
    () => [...countBy(placeHotels, (h) => (h.area ? [h.area] : [])).entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    [placeHotels]
  );
  const amenityOptions = useMemo(
    () => [...countBy(placeHotels, (h) => h.amenities || []).entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    [placeHotels]
  );

  const visibleHotels = useMemo(() => {
    let list = placeHotels.filter((h) => {
      if (h.display_price != null && priceCap && h.display_price > priceCap) return false;
      if (selectedFacilities.length && !selectedFacilities.every((k) => (h.facilities || []).some((f) => f.key === k))) return false;
      if (selectedAreas.length && !selectedAreas.includes(h.area)) return false;
      if (selectedAmenities.length && !selectedAmenities.every((a) => (h.amenities || []).includes(a))) return false;
      return true;
    });
    if (sort === 'price_asc') list = [...list].sort((a, b) => (a.display_price ?? Infinity) - (b.display_price ?? Infinity));
    if (sort === 'price_desc') list = [...list].sort((a, b) => (b.display_price ?? -Infinity) - (a.display_price ?? -Infinity));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeHotels, priceCap, searchParams, sort]);

  const activeCount = selectedFacilities.length + selectedAreas.length + selectedAmenities.length + (priceCap < maxPrice ? 1 : 0);
  const clearFilters = () => patchParams({ facility: null, area: null, amenity: null, max_price: null });
  const stayNights = countNights(checkIn, checkOut);

  const panel = (onClose) => (
    <FilterPanel
      maxPrice={maxPrice} priceRange={priceCap}
      onPriceChange={(v) => patchParams({ max_price: v >= maxPrice ? null : v })}
      facilityOptions={facilityOptions} selectedFacilities={selectedFacilities}
      onToggleFacility={(k) => toggleIn('facility', selectedFacilities, k)}
      areaOptions={areaOptions} selectedAreas={selectedAreas}
      onToggleArea={(a) => toggleIn('area', selectedAreas, a)}
      amenityOptions={amenityOptions} selectedAmenities={selectedAmenities}
      onToggleAmenity={(a) => toggleIn('amenity', selectedAmenities, a)}
      activeCount={activeCount} onClear={clearFilters} onClose={onClose}
    />
  );

  const chips = [
    ...selectedFacilities.map((k) => ({ label: FACILITY_LABELS[k] || k, remove: () => toggleIn('facility', selectedFacilities, k) })),
    ...selectedAreas.map((a) => ({ label: a, remove: () => toggleIn('area', selectedAreas, a) })),
    ...selectedAmenities.map((a) => ({ label: a, remove: () => toggleIn('amenity', selectedAmenities, a) })),
    ...(priceCap < maxPrice ? [{ label: `Up to ₦${priceCap.toLocaleString()}`, remove: () => patchParams({ max_price: null }) }] : []),
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Search bar band */}
      <div className="bg-navy">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <nav aria-label="Breadcrumb" className="text-xs text-primary-200 mb-3 flex items-center gap-1">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3 h-3" />
            {city ? (
              <>
                <button type="button" onClick={() => patchParams({ city: null })} className="hover:text-white">Nigeria</button>
                <ChevronRight className="w-3 h-3" />
                <span className="text-white">{city}</span>
              </>
            ) : <span className="text-white">Nigeria</span>}
          </nav>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-lg grid gap-3 lg:grid-cols-[260px_1fr] lg:items-end">
            <WherePicker
              value={city}
              onChange={(v) => patchParams({ city: v || null, area: null })}
              destinations={destinations}
            />
            <DateGuestPicker checkIn={checkIn} checkOut={checkOut} adults={adults} children={children} onChange={updateDates} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {loading ? `Hotels in ${placeName}` : `${visibleHotels.length} hotel${visibleHotels.length === 1 ? '' : 's'} in ${placeName}`}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDisplay(checkIn)} to {formatDisplay(checkOut)} · {stayNights} night{stayNights === 1 ? '' : 's'} · {adults} adult{adults === 1 ? '' : 's'}{children ? `, ${children} children` : ''}
            </p>
          </div>
          <p className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-primary-700" /> Every hotel verified · prices include all fees
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[270px_1fr] gap-6 items-start">
          {!loading && !error && hotels.length > 0 && (
            <aside className="hidden lg:block lg:sticky lg:top-24">{panel(null)}</aside>
          )}

          <div className="min-w-0">
            {!loading && !error && hotels.length > 0 && (
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl overflow-x-auto" role="tablist" aria-label="Sort results">
                  {SORTS.map((s) => (
                    <button key={s.key} role="tab" aria-selected={sort === s.key}
                      onClick={() => patchParams({ sort: s.key === 'recommended' ? null : s.key })}
                      className={`text-sm font-medium rounded-lg px-3 py-1.5 whitespace-nowrap transition-colors
                        ${sort === s.key ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setFiltersOpen(true)}
                  className="lg:hidden btn-secondary flex items-center gap-1.5 text-sm flex-shrink-0">
                  <SlidersHorizontal className="w-4 h-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
                </button>
              </div>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {chips.map((c) => (
                  <button key={c.label} onClick={c.remove}
                    className="flex items-center gap-1 text-xs font-medium text-primary-800 bg-primary-50 border border-primary-100 rounded-full pl-3 pr-2 py-1 hover:bg-primary-100">
                    {c.label} <X className="w-3.5 h-3.5" aria-label={`Remove ${c.label}`} />
                  </button>
                ))}
                <button onClick={clearFilters} className="text-xs font-medium text-gray-500 hover:text-gray-800 px-1">Clear all</button>
              </div>
            )}

            {loading && (
              <div className="space-y-4" aria-busy="true" aria-label="Loading hotels">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-200 flex flex-col sm:flex-row overflow-hidden animate-pulse">
                    <div className="sm:w-72 h-52 bg-gray-100" />
                    <div className="flex-1 p-5 space-y-3">
                      <div className="h-5 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && error === 'network' && (
              <div className="text-center py-16 text-gray-400">
                <WifiOff className="w-10 h-10 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Unable to reach Booqa</p>
                <p className="text-sm mt-1">Check your connection and try again.</p>
                <button onClick={fetchHotels} className="btn-secondary inline-flex items-center gap-1.5 mt-4">
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {!loading && error && error !== 'network' && (
              <div className="text-center py-16 text-red-600">
                <p>{error}</p>
                <button onClick={fetchHotels} className="btn-secondary inline-flex items-center gap-1.5 mt-4">
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
              </div>
            )}

            {!loading && !error && hotels.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-10 h-10 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No hotels available for these dates.</p>
                <p className="text-sm mt-1">Try different dates.</p>
              </div>
            )}

            {!loading && !error && hotels.length > 0 && visibleHotels.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                {city && placeHotels.length === 0 ? (
                  <>
                    <p className="text-gray-700 font-medium">No hotels on Booqa in {city} yet.</p>
                    <p className="text-sm text-gray-500 mt-1">We're adding more Nigerian cities as hotels join.</p>
                    <button onClick={() => patchParams({ city: null })} className="btn-secondary mt-4">Search all of Nigeria</button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 font-medium">No hotels match these filters.</p>
                    <button onClick={clearFilters} className="btn-secondary mt-4">Clear filters</button>
                  </>
                )}
              </div>
            )}

            {!loading && !error && visibleHotels.length > 0 && (
              <div className="space-y-4">
                {visibleHotels.map((hotel) => (
                  <ResultCard key={hotel.id} hotel={hotel} searchParams={dateParams} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone filters: full-height sheet */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setFiltersOpen(false)}>
          <div className="w-full max-h-[88vh] overflow-y-auto rounded-t-2xl bg-gray-50 p-3" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Filters">
            {panel(() => setFiltersOpen(false))}
            <button onClick={() => setFiltersOpen(false)} className="btn-primary w-full mt-3 py-3">
              Show {visibleHotels.length} hotel{visibleHotels.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
