import React, { useEffect, useState } from 'react';
import { Loader, Wallet } from 'lucide-react';
import { partnerApi } from '../../services/partnerApi';

const STATUS_STYLE = {
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  reconciled: 'bg-gray-100 text-gray-600',
};

function formatMoney(amount, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
}

// Read-only from the partner side by design — a settlement's status only
// ever changes via superadmin.marketplace/settlements/:id/mark-paid
// (backend/modules/marketplace/marketplace.routes.js has no PATCH here),
// so this hotel sees exactly what it's owed and when it was paid, not a
// control it could use to mark itself paid.
export default function PartnerSettlementsPage() {
  const [settlements, setSettlements] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    partnerApi.get('settlements')
      .then((r) => setSettlements(r.data.data))
      .catch((err) => setError(err.friendlyMessage || 'Unable to load your settlements.'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!settlements) return <div className="flex justify-center py-12 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;

  const totalOwed = settlements.filter((s) => s.status === 'pending' || s.status === 'processing').reduce((sum, s) => sum + Number(s.hotel_amount || 0), 0);

  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-lg font-bold text-gray-900 mb-1"><Wallet className="w-4 h-4 text-primary-700" /> Settlements</h2>
      <p className="text-sm text-gray-500 mb-4">Your share of every Booqa booking, after Booqa's commission — one row per confirmed reservation.</p>

      {settlements.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No settlements yet — they appear here once a Booqa booking is paid for.</p>
      ) : (
        <>
          <div className="bg-navy rounded-2xl p-5 text-white mb-4 inline-block">
            <p className="text-xs uppercase tracking-wide text-primary-200 mb-1">Awaiting payout</p>
            <p className="text-2xl font-bold">{formatMoney(totalOwed)}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">Booking</th>
                  <th className="text-right px-4 py-2">Gross</th>
                  <th className="text-right px-4 py-2">Commission</th>
                  <th className="text-right px-4 py-2">You receive</th>
                  <th className="text-left px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-800 font-mono text-xs">{s.reservations?.booking_reference || s.reservation_id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatMoney(s.gross_amount, s.currency)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{formatMoney(s.commission_amount, s.currency)} ({s.commission_percent}%)</td>
                    <td className="px-4 py-2 text-right text-gray-900 font-semibold">{formatMoney(s.hotel_amount, s.currency)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_STYLE[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
