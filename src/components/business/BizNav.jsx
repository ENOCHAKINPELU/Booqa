import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export const BIZ_NAV = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Industries', href: '/#industries' },
  { label: 'For hotels', href: '/#partners' },
];

export function BooqaMark({ dark = false }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/favicon.png" alt="" className="w-9 h-9" />
      <span className={`text-xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-navy'}`}>Booqa</span>
    </span>
  );
}

/**
 * Corporate site navigation. Sticky; once the page scrolls it tightens to
 * a compact bar with a hairline border so it never covers much content.
 */
export default function BizNav() {
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 bg-white/90 backdrop-blur-md transition-all duration-300 ${compact ? 'border-b border-gray-200 shadow-sm' : 'border-b border-transparent'}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${compact ? 'h-14' : 'h-20'}`}>
        <Link to="/" aria-label="Booqa home"><BooqaMark /></Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-7">
          {BIZ_NAV.map((n) => (
            <a key={n.label} href={n.href} className="text-sm font-medium text-gray-600 hover:text-navy transition-colors">{n.label}</a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <Link to="/business" className="text-sm font-semibold text-gray-700 hover:text-navy">Sign in</Link>
          <Link to="/request-demo" className="text-sm font-semibold text-white bg-navy hover:bg-primary-800 rounded-lg px-4 py-2.5 transition-colors">
            Request a Demo
          </Link>
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? 'Close menu' : 'Open menu'}
          className="lg:hidden p-2 -mr-2 text-gray-700">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pb-5">
          <nav aria-label="Main mobile" className="flex flex-col py-2">
            {BIZ_NAV.map((n) => (
              <a key={n.label} href={n.href} onClick={() => setOpen(false)} className="py-3 text-base font-medium text-gray-800 border-b border-gray-50">{n.label}</a>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Link to="/business" className="text-center text-sm font-semibold border border-gray-300 rounded-lg py-2.5">Sign in</Link>
            <Link to="/request-demo" className="text-center text-sm font-semibold text-white bg-navy rounded-lg py-2.5">Request a Demo</Link>
          </div>
        </div>
      )}
    </header>
  );
}
