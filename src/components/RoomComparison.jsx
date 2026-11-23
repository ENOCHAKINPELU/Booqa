import React from 'react';
import { Check } from 'lucide-react';
import { formatMoney } from '../utils/dates';
import { sleepsLabel, includesBreakfast, cancellationLabel, isFreeCancellation } from '../utils/rooms';
import { roomPricing } from '../utils/pricing';

const NotListed = () => <span className="text-gray-300">Not listed</span>;

/**
 * Side-by-side room comparison - the one view hotels.ng doesn't give
 * (it only has a stack of cards). Shown when there are 2+ room types to
 * choose between. "Select" jumps to that room's full card, where the
 * guest can see photos, pick a specific room and book.
 */
export default function RoomComparison({ roomTypes, onSelect }) {
  if (!roomTypes || roomTypes.length < 2) return null;
  const nights = roomTypes[0]?.nights || 1;
  const cheapest = Math.min(...roomTypes.map((rt) => Number(rt.base_rate)));

  return (
    <section aria-labelledby="compare-rooms" className="mb-6">
      <h3 id="compare-rooms" className="text-sm font-semibold text-gray-700 mb-2">Compare rooms</h3>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-primary-50 text-left text-xs font-semibold text-primary-800 uppercase tracking-wide">
              <th scope="col" className="px-4 py-2.5">Room</th>
              <th scope="col" className="px-3 py-2.5">Sleeps</th>
              <th scope="col" className="px-3 py-2.5">Bed</th>
              <th scope="col" className="px-3 py-2.5">Size</th>
              <th scope="col" className="px-3 py-2.5">Breakfast</th>
              <th scope="col" className="px-3 py-2.5">Cancellation</th>
              <th scope="col" className="px-3 py-2.5 text-right">Total · {nights} night{nights === 1 ? '' : 's'}</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Select</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {roomTypes.map((rt) => {
              const cancel = cancellationLabel(rt);
              const price = roomPricing(rt);
              return (
                <tr key={rt.room_type_id} className="hover:bg-gray-50 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-gray-900">
                    {rt.name}
                    {Number(rt.base_rate) === cheapest && (
                      <span className="block w-fit mt-1 text-[11px] font-semibold text-gray-900 bg-accent-soft border border-accent/40 rounded-full px-2 py-0.5">
                        Lowest price
                      </span>
                    )}
                    {rt.available_count <= 3 && (
                      <span className="block text-xs font-medium text-amber-600 mt-1">Only {rt.available_count} left</span>
                    )}
                  </th>
                  <td className="px-3 py-3 text-gray-700">{sleepsLabel(rt) || <NotListed />}</td>
                  <td className="px-3 py-3 text-gray-700">{rt.bed_type || <NotListed />}</td>
                  <td className="px-3 py-3 text-gray-700">{rt.size_sqm ? `${Number(rt.size_sqm)} m²` : <NotListed />}</td>
                  <td className="px-3 py-3">
                    {includesBreakfast(rt)
                      ? <span className="inline-flex items-center gap-1 text-green-700"><Check className="w-3.5 h-3.5" /> Included</span>
                      : <NotListed />}
                  </td>
                  <td className={`px-3 py-3 max-w-[180px] ${isFreeCancellation(rt) ? 'text-green-700' : 'text-gray-700'}`}>
                    {cancel || <NotListed />}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <span className="block font-bold text-gray-900">{formatMoney(price.total, rt.currency)}</span>
                    <span className="block text-xs text-gray-400">{formatMoney(price.perNight, rt.currency)} / night</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onSelect(rt)} className="btn-primary text-sm px-3 py-1.5 whitespace-nowrap">
                      Select
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        {roomPricing(roomTypes[0]).includesFee
          ? 'Prices include all fees. What you see is what you pay.'
          : "Room price before Booqa's service fee, which is shown before you pay."}
      </p>
    </section>
  );
}
