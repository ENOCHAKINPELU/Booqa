import React, { useState } from 'react';
import { Users, ImageOff, ChevronDown, ChevronUp, BedDouble, Maximize2, ShieldCheck } from 'lucide-react';
import { formatMoney } from '../utils/dates';
import MediaGallery from './MediaGallery';
import { track } from '../utils/analytics';

export default function RoomTypeCard({ roomType, onBook }) {
  const [expanded, setExpanded] = useState(false);
  const photo = roomType.media?.find(m => m.media_type === 'photo');
  const hasMoreMedia = (roomType.media?.length || 0) > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => { if (hasMoreMedia) { setExpanded(v => !v); if (!expanded) track('room_viewed', { room_type_id: roomType.room_type_id, room_type_name: roomType.name }); } }}
          className="sm:w-56 h-40 sm:h-auto bg-gray-100 flex items-center justify-center flex-shrink-0 relative group"
        >
          {photo ? (
            <img src={photo.url} alt={roomType.name} className="w-full h-full object-cover" />
          ) : (
            <ImageOff className="w-8 h-8 text-gray-300" />
          )}
          {hasMoreMedia && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs rounded-full px-2 py-1 flex items-center gap-1">
              Photos & videos {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
          )}
        </button>

        <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{roomType.name}</h3>
            {roomType.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{roomType.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Up to {roomType.capacity_adults} adult{roomType.capacity_adults === 1 ? '' : 's'}
                {roomType.capacity_children ? `, ${roomType.capacity_children} children` : ''}
              </span>
              {roomType.bed_type && (
                <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {roomType.bed_type}</span>
              )}
              {roomType.size_sqm && (
                <span className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> {roomType.size_sqm} m²</span>
              )}
            </div>
            {roomType.cancellation_policy && (
              <p className="flex items-center gap-1 text-xs text-green-700 mt-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> {roomType.cancellation_policy}
              </p>
            )}
            {roomType.available_count <= 3 && (
              <p className="text-xs font-medium text-amber-600 mt-1">
                Only {roomType.available_count} left for these dates
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">{roomType.nights} night{roomType.nights === 1 ? '' : 's'} total</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(roomType.total_amount, roomType.currency)}</p>
            <p className="text-xs text-gray-400 mb-3">{formatMoney(roomType.base_rate, roomType.currency)} / night</p>
            <button onClick={() => onBook(roomType)} className="btn-primary w-full sm:w-auto">
              Book now
            </button>
          </div>
        </div>
      </div>

      {expanded && hasMoreMedia && (
        <div className="p-4 sm:p-5 border-t border-gray-100">
          <MediaGallery media={roomType.media} />
        </div>
      )}
    </div>
  );
}
