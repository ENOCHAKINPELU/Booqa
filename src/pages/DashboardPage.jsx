import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { Loader, CalendarClock, Heart, Star, User, QrCode, MapPin, Building2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDisplay } from '../utils/dates';

const ACTIVE_UPCOMING = new Set(['confirmed', 'checked_in']);

// The dashboard's job is one thing: surface the next real thing a guest
// needs (their next stay), then get out of the way with links to the
// fuller pages (Module 1 vs Module 2's split) — not duplicate the full
// booking list here too.
export default function DashboardPage() {
  const { guest, loading: authLoading } = useAuth();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guest) return;
    let cancelled = false;
    api.get('/reservations/mine')
      .then((r) => { if (!cancelled) setReservations(r.data.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [guest]);

  if (authLoading) {
    return <div className="max-w-3xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }
  if (!guest) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const upcoming = reservations
    .filter((r) => ACTIVE_UPCOMING.has(r.status))
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
  const nextStay = upcoming[0];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back, {guest.full_name?.split(' ')[0]}</h1>
      <p className="text-sm text-gray-500 mb-6">Your Booqa account</p>

      {loading && <div className="flex justify-center py-8 text-gray-400"><Loader className="w-5 h-5 animate-spin" /></div>}

      {!loading && nextStay && (
        <div className="bg-navy rounded-2xl p-6 text-white mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-200 mb-3">Your next stay</p>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold">{nextStay.hotels?.name}</h2>
              {nextStay.room_types?.name && <p className="text-primary-100 text-sm mt-0.5">{nextStay.room_types.name}</p>}
              <p className="flex items-center gap-1 text-primary-100 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" /> {[nextStay.hotels?.city, nextStay.hotels?.state].filter(Boolean).join(', ')}
              </p>
              <p className="text-white font-medium mt-2">
                {formatDisplay(nextStay.check_in_date)} → {formatDisplay(nextStay.check_out_date)}
              </p>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-accent text-primary-900 rounded-full px-2 py-1 mt-2">
                {nextStay.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Link
              to={`/account/bookings/${nextStay.id}?hotel_id=${nextStay.hotels?.id || ''}`}
              className="flex items-center gap-1.5 bg-white text-primary-900 text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary-50 transition-colors"
            >
              View booking
            </Link>
            <Link
              to={`/reservations/${nextStay.id}/confirmation?hotel_id=${nextStay.hotels?.id || ''}`}
              className="flex items-center gap-1.5 bg-white/10 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-white/20 transition-colors"
            >
              <QrCode className="w-4 h-4" /> Show QR code
            </Link>
          </div>
        </div>
      )}

      {!loading && !nextStay && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center mb-6 text-gray-400">
          <CalendarClock className="w-7 h-7 mx-auto mb-2" />
          <p className="text-sm">No upcoming stays right now.</p>
          <Link to="/search" className="text-sm font-medium text-primary-700 hover:text-primary-800 mt-2 inline-block">Find a hotel in Port Harcourt →</Link>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/account/bookings" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all text-center">
          <CalendarClock className="w-5 h-5 text-primary-700" />
          <span className="text-xs font-medium text-gray-700">My bookings</span>
        </Link>
        <Link to="/account/saved" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all text-center">
          <Heart className="w-5 h-5 text-primary-700" />
          <span className="text-xs font-medium text-gray-700">Saved hotels</span>
        </Link>
        <Link to="/account/bookings?tab=completed" className="flex flex-col items-center gap-2 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all text-center">
          <Star className="w-5 h-5 text-primary-700" />
          <span className="text-xs font-medium text-gray-700">Reviews</span>
        </Link>
        <div className="flex flex-col items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 p-4 text-center opacity-60" title="Coming soon">
          <User className="w-5 h-5 text-gray-400" />
          <span className="text-xs font-medium text-gray-500">Profile</span>
        </div>
      </div>
    </div>
  );
}
