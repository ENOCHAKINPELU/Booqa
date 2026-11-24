import { format, parseISO, isValid } from 'date-fns';

export const naira = (n) => (n == null ? '—' : `₦${Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`);

export function shortDate(iso) {
  if (!iso) return '—';
  const d = parseISO(String(iso).slice(0, 10));
  return isValid(d) ? format(d, 'd MMM yyyy') : iso;
}

export const dateRange = (a, b) => `${shortDate(a)} – ${shortDate(b)}`;

export function when(ts) {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : format(d, 'd MMM, HH:mm');
}

export const INDUSTRIES = ['Oil & Gas', 'Marine & Logistics', 'Engineering & Construction', 'Consulting & Professional Services', 'Training & Events', 'Other'];

export const EVENT_LABELS = {
  submitted: 'Request submitted',
  booked: 'Rooms held',
  paid: 'Paid and confirmed',
  hold_expired: 'Hold expired',
  cancelled: 'Request cancelled',
  'status:checked_in': 'Guests checked in',
  'status:completed': 'Stay completed',
};

export const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary-500/15 focus:border-primary-600';
