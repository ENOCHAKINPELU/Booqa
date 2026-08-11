import React from 'react';
import { Star } from 'lucide-react';

// Same component for both display (interactive=false) and picking a
// rating (interactive=true, onChange) — one star-rendering
// implementation instead of two that could drift apart visually.
// `value: null` renders nothing filled — never a fabricated default,
// same rule §6.1's ReviewStars spec already set for this app.
export default function ReviewStars({ value, onChange, size = 'w-4 h-4', interactive = false, label }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5" role={interactive ? 'radiogroup' : 'img'} aria-label={label || (value ? `${value} out of 5 stars` : 'No rating')}>
      {stars.map((n) => {
        const filled = value != null && n <= value;
        const Star_ = Star;
        return interactive ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange?.(n)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star_ className={`${size} ${filled ? 'fill-accent text-accent' : 'text-gray-300'}`} />
          </button>
        ) : (
          <Star_ key={n} className={`${size} ${filled ? 'fill-accent text-accent' : 'text-gray-300'}`} />
        );
      })}
    </div>
  );
}
