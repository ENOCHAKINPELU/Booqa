import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Loader, ClipboardList, Download, MapPin } from 'lucide-react';
import api from '../services/api';
import { formatDisplay, formatMoney, nights, amountPaid } from '../utils/dates';
import { track } from '../utils/analytics';

export default function ConfirmationPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get('hotel_id');

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotelId) { setError('Missing hotel reference.'); setLoading(false); return; }
    api.get(`/reservations/${id}`, { params: { hotel_id: hotelId } })
      .then(r => { setReservation(r.data.data); track('booking_confirmed', { reservation_id: id, hotel_id: hotelId }); })
      .catch(err => setError(err.friendlyMessage || 'Unable to load this booking.'))
      .finally(() => setLoading(false));
  }, [id, hotelId]);

  if (loading) {
    return <div className="max-w-xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  }

  if (error || !reservation) {
    return <p className="max-w-xl mx-auto px-4 py-16 text-center text-red-600">{error}</p>;
  }

  const hotelName = reservation.hotels?.name || 'your hotel';
  const location = [reservation.hotels?.city, reservation.hotels?.state].filter(Boolean).join(', ');
  const roomName = reservation.room_types?.name;
  const isPaid = reservation.status !== 'pending_payment';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Your stay is confirmed</h1>
      <p className="text-sm text-gray-500 mb-6">
        You're all set for your stay at <b>{hotelName}</b>. Show this QR code at check-in, or give the front desk your booking reference.
      </p>

      <div className="receipt-print bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <p className="font-semibold text-gray-900">{hotelName}</p>
        {location && (
          <p className="flex items-center justify-center gap-1 text-xs text-gray-500 mt-0.5 mb-4">
            <MapPin className="w-3 h-3" /> {location}
          </p>
        )}

        {reservation.qr_code_image ? (
          <img src={reservation.qr_code_image} alt="Booking QR code" className="w-40 h-40 mx-auto" />
        ) : (
          <div className="w-40 h-40 mx-auto flex items-center justify-center text-gray-300 text-sm">QR unavailable</div>
        )}
        <p className="font-mono font-bold text-lg text-gray-900 mt-3">{reservation.booking_reference}</p>

        <div className="text-left mt-6 pt-4 border-t border-gray-100 space-y-1.5">
          {roomName && (
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Room</span>
              <span className="font-medium text-gray-900">{roomName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Guest</span>
            <span className="font-medium text-gray-900">{reservation.guest_name}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Check-in</span>
            <span className="font-medium text-gray-900">{formatDisplay(reservation.check_in_date)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Check-out</span>
            <span className="font-medium text-gray-900">{formatDisplay(reservation.check_out_date)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Guests</span>
            <span className="font-medium text-gray-900">
              {reservation.adults} adult{reservation.adults === 1 ? '' : 's'}{reservation.children ? `, ${reservation.children} children` : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm py-1 pt-2 mt-1 border-t border-gray-100">
            <span className="text-gray-500">{isPaid ? 'Total paid' : 'Total due'}</span>
            <span className="font-bold text-gray-900">{formatMoney(amountPaid(reservation), reservation.currency)}</span>
          </div>
          <div className="flex justify-between text-sm py-1">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium capitalize ${isPaid ? 'text-green-700' : 'text-amber-700'}`}>
              {isPaid ? 'Paid' : 'Payment pending'} · {reservation.status.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onClick={() => window.print()} className="btn-secondary inline-flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Download receipt
        </button>
        <Link to="/manage" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-800">
          <ClipboardList className="w-4 h-4" /> Manage this booking later
        </Link>
      </div>
    </div>
  );
}
