import React, { useState } from 'react';
import { Briefcase, Gem, Users2, Presentation, Waves, Wallet } from 'lucide-react';

const CATEGORIES = [
  { id: 'business', label: 'Business Hotels', icon: Briefcase },
  { id: 'luxury', label: 'Luxury', icon: Gem },
  { id: 'family', label: 'Family Friendly', icon: Users2 },
  { id: 'conference', label: 'Conference Hotels', icon: Presentation },
  { id: 'resort', label: 'Resorts', icon: Waves },
  { id: 'budget', label: 'Budget', icon: Wallet },
];

// Presentational category shortcuts, not a real filter yet - hotels.hotel_type
// doesn't exist in the schema (§5.1 has no such column), so there's nothing
// on the backend for these to actually query against today. Wiring is kept
// self-contained (local toggle state only, no navigation) specifically so
// this doesn't *look* more functional than it is. The moment a real
// category/tag field ships, this becomes `onChange(activeId)` calling
// /search?category=... instead of a no-op setState - same markup either way.
export default function FeaturePills() {
  const [active, setActive] = useState(null);

  return (
    <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Browse by hotel type">
      {CATEGORIES.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActive((cur) => (cur === id ? null : id))}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border
                        transition-all duration-200 ${
                          isActive
                            ? 'bg-accent border-accent text-primary-900 shadow-sm shadow-accent/30'
                            : 'bg-white/10 border-white/20 text-white/85 hover:bg-white/20 hover:border-white/35'
                        }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        );
      })}
    </div>
  );
}
