import React from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Loader, LayoutDashboard, ClipboardList, Building2, Wallet, LogOut } from 'lucide-react';
import { usePartnerAuth } from '../../context/PartnerAuthContext';

// Dashboard doubles as the analytics view (profile completeness + booking
// stats + room performance) — no separate "Analytics" page, so there's
// nowhere in this nav that duplicates what it already shows.
const NAV = [
  { to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/partner/application', label: 'Marketplace application', icon: ClipboardList },
  { to: '/partner/profile', label: 'Hotel profile', icon: Building2 },
  { to: '/partner/settlements', label: 'Settlements', icon: Wallet },
];

// Every route nested under this one requires a signed-in owner — enforced
// here once, not repeated per page, same as DashboardPage's own guard does
// for the guest side.
export default function PartnerLayout() {
  const { partner, loading, logout } = usePartnerAuth();
  const location = useLocation();

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }
  if (!partner) {
    return <Navigate to={`/partner/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-700">Hotel partner</p>
          <h1 className="text-xl font-bold text-gray-900">{partner.hotel_name || 'Your hotel'}</h1>
          <p className="text-sm text-gray-500">Signed in as {partner.full_name} ({partner.email})</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-8 border-b border-gray-200 pb-4">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
                isActive ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-200'
              }`
            }
          >
            <Icon className="w-4 h-4" /> {label}
          </NavLink>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
