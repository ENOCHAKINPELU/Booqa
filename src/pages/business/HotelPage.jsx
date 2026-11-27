import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Clock, Navigation, Users, BedDouble, Maximize2, Plus, Image as Images } from 'lucide-react';
import WorkspaceShell from '../../components/business/WorkspaceShell';
import HotelFacilities from '../../components/HotelFacilities';
import MediaGallery from '../../components/MediaGallery';
import { biz, errorMessage } from '../../services/businessApi';
import { naira } from './bizFormat';
import { useAuth } from '../../context/AuthContext';

/*
 * One hotel, as it set itself up in HotelOps: photos, description,
 * location, check-in/out, facilities (with their own photos and 360°
 * views) and room categories with photos and all-in prices. "Request
 * rooms here" starts a request for this hotel's city.
 */

function Gallery({ hotel }) {
  const photos = [
    hotel.cover_image_url,
    ...hotel.room_types.flatMap((rt) => rt.media.filter((m) => m.media_type === 'photo').map((m) => m.url)),
    ...(hotel.facilities || []).flatMap((f) => (f.media || []).filter((m) => m.media_type === 'photo').map((m) => m.url)),
  ].filter(Boolean);
  const unique = [...new Set(photos)];
  if (!unique.length) {
    return <div className="rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 h-56 flex items-center justify-center text-primary-200"><Images className="w-8 h-8" /></div>;
  }
  const [main, ...rest] = unique;
  return (
    <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 sm:h-96 rounded-3xl overflow-hidden">
      <img src={main} alt={hotel.name} className={`w-full h-full object-cover ${rest.length ? 'col-span-4 sm:col-span-2 row-span-2' : 'col-span-4 row-span-2'}`} />
      {rest.slice(0, 4).map((src, i) => (
        <img key={src} src={src} alt="" loading="lazy" className={`hidden sm:block w-full h-full object-cover ${rest.length < 3 && i === 0 ? 'col-span-2 row-span-2' : ''}`} />
      ))}
    </div>
  );
}

function RoomType({ rt }) {
  const [open, setOpen] = useState(false);
  const photo = rt.media.find((m) => m.media_type === 'photo');
  return (
    <li className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <button type="button" onClick={() => rt.media.length && setOpen((v) => !v)}
          className="sm:w-52 h-40 sm:h-auto bg-gray-100 flex-shrink-0 relative" aria-label={`Photos of ${rt.name}`}>
          {photo ? <img src={photo.url} alt={rt.name} className="w-full h-full object-cover" loading="lazy" /> : <BedDouble className="w-8 h-8 text-gray-300 mx-auto" />}
          {rt.media.length > 1 && <span className="absolute bottom-2 right-2 text-xs bg-black/60 text-white rounded-full px-2 py-1">{open ? 'Hide photos' : `${rt.media.length} photos`}</span>}
        </button>
        <div className="flex-1 p-5 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-950">{rt.name}</h3>
            {rt.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rt.description}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-2">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Sleeps {rt.capacity_adults}{rt.capacity_children ? ` + ${rt.capacity_children} children` : ''}</span>
              {rt.bed_type && <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" /> {rt.bed_type}</span>}
              {rt.size_sqm && <span className="flex items-center gap-1"><Maximize2 className="w-4 h-4" /> {Number(rt.size_sqm)} m²</span>}
            </div>
            {rt.amenities.length > 0 && <p className="text-xs text-gray-500 mt-2">{rt.amenities.join(' · ')}</p>}
          </div>
          <div className="sm:text-right flex-shrink-0">
            <p className="text-lg font-bold text-gray-950">{naira(rt.per_night)}</p>
            <p className="text-xs text-gray-500">per room / night</p>
            <p className="text-[11px] text-gray-400">Includes all fees</p>
          </div>
        </div>
      </div>
      {open && <div className="p-5 border-t border-gray-100"><MediaGallery media={rt.media} hideComingSoon /></div>}
    </li>
  );
}

function Content({ publicMode = false }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { guest } = useAuth();
  const [hotel, setHotel] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { (publicMode ? biz.publicHotel(id) : biz.hotel(id)).then(setHotel).catch((err) => setError(errorMessage(err, 'This hotel is not available.'))); }, [id, publicMode]);

  if (!hotel && !error) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!hotel) return <p className="text-red-700">{error}</p>;

  const address = [hotel.address, hotel.area, hotel.city, hotel.state].filter(Boolean).join(', ');
  // Booking needs a company account: signed-out visitors sign in (or sign
  // up) first and come straight back to this pre-filled request.
  const requestLink = `/business/requests/new?${new URLSearchParams(Object.entries({
    city: hotel.city, area: hotel.area, hotel: hotel.name,
    check_in: params.get('check_in'), check_out: params.get('check_out'), rooms: params.get('rooms'),
  }).filter(([, v]) => v)).toString()}`;
  const bookLink = guest ? requestLink : `/login?redirect=${encodeURIComponent(requestLink)}`;
  const backTo = publicMode ? `/hotels${params.toString() ? `?${params.toString()}` : ''}` : '/business/hotels';

  return (
    <div className="space-y-8">
      <Link to={backTo} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> All hotels</Link>
      <Gallery hotel={hotel} />

      <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-gray-950">{hotel.name}</h1>
            {address && <p className="mt-1 text-gray-600 flex items-start gap-1.5"><MapPin className="w-4 h-4 mt-1 flex-shrink-0" /> {address}</p>}
            {hotel.description && <p className="mt-4 text-gray-700 leading-relaxed">{hotel.description}</p>}
            {hotel.highlights?.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {hotel.highlights.map((x) => <li key={x} className="text-sm font-medium text-navy bg-primary-50 rounded-full px-3 py-1">{x}</li>)}
              </ul>
            )}
          </div>

          {hotel.facilities?.length > 0 && <HotelFacilities facilities={hotel.facilities} />}

          <section>
            <h2 className="font-semibold text-gray-950 mb-4">Rooms</h2>
            {hotel.room_types.length === 0
              ? <p className="text-gray-500">No room categories listed yet.</p>
              : <ul className="space-y-3">{hotel.room_types.map((rt) => <RoomType key={rt.id} rt={rt} />)}</ul>}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="rounded-2xl bg-white border border-gray-200 p-5">
            {hotel.room_types[0] && (
              <p className="text-sm text-gray-600">From <span className="text-xl font-bold text-gray-950">{naira(hotel.room_types[0].per_night)}</span> / room / night</p>
            )}
            <Link to={bookLink} className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-navy hover:bg-primary-800 text-white font-semibold rounded-xl py-3">
              <Plus className="w-4 h-4" /> Book rooms here
            </Link>
            <p className="text-xs text-gray-500 mt-2">{guest ? "We'll check live availability for your dates." : 'Sign in or create a free company account to book.'}</p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3 text-sm">
            {(hotel.check_in_time || hotel.check_out_time) && (
              <p className="flex items-center gap-2 text-gray-700"><Clock className="w-4 h-4 text-navy" />
                {hotel.check_in_time && `Check-in ${hotel.check_in_time}`}{hotel.check_in_time && hotel.check_out_time && ' · '}{hotel.check_out_time && `Check-out ${hotel.check_out_time}`}
              </p>
            )}
            {address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-navy hover:underline">
                <Navigation className="w-4 h-4" /> View on map
              </a>
            )}
            {hotel.nearby_attractions && <p className="text-gray-600"><span className="font-medium text-gray-800">Nearby: </span>{hotel.nearby_attractions}</p>}
            {hotel.transportation_info && <p className="text-gray-600"><span className="font-medium text-gray-800">Getting there: </span>{hotel.transportation_info}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function HotelPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}

/** /hotels/:id - no sign-in; booking asks for sign-in. */
export function PublicHotelPage() {
  return (
    <div className="bg-gray-50 min-h-[70vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"><Content publicMode /></div>
    </div>
  );
}
