import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ClipboardList, LogIn, UserPlus, CalendarClock, LogOut,
  MapPin, ShieldCheck, Lock, Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Every link here goes somewhere real — no dead anchors, no fabricated
// social icons for accounts that don't exist. Where a real page doesn't
// exist yet (Terms, Privacy), it links to an honest placeholder that says
// so (TermsPage.jsx / PrivacyPage.jsx) rather than a 404 or invented legal
// text — same "coming soon, not fabricated" rule as the 360° viewer and
// the hero's rating stat.
export default function Footer() {
  const { guest, loading, logout } = useAuth();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <footer className="bg-navy text-primary-100 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-6">
          <div className="col-span-2 sm:col-span-1">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
              <img src="/favicon.png" alt="" className="w-8 h-8" />
              Booqa
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-primary-200 mt-3">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> Now serving Port Harcourt, Nigeria
            </p>
            <p className="text-xs text-primary-300 mt-2 leading-relaxed max-w-[220px]">
              Book directly with hotels — real availability, synced live, no third-party resale.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-300 mb-3">Explore</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/search" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                  <Search className="w-3.5 h-3.5" /> Search hotels
                </Link>
              </li>
              <li>
                <a href="/#featured-hotels" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                  <Building2 className="w-3.5 h-3.5" /> Featured hotels
                </a>
              </li>
              <li>
                <Link to="/manage" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                  <ClipboardList className="w-3.5 h-3.5" /> Manage a booking
                </Link>
              </li>
              <li>
                <Link to="/partner/login" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                  <Building2 className="w-3.5 h-3.5" /> List your hotel
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-300 mb-3">Account</h3>
            <ul className="space-y-2.5 text-sm">
              {!loading && guest ? (
                <>
                  <li>
                    <Link to="/account" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                      <CalendarClock className="w-3.5 h-3.5" /> My bookings
                    </Link>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                      <LogIn className="w-3.5 h-3.5" /> Sign in
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="flex items-center gap-1.5 text-primary-100 hover:text-white transition-colors">
                      <UserPlus className="w-3.5 h-3.5" /> Create account
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-300 mb-3">Legal</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/terms" className="text-primary-100 hover:text-white transition-colors">Terms of Service</Link>
              </li>
              <li>
                <Link to="/privacy" className="text-primary-100 hover:text-white transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-primary-300">
          <span>© {year} Booqa. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Booking &amp; room status powered by HotelOps
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-accent" /> Payments secured by Flutterwave
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
