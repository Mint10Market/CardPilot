import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Serverless (e.g. Vercel): use max 1 to avoid connection pool exhaustion per invocation
const client = postgres(connectionString, { max: 1 });
export const db = drizzle(client, { schema });
export * from "./schema";
