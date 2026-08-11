import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader, HeartOff } from 'lucide-react';
import api, { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HotelCard from '../components/HotelCard';
import { tomorrowISO, defaultCheckOut } from '../utils/dates';

// Favorites (api/favorites.js, Booqa-owned) only ever returns hotel_ids -
// this page joins them against the real, already-public hotel listing
// (GET /hotels) rather than granting booqa_app its own read path into
// hotels. See 029's migration note for the full reasoning.
export default function SavedHotelsPage() {
  const { guest, loading: authLoading } = useAuth();
  const location = useLocation();

  const [favoriteIds, setFavoriteIds] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guest) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([authApi.get('/favorites'), api.get('/hotels')])
      .then(([favRes, hotelsRes]) => {
        if (cancelled) return;
        const ids = new Set((favRes.data.data || []).map((f) => f.hotel_id));
        setFavoriteIds(ids);
        setHotels((hotelsRes.data.data || []).filter((h) => ids.has(h.id)));
      })
      .catch((err) => { if (!cancelled) setError(err.friendlyMessage || 'Unable to load saved hotels right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guest]);

  const dateParams = useMemo(() => {
    const p = new URLSearchParams();
    const ci = tomorrowISO();
    p.set('check_in', ci);
    p.set('check_out', defaultCheckOut(ci));
    p.set('adults', '2');
    p.set('children', '0');
    return p;
  }, []);

  if (authLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }
  if (!guest) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Saved hotels</h1>
      <p className="text-sm text-gray-500 mb-6">Hotels you've saved for later.</p>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!loading && error && <p className="text-sm text-red-600 py-8 text-center">{error}</p>}

      {!loading && !error && hotels.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <HeartOff className="w-8 h-8 mx-auto mb-2" />
          <p>No saved hotels yet - tap the heart on any hotel to save it here.</p>
        </div>
      )}

      {!loading && !error && hotels.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {hotels.map((hotel) => (
            <HotelCard key={hotel.id} hotel={hotel} searchParams={dateParams} initialSaved />
          ))}
        </div>
      )}
    </div>
  );
}
