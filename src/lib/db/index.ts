import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function getConnectionString(): string {
  // Prefer full URL (local .env.local, Vercel env, or Supabase integration)
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;
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
  const port = process.env.POSTGRES_PORT ?? "5432";

  if (!host || !password) {
    throw new Error(
      "Database config missing. Set DATABASE_URL (or POSTGRES_URL), or POSTGRES_HOST + POSTGRES_PASSWORD (or SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD)."
    );
  }

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
}

const connectionString = getConnectionString();

// Serverless (Vercel): use max 1 per invocation. Pooler URL (port 6543) preferred in production.
const client = postgres(connectionString, {
  max: 1,
  ...(process.env.NODE_ENV === "production" && { connect_timeout: 10 }),
});
export const db = drizzle(client, { schema });
export * from "./schema";
