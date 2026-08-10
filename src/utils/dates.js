import { addDays, differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function tomorrowISO() {
  return format(addDays(new Date(), 1), 'yyyy-MM-dd');
}

export function defaultCheckOut(checkInISO) {
  const d = checkInISO ? parseISO(checkInISO) : new Date();
  return format(addDays(isValid(d) ? d : new Date(), 1), 'yyyy-MM-dd');
}

export function nights(checkInISO, checkOutISO) {
  const ci = parseISO(checkInISO);
  const co = parseISO(checkOutISO);
  if (!isValid(ci) || !isValid(co)) return 0;
  return Math.max(0, differenceInCalendarDays(co, ci));
}

export function formatDisplay(dateISO) {
  const d = parseISO(dateISO);
  return isValid(d) ? format(d, 'EEE, d MMM yyyy') : dateISO;
}

export function formatMoney(amount, currency = 'NGN') {
  const symbol = currency === 'NGN' ? '₦' : `${currency} `;
  return `${symbol}${Number(amount || 0).toLocaleString()}`;
}
