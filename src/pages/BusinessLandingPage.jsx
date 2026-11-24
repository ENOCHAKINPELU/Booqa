import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CalendarCheck, Clock } from 'lucide-react';
import BizNav from '../components/business/BizNav';
import BizFooter from '../components/business/BizFooter';
import Reveal from '../components/business/Reveal';
import DashboardMock from '../components/business/DashboardMock';
import { BIZ_IMAGES } from '../data/businessImages';
import { track } from '../utils/analytics';

/*
 * Booqa corporate landing page - kept deliberately short: one idea per
 * section, a line or two of copy, and photography doing the explaining.
 * Message: Booqa lets organizations request, book and track business
 * accommodation in one place. No customer counts, savings claims or
 * "live inventory" promises.
 */

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

const DashboardPoints = ['Who is staying where', 'Every booking reference, per room', 'What you spend, by project'];

export default function BusinessLandingPage() {
  useEffect(() => {
    document.title = 'Booqa — Business accommodation, managed in one place';
    // Arriving from another page via /#section: scroll once it has rendered.
    if (window.location.hash) {
      requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
    }
  }, []);

  return (
    <div className="bg-white text-gray-900 antialiased">
      <BizNav />

      <main>
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-16 pb-20 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">Corporate accommodation</p>
            <h1 className="mt-4 text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05] text-gray-950 text-balance">
              Business accommodation, managed in one place.
            </h1>
            <p className="mt-5 text-lg text-gray-600 max-w-md">
              Book and manage stays for your staff, contractors and visitors from one platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/request-demo" onClick={() => track('cta_clicked', { cta: 'hero_demo' })}
                className="group inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-lg px-6 py-3.5 transition-colors">
                Request a demo <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center justify-center border border-gray-300 hover:border-navy text-gray-800 font-semibold rounded-lg px-6 py-3.5 transition-colors">
                How it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={120} className="relative">
            <div className="rounded-3xl overflow-hidden aspect-[5/4]">
              <img src={BIZ_IMAGES.heroLounge} alt="Executive lounge of a business hotel" className="w-full h-full object-cover" fetchpriority="high" />
            </div>
            {/* One small product hint, not a whole dashboard */}
            <div className="absolute -bottom-6 left-4 sm:-left-6 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-50 text-navy flex items-center justify-center"><CalendarCheck className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-gray-950">Stay confirmed</p>
                  <p className="text-xs text-gray-500">4 rooms · 12–19 March</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                <Clock className="w-3.5 h-3.5" /> Paid · booking references sent
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── How it works: three steps, three pictures ────── */}
        <section id="how-it-works" className="scroll-mt-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <Reveal className="max-w-xl">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950">How Booqa works</h2>
              <p className="mt-3 text-gray-600">From request to confirmed booking in minutes.</p>
            </Reveal>
            <ol className="mt-12 grid md:grid-cols-3 gap-6">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 100} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={s.img} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6">
                    <span className="text-sm font-bold text-accent-dark">0{i + 1}</span>
                    <h3 className="mt-1 text-xl font-semibold text-gray-950">{s.title}</h3>
                    <p className="mt-2 text-gray-600">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── One view ─────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 items-center">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950">Every stay, in one view.</h2>
            <p className="mt-3 text-gray-600">No more chasing hotels on WhatsApp and email.</p>
            <ul className="mt-7 space-y-3">
              {DashboardPoints.map((p) => (
                <li key={p} className="flex items-center gap-3 text-gray-800">
                  <span className="w-6 h-6 rounded-full bg-primary-50 text-navy flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <DashboardMock variant="hero" />
          </Reveal>
        </section>

        {/* ── Industries ───────────────────────────────────── */}
        <section id="industries" className="scroll-mt-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-950">Built for teams on the move</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4">
              {INDUSTRIES.map((ind, i) => (
                <Reveal key={ind.key} delay={i * 60}
                  className={`group relative rounded-2xl overflow-hidden aspect-[3/4] ${i === 4 ? 'col-span-2 md:col-span-1 aspect-[16/9] md:aspect-[3/4]' : ''}`}>
                  <img src={BIZ_IMAGES.industries[ind.key]} alt="" loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/85 via-gray-950/10 to-transparent" aria-hidden="true" />
                  <h3 className="absolute bottom-0 inset-x-0 p-4 text-base font-semibold text-white">{ind.title}</h3>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── For hotels (secondary) ───────────────────────── */}
        <section id="partners" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid md:grid-cols-2 gap-10 items-center">
          <Reveal className="rounded-3xl overflow-hidden aspect-[4/3]">
            <img src={BIZ_IMAGES.partnerHandshake} alt="Two business partners shaking hands" loading="lazy" className="w-full h-full object-cover" />
          </Reveal>
          <Reveal delay={100}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">For hotels & serviced apartments</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-gray-950">Fill rooms with corporate guests.</h2>
            <p className="mt-3 text-gray-600 max-w-md">Join Booqa and receive accommodation requests from organizations, at agreed corporate rates.</p>
            <Link to="/become-a-partner" onClick={() => track('cta_clicked', { cta: 'partner' })}
              className="mt-7 inline-flex items-center gap-2 font-semibold text-navy hover:gap-3 transition-all">
              Become a partner <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </section>

        {/* ── Final CTA ────────────────────────────────────── */}
        <section id="about" className="scroll-mt-20 px-4 sm:px-6 lg:px-8 pb-20">
          <Reveal className="max-w-7xl mx-auto rounded-3xl bg-navy px-6 sm:px-12 py-14 sm:py-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">Simplify business accommodation.</h2>
            <p className="mt-3 text-primary-100 max-w-lg mx-auto">
              Booqa is based in Port Harcourt, serving organizations across Nigeria.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/request-demo" onClick={() => track('cta_clicked', { cta: 'final_demo' })}
                className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-primary-900 font-bold rounded-lg px-7 py-3.5 transition-colors">
                Request a demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/request-demo?topic=talk"
                className="inline-flex items-center justify-center border border-white/30 hover:border-white text-white font-semibold rounded-lg px-7 py-3.5 transition-colors">
                Talk to our team
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <BizFooter />
    </div>
  );
}
