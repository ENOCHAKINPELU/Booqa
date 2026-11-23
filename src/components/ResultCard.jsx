import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, Star, ChevronRight } from 'lucide-react';
import PhotoCarousel from './PhotoCarousel';
import SaveHotelButton from './SaveHotelButton';
import { formatMoney, nights as countNights } from '../utils/dates';
import { hotelFromPrice, hotelStayTotal } from '../utils/pricing';
import { facilityIcon, FACILITY_LABELS, byFacilityPriority } from '../utils/facilities';

const formatType = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ') : null);

/**
 * Search-results card - wide, one per row, like a booking site's results
 * list: photos left, facts middle, price and action right (stacked on
 * phones). Everything shown is real data from GET /hotels; nothing is
 * filled in to look busier (no invented ratings, discounts or urgency).
 */
export default function ResultCard({ hotel, searchParams }) {
  const [saved, setSaved] = useState(false);
  const price = hotelFromPrice(hotel);
  const stayNights = countNights(searchParams.get('check_in') || '', searchParams.get('check_out') || '');
  const stayTotal = stayNights > 1 ? hotelStayTotal(hotel, stayNights) : null;
  const location = [hotel.area, hotel.city, hotel.state].filter(Boolean).join(', ');
  const facilities = [...(hotel.facilities || [])].sort(byFacilityPriority).slice(0, 4);
  const href = `/hotels/${hotel.id}?${searchParams.toString()}`;

  return (
    <article className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-primary-200 transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="relative sm:w-72 flex-shrink-0">
          <Link to={href} tabIndex={-1} aria-hidden="true">
            <PhotoCarousel photos={hotel.photos?.length ? hotel.photos : [hotel.cover_image_url].filter(Boolean)} alt={hotel.name} className="h-52 sm:h-full sm:min-h-[220px]" />
          </Link>
          {hotel.verified && (
            <span className="absolute top-3 left-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white bg-primary-700/95 rounded-full px-2 py-1">
              <BadgeCheck className="w-3 h-3" /> Verified
            </span>
          )}
          <SaveHotelButton hotelId={hotel.id} saved={saved} onToggle={setSaved} className="absolute top-3 right-3 w-9 h-9" />
        </div>

        <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row gap-4 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {formatType(hotel.hotel_type) && (
                <span className="font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">{formatType(hotel.hotel_type)}</span>
              )}
              {hotel.avg_rating ? (
                <span className="flex items-center gap-1 font-semibold text-gray-800">
                  <Star className="w-3.5 h-3.5 fill-accent text-accent" /> {Number(hotel.avg_rating).toFixed(1)}
                  <span className="font-normal text-gray-400">({hotel.review_count} review{hotel.review_count === 1 ? '' : 's'})</span>
                </span>
              ) : (
                <span className="font-semibold text-accent-dark bg-accent-soft rounded-full px-2 py-0.5">New on Booqa</span>
              )}
            </div>

            <h3 className="text-lg font-bold text-gray-900 mt-2 leading-snug">
              <Link to={href} className="hover:text-primary-700 focus:outline-none focus-visible:underline">{hotel.name}</Link>
            </h3>
            {location && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" /> <span className="truncate">{location}</span>
              </p>
            )}

            {facilities.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Facilities">
                {facilities.map((f) => {
                  const Icon = facilityIcon(f);
                  const highlight = f.key === 'power' || f.key === 'security';
                  return (
                    <li key={f.key} className={`flex items-center gap-1 text-xs font-medium rounded-full px-2 py-1
                      ${highlight ? 'bg-primary-50 text-primary-800' : 'bg-gray-50 text-gray-600'}`}>
                      <Icon className="w-3.5 h-3.5" /> {FACILITY_LABELS[f.key] || f.name}
                    </li>
                  );
                })}
              </ul>
            )}

            {hotel.amenities?.length > 0 && (
              <p className="text-xs text-gray-500 mt-2.5 line-clamp-1">
                <span className="text-gray-400">In the rooms:</span> {hotel.amenities.slice(0, 4).join(' · ')}
              </p>
            )}

            {hotel.description && (
              <p className="text-sm text-gray-600 mt-2.5 line-clamp-2 hidden sm:block">{hotel.description}</p>
            )}
          </div>

          <div className="sm:w-44 flex-shrink-0 flex sm:flex-col sm:items-end justify-between sm:justify-end gap-3 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-4">
            {price ? (
              <div className="sm:text-right">
                <p className="text-xs text-gray-500">From</p>
                <p className="text-2xl font-extrabold text-gray-900 leading-tight tabular-nums">{formatMoney(price.perNight, hotel.currency)}</p>
                <p className="text-xs text-gray-500">per night</p>
                {stayTotal && <p className="text-xs text-gray-600 mt-1">{formatMoney(stayTotal, hotel.currency)} for {stayNights} nights</p>}
                <p className={`text-[11px] font-medium mt-1 ${price.includesFee ? 'text-green-700' : 'text-gray-400'}`}>
                  {price.includesFee ? 'Includes all fees' : '+ service fee'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 sm:text-right">See rooms for prices</p>
            )}
            <Link to={href} className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap sm:w-full">
              See rooms <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
