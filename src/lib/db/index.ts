import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Serverless (Vercel): use max 1 per invocation. Use Supabase *pooler* URL (port 6543) in production
// to avoid "Failed query" / connection limits. In Supabase: Project Settings → Database → Connection pooler.
const client = postgres(connectionString, {
  max: 1,
  ...(process.env.NODE_ENV === "production" && { connect_timeout: 10 }),
});
export const db = drizzle(client, { schema });
export * from "./schema";
