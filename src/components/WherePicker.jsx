import React from 'react';
import { MapPin } from 'lucide-react';

/**
 * "Where" for a search: anywhere in Nigeria, or one of the cities that
 * currently has live hotels (from destinationsFrom). Value '' = anywhere.
 */
export default function WherePicker({ value, onChange, destinations }) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl border border-gray-200 px-3 py-2 focus-within:ring-4 focus-within:ring-primary-500/15 focus-within:border-primary-500">
      <MapPin className="w-5 h-5 text-primary-700 flex-shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Where</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer -ml-0.5"
        >
          <option value="">Anywhere in Nigeria</option>
          {destinations.map((d) => (
            <option key={d.name} value={d.name}>
              {d.name}{d.state ? `, ${d.state}` : ''} ({d.count} hotel{d.count === 1 ? '' : 's'})
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
