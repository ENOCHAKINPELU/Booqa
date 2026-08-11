import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader, Building2, WifiOff, RotateCcw } from 'lucide-react';
import api from '../services/api';
import HotelCard from '../components/HotelCard';
import DateGuestPicker from '../components/DateGuestPicker';
import FilterPanel from '../components/FilterPanel';
import { tomorrowISO, defaultCheckOut } from '../utils/dates';
import { track } from '../utils/analytics';

// Results only - the hero/search entry point lives on LandingPage ("/").
// This page just refines and displays results for whatever search brought
// a guest here, and stays bookmarkable/shareable via its own URL. No city
// filter - Port Harcourt only for now (a market-scope decision, not a
// missing feature); GET /hotels already only returns what's opted in.
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [sort, setSort] = useState('recommended');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [priceRange, setPriceRange] = useState(null); // null = not yet clamped to real data

  const checkIn = searchParams.get('check_in') || tomorrowISO();
  const checkOut = searchParams.get('check_out') || defaultCheckOut(checkIn);
  const adults = Number(searchParams.get('adults') || 2);
  const children = Number(searchParams.get('children') || 0);

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
        const results = r.data.data || [];
        setHotels(results);
        track('search_completed', { result_count: results.length, check_in: checkIn, check_out: checkOut });
      })
      .catch(err => setError(!err.response ? 'network' : (err.friendlyMessage || 'Unable to load hotels right now.')))
      .finally(() => setLoading(false));
  };

  useEffect(fetchHotels, []);

  const dateParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('check_in', checkIn);
    p.set('check_out', checkOut);
    p.set('adults', String(adults));
    p.set('children', String(children));
    return p;
  }, [checkIn, checkOut, adults, children]);

  const updateDates = (patch) => {
    const next = new URLSearchParams(searchParams);
    next.set('check_in', patch.checkIn);
    next.set('check_out', patch.checkOut);
    next.set('adults', String(patch.adults));
    next.set('children', String(patch.children));
    setSearchParams(next);
  };

  // Every option offered is guaranteed to match at least one real hotel -
  // see FilterPanel.jsx for why nothing here is a fixed/aspirational list.
  const amenityOptions = useMemo(
    () => [...new Set(hotels.flatMap((h) => h.amenities || []))].sort(),
    [hotels]
  );
  const maxPrice = useMemo(
    () => hotels.reduce((max, h) => (h.from_price != null ? Math.max(max, h.from_price) : max), 0),
    [hotels]
  );
  const effectivePriceCap = priceRange ?? maxPrice;

  const toggleAmenity = (a) => {
    setSelectedAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const visibleHotels = useMemo(() => {
    let list = hotels.filter((h) => {
      if (h.from_price != null && effectivePriceCap && h.from_price > effectivePriceCap) return false;
      if (selectedAmenities.length && !selectedAmenities.every((a) => (h.amenities || []).includes(a))) return false;
      return true;
    });
    if (sort === 'price_asc') list = [...list].sort((a, b) => (a.from_price ?? Infinity) - (b.from_price ?? Infinity));
    if (sort === 'price_desc') list = [...list].sort((a, b) => (b.from_price ?? -Infinity) - (a.from_price ?? -Infinity));
    return list;
  }, [hotels, effectivePriceCap, selectedAmenities, sort]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-lg font-bold text-gray-900 mb-4">Hotels in Port Harcourt</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <DateGuestPicker
          checkIn={checkIn}
          checkOut={checkOut}
          adults={adults}
          children={children}
          onChange={updateDates}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        {!loading && !error && hotels.length > 0 && (
          <FilterPanel
            amenityOptions={amenityOptions}
            selectedAmenities={selectedAmenities}
            onToggleAmenity={toggleAmenity}
            maxPrice={maxPrice}
            priceRange={effectivePriceCap}
            onPriceChange={setPriceRange}
            sort={sort}
            onSortChange={setSort}
          />
        )}

        <div>
          {loading && (
            <div className="space-y-4" aria-busy="true" aria-label="Loading hotels">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-4 animate-pulse">
                  <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
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
              <p className="text-sm mt-1">Try different dates or explore other stays in Port Harcourt.</p>
            </div>
          )}

          {!loading && !error && hotels.length > 0 && visibleHotels.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="w-10 h-10 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No hotels match these filters.</p>
              <p className="text-sm mt-1">Try widening your price range or clearing an amenity filter.</p>
            </div>
          )}

          {!loading && !error && visibleHotels.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {visibleHotels.map((hotel) => (
                <HotelCard key={hotel.id} hotel={hotel} searchParams={dateParams} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
