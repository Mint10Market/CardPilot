#!/usr/bin/env node
/**
 * Verify alignment: migration 0005 on DB + reminder of Vercel env vars.
 * Uses DATABASE_URL from .env.local (same as drizzle.config.ts and Vercel production).
 * Run: npm run align:check  or  node scripts/verify-alignment.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set in .env.local. Add it (same as Vercel Production DATABASE_URL). See ALIGNMENT.md.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const VERCEL_CHECKLIST = [
  "DATABASE_URL (pooler, port 6543)",
  "SESSION_SECRET (≥32 chars)",
  "NEXT_PUBLIC_APP_URL",
  "EBAY_REDIRECT_URI",
  "EBAY_CLIENT_ID",
  "EBAY_CLIENT_SECRET",
  "EBAY_ENVIRONMENT",
  "EBAY_WEBHOOK_VERIFICATION_TOKEN",
];

async function main() {
  console.log("--- Database (migration 0005) ---");
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
    console.log("OK  Migration 0005 is applied (guest sign-in supported).\n");
  } else {
    console.log("!!  Migration 0005 is NOT applied on this DB.");
    if (!hasDisplayName) console.log("    users table is missing display_name column.");
    else console.log("    These columns are still NOT NULL:", required.join(", "));
    console.log("    Run: npm run db:migrate   (or ask Cursor to run the migrations).");
    console.log("    Ensure .env.local DATABASE_URL is the same as Vercel Production DATABASE_URL.\n");
  }

  console.log("--- Vercel env (ensure these are set in Production) ---");
  VERCEL_CHECKLIST.forEach((name) => console.log("  •", name));
  console.log("\nSee ALIGNMENT.md and ENV_VARS_BY_PLATFORM.md for details.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
