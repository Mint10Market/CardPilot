import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getConnectionString(): string {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.SUPABASE_DB_URL,
  ].filter(Boolean) as string[];

  const isDirectSupabase = (u: string) =>
    /@db\.[a-z0-9]+\.supabase\.co(?:[:\/]|$)/i.test(u);
  // Supabase: direct = port 5432, pooler (Transaction) = port 6543; use pooler on Vercel.
  const isPooler = (u: string) =>
    u.includes("pooler.supabase.com") || u.includes(":6543");

  // On Vercel, direct Supabase host (db.xxx.supabase.co) often fails with ENOTFOUND. Prefer pooler URL.
  if (process.env.VERCEL && candidates.length > 0) {
    const pooler = candidates.find(isPooler);
    if (pooler) return pooler;
    const notDirect = candidates.find((u) => !isDirectSupabase(u));
    if (notDirect) return notDirect;
    throw new Error(
      "On Vercel, Supabase direct host (db.*.supabase.co) is not reachable. Set DATABASE_URL or SUPABASE_DB_URL to the Shared Pooler URI from Supabase Connect panel (IPv4 COMPATIBLE, host like aws-0-*.pooler.supabase.com:6543)."
    );
  }

  const url = candidates[0];
  if (url) return url;

  // Vercel + Supabase integration: build from POSTGRES_* or SUPABASE_DB_*
  const user =
    process.env.POSTGRES_USER ?? process.env.SUPABASE_DB_USER ?? "postgres";
  const password =
    process.env.POSTGRES_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD;
  const host =
    process.env.POSTGRES_HOST ?? process.env.SUPABASE_DB_HOST;
  const database =
    process.env.POSTGRES_DATABASE ?? process.env.SUPABASE_DB_NAME ?? "postgres";
  const port = process.env.POSTGRES_PORT ?? "5432"; // direct; use 6543 for pooler (Vercel).

  if (!host || !password) {
    throw new Error(
      "Database config missing. Set DATABASE_URL (or POSTGRES_URL), or POSTGRES_HOST + POSTGRES_PASSWORD (or SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD)."
    );
  }

  const encodedPassword = encodeURIComponent(password);
  const built = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
  if (process.env.VERCEL && isDirectSupabase(built)) {
    throw new Error(
      "On Vercel, Supabase direct host (db.*.supabase.co) is not reachable. Set DATABASE_URL or SUPABASE_DB_URL to the Shared Pooler URI from Supabase Connect panel (IPv4 COMPATIBLE, host like aws-0-*.pooler.supabase.com:6543)."
    );
  }
  return built;
}

// Lazy init so next build can run without DATABASE_URL (config only required at runtime when db is used).
let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getClient(): ReturnType<typeof postgres> {
  if (!_client) {
    const connectionString = getConnectionString();
    _client = postgres(connectionString, {
      max: 1,
      ...(process.env.NODE_ENV === "production" && { connect_timeout: 10 }),
    });
  }
  return _client;
}

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getClient(), { schema });
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string, unknown>)[prop as string];
  },
});

export * from "./schema";
