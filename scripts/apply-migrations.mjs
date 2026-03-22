#!/usr/bin/env node
/**
 * Applies **all pending** Drizzle SQL migrations in ./drizzle (same as `drizzle-kit migrate`).
 * Updates `__drizzle_migrations` so nothing is re-applied.
 *
 * Loads, in order: `.env.local`, `.env`, then existing process.env (so CI can pass DATABASE_URL).
 *
 * Run from project root:
 *   npm run db:apply
 *
 * Needs a Postgres URL (Supabase: use **Session pooler** or **Transaction** pooler from
 * Dashboard → Connect — often port **6543**, not the direct db.*.supabase.co URL on Vercel.)
 */
import { config } from "dotenv";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

config({ path: join(root, ".env.local") });
config({ path: join(root, ".env") });

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!url || !String(url).trim()) {
  console.error(`
No DATABASE_URL found.

1. Copy .env.example → .env.local
2. Set DATABASE_URL to your Supabase connection string (pooler URI recommended).

Then run:  npm run db:apply
`);
  process.exit(1);
}

const migrationsFolder = join(root, "drizzle");

async function main() {
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);
  console.log("Applying migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("Done. All pending migrations are applied.");
  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
