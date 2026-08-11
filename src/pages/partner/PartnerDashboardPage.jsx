import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { partnerApi } from '../../services/partnerApi';

function formatMoney(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

export default function PartnerDashboardPage() {
  const [completeness, setCompleteness] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([partnerApi.get('profile/completeness'), partnerApi.get('analytics')])
      .then(([c, a]) => { setCompleteness(c.data.data); setAnalytics(a.data.data); })
      .catch((err) => setError(err.friendlyMessage || 'Unable to load your dashboard.'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!completeness || !analytics) return <div className="flex justify-center py-12 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">Profile completeness</h2>
          <span className="text-sm font-bold text-primary-700">{completeness.percent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-navy rounded-full transition-all" style={{ width: `${completeness.percent}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          {completeness.checks.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs text-gray-600">
              {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              {c.label}
            </div>
          ))}
        </div>
        {completeness.recommendations.length > 0 && (
          <ul className="text-sm text-gray-500 list-disc list-inside space-y-0.5">
            {completeness.recommendations.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
        <Link to="/partner/profile" className="text-sm font-medium text-primary-700 hover:text-primary-800 mt-2 inline-block">Complete your profile →</Link>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-3">Bookings via Booqa</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total bookings" value={analytics.total_bookings} />
          <StatCard label="Confirmed" value={analytics.confirmed_bookings} />
          <StatCard label="Cancellation rate" value={`${analytics.cancellation_rate}%`} />
          <StatCard label="Completed stays" value={analytics.completed_stays} />
          <StatCard label="Gross booking value" value={formatMoney(analytics.gross_booking_value)} wide />
          <StatCard label="Avg. booking value" value={formatMoney(analytics.average_booking_value)} wide />
          <StatCard label="Avg. stay length" value={`${analytics.average_stay_nights} nights`} wide />
        </div>
      </section>

      {analytics.room_performance.length > 0 && (
        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3"><TrendingUp className="w-4 h-4 text-primary-700" /> Room performance</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr><th className="text-left px-4 py-2">Room type</th><th className="text-right px-4 py-2">Bookings</th><th className="text-right px-4 py-2">Revenue</th></tr>
              </thead>
              <tbody>
                {analytics.room_performance.map((rt) => (
                  <tr key={rt.room_type} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-800">{rt.room_type}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{rt.bookings}</td>
                    <td className="px-4 py-2 text-right text-gray-800 font-medium">{formatMoney(rt.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, wide }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  );
}
