import * as db from '../lib/db.js';
import { getSessionFromRequest } from '../lib/auth.js';
import { ok, fail } from '../lib/respond.js';

// Booqa-owned data (favorites are a Booqa concept, not a HotelOps one) -
// reads/writes booqa_favorites directly via the narrowly-privileged
// booqa_app role (lib/db.js), the same pattern as api/auth/*. Only ever
// returns hotel_ids here; the guest-facing page gets real hotel display
// data (name, price, amenities, verified) from the already-public
// GET /booking-api/v1/hotels and joins client-side - see 029's migration
// note for why that's deliberate, not a missing feature.
export default async function handler(req, res) {
  const session = getSessionFromRequest(req);
  if (!session?.sub) return fail(res, 401, 'Sign in to save hotels', 'UNAUTHENTICATED');

  try {
    if (req.method === 'GET') {
      try {
        const result = await db.query(
          'SELECT hotel_id, created_at FROM booqa_favorites WHERE booqa_guest_id = $1 ORDER BY created_at DESC',
          [session.sub]
        );
        return ok(res, result.rows);
      } catch (err) {
        // 42P01 = undefined_table - true until 029's migration runs.
        // Browsing degrades to "no saved hotels", an honest state (there
        // genuinely aren't any yet), same as reviews.service.js's
        // PGRST205 fallback. Saving/removing still fails loudly below -
        // there's no honest empty-state equivalent for a write that
        // can't be persisted.
        if (err.code === '42P01') return ok(res, []);
        throw err;
      }
    }

    if (req.method === 'POST') {
      const { hotel_id } = req.body || {};
      if (!hotel_id) return fail(res, 400, 'hotel_id is required', 'VALIDATION_ERROR');
      // ON CONFLICT DO NOTHING - the UNIQUE(guest, hotel) constraint is
      // what actually prevents a duplicate save; this just makes saving
      // an already-saved hotel a harmless no-op instead of a 500.
      await db.query(
        'INSERT INTO booqa_favorites (booqa_guest_id, hotel_id) VALUES ($1, $2) ON CONFLICT (booqa_guest_id, hotel_id) DO NOTHING',
        [session.sub, hotel_id]
      );
      return ok(res, { hotel_id, saved: true }, 201);
    }

    if (req.method === 'DELETE') {
      const hotel_id = req.body?.hotel_id || req.query?.hotel_id;
      if (!hotel_id) return fail(res, 400, 'hotel_id is required', 'VALIDATION_ERROR');
      await db.query('DELETE FROM booqa_favorites WHERE booqa_guest_id = $1 AND hotel_id = $2', [session.sub, hotel_id]);
      return ok(res, { hotel_id, saved: false });
    }

    return fail(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED');
  } catch (err) {
    console.error('[favorites]', err);
    fail(res, 500, 'Unable to update saved hotels right now.', 'FAVORITES_FAILED');
  }
}
