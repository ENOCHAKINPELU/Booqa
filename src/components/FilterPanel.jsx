import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { formatMoney } from '../utils/dates';

// Amenity checkboxes are derived from whatever amenities actually appear
// across the current result set (hotels.service.js's listBookableHotels
// unions each hotel's active room-type amenities) - never a fixed list
// like "Pool / Gym / Conference" that might not correspond to a single
// real hotel yet and would silently return zero results if picked. Every
// filter shown here is guaranteed to match at least one hotel right now.
// Same reasoning as this app skips a "Rating" filter entirely: there's no
// review data to filter by yet, so it isn't offered as if there were.
export default function FilterPanel({ amenityOptions, selectedAmenities, onToggleAmenity, maxPrice, priceRange, onPriceChange, sort, onSortChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-5">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
        <SlidersHorizontal className="w-4 h-4" /> Filters
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Sort by</label>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)} className="input">
          <option value="recommended">Recommended</option>
          <option value="price_asc">Price - low to high</option>
          <option value="price_desc">Price - high to low</option>
        </select>
      </div>

      {maxPrice > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Max price - {formatMoney(priceRange, 'NGN')}/night
          </label>
          <input
            type="range"
            min="0"
            max={maxPrice}
            step="1000"
            value={priceRange}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="w-full accent-primary-700"
          />
        </div>
      )}

      {amenityOptions.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Amenities</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {amenityOptions.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAmenities.includes(a)}
                  onChange={() => onToggleAmenity(a)}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                {a}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
