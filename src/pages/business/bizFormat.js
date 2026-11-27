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

export const INDUSTRIES = [
  'Banking & Financial Services', 'Consulting & Professional Services', 'Construction & Engineering',
  'Education', 'Energy, Oil & Gas', 'Government & Public Sector', 'Healthcare & Pharmaceuticals',
  'Logistics, Maritime & Transport', 'Manufacturing', 'Media & Entertainment', 'NGO & Development',
  'Real Estate', 'Retail & FMCG', 'Technology & Telecoms', 'Other',
];

export const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 people' },
  { value: '11-50', label: '11–50 people' },
  { value: '51-200', label: '51–200 people' },
  { value: '201-1000', label: '201–1,000 people' },
  { value: '1000+', label: 'More than 1,000' },
];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

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

/** A room category's cancellation policy in words (same wording as the emails). */
export function policyText(hours, feePercent) {
  if (hours == null || !Number(feePercent)) return 'Free cancellation any time';
  return `Free cancellation until ${hours} hours before check-in. After that the hotel keeps ${Number(feePercent)}% of the room price and the Booqa fee is not refunded.`;
}

/** Short form for compact lists. */
export function policyShort(hours, feePercent) {
  if (hours == null || !Number(feePercent)) return 'Free cancellation any time';
  return `Free cancellation until ${hours}h before check-in`;
}
