#!/usr/bin/env node
/**
 * Apply migration 0005 SQL directly to the DB (uses .env.local DATABASE_URL).
 * Use when Drizzle journal is out of sync and db:migrate skips 0005.
 * Run: node scripts/apply-migration-0005.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env.local");
  process.exit(1);
}

const statements = [
  'ALTER TABLE "users" ALTER COLUMN "ebay_user_id" DROP NOT NULL',
  'ALTER TABLE "users" ALTER COLUMN "access_token" DROP NOT NULL',
  'ALTER TABLE "users" ALTER COLUMN "refresh_token" DROP NOT NULL',
  'ALTER TABLE "users" ALTER COLUMN "token_expires_at" DROP NOT NULL',
  'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_name" text',
];

const sql = postgres(url, { max: 1 });

async function main() {
  for (const stmt of statements) {
    await sql.unsafe(stmt + ";");
    console.log("OK:", stmt.slice(0, 55) + (stmt.length > 55 ? "…" : ""));
  }
  console.log("\nMigration 0005 applied. Run npm run align:check to verify.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
