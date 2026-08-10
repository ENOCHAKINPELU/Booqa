import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader, Building2, MapPin } from 'lucide-react';
import api from '../services/api';
import HotelCard from '../components/HotelCard';
import DateGuestPicker from '../components/DateGuestPicker';
import RecentlyViewed from '../components/RecentlyViewed';
import Testimonials from '../components/Testimonials';
import HeroCarousel from '../components/HeroCarousel';
import TrustBadges from '../components/TrustBadges';
import FeaturePills from '../components/FeaturePills';
import HeroStats from '../components/HeroStats';
import FloatingHotelCards from '../components/FloatingHotelCards';
import { getRecentlyViewed } from '../utils/recentlyViewed';
import { tomorrowISO, defaultCheckOut } from '../utils/dates';
import { HERO_IMAGES } from '../data/heroImages';
import { track } from '../utils/analytics';
import { buildHeroStats } from '../data/heroStats';

// Port Harcourt only for now — no city picker, no multi-city destinations
// grid. That's a market-scope decision, not a technical limitation: any
// hotel that opts in on the HotelOps side would appear here too, this
// page just isn't asking guests to choose a city that doesn't apply yet.
export default function LandingPage() {
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState(tomorrowISO());
  const [checkOut, setCheckOut] = useState(defaultCheckOut(tomorrowISO()));
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  // True total, not the display-capped `featured` list below — the hero
  // stats row's "Verified Hotels" count would silently under-report once
  // there are more than 6 live hotels if it read featured.length instead.
  const [hotelCount, setHotelCount] = useState(null);
  const recentlyViewed = useMemo(() => getRecentlyViewed(), []);

  useEffect(() => {
    // React.StrictMode fires this twice; under this local dev server's own
    // request-serialization behavior the two calls can resolve out of
    // order, and without this guard a slower *second* call's .catch could
    // overwrite the first call's already-successful data with []. Same
    // failure shape FloatingHotelCards already guards against — surfaced
    // here once its extra concurrent room-types calls made the underlying
    // race actually observable in practice.
    let cancelled = false;
    api.get('/hotels')
      .then((r) => {
        if (cancelled) return;
        const all = r.data.data || [];
        setHotelCount(all.length);
        setFeatured(all.slice(0, 6));
      })
      .catch(() => { if (!cancelled) setFeatured([]); })
      .finally(() => { if (!cancelled) setLoadingFeatured(false); });
    return () => { cancelled = true; };
  }, []);

  // avgRating stays undefined until a real reviews aggregate exists (PRD
  // §5.3/§6.8) — buildHeroStats renders an honest "New" state for it, not
  // a fabricated number.
  const heroStats = useMemo(() => buildHeroStats({ hotelCount }), [hotelCount]);

  const dateParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('check_in', checkIn);
    p.set('check_out', checkOut);
    p.set('adults', String(adults));
    p.set('children', String(children));
    return p;
  }, [checkIn, checkOut, adults, children]);

  const handleSearch = (e) => {
    e.preventDefault();
    track('search_started', { check_in: checkIn, check_out: checkOut, adults, children });
    navigate(`/search?${dateParams.toString()}`);
  };

  return (
    <div>
      <div className="bg-navy relative overflow-hidden">
        <HeroCarousel images={HERO_IMAGES} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-14 sm:pt-24 sm:pb-20">
          {/* Same headline → copy → search stack as before, just widened into
              a two-column grid at lg+ so the floating cards have a column of
              their own on the right instead of overlapping anything. Below
              lg it collapses back to the original single-column flow. */}
          <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px] gap-10 items-center">
            <div className="animate-heroFadeIn">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-100 bg-white/10 rounded-full px-3 py-1 mb-5">
                <MapPin className="w-3.5 h-3.5" /> Now live in Port Harcourt
              </span>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 max-w-xl leading-[1.1] tracking-tight text-balance">
                Find Your Perfect Stay
                <br />
                in <span className="text-accent">Port Harcourt</span>
              </h1>

              <p className="text-primary-100 text-sm sm:text-lg mb-6 max-w-lg leading-relaxed">
                Compare verified hotels, explore 360° room tours, watch room videos, and book instantly with real-time availability synced directly with hotels.
              </p>

              <TrustBadges />
              <FeaturePills />

              <form
                onSubmit={handleSearch}
                className="bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-w-2xl
                           shadow-2xl shadow-black/30 border border-white/70 transition-shadow duration-300 hover:shadow-black/40"
              >
                <DateGuestPicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  adults={adults}
                  children={children}
                  onChange={(next) => { setCheckIn(next.checkIn); setCheckOut(next.checkOut); setAdults(next.adults); setChildren(next.children); }}
                />
                <button
                  type="submit"
                  className="group w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark
                             text-primary-900 font-bold px-6 py-3 rounded-xl shadow-lg shadow-accent/30
                             transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-accent/40
                             active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-accent/40"
                >
                  <Search className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                  Search Port Harcourt hotels
                </button>
              </form>

              <HeroStats stats={heroStats} />
            </div>

            {!loadingFeatured && featured.length > 0 && (
              <FloatingHotelCards hotels={featured} />
            )}
          </div>
        </div>
      </div>

      <RecentlyViewed hotels={recentlyViewed} />

      <section id="featured-hotels" className="max-w-6xl mx-auto px-4 sm:px-6 py-10 scroll-mt-20">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Featured hotels</h2>
        {loadingFeatured && (
          <div className="flex items-center justify-center py-10 text-gray-400">
            <Loader className="w-6 h-6 animate-spin" />
          </div>
        )}
        {!loadingFeatured && featured.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Building2 className="w-8 h-8 mx-auto mb-2" />
            <p>No hotels are live on Booqa yet — check back soon.</p>
          </div>
        )}
        {!loadingFeatured && featured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((hotel) => (
              <HotelCard key={hotel.id} hotel={hotel} searchParams={dateParams} />
            ))}
          </div>
        )}
      </section>

      <Testimonials testimonials={[]} />
    </div>
  );
}
