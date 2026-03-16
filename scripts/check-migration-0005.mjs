#!/usr/bin/env node
/**
 * Check if Drizzle migration 0005 (users optional eBay + display_name) is applied.
 * Uses DATABASE_URL from .env.local (same as drizzle.config.ts).
 * Run: node scripts/check-migration-0005.mjs
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

const sql = postgres(url, { max: 1 });

async function main() {
  const cols = await sql`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
    AND column_name IN ('ebay_user_id', 'access_token', 'refresh_token', 'token_expires_at', 'display_name')
    ORDER BY column_name
  `;

  const hasDisplayName = cols.some((r) => r.column_name === "display_name");
  const nullable = cols.filter((r) => r.is_nullable === "YES").map((r) => r.column_name);
  const required = ["ebay_user_id", "access_token", "refresh_token", "token_expires_at"].filter(
    (c) => !nullable.includes(c)
  );

  if (hasDisplayName && required.length === 0) {
    console.log("Migration 0005 is applied: users has nullable eBay columns and display_name.");
    process.exit(0);
  }

  if (!hasDisplayName) {
    console.log("Migration 0005 is NOT applied: users table has no display_name column.");
  } else {
    console.log("Migration 0005 partially applied or reverted: these columns are still NOT NULL:", required);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
