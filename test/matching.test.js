import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchHotels, perNightAllIn } from '../lib/matching.js';

// availability rows as HotelOps returns them (2 nights)
const rt = (id, rate, available, extra = {}) => ({
  room_type_id: id, name: `Room ${id}`, capacity_adults: 2, available_count: available, nights: 2,
  total_amount: rate * 2, guest_fee_amount: rate * 2 * 0.075, ...extra,
});

const hotels = [
  { id: 'a', name: 'GRA Suites', city: 'Port Harcourt', state: 'Rivers', area: 'GRA' },
  { id: 'b', name: 'Trans-Amadi Inn', city: 'Port Harcourt', state: 'Rivers', area: 'Trans-Amadi' },
  { id: 'c', name: 'No Area Hotel', city: 'Port Harcourt', state: 'Rivers', area: null },
  { id: 'd', name: 'Lagos Plaza', city: 'Lagos', state: 'Lagos', area: 'Ikeja' },
];

test('all-in price per night includes the service fee', () => {
  assert.equal(perNightAllIn(rt('x', 40000, 1)), 43000);
});

test('fits: right city + area, enough rooms, within budget, cheapest first', () => {
  const avail = new Map([
    ['a', [rt('a1', 40000, 5), rt('a2', 30000, 2)]],   // a2 cheaper but only 2 free -> a1 used for 3 rooms
    ['b', [rt('b1', 35000, 5)]],
    ['c', [rt('c1', 38000, 5)]],
    ['d', [rt('d1', 20000, 9)]],
  ]);
  const { fits, close } = matchHotels({ city: 'Port Harcourt', area: '', rooms: 3, budget_per_night: 50000 }, hotels, avail);
  assert.deepEqual(fits.map((f) => f.hotel.id), ['b', 'c', 'a']);
  assert.equal(fits.find((f) => f.hotel.id === 'a').room_type.id, 'a1');
  assert.equal(close.length, 0);
  assert.equal(fits[0].total, 35000 * 2 * 1.075 * 3);
});

test('an area filter excludes other areas but keeps hotels that have not listed one (with a note)', () => {
  const avail = new Map([['a', [rt('a1', 40000, 5)]], ['b', [rt('b1', 35000, 5)]], ['c', [rt('c1', 38000, 5)]]]);
  const { fits } = matchHotels({ city: 'Port Harcourt', area: 'gra', rooms: 1 }, hotels, avail);
  assert.deepEqual(fits.map((f) => f.hotel.id), ['c', 'a']);
  assert.deepEqual(fits[0].notes, ['Hotel has not listed its area']);
});

test('nothing fits -> closest hotels with plain reasons', () => {
  const avail = new Map([
    ['a', [rt('a1', 60000, 5)]],      // over budget
    ['b', [rt('b1', 30000, 2)]],      // not enough rooms
    ['d', [rt('d1', 20000, 9)]],      // wrong city
  ]);
  const { fits, close } = matchHotels({ city: 'Port Harcourt', rooms: 4, budget_per_night: 50000 }, hotels, avail);
  assert.equal(fits.length, 0);
  // half the rooms (score 20) is closer than 29% over budget (29); another
  // city is furthest (100)
  assert.deepEqual(close.map((c) => c.hotel.id), ['b', 'a', 'd']);
  assert.equal(close[0].reasons[0], 'Only 2 of 4 rooms free');
  assert.equal(close[0].rooms_bookable, 2);
  assert.match(close[1].reasons[0], /^₦14,500 over budget per night$/);
  assert.equal(close[2].reasons[0], 'In Lagos, not Port Harcourt');
});

test('hotels with nothing free are left out entirely', () => {
  const avail = new Map([['a', [rt('a1', 40000, 0)]]]);
  const { fits, close } = matchHotels({ city: 'Port Harcourt', rooms: 1 }, hotels, avail);
  assert.equal(fits.length + close.length, 0);
});
