import React, { useEffect, useState } from 'react';
import { Loader, Save, CheckCircle2 } from 'lucide-react';
import { partnerApi } from '../../services/partnerApi';

const HOTEL_TYPES = [
  { value: '', label: 'Select a type' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'boutique_hotel', label: 'Boutique hotel' },
  { value: 'resort', label: 'Resort' },
  { value: 'guest_house', label: 'Guest house' },
  { value: 'serviced_apartment', label: 'Serviced apartment' },
  { value: 'apartment_hotel', label: 'Apartment hotel' },
  { value: 'other', label: 'Other' },
];

const FIELDS = ['hotel_type', 'description', 'cover_image_url', 'check_in_time', 'check_out_time', 'nearby_attractions', 'transportation_info', 'area'];

export default function PartnerProfilePage() {
  const [form, setForm] = useState(null);
  const [highlightsText, setHighlightsText] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    partnerApi.get('profile')
      .then((r) => {
        const p = r.data.data;
        setForm(p);
        setHighlightsText((p.highlights || []).join(', '));
      })
      .catch((err) => setError(err.friendlyMessage || 'Unable to load your profile.'));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const patch = {};
      for (const field of FIELDS) patch[field] = form[field] ?? null;
      patch.highlights = highlightsText.split(',').map((s) => s.trim()).filter(Boolean);
      const { data } = await partnerApi.patch('profile', patch);
      setForm(data.data);
      setSaved(true);
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="flex justify-center py-12 text-gray-400"><Loader className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="max-w-xl">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Hotel profile</h2>
      <p className="text-sm text-gray-500 mb-6">
        What guests see on your Booqa listing. Your address and contact details are managed in HotelOps and shown automatically — this is the marketing side.
      </p>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {saved && <p className="flex items-center gap-1.5 text-sm text-green-700 mb-4"><CheckCircle2 className="w-4 h-4" /> Profile saved.</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Property type</span>
          <select className="input" value={form.hotel_type || ''} onChange={(e) => set('hotel_type', e.target.value || null)}>
            {HOTEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Description</span>
          <textarea className="input" rows={4} value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Tell guests what makes your hotel worth booking." />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Cover image URL</span>
          <input className="input" value={form.cover_image_url || ''} onChange={(e) => set('cover_image_url', e.target.value)} placeholder="https://…" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Check-in time</span>
            <input className="input" value={form.check_in_time || ''} onChange={(e) => set('check_in_time', e.target.value)} placeholder="2:00 PM" />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-gray-600 mb-1">Check-out time</span>
            <input className="input" value={form.check_out_time || ''} onChange={(e) => set('check_out_time', e.target.value)} placeholder="12:00 PM" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Highlights (comma-separated)</span>
          <input className="input" value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} placeholder="Free WiFi, Pool, Airport shuttle" />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Area / neighbourhood</span>
          <input className="input" value={form.area || ''} onChange={(e) => set('area', e.target.value)} placeholder="GRA Phase 2, Trans Amadi…" />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Nearby attractions</span>
          <textarea className="input" rows={2} value={form.nearby_attractions || ''} onChange={(e) => set('nearby_attractions', e.target.value)} />
        </label>

        <label className="block text-sm">
          <span className="block text-xs font-medium text-gray-600 mb-1">Getting there / transportation</span>
          <textarea className="input" rows={2} value={form.transportation_info || ''} onChange={(e) => set('transportation_info', e.target.value)} />
        </label>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save profile</>}
        </button>
      </form>
    </div>
  );
}
