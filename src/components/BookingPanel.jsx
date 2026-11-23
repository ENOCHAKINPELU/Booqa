import React from 'react';
import { ShieldCheck, Lock, MessageCircle } from 'lucide-react';
import DateGuestPicker from './DateGuestPicker';
import { formatMoney, formatDisplay } from '../utils/dates';
import { roomPricing } from '../utils/pricing';

/**
 * The hotel page's booking box. On large screens it sits in the right
 * column and stays on screen while the guest reads (sticky); on phones it
 * renders inline above the rooms and MobileBookingBar takes over the
 * "always reachable" job. Every line here reflects real data - the price
 * is the cheapest room actually available for these dates, never a
 * made-up "from" rate.
 */
export function cheapestRoom(roomTypes) {
  return (roomTypes || []).reduce((min, rt) => (!min || Number(rt.base_rate) < Number(min.base_rate) ? rt : min), null);
}

export default function BookingPanel({ checkIn, checkOut, adults, children, onChange, roomTypes, loading, onChooseRoom }) {
  const cheapest = cheapestRoom(roomTypes);
  const nights = cheapest?.nights;
  const price = cheapest && roomPricing(cheapest);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        {loading ? (
          <div className="h-12 rounded-lg bg-gray-100 animate-pulse" aria-label="Checking prices" />
        ) : cheapest ? (
          <>
            <p className="text-xs text-gray-500">Rooms from</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatMoney(price.perNight, cheapest.currency)}
              <span className="text-sm font-normal text-gray-500"> / night</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatMoney(price.total, cheapest.currency)} for {nights} night{nights === 1 ? '' : 's'}
              {price.includesFee ? ' · includes all fees' : ' + service fee'}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-600">No rooms free for these dates. Try different dates.</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <DateGuestPicker checkIn={checkIn} checkOut={checkOut} adults={adults} children={children} onChange={onChange} stacked />
        <p className="text-xs text-gray-500">{formatDisplay(checkIn)} → {formatDisplay(checkOut)}</p>
        <button
          type="button"
          onClick={onChooseRoom}
          disabled={loading || !cheapest}
          className="btn-primary w-full py-2.5"
        >
          {roomTypes?.length > 1 ? `Choose from ${roomTypes.length} rooms` : 'Choose your room'}
        </button>
        <ul className="space-y-1.5 text-xs text-gray-600">
          <li className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-primary-700" /> You won't be charged until you confirm and pay</li>
          <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary-700" /> Secure card payment by Flutterwave</li>
          <li className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-primary-700" /> Confirmation emailed as soon as you pay</li>
        </ul>
      </div>
    </div>
  );
}

export function MobileBookingBar({ roomTypes, loading, hidden, onChooseRoom }) {
  const cheapest = cheapestRoom(roomTypes);
  if (loading || !cheapest) return null;
  const price = roomPricing(cheapest);
  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]
                  px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3
                  transition-transform duration-200 ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
      aria-hidden={hidden}
    >
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 leading-tight">From{price.includesFee ? ', all fees included' : ''}</p>
        <p className="font-bold text-gray-900 leading-tight">
          {formatMoney(price.perNight, cheapest.currency)}<span className="text-xs font-normal text-gray-500"> / night</span>
        </p>
      </div>
      <button type="button" onClick={onChooseRoom} tabIndex={hidden ? -1 : 0} className="btn-primary px-5 py-2.5 flex-shrink-0">
        Choose room
      </button>
    </div>
  );
}
