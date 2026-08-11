# Booqa

Guest-facing hotel discovery and booking platform. Not a hotel management
system - it's a second interface into HotelOps, which stays the source of
truth for inventory, pricing, and reservations. See the architecture doc
and `backend/db/migrations/018_*.sql` onward for the HotelOps side of this.

## What's here

- A static Vite + React app (`src/`) - search, hotel detail, booking,
  payment, confirmation, manage-booking.
- One serverless function, `api/proxy/[...path].js` - the only thing that
  holds credentials for calling HotelOps' `/booking-api/v1`. The browser
  never sees the HMAC secret and never talks to HotelOps directly.

## Local development

The proxy is a real serverless function, so plain `vite dev` alone won't
run it - API calls from the browser will 404. Use the Vercel CLI instead,
which runs the static app and the function together the way production
does:

```bash
npm install -g vercel   # once
cp .env.example .env    # fill in HOTELOPS_API_BASE_URL, BOOQA_API_KEY,
                         # BOOQA_HMAC_SECRET, VITE_FLW_PUBLIC_KEY
npm run dev              # runs `vercel dev`
```

`BOOQA_API_KEY` / `BOOQA_HMAC_SECRET` come from running
`npm run create-booking-channel booqa` in `backend/` (after migrations
018–024 are applied) - see that script's output.

If you only need to check the UI renders without hitting the API, `npm run
dev:vite` runs the plain Vite dev server (faster, but every API call will
fail).

## Deployment

Separate Vercel project from `frontend/`, with **Root Directory** set to
`booqa/` in the Vercel dashboard. Set the same four env vars from
`.env.example` as Vercel project environment variables - `HOTELOPS_API_BASE_URL`
should point at the deployed HotelOps backend (e.g.
`https://hotelops-backend.onrender.com`), not localhost.
