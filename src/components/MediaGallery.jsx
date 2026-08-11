import React, { useState } from 'react';
import { ImageOff, PlayCircle, Move3d } from 'lucide-react';
import Room360Viewer from './Room360Viewer';
import { track } from '../utils/analytics';

export default function MediaGallery({ media = [] }) {
  const photos = media.filter(m => m.media_type === 'photo');
  const videos = media.filter(m => m.media_type === 'video');
  const tours = media.filter(m => m.media_type === 'tour_360');
  const [active, setActive] = useState(photos[0] || videos[0] || tours[0] || null);

  if (!media.length) {
    return (
      <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <ImageOff className="w-8 h-8 text-gray-300" />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
        {active?.media_type === 'tour_360' ? (
          <Room360Viewer key={active.id} url={active.url} />
        ) : active?.media_type === 'video' ? (
          <video src={active.url} controls className="w-full h-full object-cover" onPlay={() => track('video_played', { media_id: active.id })} />
        ) : active ? (
          <img src={active.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
      </div>

      {(photos.length + videos.length + tours.length > 1 || tours.length === 0) && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {[...photos, ...videos, ...tours].map((m) => (
            <button
              key={m.id}
              onClick={() => { setActive(m); if (m.media_type === 'tour_360') track('tour_360_opened', { media_id: m.id }); }}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${active?.id === m.id ? 'border-primary-600' : 'border-transparent'}`}
            >
              {m.media_type === 'video' ? (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
              ) : m.media_type === 'tour_360' ? (
                <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900 flex flex-col items-center justify-center gap-0.5">
                  <Move3d className="w-4 h-4 text-white" />
                  <span className="text-[8px] font-bold text-white/90">360°</span>
                </div>
              ) : (
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}

          {/* The capability is real (Room360Viewer above), the content
              just isn't uploaded for this room yet - shown rather than
              hidden so guests (and hotel owners) know the feature exists,
              same honesty rule this app follows for ratings/reviews. */}
          {tours.length === 0 && (
            <div
              className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50
                         flex flex-col items-center justify-center gap-0.5 text-gray-300 cursor-not-allowed"
              title="360° tour coming soon"
            >
              <Move3d className="w-4 h-4" />
              <span className="text-[7px] font-semibold text-center leading-tight px-0.5">Coming soon</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
