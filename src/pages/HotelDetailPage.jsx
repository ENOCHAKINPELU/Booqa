import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader, MapPin, Phone, Building2, BadgeCheck, Star } from 'lucide-react';
import api, { authApi } from '../services/api';
import RoomTypeCard from '../components/RoomTypeCard';
import DateGuestPicker from '../components/DateGuestPicker';
import SaveHotelButton from '../components/SaveHotelButton';
import ReviewList from '../components/ReviewList';
import { tomorrowISO, defaultCheckOut } from '../utils/dates';
import { addRecentlyViewed } from '../utils/recentlyViewed';
import { track } from '../utils/analytics';

export default function HotelDetailPage() {
  const { hotelId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const checkIn = searchParams.get('check_in') || tomorrowISO();
  const checkOut = searchParams.get('check_out') || defaultCheckOut(checkIn);
  const adults = Number(searchParams.get('adults') || 2);
  const children = Number(searchParams.get('children') || 0);

  useEffect(() => {
    api.get(`/hotels/${hotelId}`)
      .then(r => { setHotel(r.data.data); addRecentlyViewed(r.data.data); track('hotel_viewed', { hotel_id: hotelId, hotel_name: r.data.data?.name }); })
      .catch(() => setError('This hotel could not be found.'));
    // Best-effort - a signed-out guest gets a 401 here, which just means
    // the heart shows "not saved", the honest default when there's
    // nothing to check.
    authApi.get('/favorites')
      .then((r) => setSaved((r.data.data || []).some((f) => f.hotel_id === hotelId)))
      .catch(() => {});
  }, [hotelId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/hotels/${hotelId}/availability`, { params: { check_in: checkIn, check_out: checkOut, adults, children } })
      .then(r => setRoomTypes(r.data.data || []))
      .catch(err => setError(err.friendlyMessage || 'Unable to check availability right now.'))
      .finally(() => setLoading(false));
  }, [hotelId, checkIn, checkOut, adults, children]);

  const updateDates = (patch) => {
    const next = new URLSearchParams(searchParams);
    next.set('check_in', patch.checkIn);
    next.set('check_out', patch.checkOut);
    next.set('adults', String(patch.adults));
    next.set('children', String(patch.children));
    setSearchParams(next);
  };

  const handleBook = (roomType) => {
    track('room_selected', { hotel_id: hotelId, room_type_id: roomType.room_type_id, room_type_name: roomType.name });
    const params = new URLSearchParams({
      room_type_id: roomType.room_type_id,
      check_in: checkIn,
      check_out: checkOut,
      adults: String(adults),
      children: String(children),
    });
    navigate(`/hotels/${hotelId}/book?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to search
      </Link>

      {hotel && (
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              {hotel.logo_url ? <img src={hotel.logo_url} alt="" className="max-h-full max-w-full object-contain" /> : <Building2 className="w-6 h-6 text-primary-400" />}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{hotel.name}</h1>
                  {hotel.verified && (
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-primary-700 bg-primary-50 rounded-full px-2 py-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> Verified Hotel
                    </span>
                  )}
                  {hotel.avg_rating ? (
                    <span className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <Star className="w-4 h-4 fill-accent text-accent" /> {hotel.avg_rating} <span className="text-gray-400 font-normal">({hotel.review_count})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">New on Booqa</span>
                  )}
                </div>
                <SaveHotelButton hotelId={hotel.id} saved={saved} onToggle={setSaved} className="w-9 h-9 flex-shrink-0" />
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" /> {[hotel.address, hotel.city, hotel.state].filter(Boolean).join(', ')}
              </p>
              {hotel.contact_phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {hotel.contact_phone}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <DateGuestPicker checkIn={checkIn} checkOut={checkOut} adults={adults} children={children} onChange={updateDates} />
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Available rooms</h2>

      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader className="w-6 h-6 animate-spin" />
        </div>
      )}

      {!loading && error && <p className="text-center text-red-600 py-16">{error}</p>}

      {!loading && !error && roomTypes.length === 0 && (
        <p className="text-center text-gray-400 py-16">No rooms available for these dates. Try adjusting your search.</p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {roomTypes.map((rt) => (
            <RoomTypeCard key={rt.room_type_id} roomType={rt} onBook={handleBook} />
          ))}
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Guest reviews</h2>
        <ReviewList hotelId={hotelId} />
      </div>
    </div>
  );
}
