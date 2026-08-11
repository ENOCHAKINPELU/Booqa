import React from 'react';
import { Quote } from 'lucide-react';

// Deliberately renders nothing until real testimonials exist - this is
// evidentiary content (it tells a guest "other people trust this"), not
// placeholder UI copy, so it's not something to fabricate. Wire this up
// once real guest reviews exist (Slice 4 / the roadmap's Phase 2 Reviews
// module) instead of inventing quotes attributed to invented guests.
export default function Testimonials({ testimonials = [] }) {
  if (!testimonials.length) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">What guests are saying</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {testimonials.map((t, i) => (
          <blockquote key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <Quote className="w-5 h-5 text-primary-300 mb-2" />
            <p className="text-sm text-gray-700 mb-3">{t.quote}</p>
            <cite className="text-xs text-gray-500 not-italic">{t.author}</cite>
          </blockquote>
        ))}
      </div>
    </section>
  );
}
