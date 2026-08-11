import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, BadgeCheck, Star } from 'lucide-react';
import { formatMoney } from '../utils/dates';
import SaveHotelButton from './SaveHotelButton';

// verified/from_price/amenities all come straight from GET /hotels
// (hotels.service.js's listBookableHotels) — "verified" isn't a claim
// this card invents, it's true by construction of that query's own
// filters (active, Booqa-opted-in, live subscription). avg_rating comes
// from the same call once published reviews exist; until then it's
// genuinely absent, not defaulted to a fabricated number.
export default function HotelCard({ hotel, searchParams, initialSaved = false }) {
  const location = [hotel.city, hotel.state].filter(Boolean).join(', ');
  // Not pre-checked against /api/favorites here for search/featured grids
  // — one duplicate fetch per card for data the guest's own /account/
  // saved page already shows authoritatively. Worst case there, a guest
  // who already saved this hotel sees an unfilled heart and taps it
  // again; the DB's UNIQUE(guest, hotel) + ON CONFLICT DO NOTHING makes
  // that a harmless no-op, not a duplicate or an error.
  //
  // SavedHotelsPage is different: every card it renders is, by
  // definition, already saved — showing an unfilled heart there would be
  // actively wrong, not just a missed optimization, so it passes
  // initialSaved={true} instead of leaving this to guess.
  const [saved, setSaved] = useState(initialSaved);
  return (
    <Link
      to={`/hotels/${hotel.id}?${searchParams.toString()}`}
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-primary-200 transition-all"
    >
      <div className="h-36 bg-primary-50 flex items-center justify-center relative">
        {hotel.logo_url ? (
          <img src={hotel.logo_url} alt={hotel.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <Building2 className="w-10 h-10 text-primary-300" />
        )}
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
        {hotel.amenities?.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-1">{hotel.amenities.slice(0, 3).join(' · ')}</p>
        )}
        {hotel.from_price != null && (
          <p className="text-sm mt-3 pt-3 border-t border-gray-100">
            <span className="text-gray-500">From </span>
            <span className="font-bold text-gray-900">{formatMoney(hotel.from_price, hotel.currency)}</span>
            <span className="text-gray-400"> / night</span>
          </p>
        )}
      </div>
    </Link>
  );
}
