import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, History } from 'lucide-react';

export default function RecentlyViewed({ hotels = [] }) {
  if (!hotels.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 mb-4">
        <History className="w-5 h-5 text-gray-400" /> Recently viewed
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {hotels.map((hotel) => (
          <Link
            key={hotel.id}
            to={`/hotels/${hotel.id}`}
            className="flex-shrink-0 w-56 bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="h-24 bg-primary-50 flex items-center justify-center">
              {hotel.logo_url ? (
                <img src={hotel.logo_url} alt={hotel.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <Building2 className="w-7 h-7 text-primary-300" />
              )}
            </div>
            <div className="p-3">
              <p className="font-medium text-sm text-gray-900 truncate">{hotel.name}</p>
              <p className="text-xs text-gray-500">{[hotel.city, hotel.state].filter(Boolean).join(', ')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
