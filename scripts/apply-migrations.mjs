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
 *
 * GitHub-hosted runners often cannot reach **IPv6-only** Supabase pooler endpoints
 * (`ENETUNREACH`). This script resolves the hostname to an **IPv4** address and connects
 * to that IP while setting TLS **servername** to the original host (required for valid certs).
 *
 * If `dns.lookup(..., { family: 4 })` fails, use Supabase’s IPv4-compatible URI or the IPv4 add-on.
 */
import dns from "node:dns";
import net from "node:net";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, join, resolve } from "path";
import postgres from "postgres";
import { fileURLToPath } from "url";

dns.setDefaultResultOrder("ipv4first");

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

/**
 * @param {string} connectionUrl
 * @returns {Promise<{ url: string, options: Record<string, unknown> }>}
 */
async function connectionUrlAndOptions(connectionUrl) {
  const raw = String(connectionUrl).trim();
  const normalized = raw.replace(/^postgresql:/, "postgres:");
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  const hostname = parsed.hostname;
  const options = { max: 1 };

  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 || ipVersion === 6) {
    return { url: raw, options };
  }

  if (process.env.DATABASE_APPLY_SKIP_IPV4_RESOLVE === "1") {
    return { url: raw, options };
  }

  let ipv4;
  try {
    const result = await dns.promises.lookup(hostname, { family: 4 });
    ipv4 = result.address;
  } catch (err) {
    throw new Error(
      `${err instanceof Error ? err.message : String(err)}\n\n` +
        `Could not resolve "${hostname}" to IPv4. GitHub Actions cannot use IPv6 to many Supabase poolers.\n` +
        `Fix: Supabase Dashboard → Connect → copy the connection string labeled **IPv4 compatible**,\n` +
        `or enable **Project Settings → Add-ons → IPv4** for a public IPv4 address.\n` +
        `See DEPLOY.md.\n` +
        `Local override: set DATABASE_APPLY_SKIP_IPV4_RESOLVE=1 to skip this resolution.`
    );
  }

  options.host = ipv4;

  const sslMode = (parsed.searchParams.get("sslmode") || "").toLowerCase();
  const isSupabase =
    hostname.endsWith(".supabase.com") ||
    hostname.endsWith(".supabase.co") ||
    hostname.includes(".pooler.supabase.com");
  const usesTls =
    sslMode !== "disable" &&
    sslMode !== "false" &&
    (sslMode === "require" ||
      sslMode === "verify-ca" ||
      sslMode === "verify-full" ||
      sslMode === "prefer" ||
      sslMode === "allow" ||
      isSupabase);

  if (usesTls) {
    // postgres.js clears SNI when host is an IP; pooler certs need the real hostname.
    const strict = sslMode === "verify-full" || sslMode === "verify-ca";
    options.ssl = {
      servername: hostname,
      rejectUnauthorized: strict,
    };
  }

  console.log(
    `[db:apply] Resolved ${hostname} → ${ipv4} (IPv4) for GitHub Actions / IPv6-restricted networks.`
  );

  return { url: raw, options };
}

async function main() {
  const { url: pgUrl, options } = await connectionUrlAndOptions(url);
  const sql = postgres(pgUrl, options);
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
