import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serves booqa/api/**/*.js (the same Vercel serverless functions used in
// production) directly inside Vite's own dev server, instead of through
// `vercel dev`. Added after `vercel dev`'s serverless-function runtime
// proved to crash reliably on this machine (Windows + this Node version -
// "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file
// src\win\async.c, line 76" on essentially every invocation, not just
// under heavy load as first suspected), while plain `vite` has been
// rock-solid all session. Every api/*.js file is already written against
// plain Node req/res semantics (req.headers, res.setHeader, res.status().
// json()) - not an Express app - so it only needs req.query/req.body
// parsed and a status()/json() shim added, nothing about the handlers
// themselves changes. `vercel dev` (via `npm run dev:full`) remains
// available for testing actual Vercel routing/build behavior before a
// deploy; it's just no longer the default local loop.
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function resolveHandlerFile(pathname) {
  // '/api/proxy' -> 'proxy.js', '/api/auth/login' -> 'auth/login.js'
  const rel = pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  if (!rel || rel.includes('..')) return null; // no path traversal
  const filePath = path.join(__dirname, 'api', `${rel}.js`);
  return fs.existsSync(filePath) ? filePath : null;
}

export default function localApiPlugin() {
  return {
    name: 'booqa-local-api',
    configureServer(server) {
      // Registered directly in configureServer (not returned as a
      // post-hook) so Vite installs it before its own SPA/history-fallback
      // middleware - otherwise every /api/* request would be swallowed by
      // the same kind of catch-all-shadowing bug already hit once this
      // session with vercel.json's rewrite.
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const requestUrl = new URL(req.url, 'http://internal');
        const filePath = resolveHandlerFile(requestUrl.pathname);
        if (!filePath) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, data: null, error: { message: 'Route not found', code: 'NOT_FOUND' } }));
          return;
        }

        req.query = Object.fromEntries(requestUrl.searchParams);
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          req.body = await parseJsonBody(req);
        }
        res.status = function status(code) { res.statusCode = code; return res; };
        res.json = function json(obj) {
          if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };

        try {
          const mod = await server.ssrLoadModule(filePath);
          await mod.default(req, res);
        } catch (err) {
          server.config.logger.error(`[local-api] ${req.method} ${req.url} failed: ${err.stack || err.message}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, data: null, error: { message: 'Internal error', code: 'INTERNAL' } }));
          }
        }
      });
    },
  };
}
