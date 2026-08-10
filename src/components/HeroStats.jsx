import React from 'react';

export default function HeroStats({ stats }) {
  return (
    <dl className="flex flex-wrap gap-x-7 gap-y-3 mt-6">
      {stats.map(({ icon: Icon, value, label }) => (
        <div key={label} className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent flex-shrink-0" />
          <div className="leading-tight">
            {value && <dt className="sr-only">{label}</dt>}
            {value ? (
              <>
                <dd className="text-sm font-bold text-white">{value}</dd>
                <dt className="text-[11px] text-primary-100/80">{label}</dt>
              </>
            ) : (
              <dd className="text-sm font-semibold text-white/90">{label}</dd>
            )}
          </div>
        </div>
      ))}
    </dl>
  );
}
