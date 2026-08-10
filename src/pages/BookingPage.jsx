import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader, UserCheck } from 'lucide-react';
import api, { newIdempotencyKey } from '../services/api';
import { formatDisplay, formatMoney, nights } from '../utils/dates';
import { useAuth } from '../context/AuthContext';
import { track } from '../utils/analytics';

export default function BookingPage() {
  const { hotelId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guest } = useAuth();

  const roomTypeId = searchParams.get('room_type_id');
  const checkIn = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');
  const adults = Number(searchParams.get('adults') || 1);
  const children = Number(searchParams.get('children') || 0);

  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ guest_name: '', guest_email: '', guest_phone: '', company: '', expected_arrival_time: '', special_requests: '' });
  const [showOptional, setShowOptional] = useState(false);

  // Signed-in guests skip retyping their details — the account link itself
  // is bound server-side from the session cookie (api/proxy/[...path].js),
  // not from anything sent in this form, so prefilling here is purely a
  // convenience, not a trust boundary.
  useEffect(() => {
    if (guest) {
      setForm((f) => ({
        guest_name: f.guest_name || guest.full_name,
        guest_email: f.guest_email || guest.email,
        guest_phone: f.guest_phone || guest.phone || '',
      }));
    }
  }, [guest]);

  // Generated once per checkout attempt — reused across retries so a
  // network hiccup or a double-tap on "Confirm booking" can't create two
  // reservations for the same attempt.
  const idempotencyKey = useRef(newIdempotencyKey());

  useEffect(() => {
    if (!roomTypeId || !checkIn || !checkOut) {
      setError('Missing booking details. Please start your search again.');
      setLoading(false);
      return;
    }
    api.get(`/hotels/${hotelId}/availability`, { params: { check_in: checkIn, check_out: checkOut, adults, children } })
      .then(r => {
        const match = (r.data.data || []).find(rt => rt.room_type_id === roomTypeId);
        if (!match) { setError('This room is no longer available for the selected dates.'); return; }
        setRoomType(match);
        track('booking_started', { hotel_id: hotelId, room_type_id: roomTypeId });
      })
      .catch(err => setError(err.friendlyMessage || 'Unable to load this room right now.'))
      .finally(() => setLoading(false));
  }, [hotelId, roomTypeId, checkIn, checkOut, adults, children]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.guest_name || !form.guest_email) {
      setError('Name and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    track('guest_details_completed', { hotel_id: hotelId, room_type_id: roomTypeId });
    try {
      const { data } = await api.post(
        '/reservations',
        {
          hotel_id: hotelId,
          room_type_id: roomTypeId,
          check_in: checkIn,
          check_out: checkOut,
          adults, children,
          guest_name: form.guest_name,
          guest_email: form.guest_email,
          guest_phone: form.guest_phone || undefined,
          company: form.company || undefined,
          expected_arrival_time: form.expected_arrival_time || undefined,
          special_requests: form.special_requests || undefined,
        },
        { headers: { 'Idempotency-Key': idempotencyKey.current } }
      );
      const reservation = data.data;
      navigate(`/reservations/${reservation.id}/pay?hotel_id=${hotelId}`);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to create this booking. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 flex justify-center text-gray-400">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <Link to={`/hotels/${hotelId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to hotel
      </Link>

      <h1 className="text-xl font-bold text-gray-900 mb-4">Confirm your booking</h1>

      {roomType && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h2 className="font-semibold text-gray-900">{roomType.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {formatDisplay(checkIn)} → {formatDisplay(checkOut)} · {nights(checkIn, checkOut)} night(s) · {adults} adult{adults === 1 ? '' : 's'}{children ? `, ${children} children` : ''}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-lg font-bold text-gray-900">{formatMoney(roomType.total_amount, roomType.currency)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {!guest && roomType && (
        <p className="text-sm text-gray-500 mb-4">
          <Link to={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="text-primary-700 font-medium hover:text-primary-800">Sign in</Link> for faster checkout next time, or continue as a guest below.
        </p>
      )}
      {guest && roomType && (
        <p className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
          <UserCheck className="w-4 h-4 text-green-600" /> Booking as {guest.full_name} ({guest.email})
        </p>
      )}

      {roomType && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Full name</span>
            <input className="input" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Email</span>
            <input type="email" className="input" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} required />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Phone</span>
            <input type="tel" className="input" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
          </label>

          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            {showOptional ? 'Hide' : 'Add'} company, arrival time or special requests (optional)
          </button>

          {showOptional && (
            <div className="space-y-4 pt-1">
              <label className="block text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</span>
                <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Expected arrival time (optional)</span>
                <input
                  className="input"
                  placeholder="e.g. 2pm, late evening"
                  value={form.expected_arrival_time}
                  onChange={(e) => setForm({ ...form, expected_arrival_time: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-medium text-gray-600 mb-1">Special requests (optional)</span>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="e.g. high floor, early check-in"
                  value={form.special_requests}
                  onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                />
              </label>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Holding your room…</> : 'Continue to payment'}
          </button>
          <p className="text-xs text-gray-400 text-center">Your room is held for a few minutes while you pay.</p>
        </form>
      )}
    </div>
  );
}
