import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, Building2, Loader2 } from 'lucide-react';
import WorkspaceShell, { useWorkspace } from '../../components/business/WorkspaceShell';
import { biz, errorMessage } from '../../services/businessApi';
import { inputCls, naira, policyText } from './bizFormat';
import { OrgSetup } from './BusinessHomePage';
import { tomorrowISO, defaultCheckOut } from '../../utils/dates';

/*
 * Two ways in, one form:
 *   ?hotel_id=…&room_type=…   booking at a hotel the company already chose
 *                             (from its page): live rooms free per room type,
 *                             then "Hold rooms" goes straight to payment.
 *   no hotel                  "find me hotels": Booqa matches hotels that fit.
 * Dates and rooms carry over from the search either way.
 */

function Field({ label, optional, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex justify-between text-sm font-medium text-gray-800 mb-1.5">
        {label}{optional && <span className="font-normal text-gray-400">Optional</span>}
      </span>
      {children}
    </label>
  );
}

const emptyGuest = () => ({ name: '', phone: '', email: '' });

function Guests({ guests, setGuests }) {
  const update = (i, k) => (e) => setGuests((all) => all.map((x, n) => (n === i ? { ...x, [k]: e.target.value } : x)));
  return (
    <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-950">Who is staying <span className="text-sm font-normal text-gray-400">Optional</span></h2>
        <button type="button" onClick={() => setGuests((g) => [...g, emptyGuest()])} className="text-sm font-medium text-navy flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add guest
        </button>
      </div>
      <p className="text-sm text-gray-500 mt-1">One guest per room, in order. Guests with an email get their own booking reference and the hotel's address.</p>
      <div className="mt-4 space-y-3">
        {guests.map((g, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-6 pt-2.5 text-xs font-semibold text-gray-400 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 grid sm:grid-cols-3 gap-2">
              <input value={g.name} onChange={update(i, 'name')} className={inputCls} placeholder="Full name" aria-label={`Guest ${i + 1} name`} />
              <input type="tel" value={g.phone} onChange={update(i, 'phone')} className={inputCls} placeholder="Phone" aria-label={`Guest ${i + 1} phone`} />
              <input type="email" value={g.email} onChange={update(i, 'email')} className={inputCls} placeholder="Email" aria-label={`Guest ${i + 1} email`} />
            </div>
            {guests.length > 1 && (
              <button type="button" onClick={() => setGuests((all) => all.filter((_, n) => n !== i))} aria-label={`Remove guest ${i + 1}`} className="p-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Room types at the chosen hotel with live availability for the dates. */
function RoomChoice({ hotelId, form, selections, setSelections, preferredRoomType }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [autoSelected, setAutoSelected] = useState(false);
  const rooms = Number(form.rooms) || 1;
  const selectedTotal = Object.values(selections).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const valid = form.check_in && form.check_out && form.check_out > form.check_in;

  useEffect(() => {
    if (!valid) return;
    setRows(null);
    setError('');
    biz.availability(hotelId, { check_in: form.check_in, check_out: form.check_out, rooms })
      .then((available) => {
        setRows(available);
        setSelections((previous) => Object.fromEntries(Object.entries(previous)
          .filter(([id]) => available.some((r) => r.room_type_id === id))
          .map(([id, count]) => [id, Math.min(Number(count) || 0, available.find((r) => r.room_type_id === id).available_count)])
          .filter(([, count]) => count > 0)));
      })
      .catch((err) => setError(errorMessage(err, 'Could not check availability right now.')));
  }, [hotelId, form.check_in, form.check_out, rooms, valid]);

  // Preselect the requested room type when available, otherwise the cheapest
  // type with enough rooms. Companies can then divide the rooms across types.
  useEffect(() => {
    if (!rows?.length || autoSelected) return;
    const preferred = rows.find((r) => r.room_type_id === preferredRoomType && r.available_count >= rooms);
    const cheapest = rows.filter((r) => r.available_count >= rooms).sort((a, b) => a.per_night - b.per_night)[0];
    const choice = preferred || cheapest;
    if (choice) setSelections({ [choice.room_type_id]: rooms });
    else setSelections({});
    setAutoSelected(true);
  }, [rows, rooms, autoSelected, preferredRoomType, setSelections]);

  if (!valid) return <p className="text-sm text-gray-500">Choose your dates to see which rooms are free.</p>;
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!rows) return <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking live availability…</p>;
  if (!rows.length) return <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">No rooms are free here for these dates. Try other dates, or submit and we'll show other hotels that fit.</p>;

  return (
    <>
      <p className="text-sm text-gray-500">Enter rooms per category. Total must equal {rooms}. Prices include a 7% Booqa fee for one room or 5% per room for a multi-room booking.</p>
      <ul className="space-y-2" aria-label="Room categories">
      {rows.map((r) => {
        const count = Number(selections[r.room_type_id]) || 0;
        const on = count > 0;
        return (
          <li key={r.room_type_id}>
            <label className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors
              ${on ? 'border-navy bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-950">{r.name}</span>
                <span className="block text-xs text-emerald-700">{r.available_count} free for these dates</span>
                <span className="block text-xs text-gray-500">{policyText(r.free_cancellation_hours, r.cancellation_fee_percent)}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold text-gray-950 tabular-nums">{naira(r.per_night)}</span>
                <span className="block text-xs text-gray-500">per room / night</span>
                {count > 0 && <span className="block text-xs text-gray-700">{naira(r.stay_per_room * count)} total</span>}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Rooms</span>
                <input type="number" min="0" max={r.available_count} value={count} onChange={(e) => setSelections((prev) => ({ ...prev, [r.room_type_id]: Math.max(0, Math.min(r.available_count, Number(e.target.value) || 0)) }))}
                  className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-center" aria-label={`${r.name} rooms`} />
              </span>
            </label>
          </li>
        );
      })}
      </ul>
      <p className={`text-sm font-medium ${selectedTotal === rooms ? 'text-emerald-700' : 'text-amber-700'}`}>
        {selectedTotal} of {rooms} rooms assigned
      </p>
    </>
  );
}

function Content() {
  const { org } = useWorkspace();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const hotelId = params.get('hotel_id');
  const [hotel, setHotel] = useState(null);
  const [hotelError, setHotelError] = useState('');
  const [roomTypeSelections, setRoomTypeSelections] = useState(() => {
    const id = params.get('room_type');
    return id ? { [id]: Number(params.get('rooms')) || 1 } : {};
  });
  const [form, setForm] = useState({
    city: params.get('city') || org?.city || 'Port Harcourt', area: params.get('area') || '',
    check_in: params.get('check_in') || tomorrowISO(),
    check_out: params.get('check_out') || defaultCheckOut(params.get('check_in') || tomorrowISO()),
    rooms: params.get('rooms') || 1, project: '', budget_per_night: '', preferences: '',
  });
  const [guests, setGuests] = useState([emptyGuest()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!hotelId) return;
    biz.publicHotel(hotelId).then(setHotel).catch((err) => setHotelError(errorMessage(err, 'That hotel is not available.')));
  }, [hotelId]);

  // New here (e.g. came from a hotel page and just signed up): set up the
  // company right here - the booking stays in the address bar.
  if (!org) return <OrgSetup />;
  if (hotelId && !hotel && !hotelError) return <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  const direct = hotelId && hotel;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = {
      ...form,
      guests: guests.filter((g) => g.name.trim()),
      ...(direct ? {
        city: hotel.city, area: hotel.area || '', hotel_id: hotel.id,
        room_type_selections: Object.entries(roomTypeSelections).filter(([, count]) => Number(count) > 0).map(([room_type_id, rooms]) => ({ room_type_id, rooms: Number(rooms) })),
      } : {}),
    };
    try {
      const created = await biz.createRequest(body);
      navigate(`/business/requests/${created.id}`, { replace: true, state: created.booking_error ? { notice: created.booking_error } : null });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const dates = (
    <>
      <Field label="Check-in"><input type="date" value={form.check_in} min={tomorrowISO()} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value, check_out: f.check_out > e.target.value ? f.check_out : defaultCheckOut(e.target.value) }))} className={inputCls} required /></Field>
      <Field label="Check-out"><input type="date" value={form.check_out} min={form.check_in} onChange={set('check_out')} className={inputCls} required /></Field>
      <Field label="Rooms"><input type="number" min="1" max="20" value={form.rooms} onChange={set('rooms')} className={inputCls} required /></Field>
      <Field label="Project or cost centre" optional><input value={form.project} onChange={set('project')} className={inputCls} placeholder="e.g. Onne Base Upgrade" /></Field>
    </>
  );

  return (
    <div className="max-w-2xl">
      <Link to={direct ? `/hotels/${hotel.id}` : '/business'} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy"><ArrowLeft className="w-4 h-4" /> Back</Link>

      {direct ? (
        <div className="mt-4 flex items-center gap-4">
          <div className="w-20 h-16 rounded-xl overflow-hidden bg-white border border-gray-100 flex-shrink-0 flex items-center justify-center p-1">
            {hotel.logo_url ? <img src={hotel.logo_url} alt={`${hotel.name} logo`} className="w-full h-full object-contain" /> : hotel.cover_image_url ? <img src={hotel.cover_image_url} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-6 h-6 text-primary-400" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">Book at {hotel.name}</h1>
            <p className="text-sm text-gray-600 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {[hotel.area, hotel.city].filter(Boolean).join(', ')}</p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-950">New accommodation request</h1>
          <p className="mt-1 text-gray-600">Booqa checks live availability and shows you the hotels that fit, so you can book straight away.</p>
          {hotelError && <p className="mt-3 text-sm text-amber-800 bg-amber-50 rounded-xl px-4 py-3">{hotelError} Tell us where you need rooms and we'll find hotels that fit.</p>}
        </>
      )}

      <form onSubmit={submit} className="mt-8 space-y-6">
        {direct ? (
          <>
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
              <h2 className="font-semibold text-gray-950">When</h2>
              <div className="grid sm:grid-cols-2 gap-4">{dates}</div>
            </section>
            <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
              <h2 className="font-semibold text-gray-950">Room</h2>
              <RoomChoice hotelId={hotel.id} form={form} selections={roomTypeSelections} setSelections={setRoomTypeSelections} preferredRoomType={params.get('room_type')} />
            </section>
          </>
        ) : (
          <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
            <h2 className="font-semibold text-gray-950">Where and when</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City"><input value={form.city} onChange={set('city')} className={inputCls} required /></Field>
              <Field label="Area or street" optional><input value={form.area} onChange={set('area')} className={inputCls} placeholder="e.g. Peter Odili Road, GRA" /></Field>
              {dates}
            </div>
          </section>
        )}

        <Guests guests={guests} setGuests={setGuests} />

        <section className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 space-y-4">
          <h2 className="font-semibold text-gray-950">{direct ? 'Notes for the hotel' : 'Preferences'}</h2>
          {!direct && (
            <Field label="Budget per room per night (₦)" optional>
              <input type="number" min="0" value={form.budget_per_night} onChange={set('budget_per_night')} className={`${inputCls} max-w-xs`} placeholder="e.g. 50000" />
            </Field>
          )}
          <Field label="Anything else" optional>
            <textarea rows={3} value={form.preferences} onChange={set('preferences')} className={`${inputCls} resize-none`} placeholder={direct ? 'e.g. Late arrival, ground-floor rooms' : 'e.g. Close to Onne port, 24-hour power, breakfast included'} />
          </Field>
        </section>

        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3" role="alert">{error}</p>}
        <div className="flex gap-3">
          <button disabled={saving || (direct && Object.values(roomTypeSelections).reduce((sum, n) => sum + (Number(n) || 0), 0) !== Number(form.rooms))} className="bg-navy hover:bg-primary-800 disabled:opacity-50 text-white font-semibold rounded-xl px-6 py-3">
            {direct ? (saving ? 'Holding rooms…' : 'Hold rooms and pay') : (saving ? 'Finding hotels…' : 'Find hotels')}
          </button>
          <Link to={direct ? `/hotels/${hotel.id}` : '/business'} className="font-semibold text-gray-700 rounded-xl px-6 py-3 hover:bg-white">Cancel</Link>
        </div>
        {direct && <p className="text-xs text-gray-500">Rooms are held for a short time while you pay online by card, transfer or USSD.</p>}
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return <WorkspaceShell><Content /></WorkspaceShell>;
}
