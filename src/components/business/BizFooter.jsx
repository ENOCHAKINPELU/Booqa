import React from 'react';
import { Link } from 'react-router-dom';
import { Linkedin, Instagram, Twitter, MapPin, Mail } from 'lucide-react';
import { BooqaMark } from './BizNav';

const CONTACT_EMAIL = 'hello@booqa.ng';

export default function BizFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-navy text-primary-100" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Footer</h2>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="Booqa home"><BooqaMark dark /></Link>
            <p className="text-sm leading-relaxed mt-4 max-w-sm text-primary-100/80">
              Booqa is a corporate accommodation management platform. We help organizations source, book and manage
              accommodation for employees, contractors and business travellers.
            </p>
            <p className="flex items-center gap-2 text-sm mt-5 text-primary-100/80"><MapPin className="w-4 h-4 text-accent" /> Port Harcourt, Nigeria</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 text-sm mt-2 text-primary-100/80 hover:text-white"><Mail className="w-4 h-4 text-accent" /> {CONTACT_EMAIL}</a>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Platform</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="/#how-it-works" className="hover:text-white">How it works</a></li>
              <li><a href="/#industries" className="hover:text-white">Industries</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Company</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><a href="/#about" className="hover:text-white">About us</a></li>
              <li><a href="/#partners" className="hover:text-white">For hotels</a></li>
              <li><Link to="/request-demo" className="hover:text-white">Contact</Link></li>
              <li><Link to="/business" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white">Get started</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/request-demo" className="hover:text-white">Request a Corporate Demo</Link></li>
              <li><Link to="/become-a-partner" className="hover:text-white">Become a Partner</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-primary-100/70">
          <p>© {year} Booqa. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms and Conditions</Link>
            <span className="flex items-center gap-3" aria-label="Social media">
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="Booqa on LinkedIn" className="hover:text-white"><Linkedin className="w-4 h-4" /></a>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Booqa on Instagram" className="hover:text-white"><Instagram className="w-4 h-4" /></a>
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Booqa on X" className="hover:text-white"><Twitter className="w-4 h-4" /></a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
