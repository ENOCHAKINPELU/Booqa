import React from 'react';

// Workspace status labels, in plain words for each step of
// request -> matched hotel -> book & pay -> stay.
export const REQUEST_STATUS = {
  requested: { label: 'Choosing hotel', cls: 'bg-sky-50 text-sky-800' },
  pending: { label: 'Awaiting payment', cls: 'bg-amber-50 text-amber-800' },
  confirmed: { label: 'Confirmed', cls: 'bg-primary-50 text-primary-800' },
  checked_in: { label: 'Checked in', cls: 'bg-emerald-50 text-emerald-800' },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-red-50 text-red-700' },
};

export default function RequestStatus({ status }) {
  const s = REQUEST_STATUS[status] || { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex items-center text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}
