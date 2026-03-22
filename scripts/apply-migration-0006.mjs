#!/usr/bin/env node
/**
 * Apply Drizzle migration 0006_inventory_collection_fields (inventory + collection columns).
 * Uses IF NOT EXISTS — safe to re-run. Matches drizzle/0006_inventory_collection_fields.sql.
 *
 * Prefer: `npm run db:migrate` (records __drizzle_migrations). Use this script if migrate
 * cannot run or you only need these columns on Supabase.
 *
 * Requires DATABASE_URL in .env.local (use Supabase pooler URI on Vercel/local).
 * Run: npm run apply:0006
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

/** Same as drizzle/0006_inventory_collection_fields.sql */
const statements = [
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "cost_of_card" numeric(12, 2)`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "primary_image_url" text`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "ebay_listing_id" text`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "listing_status" text`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "item_kind" text`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "sport_or_tcg" text`,
  `ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "extra_details" jsonb`,
  `ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "item_kind" text`,
  `ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "sport_or_tcg" text`,
  `ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "extra_details" jsonb`,
  `ALTER TABLE "personal_collection_items" ADD COLUMN IF NOT EXISTS "image_url" text`,
];

const sql = postgres(url, { max: 1 });

async function main() {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
    console.log("OK:", stmt.slice(0, 72) + (stmt.length > 72 ? "…" : ""));
  }
  console.log("\n0006_inventory_collection_fields applied.");
  console.log("Tip: run `npm run db:migrate` so Drizzle’s journal matches (skips already-applied files).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
