import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, ArrowRight } from 'lucide-react';
import { formatDisplay, formatMoney, amountPaid } from '../utils/dates';

const STATUS_STYLES = {
  pending_payment: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-green-50 text-green-700',
  checked_in: 'bg-blue-50 text-blue-700',
  checked_out: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-50 text-red-700',
  no_show: 'bg-red-50 text-red-700',
};

// Deliberately minimal - the hotel, the dates, the reference, the total,
// and a link to the existing confirmation page for anything more (QR code,
// full guest details). A guest scanning their own booking history wants to
// recognize *which* trip this was at a glance, not read a data table.
export default function BookingHistoryCard({ reservation: r }) {
  const hotel = r.hotels;
  const roomTypeName = r.room_types?.name;

  return (
    <Link
      to={`/account/bookings/${r.id}?hotel_id=${hotel?.id || ''}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-200 hover:shadow-sm transition-all"
    >
      <div className="w-14 h-14 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
        {hotel?.logo_url ? (
          <img src={hotel.logo_url} alt="" className="max-h-full max-w-full object-contain rounded-lg" />
        ) : (
          <Building2 className="w-6 h-6 text-primary-300" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 truncate">{hotel?.name || 'Hotel'}</p>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-600'}`}>
            {r.status.replace('_', ' ')}
          </span>
        </div>
        <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
          <MapPin className="w-3 h-3 flex-shrink-0" /> {[hotel?.city, hotel?.state].filter(Boolean).join(', ')}
          {roomTypeName ? ` · ${roomTypeName}` : ''}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {formatDisplay(r.check_in_date)} → {formatDisplay(r.check_out_date)}
        </p>
      </div>

      <div className="text-right flex-shrink-0 flex items-center gap-3">
        <div>
          <p className="font-mono text-xs text-gray-400">{r.booking_reference}</p>
          <p className="font-bold text-gray-900">{formatMoney(amountPaid(r), r.currency)}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300" />
      </div>
    </Link>
  );
}
