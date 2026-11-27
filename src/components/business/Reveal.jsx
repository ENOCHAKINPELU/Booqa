import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll-in animation for the corporate site. Content eases in once as it
 * enters the viewport; children of a <Reveal stagger> group follow one
 * after another. Skipped entirely for people who ask for reduced motion.
 *
 *   variant  up (default) | left | right | scale | fade
 *   delay    ms before this element starts
 */
const HIDDEN = {
  up: 'opacity-0 translate-y-6',
  left: 'opacity-0 -translate-x-6',
  right: 'opacity-0 translate-x-6',
  scale: 'opacity-0 scale-[0.97]',
  fade: 'opacity-0',
};

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); obs.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,transform] duration-[900ms] ease-out will-change-transform
        ${shown ? 'opacity-100 translate-x-0 translate-y-0 scale-100' : HIDDEN[variant] || HIDDEN.up} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A gentle parallax drift (desktop, motion allowed only): the element moves
 * at `speed` of the scroll distance while its section is on screen.
 */
export function useParallax(speed = 0.08) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || window.matchMedia('(max-width: 1023px)').matches) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed]);
  return ref;
}
