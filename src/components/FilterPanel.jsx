import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { formatMoney } from '../utils/dates';
import { facilityIcon } from '../utils/facilities';

// Every option here is built from the hotels actually returned, each with
// a count - so a filter is never offered that matches nothing, and the
// guest can see how many hotels each one leaves before clicking. Same
// reasoning as why there's no rating filter: no reviews yet, so it isn't
// offered as if there were.
function Group({ title, children }) {
  return (
    <div className="py-4 border-t border-gray-100 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function CheckRow({ checked, onChange, label, count, icon: Icon }) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
      <input type="checkbox" checked={checked} onChange={onChange}
        className="w-4 h-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500" />
      {Icon && <Icon className="w-4 h-4 text-primary-700 flex-shrink-0" />}
      <span className="flex-1">{label}</span>
      <span className="text-xs text-gray-400 tabular-nums">{count}</span>
    </label>
  );
}

export default function FilterPanel({
  maxPrice, priceRange, onPriceChange,
  facilityOptions, selectedFacilities, onToggleFacility,
  areaOptions, selectedAreas, onToggleArea,
  amenityOptions, selectedAmenities, onToggleAmenity,
  activeCount, onClear, onClose,
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-1.5 text-base font-bold text-gray-900">
          <SlidersHorizontal className="w-4 h-4" /> Filter by
        </h2>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <button type="button" onClick={onClear} className="text-sm font-medium text-primary-700 hover:underline">Clear all</button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Close filters" className="lg:hidden text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {maxPrice > 0 && (
        <Group title="Your budget per night">
          <input
            type="range" min="0" max={maxPrice} step="500" value={priceRange}
            onChange={(e) => onPriceChange(Number(e.target.value))}
            className="w-full accent-primary-700" aria-label="Maximum price per night"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>₦0</span>
            <span className="font-semibold text-gray-900">Up to {formatMoney(priceRange, 'NGN')}</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Prices include all fees.</p>
        </Group>
      )}

      {facilityOptions.length > 0 && (
        <Group title="Popular filters">
          {facilityOptions.map((f) => (
            <CheckRow key={f.key} checked={selectedFacilities.includes(f.key)} onChange={() => onToggleFacility(f.key)}
              label={f.label} count={f.count} icon={facilityIcon(f)} />
          ))}
        </Group>
      )}

      {areaOptions.length > 0 && (
        <Group title="Area">
          {areaOptions.map((a) => (
            <CheckRow key={a.name} checked={selectedAreas.includes(a.name)} onChange={() => onToggleArea(a.name)}
              label={a.name} count={a.count} />
          ))}
        </Group>
      )}

      {amenityOptions.length > 0 && (
        <Group title="In the room">
          {amenityOptions.map((a) => (
            <CheckRow key={a.name} checked={selectedAmenities.includes(a.name)} onChange={() => onToggleAmenity(a.name)}
              label={a.name} count={a.count} />
          ))}
        </Group>
      )}

      {activeCount > 0 && (
        <p className="sr-only" aria-live="polite">{activeCount} filter{activeCount === 1 ? '' : 's'} applied</p>
      )}
    </div>
  );
}
