import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader, CalendarClock, History } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import BookingHistoryCard from '../components/BookingHistoryCard';

const DONE_STATUSES = new Set(['checked_out', 'cancelled', 'no_show']);

export default function DashboardPage() {
  const { guest, loading: authLoading } = useAuth();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!guest) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    api.get('/reservations/mine')
      .then((r) => { if (!cancelled) setReservations(r.data.data || []); })
      .catch((err) => { if (!cancelled) setError(err.friendlyMessage || 'Unable to load your bookings right now.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guest]);

  // Wait for the auth check itself before deciding to redirect — otherwise
  // a guest who's actually signed in gets bounced to /login for the split
  // second before AuthContext's GET /api/me resolves.
  if (authLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }
  if (!guest) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const upcoming = reservations.filter((r) => !DONE_STATUSES.has(r.status));
  const past = reservations.filter((r) => DONE_STATUSES.has(r.status));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">My bookings</h1>
      <p className="text-sm text-gray-500 mb-6">Every stay you've booked with your account, at any hotel on Booqa.</p>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!loading && error && <p className="text-sm text-red-600 py-8 text-center">{error}</p>}

      {!loading && !error && reservations.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CalendarClock className="w-8 h-8 mx-auto mb-2" />
          <p>No bookings yet — once you book a stay while signed in, it'll show up here.</p>
        </div>
      )}

      {!loading && !error && reservations.length > 0 && (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3">
                <CalendarClock className="w-4 h-4" /> Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((r) => <BookingHistoryCard key={r.id} reservation={r} />)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-3">
                <History className="w-4 h-4" /> Past
              </h2>
              <div className="space-y-3">
                {past.map((r) => <BookingHistoryCard key={r.id} reservation={r} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
