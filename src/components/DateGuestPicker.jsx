import React from 'react';
import { CalendarCheck, CalendarX2, Users, Baby } from 'lucide-react';
import { todayISO, defaultCheckOut } from '../utils/dates';

// Controlled - the caller owns the values (usually mirrored into the URL's
// query params) so a reload or a shared link reproduces the same search.
// Same 4-field grid everywhere it's used (hero, hotel detail, search) -
// only the icon/label treatment below is new, the contract is unchanged.
export default function DateGuestPicker({ checkIn, checkOut, adults, children, onChange, compact = false }) {
  const set = (patch) => onChange({ checkIn, checkOut, adults, children, ...patch });

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
      <label className="text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-primary-600" /> Check-in
        </span>
        <input
          type="date"
          className="input"
          value={checkIn}
          min={todayISO()}
          onChange={(e) => {
            const nextCheckIn = e.target.value;
            const nextCheckOut = checkOut && checkOut > nextCheckIn ? checkOut : defaultCheckOut(nextCheckIn);
            set({ checkIn: nextCheckIn, checkOut: nextCheckOut });
          }}
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
          <CalendarX2 className="w-3.5 h-3.5 text-primary-600" /> Check-out
        </span>
        <input
          type="date"
          className="input"
          value={checkOut}
          min={checkIn || todayISO()}
          onChange={(e) => set({ checkOut: e.target.value })}
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
          <Users className="w-3.5 h-3.5 text-primary-600" /> Adults
        </span>
        <input
          type="number"
          min={1}
          max={10}
          className="input"
          value={adults}
          onChange={(e) => set({ adults: Math.max(1, Number(e.target.value) || 1) })}
        />
      </label>
      <label className="text-sm">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
          <Baby className="w-3.5 h-3.5 text-primary-600" /> Children
        </span>
        <input
          type="number"
          min={0}
          max={10}
          className="input"
          value={children}
          onChange={(e) => set({ children: Math.max(0, Number(e.target.value) || 0) })}
        />
      </label>
    </div>
  );
}
