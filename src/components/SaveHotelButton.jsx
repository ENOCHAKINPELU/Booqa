import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { track } from '../utils/analytics';

// Saving is Booqa-owned (api/favorites.js, the booqa_app-scoped DB), not
// a HotelOps concept - see 029's migration note. Signed-out guests are
// sent to sign in rather than shown a button that would just 401; a
// wishlist tied to nothing is a worse experience than asking once.
export default function SaveHotelButton({ hotelId, saved, onToggle, className = '' }) {
  const { guest } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!guest) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
    setBusy(true);
    try {
      if (saved) {
        await authApi.delete('/favorites', { data: { hotel_id: hotelId } });
        onToggle?.(false);
      } else {
        await authApi.post('/favorites', { hotel_id: hotelId });
        track('hotel_saved', { hotel_id: hotelId });
        onToggle?.(true);
      }
    } catch {
      // A failed save/unsave isn't worth an intrusive error - the button
      // just doesn't visibly change, which is honest (nothing happened).
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved hotels' : 'Save this hotel'}
      className={`flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-colors disabled:opacity-60 ${className}`}
    >
      <Heart className={`w-4 h-4 transition-colors ${saved ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
    </button>
  );
}
