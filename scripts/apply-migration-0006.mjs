#!/usr/bin/env node
/**
 * Apply migration 0006 (orders.shipping_cost) directly to the DB.
 * Run: node scripts/apply-migration-0006.mjs
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
  await sql.unsafe('ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_cost" numeric(12, 2);');
  console.log("OK: orders.shipping_cost added. Sales page should load now.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
