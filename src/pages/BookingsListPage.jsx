import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Loader, CalendarClock } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingHistoryCard from '../components/BookingHistoryCard';

const TABS = [
  { key: 'upcoming', label: 'Upcoming', statuses: ['pending_payment', 'confirmed', 'checked_in'] },
  { key: 'completed', label: 'Completed', statuses: ['checked_out'] },
  { key: 'cancelled', label: 'Cancelled', statuses: ['cancelled', 'no_show'] },
];

export default function BookingsListPage() {
  const { guest, loading: authLoading } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeTab = TABS.find((t) => t.key === searchParams.get('tab')) || TABS[0];

  useEffect(() => {
    if (!guest) return;
    let cancelled = false;
    setLoading(true);
    api.get('/reservations/mine')
      .then((r) => { if (!cancelled) setReservations(r.data.data || []); })
      .catch((err) => { if (!cancelled) setError(err.friendlyMessage || 'Unable to load your bookings right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guest]);

  const filtered = useMemo(
    () => reservations.filter((r) => activeTab.statuses.includes(r.status)),
    [reservations, activeTab]
  );

  if (authLoading) return <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  if (!guest) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">My bookings</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSearchParams({ tab: t.key })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab.key === t.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-16 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>}
      {!loading && error && <p className="text-sm text-red-600 py-8 text-center">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarClock className="w-8 h-8 mx-auto mb-2" />
          <p>No {activeTab.label.toLowerCase()} bookings.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((r) => <BookingHistoryCard key={r.id} reservation={r} />)}
        </div>
      )}
    </div>
  );
}
