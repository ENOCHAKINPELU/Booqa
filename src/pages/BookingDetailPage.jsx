import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Loader, ArrowLeft, MapPin, Phone, Download, Star, CheckCircle2, Circle, XCircle } from 'lucide-react';
import api from '../services/api';
import { formatDisplay, formatMoney, nights } from '../utils/dates';
import ReviewForm from '../components/ReviewForm';

// Timeline only ever shows real timestamps this reservation actually has
// (created_at is always real; confirmed_at/checked_in_at/checked_out_at/
// cancelled_at come from the exact RPCs that stamp them - see 029). A
// future step that hasn't happened yet is shown greyed out with no date,
// never a guessed or invented one.
function timelineSteps(r) {
  const steps = [
    { key: 'created', label: 'Booking created', at: r.created_at, done: true },
    { key: 'confirmed', label: 'Payment confirmed', at: r.confirmed_at, done: !!r.confirmed_at },
  ];
  if (r.status === 'cancelled') {
    steps.push({ key: 'cancelled', label: 'Cancelled', at: r.cancelled_at, done: true, negative: true });
    return steps;
  }
  steps.push(
    { key: 'checked_in', label: 'Checked in', at: r.checked_in_at, done: !!r.checked_in_at },
    { key: 'checked_out', label: 'Checked out', at: r.checked_out_at, done: !!r.checked_out_at },
  );
  if (r.checked_out_at) {
    steps.push({ key: 'review', label: r.reviews?.[0] ? 'Review submitted' : 'Leave a review', at: r.reviews?.[0]?.id ? r.updated_at : null, done: !!r.reviews?.[0] });
  }
  return steps;
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hotelId = searchParams.get('hotel_id');

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (!hotelId) { setError('Missing hotel reference.'); setLoading(false); return; }
    api.get(`/reservations/${id}`, { params: { hotel_id: hotelId } })
      .then((r) => setReservation(r.data.data))
      .catch((err) => setError(err.friendlyMessage || 'Unable to load this booking.'))
      .finally(() => setLoading(false));
  }, [id, hotelId]);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-16 flex justify-center text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;
  if (error || !reservation) return <p className="max-w-2xl mx-auto px-4 py-16 text-center text-red-600">{error}</p>;

  const hotel = reservation.hotels;
  const roomType = reservation.room_types;
  const photos = (roomType?.room_type_media || []).filter((m) => m.media_type === 'photo').sort((a, b) => a.sort_order - b.sort_order);
  const isPaid = reservation.status !== 'pending_payment';
  const hasReview = !!reservation.reviews?.[0] || reviewSubmitted;
  const canReview = reservation.status === 'checked_out' && !hasReview;
  const steps = timelineSteps(reservation);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/account/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to my bookings
      </Link>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-4 rounded-xl overflow-hidden h-40">
          {photos.slice(0, 3).map((p, i) => (
            <img key={i} src={p.url} alt="" className="w-full h-full object-cover" />
          ))}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-900">{hotel?.name}</h1>
      {roomType?.name && <p className="text-sm text-gray-500 mt-0.5">{roomType.name}</p>}
      {hotel?.address && (
        <p className="flex items-center gap-1 text-sm text-gray-500 mt-1">
          <MapPin className="w-3.5 h-3.5" /> {[hotel.address, hotel.city, hotel.state].filter(Boolean).join(', ')}
        </p>
      )}
      {hotel?.contact_phone && (
        <a href={`tel:${hotel.contact_phone}`} className="flex items-center gap-1 text-sm text-primary-700 hover:text-primary-800 mt-1 w-fit">
          <Phone className="w-3.5 h-3.5" /> {hotel.contact_phone}
        </a>
      )}

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Booking timeline</h2>
        <ol className="space-y-3">
          {steps.map((s) => (
            <li key={s.key} className="flex items-start gap-3">
              {s.negative ? <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                : s.done ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                : <Circle className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-medium ${s.done ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</p>
                {s.at && <p className="text-xs text-gray-400">{formatDisplay(s.at.slice(0, 10))}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Stay details ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4 space-y-1.5">
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Booking reference</span><span className="font-mono font-semibold text-gray-900">{reservation.booking_reference}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Check-in</span><span className="font-medium text-gray-900">{formatDisplay(reservation.check_in_date)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Check-out</span><span className="font-medium text-gray-900">{formatDisplay(reservation.check_out_date)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Nights</span><span className="font-medium text-gray-900">{nights(reservation.check_in_date, reservation.check_out_date)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Guests</span><span className="font-medium text-gray-900">{reservation.adults} adult{reservation.adults === 1 ? '' : 's'}{reservation.children ? `, ${reservation.children} children` : ''}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Guest name</span><span className="font-medium text-gray-900">{reservation.guest_name}</span></div>
        {reservation.company && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Company</span><span className="font-medium text-gray-900">{reservation.company}</span></div>}
        {reservation.special_requests && <div className="flex justify-between text-sm py-1"><span className="text-gray-500">Special requests</span><span className="font-medium text-gray-900 text-right max-w-[60%]">{reservation.special_requests}</span></div>}
        <div className="flex justify-between text-sm py-1 pt-2 mt-1 border-t border-gray-100">
          <span className="text-gray-500">{isPaid ? 'Amount paid' : 'Total due'}</span>
          <span className="font-bold text-gray-900">{formatMoney(reservation.total_amount, reservation.currency)}</span>
        </div>
        {roomType?.cancellation_policy && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mt-2">{roomType.cancellation_policy}</p>
        )}
      </div>

      {reservation.qr_code_image && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-4 text-center">
          <img src={reservation.qr_code_image} alt="Booking QR code" className="w-36 h-36 mx-auto" />
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button onClick={() => window.print()} className="btn-secondary flex-1 flex items-center justify-center gap-1.5">
          <Download className="w-4 h-4" /> Download receipt
        </button>
        <Link to="/manage" className="btn-secondary flex-1 text-center">Manage booking</Link>
      </div>

      {canReview && (
        <div className="mt-6">
          <ReviewForm reservationId={reservation.id} hotelName={hotel?.name} onSubmitted={() => setReviewSubmitted(true)} />
        </div>
      )}
      {hasReview && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl p-4 mt-6">
          <Star className="w-4 h-4 fill-green-600 text-green-600" /> Thanks - your review is in and will show once it's been checked.
        </div>
      )}
    </div>
  );
}
