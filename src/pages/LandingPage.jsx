import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Loader, Building2, MapPin, ShieldCheck, Receipt, CreditCard, MailCheck, ArrowRight, ChevronRight,
  BedDouble, Wallet, QrCode, Hotel,
} from 'lucide-react';
import api from '../services/api';
import HotelCard from '../components/HotelCard';
import DateGuestPicker from '../components/DateGuestPicker';
import RecentlyViewed from '../components/RecentlyViewed';
import Testimonials from '../components/Testimonials';
import HeroCarousel from '../components/HeroCarousel';
import HeroStats from '../components/HeroStats';
import FloatingHotelCards from '../components/FloatingHotelCards';
import { getRecentlyViewed } from '../utils/recentlyViewed';
import { tomorrowISO, defaultCheckOut, formatMoney } from '../utils/dates';
import { hotelFromPrice } from '../utils/pricing';
import { facilityIcon, FACILITY_LABELS, FACILITY_PRIORITY } from '../utils/facilities';
import WherePicker from '../components/WherePicker';
import { destinationsFrom, listPlaces } from '../utils/destinations';
import { HERO_IMAGES } from '../data/heroImages';
import { track } from '../utils/analytics';
import { buildHeroStats } from '../data/heroStats';

// Every claim on this page is something Booqa actually does today - see
// TrustBadges.jsx / BookingPanel.jsx for where each one is backed in code.
const WHY = [
  { icon: ShieldCheck, title: 'Verified hotels only', body: 'Every hotel runs on HotelOps, so rooms and availability are real and live.' },
  { icon: Receipt, title: 'The price you see is the price you pay', body: 'All fees are included from the first search. No surprises at checkout.' },
  { icon: CreditCard, title: 'Pay your way', body: 'Card, bank transfer or USSD, secured by Flutterwave.' },
  { icon: MailCheck, title: 'Instant confirmation', body: 'Your booking is confirmed and emailed to you the moment you pay.' },
];

const STEPS = [
  { icon: Search, title: 'Search & compare', body: 'Real photos, room-by-room comparison and full prices.' },
  { icon: Wallet, title: 'Book & pay securely', body: 'Card, transfer or USSD. Your room is held while you pay.' },
  { icon: QrCode, title: 'Show your QR at check-in', body: 'The front desk scans it and you are in your room.' },
];

const HOTELOPS_URL = 'https://hotelops.ng';

export default function LandingPage() {
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState(tomorrowISO());
  const [checkOut, setCheckOut] = useState(defaultCheckOut(tomorrowISO()));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [where, setWhere] = useState(''); // '' = anywhere in Nigeria

  const [hotels, setHotels] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const recentlyViewed = useMemo(() => getRecentlyViewed(), []);

  useEffect(() => {
    // StrictMode fires this twice; the guard stops a slower second call's
    // .catch from overwriting the first call's data with [].
    let cancelled = false;
    api.get('/hotels')
      .then((r) => { if (!cancelled) setHotels(r.data.data || []); })
      .catch(() => { if (!cancelled) setHotels([]); })
      .finally(() => { if (!cancelled) setLoadingHotels(false); });
    return () => { cancelled = true; };
  }, []);

  const featured = hotels.slice(0, 8);
  // Cities that actually have live hotels - grows on its own as hotels in
  // new cities go live. Port Harcourt is simply where Booqa starts.
  const destinations = useMemo(() => destinationsFrom(hotels), [hotels]);
  const liveIn = listPlaces(destinations.map((d) => d.name));
  // avgRating stays undefined until real reviews exist - buildHeroStats
  // renders an honest "New" state for it, not a fabricated number.
  const heroStats = useMemo(() => buildHeroStats({ hotelCount: loadingHotels ? null : hotels.length }), [hotels, loadingHotels]);

  const dateParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('check_in', checkIn);
    p.set('check_out', checkOut);
    p.set('adults', String(adults));
    p.set('children', String(children));
    return p;
  }, [checkIn, checkOut, adults, children]);

  const searchLink = (extra = {}) => {
    const p = new URLSearchParams(dateParams);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return `/search?${p.toString()}`;
  };

  // "Stay by what matters" - built from what the live hotels actually
  // offer, each with a real count, so no shortcut leads to zero results.
  const shortcuts = useMemo(() => {
    const counts = new Map();
    hotels.forEach((h) => new Set((h.facilities || []).map((f) => f.key)).forEach((k) => counts.set(k, (counts.get(k) || 0) + 1)));
    const tiles = FACILITY_PRIORITY.filter((k) => counts.get(k)).slice(0, 5).map((key) => ({
      key, label: FACILITY_LABELS[key], icon: facilityIcon({ key }), count: counts.get(key), to: searchLink({ facility: key }),
    }));
    const prices = hotels.map((h) => hotelFromPrice(h)?.perNight).filter(Boolean).sort((a, b) => a - b);
    if (prices.length >= 2) {
      // A round budget that genuinely includes the cheaper half of hotels.
      const budget = Math.ceil(prices[Math.floor((prices.length - 1) / 2)] / 5000) * 5000;
      const count = prices.filter((p) => p <= budget).length;
      tiles.push({ key: 'budget', label: `Under ${formatMoney(budget)}`, icon: Wallet, count, to: searchLink({ max_price: budget }) });
    }
    return tiles;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels, dateParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    track('search_started', { check_in: checkIn, check_out: checkOut, adults, children, where: where || 'anywhere' });
    navigate(searchLink(where ? { city: where } : {}));
  };

  return (
    <div className="bg-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="bg-navy relative overflow-hidden">
        <HeroCarousel images={HERO_IMAGES} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-14 sm:pt-20 sm:pb-20">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px] gap-10 items-center">
            <div className="animate-heroFadeIn">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-100 bg-white/10 rounded-full px-3 py-1 mb-5">
                <MapPin className="w-3.5 h-3.5" /> {liveIn ? `Live in ${liveIn}` : 'Starting in Port Harcourt'} · more Nigerian cities soon
              </span>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 max-w-xl leading-[1.1] tracking-tight text-balance">
                Book a hotel you can <span className="text-accent">trust</span>, anywhere in Nigeria.
              </h1>
              <p className="text-primary-100 text-sm sm:text-lg mb-7 max-w-lg leading-relaxed">
                Verified hotels with real photos, live availability and prices that already include every fee.
              </p>

              <form onSubmit={handleSearch}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/30 max-w-2xl space-y-4">
                <WherePicker value={where} onChange={setWhere} destinations={destinations} />
                <DateGuestPicker
                  checkIn={checkIn} checkOut={checkOut} adults={adults} children={children}
                  onChange={(n) => { setCheckIn(n.checkIn); setCheckOut(n.checkOut); setAdults(n.adults); setChildren(n.children); }}
                />
                <button type="submit"
                  className="group w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-primary-900 font-bold
                             px-6 py-3.5 rounded-xl shadow-lg shadow-accent/30 transition-all duration-200 hover:scale-[1.01]
                             active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-accent/40">
                  <Search className="w-4 h-4" /> Search hotels
                </button>
              </form>

              <HeroStats stats={heroStats} />
            </div>

            {!loadingHotels && featured.length > 0 && <FloatingHotelCards hotels={featured.slice(0, 6)} />}
          </div>
        </div>
      </div>

      {/* ── Why Booqa ────────────────────────────────────────── */}
      <section aria-labelledby="why-booqa" className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <h2 id="why-booqa" className="sr-only">Why book with Booqa</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <RecentlyViewed hotels={recentlyViewed} />

      {/* ── Stay by what matters ─────────────────────────────── */}
      {shortcuts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Stay by what matters to you</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">Jump straight to hotels with what you need.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {shortcuts.map(({ key, label, icon: Icon, count, to }) => (
              <Link key={key} to={to} onClick={() => track('shortcut_clicked', { shortcut: key })}
                className="group rounded-2xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-md transition-all">
                <Icon className="w-6 h-6 text-primary-700" />
                <p className="text-sm font-bold text-gray-900 mt-3">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{count} hotel{count === 1 ? '' : 's'}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Destinations: real cities with live hotels ───────── */}
      {destinations.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Destinations in Nigeria</h2>
          <p className="text-sm text-gray-500 mt-1 mb-5">We're starting in Port Harcourt and adding more cities as hotels join.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {destinations.map((d) => (
              <Link key={d.name} to={searchLink({ city: d.name })} onClick={() => track('destination_clicked', { city: d.name })}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-700 to-primary-900 p-5 min-h-[120px] flex flex-col justify-end hover:shadow-lg transition-shadow">
                <MapPin className="absolute top-4 right-4 w-5 h-5 text-accent" />
                <p className="text-lg font-extrabold text-white">{d.name}</p>
                <p className="text-xs text-primary-100">{d.state ? `${d.state} · ` : ''}{d.count} hotel{d.count === 1 ? '' : 's'}</p>
              </Link>
            ))}
            <div className="rounded-2xl border-2 border-dashed border-gray-200 p-5 min-h-[120px] flex flex-col justify-end">
              <p className="text-sm font-bold text-gray-700">More cities coming</p>
              <p className="text-xs text-gray-500 mt-0.5">Lagos, Abuja and beyond, as hotels go live.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Featured hotels ──────────────────────────────────── */}
      <section id="featured-hotels" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 scroll-mt-20">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Hotels on Booqa</h2>
            <p className="text-sm text-gray-500 mt-1">Verified, bookable now, prices include all fees.</p>
          </div>
          {hotels.length > 0 && (
            <Link to={searchLink()} className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">
              See all {hotels.length} <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        {loadingHotels && (
          <div className="flex items-center justify-center py-10 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>
        )}
        {!loadingHotels && featured.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Building2 className="w-8 h-8 mx-auto mb-2" />
            <p>No hotels are live on Booqa yet - check back soon.</p>
          </div>
        )}
        {!loadingHotels && featured.length > 0 && (
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
            {featured.map((hotel) => (
              <div key={hotel.id} className="snap-start flex-shrink-0 w-[78%] sm:w-[46%] lg:w-[31.5%]">
                <HotelCard hotel={hotel} searchParams={dateParams} />
              </div>
            ))}
          </div>
        )}
        {hotels.length > 0 && (
          <Link to={searchLink()} className="sm:hidden btn-secondary w-full mt-3 flex items-center justify-center gap-1">
            See all {hotels.length} hotels <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 text-center">How Booqa works</h2>
          <ol className="grid sm:grid-cols-3 gap-6 mt-8">
            {STEPS.map(({ icon: Icon, title, body }, n) => (
              <li key={title} className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <span className="mx-auto w-12 h-12 rounded-full bg-primary-700 text-white flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <p className="text-xs font-bold text-accent-dark mt-4">STEP {n + 1}</p>
                <p className="font-bold text-gray-900 mt-1">{title}</p>
                <p className="text-sm text-gray-500 mt-1">{body}</p>
              </li>
            ))}
          </ol>
          <div className="text-center mt-8">
            <Link to={searchLink()} className="btn-primary inline-flex items-center gap-1.5 px-6 py-3">
              <BedDouble className="w-4 h-4" /> Find a room
            </Link>
          </div>
        </div>
      </section>

      <Testimonials testimonials={[]} />

      {/* ── For hotels ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-navy p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent"><Hotel className="w-4 h-4" /> For hotel owners</p>
            <h2 className="text-2xl font-extrabold text-white mt-2">Get your hotel on Booqa</h2>
            <p className="text-primary-100 text-sm mt-2 max-w-md">
              Run your hotel on HotelOps and go live on Booqa with one switch. Bookings land straight in your front desk.
            </p>
          </div>
          <a href={HOTELOPS_URL} target="_blank" rel="noreferrer"
            className="relative flex items-center gap-2 bg-accent hover:bg-accent-dark text-primary-900 font-bold px-5 py-3 rounded-xl flex-shrink-0">
            List your hotel <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
