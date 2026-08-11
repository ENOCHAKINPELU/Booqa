import { Star, Building2, Zap, Lock } from 'lucide-react';

// Pure config, fed real numbers from LandingPage rather than hardcoding
// them here - that's the "configurable later from the backend" hook: swap
// what LandingPage passes into buildHeroStats() for a real API response
// and nothing in HeroStats.jsx has to change.
//
// avgRating is intentionally allowed to be null/undefined and rendered as
// "New" rather than a fabricated number - Booqa has no reviews table live
// yet (PRD §5.3: reviews/avg_rating are planned, not applied), and this
// row makes a trust claim a real guest will judge the whole platform by,
// so it follows the same rule the PRD sets for a single hotel's rating:
// no reviews yet is a real state to show, not a gap to paper over with 4.8.
export function buildHeroStats({ hotelCount, avgRating } = {}) {
  return [
    {
      icon: Star,
      value: avgRating ? avgRating.toFixed(1) : 'New',
      label: avgRating ? 'Average Rating' : 'On Booqa',
    },
    {
      icon: Building2,
      value: hotelCount != null ? `${hotelCount}+` : '-',
      label: 'Verified Hotels',
    },
    { icon: Zap, value: null, label: 'Instant Booking' },
    { icon: Lock, value: null, label: 'Secure Payment' },
  ];
}
