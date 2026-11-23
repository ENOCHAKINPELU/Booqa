import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Star } from 'lucide-react';
import PhotoCarousel from './PhotoCarousel';
import { facilityIcon, FACILITY_LABELS, byFacilityPriority } from '../utils/facilities';
import { formatMoney, nights as countNights } from '../utils/dates';
import { hotelFromPrice, hotelStayTotal } from '../utils/pricing';
import SaveHotelButton from './SaveHotelButton';

// verified/from_price/amenities all come straight from GET /hotels
// (hotels.service.js's listBookableHotels) - "verified" isn't a claim
// this card invents, it's true by construction of that query's own
// filters (active, Booqa-opted-in, live subscription). avg_rating comes
// from the same call once published reviews exist; until then it's
// genuinely absent, not defaulted to a fabricated number.
export default function HotelCard({ hotel, searchParams, initialSaved = false }) {
  const location = [hotel.city, hotel.state].filter(Boolean).join(', ');
  // Not pre-checked against /api/favorites here for search/featured grids
  // - one duplicate fetch per card for data the guest's own /account/
  // saved page already shows authoritatively. Worst case there, a guest
  // who already saved this hotel sees an unfilled heart and taps it
  // again; the DB's UNIQUE(guest, hotel) + ON CONFLICT DO NOTHING makes
  // that a harmless no-op, not a duplicate or an error.
  //
  // SavedHotelsPage is different: every card it renders is, by
  // definition, already saved - showing an unfilled heart there would be
  // actively wrong, not just a missed optimization, so it passes
  // initialSaved={true} instead of leaving this to guess.
  const [saved, setSaved] = useState(initialSaved);
  const price = hotelFromPrice(hotel);
  const checkIn = searchParams?.get?.('check_in');
  const checkOut = searchParams?.get?.('check_out');
  const stayNights = checkIn && checkOut ? countNights(checkIn, checkOut) : 0;
  return (
    <Link
      to={`/hotels/${hotel.id}?${searchParams.toString()}`}
      className="block h-full bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all"
    >
      <div className="relative">
        <PhotoCarousel
          photos={hotel.photos?.length ? hotel.photos : [hotel.cover_image_url].filter(Boolean)}
          alt={hotel.name}
          className="h-44"
        />
        {hotel.verified && (
          <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white bg-primary-700/90 rounded-full px-2 py-1">
            <BadgeCheck className="w-3 h-3" /> Verified
          </span>
        )}
        <SaveHotelButton hotelId={hotel.id} saved={saved} onToggle={setSaved} className="absolute top-2 right-2 w-8 h-8" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{hotel.name}</h3>
          {hotel.avg_rating ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-gray-700 flex-shrink-0 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-accent text-accent" /> {hotel.avg_rating}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 mt-0.5" title="No reviews yet">
              <Star className="w-3.5 h-3.5" /> New
            </span>
          )}
        </div>
        {location && (
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" /> {location}
          </p>
        )}
        {hotel.facilities?.length > 0 ? (
          <ul className="flex flex-wrap gap-1 mt-2" aria-label="Facilities">
            {[...hotel.facilities].sort(byFacilityPriority).slice(0, 3).map((f) => {
              const Icon = facilityIcon(f);
              return (
                <li key={f.key} className="flex items-center gap-1 text-[11px] font-medium text-primary-800 bg-primary-50 rounded-full px-2 py-0.5">
                  <Icon className="w-3 h-3" /> {FACILITY_LABELS[f.key] || f.name}
                </li>
              );
            })}
          </ul>
        ) : hotel.amenities?.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-1">{hotel.amenities.slice(0, 3).join(' · ')}</p>
        )}
        {price && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm">
              <span className="text-gray-500">From </span>
              <span className="font-bold text-gray-900">{formatMoney(price.perNight, hotel.currency)}</span>
              <span className="text-gray-400"> / night</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {price.includesFee
                ? <>{stayNights > 1 && <>{formatMoney(hotelStayTotal(hotel, stayNights), hotel.currency)} for {stayNights} nights · </>}Includes all fees</>
                : '+ service fee'}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
