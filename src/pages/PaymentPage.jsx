import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import api, { newIdempotencyKey } from '../services/api';
import { formatDisplay, formatMoney, nights } from '../utils/dates';
import { track } from '../utils/analytics';

// Same inline-checkout pattern as HotelOps' own subscription paywall
// (frontend/src/pages/subscription/PaywallPage.jsx) — the Flutterwave
// script is loaded on demand, never bundled.
function loadFlutterwave() {
  return new Promise((resolve) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.flutterwave.com/v3.js';
    s.onload = resolve;
    s.onerror = resolve;
    document.head.appendChild(s);
  });
}

export default function PaymentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get('hotel_id');
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const confirmKey = useRef(newIdempotencyKey());

  useEffect(() => {
    if (!hotelId) { setError('Missing hotel reference. Please start your booking again.'); setLoading(false); return; }
    api.get(`/reservations/${id}`, { params: { hotel_id: hotelId } })
      .then(r => setReservation(r.data.data))
      .catch(err => setError(err.friendlyMessage || 'Unable to load this reservation.'))
      .finally(() => setLoading(false));
  }, [id, hotelId]);

  const confirmPayment = async (tx_ref) => {
    try {
      await api.post(
        `/reservations/${id}/confirm-payment`,
        { hotel_id: hotelId, tx_ref },
        { headers: { 'Idempotency-Key': confirmKey.current } }
      );
      navigate(`/reservations/${id}/confirmation?hotel_id=${hotelId}`);
    } catch (err) {
      setPaying(false);
      setError(err.friendlyMessage || 'We could not confirm your payment. If you were charged, contact the hotel with your reference below.');
    }
  };

  const handlePay = async () => {
    setPaying(true);
    setError('');
    track('payment_started', { reservation_id: id, hotel_id: hotelId, amount: reservation.total_amount });
    await loadFlutterwave();
    if (!window.FlutterwaveCheckout) {
      setError('Payment system failed to load. Check your connection and try again.');
      setPaying(false);
      return;
    }

    const ref = `BOOQA-${reservation.booking_reference}-${Date.now()}`;
    let callbackFired = false;

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
      tx_ref: ref,
      amount: reservation.total_amount,
      currency: reservation.currency || 'NGN',
      payment_options: 'card',
      customer: { email: reservation.guest_email, name: reservation.guest_name, phone_number: reservation.guest_phone },
      customizations: {
        title: 'Booqa',
        description: `${reservation.booking_reference} — ${nights(reservation.check_in_date, reservation.check_out_date)} night(s)`,
      },
      callback: function (data) {
        callbackFired = true;
        if (data.status === 'successful' || data.status === 'completed') {
          track('payment_successful', { reservation_id: id, hotel_id: hotelId });
          confirmPayment(data.tx_ref || ref);
        } else {
          track('payment_failed', { reservation_id: id, hotel_id: hotelId, reason: data.status });
          setPaying(false);
          setError('Payment was not completed. Please try again.');
        }
      },
      onclose: function () {
        if (callbackFired) return;
        setPaying(false);
      },
    });
  };

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }

  if (!reservation) {
    return <p className="max-w-xl mx-auto px-4 py-16 text-center text-red-600">{error}</p>;
  }

  const expired = reservation.status === 'cancelled' || reservation.status === 'no_show';
  const alreadyConfirmed = reservation.status !== 'pending_payment';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Payment</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <p className="text-xs text-gray-500">Booking reference</p>
        <p className="font-mono font-semibold text-gray-900 mb-3">{reservation.booking_reference}</p>
        <p className="text-sm text-gray-600">
          {formatDisplay(reservation.check_in_date)} → {formatDisplay(reservation.check_out_date)}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">Total due</span>
          <span className="text-lg font-bold text-gray-900">{formatMoney(reservation.total_amount, reservation.currency)}</span>
        </div>
      </div>

      {alreadyConfirmed && !expired && (
        <button onClick={() => navigate(`/reservations/${id}/confirmation?hotel_id=${hotelId}`)} className="btn-primary w-full">
          View confirmation
        </button>
      )}

      {expired && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          This booking hold has expired. Please search again to book this room.
        </div>
      )}

      {!alreadyConfirmed && !expired && (
        <>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button onClick={handlePay} disabled={paying} className="btn-primary w-full flex items-center justify-center gap-2">
            {paying ? <><Loader className="w-4 h-4 animate-spin" /> Opening payment…</> : <><Zap className="w-4 h-4" /> Pay {formatMoney(reservation.total_amount, reservation.currency)}</>}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Secured by Flutterwave
          </p>
        </>
      )}
    </div>
  );
}
