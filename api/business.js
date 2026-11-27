import * as db from '../lib/db.js';
import { getSessionFromRequest } from '../lib/auth.js';
import { ok, fail } from '../lib/respond.js';
import { handleEnquiry } from '../lib/enquiries.js';
import * as biz from '../lib/business.js';
import { HotelOpsError } from '../lib/hotelops.js';

/*
 * One serverless function for all of Booqa for Business (Vercel's plan
 * caps the number of functions). The route travels as ?path=, the same
 * way api/proxy.js works - see src/services/api.js for why.
 *
 *   enquiries                         POST   public demo / partner form
 *   me                                GET    membership + ops flag
 *   org                               POST   create organization
 *   org                               PATCH  update company details / own job title
 *   team                              GET, POST
 *   team/:guestId                     PATCH, DELETE
 *   team/invites/:inviteId            DELETE cancel an invitation
 *   public/hotels                     GET    PUBLIC: hotel directory (no sign-in)
 *   public/hotels/:id                 GET    PUBLIC: one hotel
 *   public/hotels/:id/availability    GET    PUBLIC: live rooms free + prices for dates
 *   hotels                            GET    hotel directory (search: q, city)
 *   hotels/:id                        GET    one hotel: photos, facilities, rooms
 *   dashboard                         GET
 *   requests                          GET, POST (POST with hotel_id + room_type_id books straight away)
 *   requests/:id                      GET
 *   requests/:id/matches              GET    hotels that fit (or the closest)
 *   requests/:id/book                 POST   hold every room at one hotel
 *   requests/:id/pay                  POST   start a payment (new tx_ref)
 *   requests/:id/confirm-payment      POST   confirm once paid
 *   requests/:id/cancel               POST
 *   ops/requests                      GET    Booqa operations team (read-only)
 *   ops/requests/:id                  GET
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ROUTES = [
  ['GET', /^me$/, (s) => biz.me(db, s)],
  ['POST', /^org$/, (s, b) => biz.createOrganization(db, s, b)],
  ['PATCH', /^org$/, (s, b) => biz.updateOrganization(db, s, b)],
  ['GET', /^team$/, (s) => biz.listMembers(db, s)],
  ['POST', /^team$/, (s, b) => biz.addMember(db, s, b)],
  ['PATCH', new RegExp(`^team/(${UUID})$`), (s, b, q, m) => biz.updateMember(db, s, m[1], b)],
  ['DELETE', new RegExp(`^team/(${UUID})$`), (s, b, q, m) => biz.removeMember(db, s, m[1])],
  ['DELETE', new RegExp(`^team/invites/(${UUID})$`), (s, b, q, m) => biz.cancelInvite(db, s, m[1])],
  ['GET', /^dashboard$/, (s) => biz.dashboard(db, s)],
  ['GET', /^hotels$/, (s, b, q) => biz.listHotels(db, s, q)],
  ['GET', new RegExp('^hotels/(' + UUID + ')$'), (s, b, q, m) => biz.getHotel(db, s, m[1])],
  ['GET', /^requests$/, (s, b, q) => biz.listRequests(db, s, q)],
  ['POST', /^requests$/, (s, b) => biz.createAndBook(db, s, b), 201],
  ['GET', new RegExp(`^requests/(${UUID})$`), (s, b, q, m) => biz.getRequest(db, s, m[1])],
  ['GET', new RegExp(`^requests/(${UUID})/matches$`), (s, b, q, m) => biz.findMatches(db, s, m[1])],
  ['POST', new RegExp(`^requests/(${UUID})/book$`), (s, b, q, m) => biz.bookHotel(db, s, m[1], b)],
  ['POST', new RegExp(`^requests/(${UUID})/pay$`), (s, b, q, m) => biz.startPayment(db, s, m[1])],
  ['POST', new RegExp(`^requests/(${UUID})/confirm-payment$`), (s, b, q, m) => biz.confirmPayment(db, s, m[1])],
  ['POST', new RegExp(`^requests/(${UUID})/cancel$`), (s, b, q, m) => biz.cancelRequest(db, s, m[1], b)],
  ['GET', /^ops\/requests$/, (s, b, q) => biz.opsListRequests(db, s, q)],
  ['GET', new RegExp(`^ops/requests/(${UUID})$`), (s, b, q, m) => biz.opsGetRequest(db, s, m[1])],
];

export default async function handler(req, res) {
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : (req.query.path || '');
  const path = String(rawPath).replace(/^\/+|\/+$/g, '');
  const method = (req.method || 'GET').toUpperCase();

  if (path === 'enquiries' && method === 'POST') return handleEnquiry(req, res);

  // Public, read-only: anyone can browse hotels; booking needs sign-in.
  if (method === 'GET' && path.startsWith('public/')) {
    const one = path.match(new RegExp(`^public/hotels/(${UUID})$`));
    const query = { ...req.query };
    delete query.path;
    try {
      if (path === 'public/hotels') return ok(res, await biz.publicHotels(query, db));
      if (one) return ok(res, await biz.publicHotel(one[1]));
      const avail = path.match(new RegExp(`^public/hotels/(${UUID})/availability$`));
      if (avail) return ok(res, await biz.publicAvailability(avail[1], query));
      return fail(res, 404, 'Not found', 'NOT_FOUND');
    } catch (err) {
      if (err instanceof biz.BizError || err instanceof HotelOpsError) return fail(res, err.status, err.message, err.code);
      console.error('[business] public', path, err);
      return fail(res, 500, 'Something went wrong. Please try again.', 'SERVER_ERROR');
    }
  }

  const route = ROUTES.find(([m, re]) => m === method && re.test(path));
  if (!route) return fail(res, 404, 'Not found', 'NOT_FOUND');
  const [, re, fn, status = 200] = route;

  const session = getSessionFromRequest(req);
  if (!session?.sub) return fail(res, 401, 'Please sign in.', 'UNAUTHENTICATED');

  const query = { ...req.query };
  delete query.path;
  try {
    const data = await fn(session, req.body || {}, query, path.match(re));
    return ok(res, data, status);
  } catch (err) {
    if (err instanceof biz.BizError || err instanceof HotelOpsError) return fail(res, err.status, err.message, err.code);
    console.error('[business]', method, path, err);
    return fail(res, 500, 'Something went wrong. Please try again.', 'SERVER_ERROR');
  }
}
