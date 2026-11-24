import * as db from '../lib/db.js';
import { getSessionFromRequest } from '../lib/auth.js';
import { ok, fail } from '../lib/respond.js';
import { handleEnquiry } from '../lib/enquiries.js';
import * as biz from '../lib/business.js';

/*
 * One serverless function for all of Booqa for Business (Vercel's plan
 * caps the number of functions). The route travels as ?path=, the same
 * way api/proxy.js works - see src/services/api.js for why.
 *
 *   enquiries                         POST   public demo / partner form
 *   me                                GET    membership + ops flag
 *   org                               POST   create organization
 *   team                              GET, POST
 *   team/:guestId                     PATCH, DELETE
 *   dashboard                         GET
 *   requests                          GET, POST
 *   requests/:id                      GET
 *   requests/:id/approve              POST
 *   requests/:id/cancel               POST
 *   ops/requests                      GET    Booqa operations team
 *   ops/requests/:id                  GET
 *   ops/requests/:id/options          POST
 *   ops/requests/:id/options/:optId   DELETE
 *   ops/requests/:id/status           POST
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ROUTES = [
  ['GET', /^me$/, (s) => biz.me(db, s)],
  ['POST', /^org$/, (s, b) => biz.createOrganization(db, s, b)],
  ['GET', /^team$/, (s) => biz.listMembers(db, s)],
  ['POST', /^team$/, (s, b) => biz.addMember(db, s, b)],
  ['PATCH', new RegExp(`^team/(${UUID})$`), (s, b, q, m) => biz.updateMember(db, s, m[1], b)],
  ['DELETE', new RegExp(`^team/(${UUID})$`), (s, b, q, m) => biz.removeMember(db, s, m[1])],
  ['GET', /^dashboard$/, (s) => biz.dashboard(db, s)],
  ['GET', /^requests$/, (s, b, q) => biz.listRequests(db, s, q)],
  ['POST', /^requests$/, (s, b) => biz.createRequest(db, s, b), 201],
  ['GET', new RegExp(`^requests/(${UUID})$`), (s, b, q, m) => biz.getRequest(db, s, m[1])],
  ['POST', new RegExp(`^requests/(${UUID})/approve$`), (s, b, q, m) => biz.approveRequest(db, s, m[1], b)],
  ['POST', new RegExp(`^requests/(${UUID})/cancel$`), (s, b, q, m) => biz.cancelRequest(db, s, m[1], b)],
  ['GET', /^ops\/requests$/, (s, b, q) => biz.opsListRequests(db, s, q)],
  ['GET', new RegExp(`^ops/requests/(${UUID})$`), (s, b, q, m) => biz.opsGetRequest(db, s, m[1])],
  ['POST', new RegExp(`^ops/requests/(${UUID})/options$`), (s, b, q, m) => biz.opsAddOption(db, s, m[1], b)],
  ['DELETE', new RegExp(`^ops/requests/(${UUID})/options/(${UUID})$`), (s, b, q, m) => biz.opsRemoveOption(db, s, m[1], m[2])],
  ['POST', new RegExp(`^ops/requests/(${UUID})/status$`), (s, b, q, m) => biz.opsSetStatus(db, s, m[1], b)],
];

export default async function handler(req, res) {
  const rawPath = Array.isArray(req.query.path) ? req.query.path[0] : (req.query.path || '');
  const path = String(rawPath).replace(/^\/+|\/+$/g, '');
  const method = (req.method || 'GET').toUpperCase();

  if (path === 'enquiries' && method === 'POST') return handleEnquiry(req, res);

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
    if (err instanceof biz.BizError) return fail(res, err.status, err.message, err.code);
    console.error('[business]', method, path, err);
    return fail(res, 500, 'Something went wrong. Please try again.', 'SERVER_ERROR');
  }
}
