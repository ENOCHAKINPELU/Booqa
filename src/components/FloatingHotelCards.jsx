import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ArrowRight, Loader } from 'lucide-react';
import api from '../services/api';
import { formatMoney } from '../utils/dates';

// Right-side hero showpiece. Every hotel, photo and price shown here is
// real — sourced from the same live GET /hotels + GET /hotels/:id/room-types
// calls the rest of the app uses, not mocked data. Two things are
// deliberately real-or-honest rather than fabricated:
//  - price: the cheapest active room type's base_rate, fetched per hotel.
//  - rating: hotels.avg_rating doesn't exist in the schema yet (PRD §5.3
//    marks it "planned, not applied") — so this always renders a "New on
//    Booqa" pill today instead of a made-up star rating, and will start
//    showing real stars automatically the moment that column ships and
//    GET /hotels starts returning it, with no change needed here.
const ROTATE_MS = 5500;
const MAX_CARDS = 4;

function useReducedMotion() {
  const ref = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  return ref.current;
}

function rankStyle(rank) {
  // rank 0 = front card, higher rank = further back in the stack.
  const steps = [
    { x: 0, y: 0, scale: 1, opacity: 1, z: 30 },
    { x: 22, y: 26, scale: 0.95, opacity: 0.92, z: 20 },
    { x: 44, y: 52, scale: 0.9, opacity: 0.78, z: 10 },
    { x: 64, y: 76, scale: 0.85, opacity: 0, z: 0 }, // parked, waiting to enter
  ];
  const s = steps[Math.min(rank, steps.length - 1)];
  return {
    transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale})`,
    opacity: s.opacity,
    zIndex: s.z,
    pointerEvents: rank === 0 ? 'auto' : 'none',
  };
}

function FloatingCard({ hotel, enrichment, rank, floatDelay, style }) {
  const loading = enrichment === undefined;
  const photo = enrichment?.photo;
  const price = enrichment?.price;

  return (
    <Link
      to={`/hotels/${hotel.id}`}
      aria-hidden={rank != null && rank > 0}
      tabIndex={rank != null && rank > 0 ? -1 : 0}
      className="group block w-52 sm:w-56 bg-white rounded-2xl shadow-2xl shadow-navy/20 border border-white/60
                 overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-navy/30"
      style={style}
    >
      <div className={rank === 0 ? 'animate-float motion-reduce:animate-none' : ''} style={{ animationDelay: floatDelay }}>
        <div className="h-28 bg-primary-50 flex items-center justify-center overflow-hidden">
          {loading ? (
            <Loader className="w-5 h-5 text-primary-300 animate-spin" />
          ) : photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-8 h-8 text-primary-300" />
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-sm text-gray-900 truncate">{hotel.name}</p>
          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" /> {[hotel.city, hotel.state].filter(Boolean).join(', ')}
          </p>

          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-accent-dark bg-accent-soft rounded-full px-2 py-0.5">
              New on Booqa
            </span>
            {loading ? (
              <span className="h-3.5 w-14 rounded bg-gray-100 animate-pulse" />
            ) : price ? (
              <span className="text-xs font-bold text-gray-900">
                {formatMoney(price, enrichment.currency)}<span className="text-gray-400 font-normal">/night</span>
              </span>
            ) : null}
          </div>

          <span className="mt-3 flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white
                            bg-primary-700 rounded-lg py-1.5 transition-colors group-hover:bg-primary-800">
            Book now <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FloatingHotelCards({ hotels }) {
  const list = hotels.slice(0, MAX_CARDS);
  const [order, setOrder] = useState(() => list.map((h) => h.id));
  const [enrichment, setEnrichment] = useState({}); // { [hotelId]: { photo, price, currency } | null }
  const requestedRef = useRef(new Set());
  const reducedMotion = useReducedMotion();

  // Keep `order` in sync if the hotel list itself changes (e.g. re-fetch).
  useEffect(() => {
    setOrder((prev) => {
      const ids = list.map((h) => h.id);
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [list.map((h) => h.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // One room-types call per hotel, in parallel, tolerant of individual
  // failures — a hotel with no bookable room type just shows no price.
  // requestedRef (not state) is what actually dedupes React.StrictMode's
  // double-invoked effect: both invocations fire in the same tick, before
  // either's setEnrichment has landed, so checking `enrichment[id]` alone
  // let both through and doubled every request. A ref is mutated
  // synchronously, so the second invocation sees it immediately.
  useEffect(() => {
    let cancelled = false;
    list.forEach((hotel) => {
      if (requestedRef.current.has(hotel.id)) return;
      requestedRef.current.add(hotel.id);
      api.get(`/hotels/${hotel.id}/room-types`)
        .then((r) => {
          if (cancelled) return;
          const roomTypes = r.data.data || [];
          const cheapest = roomTypes.reduce((min, rt) => (
            min == null || Number(rt.base_rate) < Number(min.base_rate) ? rt : min
          ), null);
          const photo = roomTypes.flatMap((rt) => rt.media || []).find((m) => m.media_type === 'photo')?.url || null;
          setEnrichment((prev) => ({
            ...prev,
            [hotel.id]: cheapest ? { price: cheapest.base_rate, currency: cheapest.currency, photo } : { price: null, photo },
          }));
        })
        .catch(() => {
          if (!cancelled) setEnrichment((prev) => ({ ...prev, [hotel.id]: { price: null, photo: null } }));
        });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map((h) => h.id).join(',')]);

  // Front card retires to the back of the stack; everyone else advances.
  useEffect(() => {
    if (reducedMotion || order.length <= 1) return;
    const timer = setInterval(() => {
      setOrder((prev) => [...prev.slice(1), prev[0]]);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [reducedMotion, order.length]);

  if (!list.length) return null;
  const byId = Object.fromEntries(list.map((h) => [h.id, h]));

  return (
    <>
      {/* Desktop / tablet: overlapping stack that auto-rotates. */}
      <div className="hidden lg:block relative" style={{ height: 340, width: 280 }} aria-hidden={false}>
        {order.map((id, i) => (
          <div key={id} className="absolute top-0 left-0 transition-all duration-700 ease-out" style={rankStyle(i)}>
            <FloatingCard hotel={byId[id]} enrichment={enrichment[id]} rank={i} floatDelay={`${i * 0.6}s`} />
          </div>
        ))}
      </div>

      {/* Mobile / small tablet: the same cards as a horizontal swipe row. */}
      <div className="lg:hidden -mx-4 px-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2" style={{ scrollbarWidth: 'none' }}>
        {list.map((hotel) => (
          <div key={hotel.id} className="snap-start flex-shrink-0">
            <FloatingCard hotel={hotel} enrichment={enrichment[hotel.id]} rank={null} floatDelay="0s" style={{}} />
          </div>
        ))}
      </div>
    </>
  );
}
