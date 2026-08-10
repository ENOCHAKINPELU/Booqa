import React, { useState } from 'react';
import { Search, Loader, XCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatDisplay, formatMoney } from '../utils/dates';
import { track } from '../utils/analytics';

const CANCELLABLE = ['pending_payment', 'confirmed'];

export default function ManageBookingPage() {
  const [form, setForm] = useState({ booking_reference: '', email: '' });
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReservation(null);
    try {
      const { data } = await api.get('/reservations/lookup', {
        params: { booking_reference: form.booking_reference.trim(), email: form.email.trim() },
      });
      setReservation(data.data);
      track('manage_booking_viewed', { booking_reference: form.booking_reference.trim() });
    } catch (err) {
      setError(err.friendlyMessage || 'We could not find a booking with that reference and email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!reservation || !window.confirm('Cancel this booking? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await api.post(`/reservations/${reservation.id}/cancel`, {
        hotel_id: reservation.hotel_id,
        reason: 'Cancelled by guest via Booqa',
      });
      setReservation({ ...reservation, status: 'cancelled' });
      track('booking_cancelled', { reservation_id: reservation.id, hotel_id: reservation.hotel_id });
      toast.success('Booking cancelled.');
    } catch (err) {
      toast.error(err.friendlyMessage || 'Unable to cancel this booking.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Manage your booking</h1>
      <p className="text-sm text-gray-500 mb-6">Look up your reservation using your booking reference and email.</p>

      <form onSubmit={handleLookup} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-6">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Booking reference</span>
          <input
            className="input font-mono"
            placeholder="e.g. HTL-A1B2C3"
            value={form.booking_reference}
            onChange={(e) => setForm({ ...form, booking_reference: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Email used to book</span>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          {loading ? <><Loader className="w-4 h-4 animate-spin" /> Looking up…</> : <><Search className="w-4 h-4" /> Find booking</>}
        </button>
      </form>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {reservation && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {reservation.hotels?.name && (
            <p className="font-semibold text-gray-900">{reservation.hotels.name}</p>
          )}
          {reservation.room_types?.name && (
            <p className="text-sm text-gray-500">{reservation.room_types.name}</p>
          )}
          <p className="font-mono font-semibold text-gray-900 mt-2">{reservation.booking_reference}</p>
          <p className="text-sm text-gray-600 mt-2">
            {formatDisplay(reservation.check_in_date)} → {formatDisplay(reservation.check_out_date)}
          </p>
          <p className="text-sm text-gray-600">{formatMoney(reservation.total_amount, reservation.currency)}</p>
          <div className="flex items-center gap-1.5 mt-2">
            {reservation.status === 'cancelled' ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
            <span className="text-sm font-medium capitalize">{reservation.status.replace('_', ' ')}</span>
          </div>
          {reservation.room_types?.cancellation_policy && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">{reservation.room_types.cancellation_policy}</p>
          )}

          {reservation.qr_code_image && (
            <img src={reservation.qr_code_image} alt="Booking QR code" className="w-32 h-32 mx-auto mt-4" />
          )}

          {CANCELLABLE.includes(reservation.status) && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="mt-4 w-full py-2.5 rounded-lg font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
