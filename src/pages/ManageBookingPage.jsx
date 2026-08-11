import React, { useState } from 'react';
import { Search, Loader, XCircle, CheckCircle2, Phone, Mail, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatDisplay, formatMoney } from '../utils/dates';
import { track } from '../utils/analytics';

const CANCELLABLE = ['pending_payment', 'confirmed'];

// free_cancellation_hours=null means "always fully refundable" (029's
// migration note) — the safe default for a hotel that hasn't configured
// a policy, not an invented fee. Computed client-side from data the
// lookup already returns; never guessed, never a flat "we'll figure it
// out later".
function cancellationPreview(reservation) {
  const rt = reservation.room_types || {};
  const total = Number(reservation.total_amount || 0);
  const isPaid = reservation.status !== 'pending_payment';
  if (!isPaid) return { fee: 0, refund: 0, isPaid, note: 'No payment has been made yet — nothing to refund.' };

  const freeHours = rt.free_cancellation_hours;
  const feePercent = Number(rt.cancellation_fee_percent || 0);
  if (freeHours == null) return { fee: 0, refund: total, isPaid, note: 'Free cancellation — full refund.' };

  const checkIn = new Date(`${reservation.check_in_date}T00:00:00`);
  const hoursUntilCheckIn = (checkIn.getTime() - Date.now()) / 3_600_000;
  const withinFreeWindow = hoursUntilCheckIn >= freeHours;
  const fee = withinFreeWindow ? 0 : total * (feePercent / 100);
  const deadline = new Date(checkIn.getTime() - freeHours * 3_600_000);
  return {
    fee,
    refund: Math.max(0, total - fee),
    isPaid,
    note: withinFreeWindow
      ? `Free cancellation until ${formatDisplay(deadline.toISOString().slice(0, 10))}.`
      : `Past the free-cancellation window (${formatDisplay(deadline.toISOString().slice(0, 10))}) — a ${feePercent}% fee applies.`,
  };
}

const REFUND_LABELS = {
  refund_pending: { label: 'Refund pending', tone: 'text-amber-700 bg-amber-50' },
  refund_processing: { label: 'Refund processing', tone: 'text-blue-700 bg-blue-50' },
  refunded: { label: 'Refund completed', tone: 'text-green-700 bg-green-50' },
  refund_failed: { label: 'Refund failed — contact support', tone: 'text-red-700 bg-red-50' },
};

export default function ManageBookingPage() {
  const [form, setForm] = useState({ booking_reference: '', email: '' });
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReservation(null);
    setConfirmingCancel(false);
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
    setCancelling(true);
    try {
      await api.post(`/reservations/${reservation.id}/cancel`, {
        hotel_id: reservation.hotel_id,
        reason: 'Cancelled by guest via Booqa',
      });
      setReservation({ ...reservation, status: 'cancelled' });
      setConfirmingCancel(false);
      track('booking_cancelled', { reservation_id: reservation.id, hotel_id: reservation.hotel_id });
      toast.success('Booking cancelled.');
    } catch (err) {
      toast.error(err.friendlyMessage || 'Unable to cancel this booking.');
    } finally {
      setCancelling(false);
    }
  };

  const payment = reservation?.payments?.[0];
  const refundInfo = payment?.status ? REFUND_LABELS[payment.status] : null;
  const preview = reservation ? cancellationPreview(reservation) : null;

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
          {reservation.hotels?.name && <p className="font-semibold text-gray-900">{reservation.hotels.name}</p>}
          {reservation.room_types?.name && <p className="text-sm text-gray-500">{reservation.room_types.name}</p>}

          {(reservation.hotels?.contact_phone || reservation.hotels?.contact_email) && (
            <div className="flex flex-wrap gap-3 mt-2">
              {reservation.hotels.contact_phone && (
                <a href={`tel:${reservation.hotels.contact_phone}`} className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800">
                  <Phone className="w-3 h-3" /> {reservation.hotels.contact_phone}
                </a>
              )}
              {reservation.hotels.contact_email && (
                <a href={`mailto:${reservation.hotels.contact_email}`} className="flex items-center gap-1 text-xs text-primary-700 hover:text-primary-800">
                  <Mail className="w-3 h-3" /> {reservation.hotels.contact_email}
                </a>
              )}
            </div>
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

          {refundInfo && (
            <span className={`inline-block text-xs font-semibold rounded-full px-2.5 py-1 mt-2 ${refundInfo.tone}`}>
              {refundInfo.label}{payment.refund_amount ? ` — ${formatMoney(payment.refund_amount, reservation.currency)}` : ''}
            </span>
          )}

          {reservation.room_types?.cancellation_policy && (
            <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded-lg p-2">{reservation.room_types.cancellation_policy}</p>
          )}

          {reservation.qr_code_image && (
            <img src={reservation.qr_code_image} alt="Booking QR code" className="w-32 h-32 mx-auto mt-4" />
          )}

          {CANCELLABLE.includes(reservation.status) && !confirmingCancel && (
            <button
              onClick={() => setConfirmingCancel(true)}
              className="mt-4 w-full py-2.5 rounded-lg font-medium text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Cancel booking
            </button>
          )}

          {confirmingCancel && preview && (
            <div className="mt-4 border border-amber-200 bg-amber-50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-900 mb-2">
                <ShieldAlert className="w-4 h-4" /> Cancellation policy
              </div>
              <p className="text-xs text-amber-800 mb-3">{preview.note}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Cancellation fee</span><span className="font-medium text-gray-900">{formatMoney(preview.fee, reservation.currency)}</span></div>
                <div className="flex justify-between font-semibold"><span className="text-gray-700">Amount refunded</span><span className="text-gray-900">{formatMoney(preview.refund, reservation.currency)}</span></div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setConfirmingCancel(false)} className="btn-secondary flex-1">Keep booking</button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="flex-1 py-2 rounded-lg font-medium text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
