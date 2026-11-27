import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, ChevronDown, ArrowRight, Search, CreditCard, BarChart3, Flame, Ship, HardHat, Briefcase, Presentation,
  Hotel, HeartHandshake as Handshake, CalendarCheck, MessageCircle, FileText, ShieldCheck,
} from 'lucide-react';

export const BIZ_NAV = [
  {
    label: 'How it works',
    items: [
      { icon: Search, label: 'Request & match', desc: 'Hotels that fit your request, live', href: '/#how-it-works' },
      { icon: CreditCard, label: 'Book & pay', desc: 'One payment for every room', href: '/#how-it-works' },
      { icon: BarChart3, label: 'Track every stay', desc: 'Bookings and spend in one view', href: '/#one-view' },
    ],
  },
  {
    label: 'Industries',
    items: [
      { icon: Flame, label: 'Oil & Gas', href: '/#industries' },
      { icon: Ship, label: 'Marine & Logistics', href: '/#industries' },
      { icon: HardHat, label: 'Engineering & Construction', href: '/#industries' },
      { icon: Briefcase, label: 'Corporate & Consulting', href: '/#industries' },
      { icon: Presentation, label: 'Training & Events', href: '/#industries' },
    ],
  },
  {
    label: 'For hotels',
    items: [
      { icon: Hotel, label: 'Why join Booqa', desc: 'Corporate guests for your rooms', href: '/#partners' },
      { icon: Handshake, label: 'Become a partner', desc: 'Tell us about your property', href: '/become-a-partner' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { icon: CalendarCheck, label: 'Find hotels', href: '/hotels' },
      { icon: MessageCircle, label: 'Talk to our team', href: '/request-demo?topic=talk' },
      { icon: ShieldCheck, label: 'Privacy policy', href: '/privacy' },
      { icon: FileText, label: 'Terms', href: '/terms' },
    ],
  },
];

export function BooqaMark({ dark = false }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/favicon.png" alt="" className="w-9 h-9" />
      <span className={`font-display text-2xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-navy'}`}>Booqa</span>
    </span>
  );
}

// Section links work from any page: a real link to "/#section" off the home
// page, a smooth scroll on it.
function NavHref({ href, className, onClick, children }) {
  const { pathname } = useLocation();
  if (href.startsWith('/#')) {
    const id = href.slice(2);
    return (
      <a href={href} className={className}
        onClick={(e) => {
          onClick?.();
          if (pathname === '/') {
            e.preventDefault();
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            window.history.replaceState(null, '', `#${id}`);
          }
        }}>
        {children}
      </a>
    );
  }
  return <Link to={href} className={className} onClick={onClick}>{children}</Link>;
}

function Dropdown({ menu, open, onOpen, onClose }) {
  const closeTimer = useRef(null);
  const hoverOpen = () => { clearTimeout(closeTimer.current); onOpen(); };
  const hoverClose = () => { closeTimer.current = setTimeout(onClose, 120); };

  return (
    <div className="relative" onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
      <button type="button" aria-expanded={open} aria-haspopup="true" onClick={() => (open ? onClose() : onOpen())}
        className={`flex items-center gap-1 text-[15px] font-medium transition-colors ${open ? 'text-navy' : 'text-gray-700 hover:text-navy'}`}>
        {menu.label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`absolute left-1/2 top-full pt-4 -translate-x-1/2 transition-all duration-300 ease-out
        ${open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'}`}>
        <ul className="w-72 rounded-2xl bg-white border border-gray-100 shadow-[0_24px_60px_-20px_rgba(8,28,87,0.35)] p-2">
          {menu.items.map(({ icon: Icon, label, desc, href }) => (
            <li key={label}>
              <NavHref href={href} onClick={onClose}
                className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-primary-50 transition-colors">
                <span className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-navy flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                  <Icon className="w-4 h-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{label}</span>
                  {desc && <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>}
                </span>
              </NavHref>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Corporate site navigation: sticky, tightening to a compact bar with a
 * hairline once the page scrolls.
 */
export default function BizNav() {
  const [compact, setCompact] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setOpenMenu(null); setMobileOpen(false); } };
    const onClick = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <header ref={navRef}
      className={`sticky top-0 z-40 transition-all duration-500 ease-out
        ${compact ? 'bg-white/85 backdrop-blur-xl border-b border-gray-200/80 shadow-[0_8px_30px_-18px_rgba(8,28,87,0.25)]' : 'bg-white border-b border-gray-100'}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ease-out ${compact ? 'h-16' : 'h-20'}`}>
        <Link to="/" aria-label="Booqa home"><BooqaMark /></Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-9">
          {BIZ_NAV.map((menu) => (
            <Dropdown key={menu.label} menu={menu} open={openMenu === menu.label}
              onOpen={() => setOpenMenu(menu.label)} onClose={() => setOpenMenu((m) => (m === menu.label ? null : m))} />
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <Link to="/business" className="text-[15px] font-semibold text-gray-800 hover:text-navy transition-colors">Sign in</Link>
          <Link to="/hotels"
            className="group inline-flex items-center gap-2 text-[15px] font-semibold text-white bg-navy hover:bg-primary-800 rounded-xl px-5 py-3 shadow-[0_10px_24px_-10px_rgba(16,48,143,0.7)] transition-all duration-300 ease-out hover:-translate-y-0.5">
            Find hotels <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button type="button" onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="lg:hidden p-2 -mr-2 text-gray-800">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Phone menu: full-height sheet with collapsible sections */}
      <div className={`lg:hidden fixed inset-x-0 top-[inherit] bottom-0 bg-white overflow-y-auto transition-all duration-300 ease-out
        ${mobileOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} style={{ top: compact ? 64 : 80 }}>
        <nav aria-label="Main mobile" className="px-4 py-2">
          {BIZ_NAV.map((menu) => {
            const open = mobileSection === menu.label;
            return (
              <div key={menu.label} className="border-b border-gray-100">
                <button type="button" onClick={() => setMobileSection(open ? null : menu.label)} aria-expanded={open}
                  className="w-full flex items-center justify-between py-4 text-base font-semibold text-gray-900">
                  {menu.label} <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-out ${open ? 'grid-rows-[1fr] opacity-100 pb-3' : 'grid-rows-[0fr] opacity-0'}`}>
                  <ul className="overflow-hidden">
                    {menu.items.map(({ icon: Icon, label, href }) => (
                      <li key={label}>
                        <NavHref href={href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 py-2.5 text-[15px] text-gray-700">
                          <Icon className="w-4 h-4 text-navy" /> {label}
                        </NavHref>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="grid grid-cols-2 gap-3 p-4">
          <Link to="/business" onClick={() => setMobileOpen(false)} className="text-center text-sm font-semibold border border-gray-300 rounded-xl py-3">Sign in</Link>
          <Link to="/hotels" onClick={() => setMobileOpen(false)} className="text-center text-sm font-semibold text-white bg-navy rounded-xl py-3">Find hotels</Link>
        </div>
      </div>
    </header>
  );
}
