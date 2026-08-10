import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

// Shared shell for /terms and /privacy. Both are honest early-access
// placeholders, not attorney-drafted legal documents — see each page's own
// content for why, and TermsPage.jsx / PrivacyPage.jsx for what's actually
// said. Existing so the footer never links to a 404, matching the
// "coming soon, not fabricated" rule used everywhere else in this app.
export default function LegalPage({ title, updated, children }) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <FileText className="w-8 h-8 text-primary-300 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{title}</h1>
      <p className="text-xs text-gray-400 mb-8">Last updated {updated}</p>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-4 leading-relaxed">
        {children}
      </div>
      <Link to="/" className="btn-secondary inline-block mt-10">Back to Booqa</Link>
    </div>
  );
}
