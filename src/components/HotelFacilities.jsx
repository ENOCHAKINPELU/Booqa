import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Move3d, X, Camera } from 'lucide-react';
import MediaGallery from './MediaGallery';
import { track } from '../utils/analytics';
import { facilityIcon } from '../utils/facilities';

// Grouped the way Nigerian guests actually decide: power and connectivity
// first (the question everyone asks), then safety and getting there.
// Anything not in a group (a hotel's custom facility) lands in "More".
const GROUPS = [
  { title: 'Power & connectivity', keys: ['power', 'wifi'] },
  { title: 'Safety & getting there', keys: ['security', 'parking', 'shuttle'] },
  { title: 'Food & drink', keys: ['restaurant', 'bar', 'room_service'] },
  { title: 'Leisure & wellness', keys: ['pool', 'gym', 'spa', 'garden', 'rooftop', 'kids_area'] },
  { title: 'Services & spaces', keys: ['lobby', 'event_hall', 'laundry', 'exterior'] },
];

function groupFacilities(facilities) {
  const used = new Set();
  const groups = GROUPS.map((g) => {
    const items = g.keys.map((k) => facilities.find((f) => f.key === k)).filter(Boolean);
    items.forEach((f) => used.add(f.key));
    return { title: g.title, items };
  }).filter((g) => g.items.length);
  const rest = facilities.filter((f) => !used.has(f.key));
  if (rest.length) groups.push({ title: groups.length ? 'More' : 'Facilities', items: rest });
  return groups;
}

/**
 * "Facilities" on the hotel page: every facility as an icon, and the ones
 * with photos as cards that open a gallery (photos + 360° view).
 */
export default function HotelFacilities({ facilities = [] }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!facilities.length) return null;
  const withMedia = facilities.filter((f) => (f.media || []).length > 0);
  const iconOf = facilityIcon;

  return (
    <section className="mt-10 pt-6 border-t border-gray-100">
      <h2 className="font-semibold text-gray-900 mb-4">Facilities</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mb-1">
        {groupFacilities(facilities).map((g) => (
          <div key={g.title}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{g.title}</h3>
            <ul className="space-y-2">
              {g.items.map((f) => {
                const Icon = iconOf(f);
                return (
                  <li key={f.key} className="flex items-start gap-2 text-sm text-gray-700">
                    <Icon className="w-4 h-4 text-primary-700 mt-0.5 flex-shrink-0" />
                    <span>{f.name}{f.note ? <span className="block text-xs text-gray-400">{f.note}</span> : null}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {withMedia.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          {withMedia.map((f) => {
            const cover = f.media.find((m) => m.media_type === 'photo');
            const hasTour = f.media.some((m) => m.media_type === 'tour_360');
            const photoCount = f.media.filter((m) => m.media_type === 'photo').length;
            return (
              <button key={f.key} type="button"
                onClick={() => { setOpen(f); track('facility_opened', { facility: f.key }); }}
                className="group text-left rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {cover
                    ? <img src={cover.url} alt={f.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                    : <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900" />}
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    {photoCount > 0 && <span className="flex items-center gap-1 text-[11px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded"><Camera className="w-3 h-3" />{photoCount}</span>}
                    {hasTour && <span className="flex items-center gap-1 text-[11px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded"><Move3d className="w-3 h-3" />360°</span>}
                  </div>
                </div>
                <p className="px-3 py-2 text-sm font-medium text-gray-900 truncate">{f.name}</p>
              </button>
            );
          })}
        </div>
      )}

      {open && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpen(null)}>
          <div className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.name}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">{open.name}</h3>
                {open.note && <p className="text-xs text-gray-500">{open.note}</p>}
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="p-1.5 text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              {/* Facilities don't have video, so no "360° coming soon" tile either way */}
              <MediaGallery media={open.media} hideComingSoon />
            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
