import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, nearby } from '../lib/geo.js';

// Real Port Harcourt positions (from OpenStreetMap)
const PETER_ODILI = { latitude: 4.8062, longitude: 7.0482, isCity: false };
const hotels = [
  { id: 'bonny', name: 'Bonny View', latitude: 4.8062, longitude: 7.0482, geo_precision: 'address' },    // on Peter Odili Rd
  { id: 'ta', name: 'Trans-Amadi', latitude: 4.8249, longitude: 7.0391, geo_precision: 'area' },         // ~2.3 km
  { id: 'rumu', name: 'Rumuibekwe', latitude: 4.8425, longitude: 7.0504, geo_precision: 'area' },        // ~4 km
  { id: 'gra', name: 'Old GRA', latitude: 4.7790, longitude: 7.0125, geo_precision: 'address' },        // ~5 km
  { id: 'rumuodara', name: 'Rumuodara', latitude: 4.8614, longitude: 7.0315, geo_precision: 'area' },   // ~6.4 km
  { id: 'nowhere', name: 'No position', latitude: null, longitude: null },
  { id: 'lagos', name: 'Lagos', latitude: 6.5244, longitude: 3.3792, geo_precision: 'city' },
];

test('distance between two points in km', () => {
  assert.ok(Math.abs(distanceKm({ latitude: 4.8062, longitude: 7.0482 }, { latitude: 4.7790, longitude: 7.0125 }) - 4.98) < 0.1);
});

test('street search: nearest first, widening until at least three hotels', () => {
  const { hotels: near, far } = nearby(hotels, PETER_ODILI);
  assert.equal(far, false);
  // 3 km has Bonny + Trans-Amadi only; 6 km adds Rumuibekwe and Old GRA
  assert.deepEqual(near.map((h) => h.id), ['bonny', 'ta', 'rumu', 'gra']);
  assert.equal(near[0].distance_km, 0);
  assert.ok(near.every((h, i) => i === 0 || h.distance_km >= near[i - 1].distance_km));
});

test('hotels without a map position never appear in a distance search', () => {
  const { hotels: near } = nearby(hotels, { latitude: 4.81, longitude: 7.04, isCity: true });
  assert.ok(!near.some((h) => h.id === 'nowhere'));
  assert.ok(!near.some((h) => h.id === 'lagos'), 'a city search stays within 30 km');
});

test('nothing within 20 km: the five nearest, flagged as far, city-level ones marked approximate', () => {
  const { hotels: near, far } = nearby(hotels, { latitude: 9.0765, longitude: 7.3986, isCity: false }); // Abuja
  assert.equal(far, true);
  assert.equal(near.length, 5);
  assert.equal(near.find((h) => h.id === 'lagos')?.approximate ?? false, near.some((h) => h.id === 'lagos'));
});
