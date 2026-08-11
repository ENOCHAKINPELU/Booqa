import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import ReviewStars from './ReviewStars';
import api from '../services/api';
import { track } from '../utils/analytics';

const SUB_RATINGS = [
  { key: 'rating_cleanliness', label: 'Cleanliness' },
  { key: 'rating_staff', label: 'Staff' },
  { key: 'rating_location', label: 'Location' },
  { key: 'rating_facilities', label: 'Facilities' },
  { key: 'rating_value', label: 'Value for money' },
];

// submit_review (029) is the real gate — checked_out + owns the
// reservation + not already reviewed — this form just gives the guest a
// clean way to hit it. Server errors (STAY_NOT_COMPLETED,
// ALREADY_REVIEWED, etc.) surface verbatim via err.friendlyMessage
// rather than this form trying to pre-guess every case.
export default function ReviewForm({ reservationId, hotelName, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [subRatings, setSubRatings] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please choose an overall rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/reservations/${reservationId}/review`, { rating, ...subRatings, comment });
      track('review_submitted', { reservation_id: reservationId });
      onSubmitted?.(data.data);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to submit your review right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900">How was your stay at {hotelName}?</h3>
        <p className="text-xs text-gray-500 mt-0.5">Your review is verified against your actual booking and shown after a quick check by our team.</p>
      </div>

      <div>
        <span className="block text-xs font-medium text-gray-600 mb-1.5">Overall rating</span>
        <ReviewStars value={rating || null} onChange={setRating} interactive size="w-7 h-7" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {SUB_RATINGS.map(({ key, label }) => (
          <div key={key}>
            <span className="block text-xs text-gray-500 mb-1">{label}</span>
            <ReviewStars value={subRatings[key] || null} onChange={(v) => setSubRatings((s) => ({ ...s, [key]: v }))} interactive size="w-4 h-4" />
          </div>
        ))}
      </div>

      <label className="block text-sm">
        <span className="block text-xs font-medium text-gray-600 mb-1">Tell other guests about it (optional)</span>
        <textarea className="input" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What stood out about your stay?" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
        {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit review'}
      </button>
    </form>
  );
}
