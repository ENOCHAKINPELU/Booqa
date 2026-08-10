import React, { useEffect, useRef, useState } from 'react';

// Auto-rotating photo background for the landing page hero. Sits behind the
// hero content (headline, search widget) as an absolutely-positioned layer
// — the parent must be `position: relative` and the content stacked above
// it with a higher z-index.
//
// Deliberately respects prefers-reduced-motion (stops auto-advancing,
// shows the first photo statically — same discipline as every other
// animation in this codebase) and pauses on hover/focus so a guest reading
// the search form isn't fighting a photo change underneath their cursor.
export default function HeroCarousel({ images, intervalMs = 5000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (paused || reducedMotion.current || images.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [paused, images.length, intervalMs]);

  if (!images.length) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {images.map((img, i) => (
        <img
          key={img.url}
          src={img.url}
          alt=""
          aria-hidden="true"
          // Ken Burns: a slow, continuous zoom independent of which photo is
          // currently visible, so the crossfade above never reveals a jump
          // back to scale(1) — each image is just wherever its own 14s
          // cycle happens to be. motion-reduce turns it off entirely, same
          // discipline as the auto-advance timer already respects.
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out animate-kenburns motion-reduce:animate-none"
          style={{ opacity: i === index ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
        />
      ))}

      {/* Brand-tinted scrim — keeps the hero reading as "Booqa navy" rather
          than a raw stock photo, and guarantees the white headline/search
          widget stay legible over any image in the rotation. */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/80 to-navy/95" />

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5" role="tablist" aria-label="Featured room photos">
          {images.map((img, i) => (
            <button
              key={img.url}
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1} of ${images.length}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
