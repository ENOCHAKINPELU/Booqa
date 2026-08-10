import pg from 'pg';

const { Pool } = pg;

// Connects as the narrowly-privileged `booqa_app` role (see
// backend/db/migrations/025_booqa_accounts.sql) — SELECT/INSERT/UPDATE on
// booqa_guests and booqa_auth_tokens only. Never the HotelOps
// SUPABASE_SERVICE_ROLE_KEY; this pool has no access to hotel data at all.
//
// Reused across warm serverless invocations via `global` — a fresh Pool
// per invocation would exhaust Postgres connections under load.
function getPool() {
  if (!global.__booqaPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    global.__booqaPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__booqaPool;
}

function query(text, params) {
  return getPool().query(text, params);
}

export { query, getPool };
export default { query, getPool };
