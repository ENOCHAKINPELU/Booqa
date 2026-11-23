import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader, ShieldCheck, Zap, AlertCircle, CreditCard, Landmark, Smartphone, Timer, RefreshCw } from 'lucide-react';
import api, { newIdempotencyKey } from '../services/api';
import { formatDisplay, formatMoney, nights } from '../utils/dates';
import { track } from '../utils/analytics';

// Same inline-checkout pattern as HotelOps' own subscription paywall
// (frontend/src/pages/subscription/PaywallPage.jsx) - the Flutterwave
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

// Card, bank transfer and USSD - how most Nigerians pay online. Transfer
// and USSD can take a few minutes to land, which is why this page has a
// "waiting" state and HotelOps confirms late payments from Flutterwave's
// webhook (payments.service.js's confirmGuestPaymentByTxRef).
const PAYMENT_OPTIONS = 'card,banktransfer,ussd';
const METHODS = [
  { icon: CreditCard, label: 'Card' },
  { icon: Landmark, label: 'Bank transfer' },
  { icon: Smartphone, label: 'USSD' },
];

const POLL_EVERY_MS = 8000;
const POLL_FOR_MS = 10 * 60 * 1000;
// Outcomes a retry can't fix - stop waiting and say what happened.
const TERMINAL_CODES = ['HOLD_EXPIRED', 'RESERVATION_NOT_PAYABLE', 'ROOM_NO_LONGER_AVAILABLE', 'AMOUNT_MISMATCH'];
const PAID_STATUSES = ['confirmed', 'checked_in', 'checked_out'];

// The last tx_ref started for this booking survives a reload or closed
// tab, so "I've paid - check status" can still find the payment.
// Storage may be unavailable (private mode); everything works without it.
const refKey = (id) => `booqa_txref_${id}`;
function saveRef(id, ref) { try { sessionStorage.setItem(refKey(id), ref); } catch { /* ignore */ } }
function loadRef(id) { try { return sessionStorage.getItem(refKey(id)); } catch { return null; } }

function useCountdown(expiresAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
}

export default function PaymentPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get('hotel_id');
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [waiting, setWaiting] = useState(false); // a transfer/USSD payment is on its way
  const [error, setError] = useState('');
  const [lastRef, setLastRef] = useState(() => loadRef(id));
  const confirmKey = useRef(newIdempotencyKey());
  const pollTimer = useRef(null);

  useEffect(() => {
    if (!hotelId) { setError('Missing hotel reference. Please start your booking again.'); setLoading(false); return; }
    api.get(`/reservations/${id}`, { params: { hotel_id: hotelId } })
      .then(r => setReservation(r.data.data))
      .catch(err => setError(err.friendlyMessage || 'Unable to load this reservation.'))
      .finally(() => setLoading(false));
  }, [id, hotelId]);

  useEffect(() => () => clearTimeout(pollTimer.current), []);

  const secondsLeft = useCountdown(reservation?.status === 'pending_payment' ? reservation?.expires_at : null);

  // The room price stays exactly what the hotel set (reservation.total_amount)
  // - the service fee is a separate, itemized add-on (create_reservation's
  // guest_fee_amount, 034), never silently folded into "the price" without
  // explanation. Defaults to 0 for anything that predates this, so the
  // breakdown just collapses to "Total due" with nothing extra shown.
  const guestFee = Number(reservation?.guest_fee_amount || 0);
  const amountToCharge = Number(reservation?.total_amount || 0) + guestFee;

  const goToConfirmation = useCallback(() => {
    clearTimeout(pollTimer.current);
    try { sessionStorage.removeItem(refKey(id)); } catch { /* ignore */ }
    navigate(`/reservations/${id}/confirmation?hotel_id=${hotelId}`);
  }, [id, hotelId, navigate]);

  // One confirm attempt. Returns 'paid' | 'pending' | a terminal error code.
  // Each attempt needs a fresh Idempotency-Key: HotelOps stores 4xx
  // responses against the key, so reusing one would replay the first
  // "not successful yet" answer forever.
  const tryConfirm = useCallback(async (txRef, key = newIdempotencyKey()) => {
    try {
      await api.post(`/reservations/${id}/confirm-payment`, { hotel_id: hotelId, tx_ref: txRef }, { headers: { 'Idempotency-Key': key } });
      return 'paid';
    } catch (err) {
      const code = err.response?.data?.error?.code;
      return TERMINAL_CODES.includes(code) ? code : 'pending';
    }
  }, [id, hotelId]);

  const terminalMessage = (code) => (
    code === 'AMOUNT_MISMATCH'
      ? 'The amount paid did not match this booking. We will refund you - please contact support with your booking reference.'
      : 'Your payment arrived after this booking hold ended, so the room could not be kept. Contact support with your booking reference and we will refund you.'
  );

  // Wait for a transfer/USSD payment: check the booking itself (HotelOps'
  // webhook may already have confirmed it) and also try confirming with
  // the tx_ref directly, in case the webhook isn't set up or is slow.
  const startWaiting = useCallback((txRef) => {
    setWaiting(true);
    setPaying(false);
    setError('');
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const r = await api.get(`/reservations/${id}`, { params: { hotel_id: hotelId } });
        const status = r.data.data?.status;
        if (PAID_STATUSES.includes(status)) return goToConfirmation();
        if (status === 'cancelled') {
          setWaiting(false);
          setReservation(r.data.data);
          setError(terminalMessage('HOLD_EXPIRED'));
          return undefined;
        }
      } catch { /* network blip - keep waiting */ }

      const outcome = txRef ? await tryConfirm(txRef) : 'pending';
      if (outcome === 'paid') return goToConfirmation();
      if (outcome !== 'pending') {
        setWaiting(false);
        setError(terminalMessage(outcome));
        return undefined;
      }
      if (Date.now() - startedAt > POLL_FOR_MS) {
        setWaiting(false);
        setError("We haven't received your payment yet. If you've paid, it can take a little longer - press \"I've paid\" to check again.");
        return undefined;
      }
      pollTimer.current = setTimeout(tick, POLL_EVERY_MS);
      return undefined;
    };
    clearTimeout(pollTimer.current);
    tick();
  }, [id, hotelId, tryConfirm, goToConfirmation]);

  const handlePay = async () => {
    setPaying(true);
    setError('');
    track('payment_started', { reservation_id: id, hotel_id: hotelId, amount: amountToCharge });
    await loadFlutterwave();
    if (!window.FlutterwaveCheckout) {
      setError('Payment system failed to load. Check your connection and try again.');
      setPaying(false);
      return;
    }

    const ref = `BOOQA-${reservation.booking_reference}-${Date.now()}`;
    saveRef(id, ref);
    setLastRef(ref);
    let callbackFired = false;

    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
      tx_ref: ref,
      amount: amountToCharge,
      currency: reservation.currency || 'NGN',
      payment_options: PAYMENT_OPTIONS,
      customer: { email: reservation.guest_email, name: reservation.guest_name, phone_number: reservation.guest_phone },
      customizations: {
        title: 'Booqa',
        description: `${reservation.booking_reference} - ${nights(reservation.check_in_date, reservation.check_out_date)} night(s)`,
      },
      callback: async function (data) {
        callbackFired = true;
        const txRef = data.tx_ref || ref;
        if (data.status === 'successful' || data.status === 'completed') {
          track('payment_successful', { reservation_id: id, hotel_id: hotelId, method: data.payment_type });
          const outcome = await tryConfirm(txRef, confirmKey.current);
          if (outcome === 'paid') return goToConfirmation();
          // Flutterwave said yes but verification isn't through yet - wait
          // for it rather than telling the guest it failed.
          if (outcome === 'pending') return startWaiting(txRef);
          setPaying(false);
          setError(terminalMessage(outcome));
        } else if (data.status === 'pending') {
          track('payment_pending', { reservation_id: id, hotel_id: hotelId, method: data.payment_type });
          startWaiting(txRef);
        } else {
          track('payment_failed', { reservation_id: id, hotel_id: hotelId, reason: data.status });
          setPaying(false);
          setError('Payment was not completed. Please try again.');
        }
        return undefined;
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

  const holdOver = secondsLeft === 0;
  const expired = reservation.status === 'cancelled' || reservation.status === 'no_show' || (holdOver && !waiting);
  const alreadyConfirmed = PAID_STATUSES.includes(reservation.status);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Payment</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <p className="text-xs text-gray-500">Booking reference</p>
        <p className="font-mono font-semibold text-gray-900 mb-3">{reservation.booking_reference}</p>
        <p className="text-sm text-gray-600">
          {formatDisplay(reservation.check_in_date)} → {formatDisplay(reservation.check_out_date)}
        </p>
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Room price</span>
            <span>{formatMoney(reservation.total_amount, reservation.currency)}</span>
          </div>
          {guestFee > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Service fee</span>
              <span>{formatMoney(guestFee, reservation.currency)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
            <span className="text-sm text-gray-500">Total due</span>
            <span className="text-lg font-bold text-gray-900">{formatMoney(amountToCharge, reservation.currency)}</span>
          </div>
        </div>
      </div>

      {alreadyConfirmed && (
        <button onClick={goToConfirmation} className="btn-primary w-full">
          View confirmation
        </button>
      )}

      {!alreadyConfirmed && expired && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {error || 'This booking hold has expired. Please search again to book this room.'}
            {lastRef && !error && ' If you already paid, contact support with your booking reference and we will sort it out.'}
          </span>
        </div>
      )}

      {!alreadyConfirmed && !expired && waiting && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-center" role="status" aria-live="polite">
          <Loader className="w-6 h-6 animate-spin text-primary-700 mx-auto" />
          <p className="font-semibold text-gray-900 mt-2">Waiting for your payment to arrive</p>
          <p className="text-sm text-gray-600 mt-1">
            Bank transfers and USSD can take a few minutes. Keep this page open - we'll confirm your booking as soon as it lands.
            We'll also email you if you close it.
          </p>
        </div>
      )}

      {!alreadyConfirmed && !expired && !waiting && (
        <>
          {secondsLeft != null && (
            <p className={`flex items-center gap-1.5 text-sm mb-3 ${secondsLeft < 300 ? 'text-amber-700' : 'text-gray-600'}`}>
              <Timer className="w-4 h-4" />
              Your room is held for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-4" aria-label="Ways to pay">
            {METHODS.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-primary-800 bg-primary-50 rounded-full px-3 py-1.5">
                <Icon className="w-3.5 h-3.5" /> {label}
              </span>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <button onClick={handlePay} disabled={paying} className="btn-primary w-full flex items-center justify-center gap-2">
            {paying ? <><Loader className="w-4 h-4 animate-spin" /> Opening payment…</> : <><Zap className="w-4 h-4" /> Pay {formatMoney(amountToCharge, reservation.currency)}</>}
          </button>
          {lastRef && (
            <button
              onClick={() => { track('payment_status_checked', { reservation_id: id }); startWaiting(lastRef); }}
              className="btn-secondary w-full flex items-center justify-center gap-2 mt-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> I've paid by transfer or USSD - check status
            </button>
          )}
          <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-3">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" /> Secured by Flutterwave
          </p>
        </>
      )}
    </div>
  );
}
