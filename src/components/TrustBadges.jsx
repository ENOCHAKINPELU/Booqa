import React from 'react';
import { ShieldCheck, Zap, Lock, QrCode, Radio } from 'lucide-react';

// Every claim here matches something real elsewhere in the product, not
// marketing copy invented for this row:
//  - "Verified Hotels"       → hotels.is_active + booqa_enabled gate (hotels.service.js)
//  - "Instant Confirmation"  → reservation status flips on Flutterwave callback (PaymentPage)
//  - "Secure Payments"       → Flutterwave inline checkout, never a card field of our own
//  - "QR Code Check-in"      → withQr()/qrTokenToDataUrl on confirmation + lookup (booking-api.routes.js)
//  - "Live Availability"     → GET .../availability hits HotelOps live, never cached (§5.4)
const BADGES = [
  { icon: ShieldCheck, label: 'Verified Hotels' },
  { icon: Zap, label: 'Instant Confirmation' },
  { icon: Lock, label: 'Secure Payments' },
  { icon: QrCode, label: 'QR Code Check-in' },
  { icon: Radio, label: 'Live Room Availability' },
];

export default function TrustBadges() {
  return (
    <ul className="flex flex-wrap gap-2 mb-6" aria-label="Why guests trust Booqa">
      {BADGES.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="group flex items-center gap-1.5 text-xs font-medium text-white/90 bg-white/10
                     border border-white/15 rounded-full pl-2.5 pr-3 py-1.5 backdrop-blur-sm
                     transition-colors duration-200 hover:bg-white/15 hover:border-accent/40"
        >
          <Icon className="w-3.5 h-3.5 text-accent transition-transform duration-300 group-hover:scale-110" />
          {label}
        </li>
      ))}
    </ul>
  );
}
