import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, MessagesSquare, Wallet, Building2, CalendarSearch, Inbox, Search, BadgePercent, ClipboardCheck,
  CalendarCheck, Users, BarChart3, HeartHandshake as Handshake, Check, X as XIcon, ShieldCheck, Headphones, FileText,
} from 'lucide-react';
import BizNav from '../components/business/BizNav';
import BizFooter from '../components/business/BizFooter';
import Reveal from '../components/business/Reveal';
import DashboardMock, { StatusPill, STATUS } from '../components/business/DashboardMock';
import { BIZ_IMAGES } from '../data/businessImages';
import { track } from '../utils/analytics';

/*
 * Booqa corporate landing page - "Business accommodation, managed in one
 * place." Audience: the organization arranging accommodation (procurement,
 * HR, admin, finance, project and travel coordinators), not holiday
 * travellers. Claims are deliberately modest: no customer counts, savings
 * percentages or market-leadership lines, and no promise of instant/live
 * inventory - availability is confirmed through each supplier's workflow.
 */

const CHALLENGES = [
  { icon: MessagesSquare, title: 'Fragmented booking processes', body: 'Accommodation requests are scattered across phone calls, emails and messaging platforms.' },
  { icon: Wallet, title: 'Limited spending visibility', body: 'Organizations struggle to see how much they spend on accommodation across teams and projects.' },
  { icon: Building2, title: 'Difficult supplier coordination', body: 'Managing multiple hotels, rates, availability and confirmations creates unnecessary administrative work.' },
  { icon: CalendarSearch, title: 'Poor reservation tracking', body: 'Knowing who is staying where, what has been confirmed and what has changed becomes difficult.' },
];

const FEATURES = [
  { icon: Inbox, title: 'Centralized accommodation requests', body: 'Submit, organize and track every accommodation request from one place.' },
  { icon: Search, title: 'Accommodation discovery', body: 'Explore suitable hotels, serviced apartments and other providers by location, requirements and corporate rates.' },
  { icon: BadgePercent, title: 'Corporate rates', body: 'Negotiated accommodation rates and organization-specific pricing agreements.' },
  { icon: ClipboardCheck, title: 'Approval workflows', body: 'Review and approve accommodation requests before reservations are confirmed.' },
  { icon: CalendarCheck, title: 'Reservation management', body: 'Confirmations, guest details, check-in and check-out dates, extensions and cancellations.' },
  { icon: Users, title: 'Guest coordination', body: 'Arrangements for employees, contractors, consultants and business visitors.' },
  { icon: BarChart3, title: 'Spending and reporting', body: 'Expenditure, booking history and spend across departments and projects.' },
  { icon: Handshake, title: 'Supplier management', body: 'Accommodation providers, agreed rates, service information and supplier performance.' },
];

const STEPS = [
  { title: 'Submit a request', body: 'Share the location, dates, number of guests, room preferences and project details.' },
  { title: 'Explore suitable options', body: 'Booqa identifies suitable providers and coordinates availability and applicable rates.' },
  { title: 'Review and approve', body: 'Your team reviews the options and completes any internal approval.' },
  { title: 'Confirm the reservation', body: 'Booqa confirms with the provider and shares the reservation and guest arrangements.' },
  { title: 'Manage the stay', body: 'Track reservations, guest stays, changes and accommodation expenditure.' },
];

const INDUSTRIES = [
  { key: 'oilGas', title: 'Oil & Gas', body: 'Project personnel, field engineers, consultants and visiting professionals.' },
  { key: 'marine', title: 'Marine & Logistics', body: 'Marine personnel, contractors, operational teams and visiting specialists.' },
  { key: 'construction', title: 'Engineering & Construction', body: 'Project teams, site personnel, consultants and technical specialists.' },
  { key: 'corporate', title: 'Corporate & Consulting', body: 'Executives, employees, consultants and business visitors.' },
  { key: 'training', title: 'Training & Events', body: 'Participants, facilitators and corporate event teams.' },
];

const PARTNER_BENEFITS = [
  'Access to corporate accommodation requests',
  'Relationships with business customers',
  'Agreed corporate rates and structured booking processes',
  'Better coordination of reservations',
  'Opportunities for recurring business',
];

const COMPARISON = [
  { label: 'Built around organizational accommodation needs', booking: false },
  { label: 'Centralized booking records for the whole organization', booking: false },
  { label: 'Structured coordination with accommodation providers', booking: false },
  { label: 'Corporate pricing arrangements', booking: false },
  { label: 'Booking and expenditure visibility by team or project', booking: false },
  { label: 'Dedicated support for accommodation coordination', booking: false },
];

function Eyebrow({ children, light = false }) {
  return <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${light ? 'text-accent' : 'text-primary-700'}`}>{children}</p>;
}

function SectionHeading({ eyebrow, title, body, light = false, center = false }) {
  return (
    <div className={center ? 'text-center max-w-2xl mx-auto' : 'max-w-2xl'}>
      {eyebrow && <Eyebrow light={light}>{eyebrow}</Eyebrow>}
      <h2 className={`mt-3 text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] text-balance ${light ? 'text-white' : 'text-gray-950'}`}>{title}</h2>
      {body && <p className={`mt-4 text-base sm:text-lg leading-relaxed ${light ? 'text-primary-100' : 'text-gray-600'}`}>{body}</p>}
    </div>
  );
}

export default function BusinessLandingPage() {
  useEffect(() => {
    document.title = 'Booqa — Business accommodation, managed in one place';
    // Arriving from another page via /#section: the section only exists
    // after render, so scroll to it once the page is on screen.
    if (window.location.hash) {
      requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
    }
  }, []);

  return (
    <div className="bg-white text-gray-900 antialiased">
      <BizNav />

      <main>
        {/* ── 2. Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b from-primary-50/70 to-white pointer-events-none" aria-hidden="true" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-20 lg:pb-28 grid lg:grid-cols-[1fr_1.1fr] gap-14 items-center">
            <Reveal>
              <Eyebrow>Corporate accommodation management</Eyebrow>
              <h1 className="mt-5 text-4xl sm:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.05] text-gray-950 text-balance">
                Business accommodation, managed in one place.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-gray-600 max-w-xl">
                From employee stays to project accommodation, Booqa helps organizations source, coordinate and manage
                business accommodation through one centralized platform.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link to="/request-demo" onClick={() => track('cta_clicked', { cta: 'hero_demo' })}
                  className="group inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-lg px-6 py-3.5 transition-colors">
                  Request a Corporate Demo <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 border border-gray-300 hover:border-navy text-gray-800 font-semibold rounded-lg px-6 py-3.5 transition-colors">
                  Explore How It Works
                </a>
              </div>
              <p className="mt-8 flex items-center gap-2 text-sm text-gray-500">
                <span className="w-8 h-px bg-accent" aria-hidden="true" />
                Designed for organizations with teams, projects and people constantly on the move.
              </p>
            </Reveal>

            <Reveal delay={150} className="relative">
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3.4] lg:aspect-[4/3.6]">
                <img src={BIZ_IMAGES.heroLounge} alt="Executive lounge of a business hotel" className="w-full h-full object-cover" fetchpriority="high" />
                <div className="absolute inset-0 bg-gradient-to-tr from-navy/40 via-transparent to-transparent" aria-hidden="true" />
              </div>
              <div className="absolute -bottom-10 -left-4 sm:-left-10 right-6 sm:right-16 lg:right-auto lg:w-[88%]">
                <DashboardMock variant="hero" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 3. The business challenge ───────────────────────── */}
        <section className="bg-gray-50 border-y border-gray-100 mt-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20">
            <Reveal className="lg:sticky lg:top-28 self-start">
              <SectionHeading
                eyebrow="The challenge"
                title="Managing business accommodation shouldn't be this complicated."
                body="Accommodation arrangements often involve multiple hotels, different booking channels, employee requests and fragmented records. Booqa brings these processes together."
              />
            </Reveal>
            <ol className="grid sm:grid-cols-2 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200">
              {CHALLENGES.map(({ icon: Icon, title, body }, i) => (
                <Reveal as="li" key={title} delay={i * 80} className="bg-white p-7">
                  <div className="flex items-center justify-between">
                    <Icon className="w-6 h-6 text-navy" strokeWidth={1.75} />
                    <span className="text-xs font-semibold text-gray-300 tabular-nums">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-950">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── 4. The Booqa solution ───────────────────────────── */}
        <section id="solutions" className="scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <Reveal>
              <SectionHeading eyebrow="The platform" title="One platform. Better accommodation coordination." />
            </Reveal>

            <div className="mt-14 grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16 items-start">
              {/* product detail: a request moving through approval */}
              <Reveal className="rounded-3xl bg-navy p-6 sm:p-8 lg:sticky lg:top-28">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent">Accommodation request · AR-2041</p>
                <p className="mt-3 text-xl font-semibold text-white">4 rooms · Port Harcourt · 12–19 March</p>
                <p className="text-sm text-primary-100 mt-1">Onne Base Upgrade · requested by Operations</p>
                <div className="mt-6 rounded-2xl bg-white p-4 space-y-3">
                  {[
                    { name: 'Harbour Executive Suites', rate: '₦62,000', note: 'Corporate rate', status: 'approved' },
                    { name: 'Trans-Amadi Residency', rate: '₦48,500', note: 'Corporate rate', status: 'pending' },
                    { name: 'GRA Serviced Apartments', rate: '₦55,000', note: 'Weekly rate', status: 'requested' },
                  ].map((o) => (
                    <div key={o.name} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{o.name}</p>
                        <p className="text-xs text-gray-500">{o.rate} / night · {o.note}</p>
                      </div>
                      <StatusPill status={o.status} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-xs text-gray-500">Approver: Finance Manager</p>
                    <span className="text-xs font-semibold text-white bg-navy rounded-md px-3 py-1.5">Approve selection</span>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-primary-200">Illustrative example</p>
              </Reveal>

              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
                {FEATURES.map(({ icon: Icon, title, body }, i) => (
                  <Reveal as="li" key={title} delay={(i % 2) * 80}>
                    <span className="w-11 h-11 rounded-xl bg-primary-50 text-navy flex items-center justify-center">
                      <Icon className="w-5 h-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-gray-950">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── 5. How Booqa works ──────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <Reveal>
              <SectionHeading eyebrow="How it works" title="From accommodation request to confirmed stay." />
            </Reveal>

            <ol className="mt-14 grid gap-0 lg:grid-cols-5 relative">
              <span className="hidden lg:block absolute top-5 left-[10%] right-[10%] h-px bg-gray-300" aria-hidden="true" />
              <span className="lg:hidden absolute top-2 bottom-2 left-5 w-px bg-gray-300" aria-hidden="true" />
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 90} className="relative flex lg:block gap-5 pb-10 lg:pb-0 lg:px-4 lg:text-center">
                  <span className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center lg:mx-auto ring-8 ring-gray-50">
                    {i + 1}
                  </span>
                  <div className="lg:mt-6">
                    <h3 className="text-base font-semibold text-gray-950">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal className="mt-14 rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <p className="text-sm font-semibold text-gray-950">Every booking has a clear status</p>
                <p className="text-sm text-gray-600 mt-1 max-w-xl">
                  Availability is confirmed with each accommodation provider through their own process. Booqa shows exactly
                  where every booking stands, from first request to completed stay.
                </p>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label="Booking statuses">
                {Object.keys(STATUS).map((k) => <li key={k}><StatusPill status={k} /></li>)}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ── 6. Corporate dashboard ──────────────────────────── */}
        <section className="bg-navy overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <Reveal>
              <SectionHeading
                light
                eyebrow="The corporate dashboard"
                title="Your organization's accommodation activity. All in one view."
                body="Bookings, upcoming stays, pending requests, active guests and spending by department or project, for the people who coordinate and pay for accommodation."
              />
            </Reveal>
            <Reveal delay={120} className="mt-12">
              <DashboardMock variant="full" />
            </Reveal>
            <Reveal delay={200} className="mt-8 grid sm:grid-cols-3 gap-4">
              {[
                { icon: FileText, title: 'Complete booking history', body: 'Every request, approval and reservation on record.' },
                { icon: Users, title: 'Active guests at a glance', body: 'Who is staying where, today and this week.' },
                { icon: BarChart3, title: 'Spend by project', body: 'Accommodation costs grouped the way your business reports.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                  <p className="mt-3 text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-primary-100/80">{body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ── 7. Industries ──────────────────────────────────── */}
        <section id="industries" className="scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
            <Reveal>
              <SectionHeading eyebrow="Industries" title="Accommodation solutions for businesses that keep moving." />
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-6">
              {INDUSTRIES.map((ind, i) => (
                <Reveal key={ind.key} delay={i * 70}
                  className={`group relative rounded-2xl overflow-hidden min-h-[300px] ${i < 2 ? 'md:col-span-3' : 'md:col-span-2'}`}>
                  <img src={BIZ_IMAGES.industries[ind.key]} alt="" loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/35 to-transparent" aria-hidden="true" />
                  <div className="relative h-full flex flex-col justify-end p-6">
                    <h3 className="text-xl font-semibold text-white">{ind.title}</h3>
                    <p className="mt-1.5 text-sm text-gray-200 max-w-sm">{ind.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Accommodation partners (secondary audience) ──── */}
        <section id="partners" className="scroll-mt-20 bg-gray-50 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <Reveal className="rounded-3xl overflow-hidden aspect-[4/3] order-last lg:order-first">
              <img src={BIZ_IMAGES.partnerHandshake} alt="Two business partners shaking hands" loading="lazy" className="w-full h-full object-cover" />
            </Reveal>
            <Reveal delay={100}>
              <SectionHeading
                eyebrow="For hotels and serviced apartments"
                title="Grow your business with corporate accommodation demand."
                body="Booqa connects accommodation providers with organizations looking for reliable business accommodation. Join a growing network of hotels and serviced apartments serving corporate travellers."
              />
              <ul className="mt-7 space-y-3">
                {PARTNER_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-accent-soft text-accent-dark flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <Link to="/become-a-partner" onClick={() => track('cta_clicked', { cta: 'partner' })}
                className="mt-9 inline-flex items-center gap-2 border-2 border-navy text-navy hover:bg-navy hover:text-white font-semibold rounded-lg px-6 py-3 transition-colors">
                Become an Accommodation Partner <ArrowRight className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* ── 9. Why Booqa ───────────────────────────────────── */}
        <section id="about" className="scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-20 items-start">
            <Reveal>
              <SectionHeading
                eyebrow="Why Booqa"
                title="More than finding a place to stay."
                body="Booqa is a Port Harcourt company building business accommodation infrastructure for Nigerian organizations, with the ambition to serve businesses across Nigeria and Africa."
              />
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden aspect-[4/3]">
                  <img src={BIZ_IMAGES.businessRoom} alt="Business hotel room with a city view" loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="rounded-2xl bg-primary-50 p-5 flex flex-col justify-between">
                  <ShieldCheck className="w-6 h-6 text-navy" strokeWidth={1.75} />
                  <p className="text-sm font-semibold text-gray-950">Built for the organization arranging the stay, not the holiday traveller.</p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={120} className="rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <caption className="sr-only">Booqa compared with a basic hotel booking service</caption>
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th scope="col" className="px-5 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">Capability</th>
                    <th scope="col" className="px-4 py-4 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Basic hotel booking</th>
                    <th scope="col" className="px-4 py-4 font-bold text-navy text-xs uppercase tracking-wider text-center bg-primary-50">Booqa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COMPARISON.map((row) => (
                    <tr key={row.label}>
                      <th scope="row" className="px-5 py-4 text-left font-medium text-gray-800">{row.label}</th>
                      <td className="px-4 py-4 text-center">
                        <XIcon className="w-4 h-4 text-gray-300 mx-auto" aria-label="Not included" />
                      </td>
                      <td className="px-4 py-4 text-center bg-primary-50/50">
                        <Check className="w-4 h-4 text-navy mx-auto" strokeWidth={3} aria-label="Included" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-t border-gray-100 text-sm text-gray-600">
                <Headphones className="w-5 h-5 text-navy flex-shrink-0" />
                A Booqa coordinator supports your team from request to check-out.
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 10. Final call to action ───────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20 lg:pb-28">
          <Reveal className="max-w-7xl mx-auto rounded-3xl bg-navy relative overflow-hidden">
            <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary-600/30 blur-3xl" aria-hidden="true" />
            <div className="relative px-6 sm:px-12 lg:px-16 py-14 lg:py-20 grid lg:grid-cols-[1.3fr_1fr] gap-10 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-[1.15] text-balance">
                  Bring your organization's accommodation management into one place.
                </h2>
                <p className="mt-5 text-base sm:text-lg text-primary-100 leading-relaxed max-w-xl">
                  Whether you coordinate accommodation for employees, project teams or business visitors, Booqa helps you
                  manage the process with greater visibility and control.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                <Link to="/request-demo" onClick={() => track('cta_clicked', { cta: 'final_demo' })}
                  className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-dark text-primary-900 font-bold rounded-lg px-7 py-4 transition-colors">
                  Request a Corporate Demo <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/request-demo?topic=talk"
                  className="inline-flex items-center justify-center gap-2 border border-white/30 hover:border-white text-white font-semibold rounded-lg px-7 py-4 transition-colors">
                  Talk to Our Team
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <BizFooter />
    </div>
  );
}
