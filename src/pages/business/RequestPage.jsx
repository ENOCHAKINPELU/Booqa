import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Building2, Timer, CreditCard, Landmark, Smartphone, RefreshCw, Info, SearchX } from 'lucide-react';
import WorkspaceShell from '../../components/business/WorkspaceShell';
import { biz, errorMessage, errorCode } from '../../services/businessApi';
import { RequestHeader, Timeline, BookingSummary } from './RequestDetail';
import { naira } from './bizFormat';

/*
 * One request, from choosing a hotel to the stay:
 *   requested -> hotels that fit (or the closest, with reasons) -> Book
 *   pending   -> pay online (card / transfer / USSD) before the hold ends
 *   confirmed -> booking references per room
 */

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

function useSecondsLeft(until) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!until) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [until]);
  return until ? Math.max(0, Math.floor((new Date(until).getTime() - now) / 1000)) : null;
}

function MatchCard({ m, rooms, nights, onBook, busy }) {
  const partial = m.rooms_bookable < rooms;
  return (
    <li className="rounded-2xl border border-gray-200 bg-white overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-48 h-36 sm:h-auto bg-gradient-to-br from-primary-700 to-primary-900 flex-shrink-0">
        {m.hotel.photo
          ? <img src={m.hotel.photo} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-primary-200"><Building2 className="w-8 h-8" /></div>}
      </div>
      <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-950">{m.hotel.name}</h3>
          <p className="text-sm text-gray-500">{[m.hotel.area, m.hotel.city].filter(Boolean).join(', ')}</p>
          <p className="text-sm text-gray-700 mt-2">{m.room_type.name}{m.room_type.bed_type ? ` · ${m.room_type.bed_type}` : ''} · sleeps {m.room_type.capacity_adults}</p>
          {m.reasons.length > 0 && (
            <ul className="mt-2 space-y-1">
              {m.reasons.map((x) => <li key={x} className="text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-2 py-1 w-fit">{x}</li>)}
            </ul>
          )}
          {m.notes.map((x) => <p key={x} className="text-xs text-gray-400 mt-1.5">{x}</p>)}
        </div>
        <div className="sm:text-right sm:w-44 flex sm:flex-col justify-between sm:justify-start items-end gap-2">
          <div>
            <p className="text-lg font-bold text-gray-950 tabular-nums">{naira(m.per_night)} <span className="text-xs font-normal text-gray-500">/ room / night</span></p>
            <p className="text-xs text-gray-500">{naira(m.total)} for {m.rooms_bookable} room{m.rooms_bookable === 1 ? '' : 's'}, {nights} night{nights === 1 ? '' : 's'}</p>
            <p className="text-[11px] text-gray-400">Includes all fees</p>
          </div>
          <button onClick={() => onBook(m)} disabled={busy}
            className="bg-navy hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap">
            {busy === m.hotel.id ? 'Holding rooms…' : partial ? `Book ${m.rooms_bookable} room${m.rooms_bookable === 1 ? '' : 's'}` : 'Book'}
          </button>
        </div>
      </div>
    </li>
  );
}

function Matches({ r, onBooked }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    biz.matches(r.id).then(setData).catch((err) => setError(errorMessage(err, 'Could not check hotels right now.')));
  }, [r.id]);

  const book = async (m) => {
    setBusy(m.hotel.id);
    setError('');
    try { onBooked(await biz.book(r.id, m.hotel.id, m.room_type.id)); } catch (err) { setError(errorMessage(err)); setBusy(''); }
  };

  if (!data && !error) {
    return (
      <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        <p className="mt-3 text-sm">Checking live availability at hotels…</p>
      </div>
    );
  }

  const list = data?.fits.length ? data.fits : data?.close || [];
  return (
    <section>
      {data && data.fits.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-950">{data.fits.length} hotel{data.fits.length === 1 ? '' : 's'} fit your request</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live availability and prices, cheapest first. Book to hold the rooms, then pay.</p>
        </>
      )}
      {data && !data.fits.length && list.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-gray-950">No hotel matches everything you asked for</h2>
            <p className="text-sm text-gray-700 mt-0.5">These are the closest. Each shows where it differs from your request.</p>
          </div>
        </div>
      )}
      {data && !list.length && (
        <div className="rounded-2xl bg-white border border-gray-200 p-8 text-center">
          <SearchX className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="mt-3 font-medium text-gray-900">No rooms are free at Booqa hotels for these dates.</p>
          <p className="text-sm text-gray-500 mt-1">Try different dates, or cancel this request and send a new one.</p>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
      <ul className="mt-4 space-y-3">
        {list.map((m) => <MatchCard key={m.hotel.id} m={m} rooms={r.rooms} nights={r.nights} onBook={book} busy={busy} />)}
      </ul>
    </section>
  );
}

const POLL_EVERY_MS = 8000;
const POLL_FOR_MS = 10 * 60 * 1000;

function Payment({ r, onUpdated }) {
  const secondsLeft = useSecondsLeft(r.hold_expires_at);
  const [paying, setPaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const tryConfirm = useCallback(async () => {
    try { onUpdated(await biz.confirmPayment(r.id)); return 'done'; } catch (err) {
      if (errorCode(err) === 'PAYMENT_PENDING') return 'waiting';
      setError(errorMessage(err));
      return 'stopped';
    }
  }, [r.id, onUpdated]);

  const startWaiting = useCallback(() => {
    setWaiting(true);
    setPaying(false);
    setError('');
    const started = Date.now();
    const tick = async () => {
      const outcome = await tryConfirm();
      if (outcome !== 'waiting') { setWaiting(false); return; }
      if (Date.now() - started > POLL_FOR_MS) {
        setWaiting(false);
        setError("We haven't received the payment yet. If you've paid, press \"I've paid\" to check again.");
        return;
      }
      timer.current = setTimeout(tick, POLL_EVERY_MS);
    };
    clearTimeout(timer.current);
    tick();
  }, [tryConfirm]);

  const pay = async () => {
    setPaying(true);
    setError('');
    let p;
    try { p = await biz.startPayment(r.id); } catch (err) { setError(errorMessage(err)); setPaying(false); if (errorCode(err) === 'HOLD_EXPIRED') onUpdated(await biz.request(r.id)); return; }
    await loadFlutterwave();
    if (!window.FlutterwaveCheckout) { setError('Payment failed to load. Check your connection and try again.'); setPaying(false); return; }
    let callbackFired = false;
    window.FlutterwaveCheckout({
      public_key: import.meta.env.VITE_FLW_PUBLIC_KEY,
      tx_ref: p.tx_ref,
      amount: p.amount,
      currency: p.currency,
      payment_options: 'card,banktransfer,ussd',
      customer: { email: p.email, name: p.name },
      customizations: { title: 'Booqa', description: p.description },
      callback: async (data) => {
        callbackFired = true;
        if (data.status === 'successful' || data.status === 'completed' || data.status === 'pending') {
          if ((await tryConfirm()) === 'waiting') startWaiting();
          else setPaying(false);
        } else {
          setPaying(false);
          setError('Payment was not completed. Please try again.');
        }
      },
      onclose: () => { if (!callbackFired) setPaying(false); },
    });
  };

  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">{r.reservations.length} room{r.reservations.length === 1 ? '' : 's'} held at {r.hotel_name}</h2>
          <p className="text-sm text-gray-500">{r.room_type_name} · {r.nights} night{r.nights === 1 ? '' : 's'}</p>
        </div>
        {secondsLeft != null && !waiting && (
          <span className={`flex items-center gap-1 text-sm font-medium ${secondsLeft < 300 ? 'text-amber-700' : 'text-gray-600'}`}>
            <Timer className="w-4 h-4" /> Held for {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between border-t border-gray-100 pt-4">
        <span className="text-gray-600">Total to pay (all fees included)</span>
        <span className="text-2xl font-bold text-gray-950 tabular-nums">{naira(r.amount_due)}</span>
      </div>

      {waiting ? (
        <div className="mt-5 rounded-xl bg-primary-50 p-4 text-center" role="status" aria-live="polite">
          <Loader2 className="w-6 h-6 animate-spin text-navy mx-auto" />
          <p className="mt-2 font-semibold text-gray-950">Waiting for your payment</p>
          <p className="text-sm text-gray-600">Bank transfers and USSD can take a few minutes. This page updates by itself.</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2" aria-label="Ways to pay">
            {[[CreditCard, 'Card'], [Landmark, 'Bank transfer'], [Smartphone, 'USSD']].map(([Icon, label]) => (
              <span key={label} className="flex items-center gap-1.5 text-xs font-medium text-primary-800 bg-primary-50 rounded-full px-3 py-1.5"><Icon className="w-3.5 h-3.5" /> {label}</span>
            ))}
          </div>
          <button onClick={pay} disabled={paying || secondsLeft === 0}
            className="mt-4 w-full bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5">
            {paying ? 'Opening payment…' : `Pay ${naira(r.amount_due)}`}
          </button>
          <button onClick={startWaiting} className="mt-2 w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 rounded-xl py-2.5 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> I've paid by transfer or USSD - check
          </button>
        </>
      )}
      {error && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
    </section>
  );
}

function Content() {
  const { id } = useParams();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { biz.request(id).then(setR).catch((err) => setError(errorMessage(err))); }, [id]);

  if (!r && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!r) return <p className="text-red-700">{error}</p>;

  const cancel = async () => {
    setBusy(true);
    setError('');
    try { setR(await biz.cancel(r.id, reason)); setCancelling(false); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link to="/business/requests" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> All requests</Link>
      <RequestHeader r={r} />
      {r.status === 'requested' && <Matches r={r} onBooked={setR} />}
      {r.status === 'pending' && <Payment r={r} onUpdated={setR} />}
      <BookingSummary r={r} />
      {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
      <Timeline events={r.events} />

      {r.can_cancel && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          {!cancelling ? (
            <button onClick={() => setCancelling(true)} className="text-sm font-medium text-red-600 hover:text-red-700">Cancel this request</button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-900">
                Cancel {r.reference}?{r.status === 'confirmed' && ' The hotel bookings are cancelled and your payment refunded.'}
                {r.status === 'pending' && ' The held rooms are released.'}
              </p>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm" />
              <div className="flex gap-2">
                <button onClick={cancel} disabled={busy} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2">
                  {busy ? 'Cancelling…' : 'Cancel request'}
                </button>
                <button onClick={() => setCancelling(false)} className="text-sm font-medium text-gray-600 px-4 py-2">Keep it</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RequestPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
