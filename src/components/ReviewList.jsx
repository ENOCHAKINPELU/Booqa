import React, { useEffect, useState } from 'react';
import { Loader, MessageSquareOff, BadgeCheck } from 'lucide-react';
import ReviewStars from './ReviewStars';
import api from '../services/api';
import { formatDisplay } from '../utils/dates';

export default function ReviewList({ hotelId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get(`/hotels/${hotelId}/reviews`)
      .then((r) => { if (!cancelled) setReviews(r.data.data?.reviews || []); })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hotelId]);

  if (loading) {
    return <div className="flex justify-center py-8 text-gray-400"><Loader className="w-5 h-5 animate-spin" /></div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <MessageSquareOff className="w-7 h-7 mx-auto mb-2" />
        <p className="text-sm">No reviews yet — be the first to stay and share your experience.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((rv) => (
        <div key={rv.id} className="border-b border-gray-100 pb-4 last:border-0">
          <div className="flex items-center gap-2">
            <ReviewStars value={rv.rating} />
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">
              <BadgeCheck className="w-3 h-3" /> Verified stay
            </span>
            <span className="text-xs text-gray-400 ml-auto">{formatDisplay(rv.created_at?.slice(0, 10))}</span>
          </div>
          {rv.comment && <p className="text-sm text-gray-700 mt-2">{rv.comment}</p>}
        </div>
      ))}
    </div>
  );
}
