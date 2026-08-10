import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, User, LogOut, ChevronDown, CalendarClock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { guest, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-navy">
          {/* Mark from the real logo (public/booqa-logo.png), wordmark set
              in the app's own type rather than baked into the image — scales
              cleanly at any size and stays crisp on retina screens. */}
          <img src="/favicon.png" alt="" className="w-9 h-9" />
          Booqa
        </Link>

        <div className="flex items-center gap-5">
          <Link
            to="/manage"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-primary-800 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Manage booking</span>
          </Link>

          {!loading && !guest && (
            <Link to="/login" className="text-sm font-medium text-primary-700 hover:text-primary-800">
              Sign in
            </Link>
          )}

          {!loading && guest && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary-800"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{guest.full_name.split(' ')[0]}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                  <Link
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <CalendarClock className="w-4 h-4" /> My bookings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
