import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

/**
 * Small photo carousel for hotel cards. Arrows appear on hover (desktop)
 * and stay visible on touch screens; dots show position. Clicks on the
 * arrows never follow the card's link. With no photos it shows a branded
 * placeholder instead of an empty grey box.
 */
export default function PhotoCarousel({ photos = [], alt, className = '' }) {
  const [i, setI] = useState(0);
  const count = photos.length;

  if (!count) {
    return (
      <div className={`bg-gradient-to-br from-primary-700 to-primary-900 flex flex-col items-center justify-center text-primary-200 ${className}`}>
        <Building2 className="w-9 h-9" />
        <span className="text-[11px] mt-1.5 text-primary-200/80">Photos coming soon</span>
      </div>
    );
  }

  const go = (e, delta) => {
    e.preventDefault();
    e.stopPropagation();
    setI((prev) => (prev + delta + count) % count);
  };

  return (
    <div className={`relative overflow-hidden group/carousel bg-gray-100 ${className}`}>
      <img src={photos[i]} alt={alt} loading="lazy" className="w-full h-full object-cover" />
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous photo" onClick={(e) => go(e, -1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-800
                       opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-opacity">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Next photo" onClick={(e) => go(e, 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-800
                       opacity-100 sm:opacity-0 sm:group-hover/carousel:opacity-100 transition-opacity">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1" aria-hidden="true">
            {photos.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
