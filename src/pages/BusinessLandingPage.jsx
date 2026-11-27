import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Check, Building2, PlayCircle, Zap, CreditCard, BarChart3, Users, CalendarCheck, BadgeCheck,
  Landmark, Briefcase, Search, Globe2,
} from 'lucide-react';
import BizNav from '../components/business/BizNav';
import BizFooter from '../components/business/BizFooter';
import Reveal, { useParallax } from '../components/business/Reveal';
import DashboardMock from '../components/business/DashboardMock';
import { BIZ_IMAGES } from '../data/businessImages';
import HotelSearchBar from '../components/business/HotelSearchBar';
import { HotelCard } from './business/HotelsPage';
import { biz } from '../services/businessApi';
import { track } from '../utils/analytics';

/*
 * Booqa corporate landing page. Short, one idea per section, photography
 * and real product UI doing the explaining. No unsupported claims: no
 * customer counts, savings percentages or "compliance" features Booqa
 * doesn't have; example figures are labelled as such.
 */

const HIGHLIGHTS = [
  { icon: Zap, title: 'Instant matching', body: 'See hotels that fit your request, with live availability.' },
  { icon: CreditCard, title: 'One payment', body: 'Book every room and pay once by card, transfer or USSD.' },
  { icon: BarChart3, title: 'Spend visibility', body: 'Track bookings and spend by project, as it happens.' },
  { icon: Users, title: 'Your whole team', body: 'Invite colleagues to book and manage stays together.', gold: true },
];

const STEPS = [
  { img: BIZ_IMAGES.steps.request, title: 'You request', body: 'Tell us who needs a room, where and when.' },
  { img: BIZ_IMAGES.steps.arrange, title: 'See hotels that fit', body: 'Booqa checks live availability and shows the hotels that match. Book and pay in one go.' },
  { img: BIZ_IMAGES.steps.track, title: 'Track every stay', body: 'Every booking, guest and naira spent, in one place.' },
];

const INDUSTRIES = [
  { key: 'oilGas', title: 'Oil & Gas' },
  { key: 'marine', title: 'Marine & Logistics' },
  { key: 'construction', title: 'Engineering & Construction' },
  { key: 'corporate', title: 'Corporate & Consulting' },
  { key: 'training', title: 'Training & Events' },
];

const DASHBOARD_POINTS = ['Who is staying where', 'Every booking reference, per room', 'What you spend, by project'];

function Sparkline() {
  return (
    <svg viewBox="0 0 160 56" className="w-full h-14" aria-hidden="true">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F8C410" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F8C410" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M2 46 L18 40 L32 44 L48 32 L62 36 L78 26 L94 30 L110 18 L126 22 L142 10 L158 4 L158 56 L2 56 Z" fill="url(#spark)" />
      <path d="M2 46 L18 40 L32 44 L48 32 L62 36 L78 26 L94 30 L110 18 L126 22 L142 10 L158 4" fill="none" stroke="#F8C410" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Hero() {
  const parallax = useParallax(0.06);
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,48,143,0.06),transparent_55%)] pointer-events-none" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-16 pb-14 grid lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-14 items-center">
        <div>
          <p className="animate-fadeUp inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wide text-navy">
            <Building2 className="w-4 h-4" /> Corporate accommodation
          </p>
          <h1 className="animate-fadeUp [animation-delay:80ms] mt-6 font-display text-[2.6rem] leading-[1.02] sm:text-6xl xl:text-[4.6rem] font-extrabold tracking-[-0.03em] text-gray-950">
            Business accommodation, managed in{' '}
            <span className="relative inline-block text-navy">
              one place.
              <svg className="absolute left-0 -bottom-2 sm:-bottom-3 w-full h-3 sm:h-4" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                <path d="M3 11 C 70 3, 160 3, 297 9" fill="none" stroke="#F8C410" strokeWidth="5" strokeLinecap="round" strokeDasharray="320" className="animate-draw" />
              </svg>
            </span>
          </h1>
          <p className="animate-fadeUp [animation-delay:160ms] mt-7 text-lg sm:text-xl text-gray-600 max-w-xl leading-relaxed">
            Book and manage stays for your staff, contractors and visitors from one platform.
          </p>
          <div className="animate-fadeUp [animation-delay:240ms] mt-9 flex flex-col sm:flex-row gap-3">
            <a href="#find-hotels" onClick={(e) => { e.preventDefault(); track('cta_clicked', { cta: 'hero_find' }); document.getElementById('find-hotels')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.querySelector('#find-hotels input')?.focus({ preventScroll: true }); }}
              className="group inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-full px-7 py-4 shadow-[0_14px_30px_-12px_rgba(16,48,143,0.75)] transition-all duration-300 ease-out hover:-translate-y-0.5">
              <Search className="w-4 h-4" /> Find hotels <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
            <a href="#how-it-works"
              className="group inline-flex items-center justify-center gap-2 border-2 border-primary-200 hover:border-navy text-navy font-semibold rounded-full px-7 py-[14px] transition-all duration-300 ease-out hover:-translate-y-0.5">
              <PlayCircle className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" /> How it works
            </a>
          </div>
          <div className="animate-fadeUp [animation-delay:320ms] mt-10 flex items-center gap-4">
            <div className="flex -space-x-2" aria-hidden="true">
              {[Building2, Briefcase, Landmark, Globe2].map((Icon, i) => (
                <span key={i} className="w-10 h-10 rounded-full bg-white border-2 border-white ring-1 ring-gray-200 text-navy flex items-center justify-center shadow-sm">
                  <Icon className="w-4 h-4" />
                </span>
              ))}
            </div>
            <span className="w-px h-10 bg-gray-200" aria-hidden="true" />
            <p className="text-sm text-gray-600 leading-snug">For organizations of every size and sector,<br className="hidden sm:block" /> from growing firms to multinationals</p>
          </div>
        </div>

        <div className="relative animate-popIn [animation-delay:150ms]">
          <span className="hidden sm:block absolute -top-5 -right-3 w-10 h-10 text-accent" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M8 4 L12 14" /><path d="M22 10 L30 4" /><path d="M24 22 L36 20" /></svg>
          </span>
          <div className="relative rounded-[28px] overflow-hidden aspect-[4/3.4] shadow-[0_40px_80px_-30px_rgba(8,28,87,0.45)]">
            <div ref={parallax} className="absolute -inset-y-8 inset-x-0 will-change-transform">
              <img src={BIZ_IMAGES.heroRoom} alt="A warm, wood-panelled business hotel room" className="w-full h-full object-cover" fetchpriority="high" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden="true" />

            {/* bottom highlights bar */}
            <div className="absolute inset-x-4 sm:inset-x-10 bottom-4 sm:bottom-6 grid grid-cols-3 rounded-2xl bg-white/95 backdrop-blur shadow-lg divide-x divide-gray-200">
              {[[CalendarCheck, 'Book in minutes'], [CreditCard, 'Pay once'], [BarChart3, 'Track every stay']].map(([Icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-1.5 py-3 sm:py-4 px-2 text-center">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-navy" strokeWidth={1.75} />
                  <span className="text-[11px] sm:text-sm font-semibold text-navy leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* floating cards */}
          <div className="absolute -top-4 right-2 sm:-right-6 animate-popIn [animation-delay:600ms]">
            <div className="animate-bob flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_20px_40px_-15px_rgba(8,28,87,0.35)] rotate-[-2deg]">
              <span className="w-9 h-9 rounded-full bg-navy text-white flex items-center justify-center"><Check className="w-5 h-5" strokeWidth={3} /></span>
              <div>
                <p className="text-sm font-bold text-gray-950">Booking confirmed</p>
                <p className="text-xs text-gray-500">4 rooms · all set</p>
              </div>
            </div>
          </div>
          <div className="hidden sm:block absolute top-[34%] -left-10 w-60 animate-popIn [animation-delay:800ms]">
            <div className="animate-bob [animation-delay:1.5s] rounded-2xl bg-white p-4 shadow-[0_20px_40px_-15px_rgba(8,28,87,0.35)] rotate-[-1.5deg]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-navy">Accommodation spend</p>
                <BarChart3 className="w-4 h-4 text-navy" />
              </div>
              <p className="mt-1 font-display text-2xl font-extrabold text-navy tabular-nums">₦18.4M</p>
              <p className="text-[11px] text-gray-400">This month · example</p>
              <Sparkline />
            </div>
          </div>
        </div>
      </div>

      {/* feature strip */}
      {/* Find hotels - no sign-in needed */}
      <div id="find-hotels" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 scroll-mt-28">
        <div className="animate-fadeUp [animation-delay:400ms] rounded-3xl bg-white border border-gray-200 p-3 sm:p-4 shadow-[0_30px_60px_-35px_rgba(8,28,87,0.45)]">
          <p className="px-2 pb-3 text-sm font-semibold text-gray-700">Find hotels for your team <span className="font-normal text-gray-500">· browse freely, sign in only to book</span></p>
          <HotelSearchBar />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <Reveal className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur grid sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-gray-200 shadow-[0_20px_50px_-35px_rgba(8,28,87,0.35)]">
          {HIGHLIGHTS.map(({ icon: Icon, title, body, gold }) => (
            <div key={title} className="group flex gap-4 p-6 lg:p-7">
              <span className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-500 ease-out group-hover:scale-110
                ${gold ? 'bg-accent-soft text-accent-dark' : 'bg-primary-50 text-navy'}`}>
                <Icon className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-display text-lg font-bold text-navy">{title}</h3>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// Real hotels companies can book, straight from HotelOps - no sign-in.
function HotelsShowcase() {
  const [hotels, setHotels] = useState(null);
  useEffect(() => { biz.publicHotels().then((r) => setHotels(r.hotels)).catch(() => setHotels([])); }, []);
  if (hotels && hotels.length === 0) return null;
  return (
    <section id="hotels" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <Reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary-700">Hotels</p>
          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-gray-950">Hotels you can book today</h2>
          <p className="mt-3 text-lg text-gray-600">Rooms, photos and facilities, straight from each hotel.</p>
        </div>
        <Link to="/hotels" className="group inline-flex items-center gap-2 font-semibold text-navy">
          See all hotels <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </Reveal>
      {!hotels ? (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : (
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...hotels].sort((a, b) => (b.facilities?.length || 0) - (a.facilities?.length || 0)).slice(0, 6).map((h, i) => (
            <Reveal as="li" key={h.id} delay={(i % 3) * 100}>
              <HotelCard h={h} href={`/hotels/${h.id}`} />
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function BusinessLandingPage() {
  useEffect(() => {
    document.title = 'Booqa — Business accommodation, managed in one place';
    if (window.location.hash) {
      requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
    }
  }, []);

  return (
    <div className="bg-white text-gray-900 antialiased">
      <BizNav />

      <main>
        <Hero />
        <HotelsShowcase />

        {/* ── How it works ─────────────────────────────────── */}
        <section id="how-it-works" className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <Reveal className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-wider text-primary-700">How it works</p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-gray-950">From request to confirmed booking in minutes.</h2>
            </Reveal>
            <ol className="mt-14 grid md:grid-cols-3 gap-6">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 120} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-500">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={s.img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
                  </div>
                  <div className="p-7">
                    <span className="inline-flex w-9 h-9 rounded-full bg-accent-soft text-accent-dark font-display font-extrabold items-center justify-center">{i + 1}</span>
                    <h3 className="mt-4 font-display text-xl font-bold text-gray-950">{s.title}</h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── One view ─────────────────────────────────────── */}
        <section id="one-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-14 items-center">
          <Reveal variant="left">
            <p className="text-sm font-bold uppercase tracking-wider text-primary-700">One view</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-gray-950">Every stay, in one view.</h2>
            <p className="mt-4 text-lg text-gray-600">No more chasing hotels on WhatsApp and email.</p>
            <ul className="mt-8 space-y-4">
              {DASHBOARD_POINTS.map((p, i) => (
                <Reveal as="li" key={p} delay={150 + i * 100} variant="left" className="flex items-center gap-3 text-gray-800">
                  <span className="w-7 h-7 rounded-full bg-navy text-white flex items-center justify-center flex-shrink-0"><Check className="w-4 h-4" strokeWidth={3} /></span>
                  {p}
                </Reveal>
              ))}
            </ul>
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <DashboardMock variant="hero" />
          </Reveal>
        </section>

        {/* ── Industries ───────────────────────────────────── */}
        <section id="industries" className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-wider text-primary-700">Industries</p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-gray-950">Built for teams on the move</h2>
            </Reveal>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-4">
              {INDUSTRIES.map((ind, i) => (
                <Reveal key={ind.key} delay={i * 80}
                  className={`group relative rounded-3xl overflow-hidden aspect-[3/4] ${i === 4 ? 'col-span-2 md:col-span-1 aspect-[16/9] md:aspect-[3/4]' : ''}`}>
                  <img src={BIZ_IMAGES.industries[ind.key]} alt="" loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/10 to-transparent" aria-hidden="true" />
                  <h3 className="absolute bottom-0 inset-x-0 p-5 font-display text-base sm:text-lg font-bold text-white">{ind.title}</h3>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── For hotels ───────────────────────────────────── */}
        <section id="partners" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid md:grid-cols-2 gap-12 items-center">
          <Reveal variant="left" className="rounded-[28px] overflow-hidden aspect-[4/3]">
            <img src={BIZ_IMAGES.partnerHandshake} alt="Two business partners shaking hands" loading="lazy" className="w-full h-full object-cover" />
          </Reveal>
          <Reveal variant="right" delay={100}>
            <p className="text-sm font-bold uppercase tracking-wider text-primary-700">For hotels &amp; serviced apartments</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-gray-950">Fill rooms with corporate guests.</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-md">Run your hotel on HotelOps and companies on Booqa can find and book your rooms.</p>
            <ul className="mt-6 space-y-3">
              {['Bookings land straight in your front desk', 'Paid online before guests arrive', 'Your photos and facilities, shown as you set them'].map((x) => (
                <li key={x} className="flex items-center gap-3 text-gray-800"><BadgeCheck className="w-5 h-5 text-navy" /> {x}</li>
              ))}
            </ul>
            <Link to="/become-a-partner" onClick={() => track('cta_clicked', { cta: 'partner' })}
              className="group mt-8 inline-flex items-center gap-2 border-2 border-navy text-navy hover:bg-navy hover:text-white font-semibold rounded-full px-6 py-3 transition-all duration-300 ease-out">
              Become a partner <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section id="about" className="px-4 sm:px-6 lg:px-8 pb-24">
          <Reveal variant="scale" className="relative max-w-7xl mx-auto rounded-[32px] bg-navy px-6 sm:px-12 py-16 sm:py-20 text-center overflow-hidden">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-primary-500/30 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-accent/20 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-[-0.02em] text-white text-balance">Simplify business accommodation.</h2>
              <p className="mt-4 text-lg text-primary-100 max-w-lg mx-auto">Based in Port Harcourt, serving organizations across Nigeria.</p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/hotels" onClick={() => track('cta_clicked', { cta: 'final_find' })}
                  className="group inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-primary-900 font-bold rounded-full px-8 py-4 transition-all duration-300 ease-out hover:-translate-y-0.5">
                  <Search className="w-4 h-4" /> Find hotels <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link to="/signup?redirect=%2Fbusiness"
                  className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white text-white font-semibold rounded-full px-8 py-[14px] transition-colors duration-300">
                  Create a free company account
                </Link>
              </div>
              <p className="mt-6 text-sm text-primary-200">
                Prefer to talk first? <Link to="/request-demo?topic=talk" className="font-semibold text-white underline-offset-4 hover:underline">Talk to our team</Link>
              </p>
            </div>
          </Reveal>
        </section>
      </main>

      <BizFooter />
    </div>
  );
}
