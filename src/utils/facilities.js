import {
  Waves, Utensils, Wine, Dumbbell, Presentation, Car, Sparkles, ConciergeBell, Building2, Trees, Sunset,
  Baby, Wifi, Zap, ShieldCheck, Plane, Shirt, BellRing, CircleDot,
} from 'lucide-react';

// Facility icons, keyed by the HotelOps facility catalog (facilities.service.js).
export const FACILITY_ICONS = {
  pool: Waves, restaurant: Utensils, bar: Wine, gym: Dumbbell, event_hall: Presentation, parking: Car,
  spa: Sparkles, lobby: ConciergeBell, exterior: Building2, garden: Trees, rooftop: Sunset, kids_area: Baby,
  wifi: Wifi, power: Zap, security: ShieldCheck, shuttle: Plane, laundry: Shirt, room_service: BellRing,
};

export const facilityIcon = (f) => FACILITY_ICONS[f?.icon_key] || FACILITY_ICONS[f?.key] || CircleDot;

// The order Nigerian guests actually decide by: power and security before
// anything else. Used for filter order and for which few facilities a
// results card shows first.
export const FACILITY_PRIORITY = ['power', 'security', 'wifi', 'parking', 'pool', 'restaurant', 'gym', 'shuttle', 'bar', 'room_service', 'laundry', 'spa'];

export const FACILITY_LABELS = {
  power: '24-hour power', security: 'Security & CCTV', wifi: 'Free Wi-Fi', parking: 'Parking', pool: 'Swimming pool',
  restaurant: 'Restaurant', gym: 'Gym', shuttle: 'Airport shuttle', bar: 'Bar & lounge', room_service: 'Room service',
  laundry: 'Laundry', spa: 'Spa', event_hall: 'Event hall', kids_area: "Kids' area", garden: 'Garden', rooftop: 'Rooftop',
};

export function byFacilityPriority(a, b) {
  const ia = FACILITY_PRIORITY.indexOf(a.key ?? a);
  const ib = FACILITY_PRIORITY.indexOf(b.key ?? b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
}
