import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import WorkspaceShell, { useWorkspace } from '../../components/business/WorkspaceShell';
import { BooqaMark } from '../../components/business/BizNav';
import { biz, errorMessage } from '../../services/businessApi';
import { naira, shortDate, when } from './bizFormat';

/*
 * A receipt for a paid booking, for the company's finance team. "Print or
 * save as PDF" uses the browser's own print dialog; the workspace header
 * is hidden when printing.
 */

const PAID = ['confirmed', 'checked_in', 'completed', 'cancelled'];

function Content() {
  const { id } = useParams();
  const { org } = useWorkspace();
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { biz.request(id).then(setR).catch((err) => setError(errorMessage(err))); }, [id]);

  if (!r && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!r) return <p className="text-red-700">{error}</p>;
  if (!r.paid_at || !PAID.includes(r.status)) {
    return (
      <div className="max-w-md">
        <p className="text-gray-700">A receipt is available once this booking is paid.</p>
        <Link to={`/business/requests/${r.id}`} className="mt-3 inline-block font-semibold text-navy hover:underline">Back to the request</Link>
      </div>
    );
  }

  const rooms = r.reservations || [];
  const perRoom = rooms.length ? Number(r.total_cost) / rooms.length : 0;
  const companyLines = [org?.org_name, [org?.city, org?.state].filter(Boolean).join(', '), org?.phone, org?.billing_email].filter(Boolean);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link to={`/business/requests/${r.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy whitespace-nowrap"><ArrowLeft className="w-4 h-4" /> Back to booking</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl px-4 py-2.5 whitespace-nowrap">
          <Printer className="w-4 h-4" /> <span className="sm:hidden">Save as PDF</span><span className="hidden sm:inline">Print or save as PDF</span>
        </button>
      </div>

      <article className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <BooqaMark />
            <p className="mt-2 text-xs text-gray-500">Business accommodation, managed in one place</p>
            {r.hotel_logo_url && <img src={r.hotel_logo_url} alt={`${r.hotel_name} logo`} className="mt-4 w-20 h-20 rounded-xl border border-gray-200 bg-white object-contain p-2" />}
          </div>
          <div className="sm:text-right">
            <h1 className="text-2xl font-bold text-gray-950">Receipt</h1>
            <p className="font-mono text-sm text-gray-600 mt-1">{r.reference}</p>
            <p className="text-sm text-gray-600">Paid {when(r.paid_at)}</p>
          </div>
        </header>

        <div className="mt-8 grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Billed to</p>
            {companyLines.map((line, i) => <p key={i} className={i === 0 ? 'mt-1 font-semibold text-gray-950' : 'text-gray-700'}>{line}</p>)}
            {r.requested_by_name && <p className="text-gray-500 mt-1">Booked by {r.requested_by_name}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Stay</p>
            <p className="mt-1 font-semibold text-gray-950">{r.hotel_name}</p>
            <p className="text-gray-700">{r.room_type_name}</p>
            <p className="text-gray-700">{shortDate(r.check_in)} – {shortDate(r.check_out)} · {r.nights} night{r.nights === 1 ? '' : 's'}</p>
            {r.project && <p className="text-gray-700">Project: {r.project}</p>}
          </div>
        </div>

        {/* Phones: one block per room. The table is for wider screens and printing. */}
        <ul className="mt-8 divide-y divide-gray-100 border-y border-gray-200 sm:hidden print:hidden">
          {rooms.map((res, i) => (
            <li key={res.id} className="py-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-gray-950">Room {res.room_number || i + 1} · {res.room_type_name || r.room_type_name}</span>
                <span className="font-mono text-gray-950 whitespace-nowrap">{res.booking_reference}</span>
              </div>
              <p className="text-gray-600">{res.guest_name || 'Guest not named'} · {r.nights} night{r.nights === 1 ? '' : 's'}</p>
              <dl className="mt-2 space-y-0.5 text-gray-700">
                <div className="flex justify-between"><dt>Room</dt><dd className="tabular-nums">{naira(res.room_amount ?? perRoom)}</dd></div>
                <div className="flex justify-between"><dt>Booqa fee</dt><dd className="tabular-nums">{naira(res.company_fee ?? 0)}</dd></div>
                <div className="flex justify-between font-semibold text-gray-950"><dt>Paid</dt><dd className="tabular-nums">{naira(res.amount_paid ?? perRoom)}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between gap-3 sm:hidden print:hidden">
          <span className="font-semibold text-gray-950">Total paid</span>
          <span className="text-lg font-bold tabular-nums text-gray-950">{naira(r.total_cost)}</span>
        </div>

        <table className="mt-8 w-full text-sm hidden sm:table print:table">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="font-semibold py-2">Room</th>
              <th className="font-semibold py-2">Guest</th>
              <th className="font-semibold py-2">Booking reference</th>
              <th className="font-semibold py-2 text-right">Room amount</th>
              <th className="font-semibold py-2 text-right">Booqa fee</th>
              <th className="font-semibold py-2 text-right">Amount paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rooms.map((res, i) => (
              <tr key={res.id}>
                <td className="py-2.5 text-gray-700">Room {res.room_number || i + 1} · {res.room_type_name || r.room_type_name}, {r.nights} night{r.nights === 1 ? '' : 's'}</td>
                <td className="py-2.5 text-gray-700">{res.guest_name || '—'}</td>
                <td className="py-2.5 font-mono text-gray-950">{res.booking_reference}</td>
                <td className="py-2.5 text-right tabular-nums text-gray-700">{naira(res.room_amount ?? perRoom)}</td>
                <td className="py-2.5 text-right tabular-nums text-gray-700">{naira(res.company_fee ?? 0)}</td>
                <td className="py-2.5 text-right tabular-nums font-semibold text-gray-950">{naira(res.amount_paid ?? perRoom)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900">
              <td colSpan={5} className="pt-3 font-semibold text-gray-950">Total paid (all fees included)</td>
              <td className="pt-3 text-right text-lg font-bold tabular-nums text-gray-950">{naira(r.total_cost)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-xs text-gray-500">
          Paid online through Booqa (card, bank transfer or USSD).
          {r.status === 'cancelled' && ' This booking was later cancelled; the payment is refunded to the original payment method.'}
        </p>
      </article>
    </div>
  );
}

export default function ReceiptPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
