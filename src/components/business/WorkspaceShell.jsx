import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LogOut, LayoutDashboard, ListChecks, Users, Wrench, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { biz } from '../../services/businessApi';
import { BooqaMark } from './BizNav';

/*
 * Layout + session context for the signed-in business workspace
 * (/business/*) and the Booqa operations console (/ops/*). Loads the
 * caller's organization membership once and shares it with every page.
 */

const WorkspaceContext = createContext(null);
export const useWorkspace = () => useContext(WorkspaceContext);

export default function WorkspaceShell({ children, ops = false }) {
  const { guest, loading: authLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => biz.me().then(setMe).catch(() => setMe({ membership: null, ops: false })), []);

  useEffect(() => {
    if (!guest) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [guest, reload]);

  if (authLoading || (guest && loading)) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!guest) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  const org = me?.membership;
  const nav = ops
    ? [{ to: '/ops', label: 'Requests', icon: ListChecks, end: true }]
    : [
      { to: '/business', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/business/requests', label: 'Requests', icon: ListChecks },
      { to: '/business/hotels', label: 'Hotels', icon: Building2 },
      ...(org?.role === 'admin' ? [{ to: '/business/team', label: 'Team', icon: Users }] : []),
    ];

  const signOut = async () => { await logout(); navigate('/'); };

  return (
    <WorkspaceContext.Provider value={{ me, org, reload }}>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
            <Link to={ops ? '/ops' : '/business'} aria-label="Booqa workspace"><BooqaMark /></Link>
            {ops && <span className="text-xs font-bold uppercase tracking-wide text-accent-dark bg-accent-soft rounded-full px-2.5 py-1">Operations</span>}
            {(org || ops) && (
              <nav aria-label="Workspace" className="hidden sm:flex items-center gap-1">
                {nav.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end}
                    className={({ isActive }) => `flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 transition-colors
                      ${isActive ? 'bg-primary-50 text-navy' : 'text-gray-600 hover:text-navy'}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </NavLink>
                ))}
              </nav>
            )}
            <div className="ml-auto flex items-center gap-4">
              {me?.ops && !ops && (
                <Link to="/ops" className="hidden sm:flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-navy"><Wrench className="w-4 h-4" /> Operations</Link>
              )}
              {ops && me?.membership && (
                <Link to="/business" className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-navy">My workspace</Link>
              )}
              <span className="hidden md:block text-right leading-tight">
                <span className="block text-sm font-semibold text-gray-900">{guest.full_name}</span>
                {org && <span className="block text-xs text-gray-500">{org.org_name}</span>}
              </span>
              <button onClick={signOut} aria-label="Sign out" className="p-2 text-gray-400 hover:text-gray-700"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
          {(org || ops) && (
            <nav aria-label="Workspace mobile" className="sm:hidden flex gap-1 px-4 pb-2 overflow-x-auto">
              {nav.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `text-sm font-medium rounded-lg px-3 py-1.5 whitespace-nowrap ${isActive ? 'bg-primary-50 text-navy' : 'text-gray-600'}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>
      </div>
    </WorkspaceContext.Provider>
  );
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
