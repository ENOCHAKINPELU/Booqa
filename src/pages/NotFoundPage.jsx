import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <Compass className="w-10 h-10 text-gray-300 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary inline-block">Back to search</Link>
    </div>
  );
}
