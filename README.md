# Card Pilot

**By Mint 10 Market** — All-in-one CRM, inventory, sales/profit, and card show tracker for TCG and sports card sellers.

## Features

- **eBay integration**: Sign in with eBay (OAuth). Sync orders and derive customers. Marketplace Account Deletion webhook for compliance.
- **CRM**: Customers from eBay buyers and manual entries; list, search, and detail with linked orders.
- **Inventory**: Manual items and CSV import; ready for eBay inventory sync.
- **Sales & profit**: eBay orders plus manual sales (e.g. card shows); date filters and CSV export.
- **Card shows**: Multi-source aggregator with deduplication and credibility; hot/cold meter and vendor count. List and detail (when/where, host, booth info).

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- PostgreSQL (Drizzle ORM) — use Supabase, Neon, or any Postgres
- eBay OAuth 2.0 and Sell APIs

## Setup

1. **Clone and install**

   ```bash
   cd "Card Pilot"
   npm install
   ```

2. **Database**

   Create a PostgreSQL database and run migrations:

   ```bash
   cp .env.example .env.local
   # Edit .env.local and set DATABASE_URL
   npm run db:push
   ```

3. **eBay Developer**

   - Create an app at [eBay Developer Portal](https://developer.ebay.com/).
   - Add OAuth redirect URI: `http://localhost:3000/api/auth/ebay/callback` (and your production URL).
   - Set **EBAY_CLIENT_ID**, **EBAY_CLIENT_SECRET**, **EBAY_REDIRECT_URI**, **EBAY_ENVIRONMENT** (e.g. `sandbox`) in `.env.local`.
   - For Marketplace Account Deletion: set **EBAY_WEBHOOK_VERIFICATION_TOKEN** (32–80 chars) and register the webhook URL in the portal (Alerts and Notifications).

4. **Session**

   Set **SESSION_SECRET** in `.env.local` (at least 32 characters).

5. **App URL**

   Set **NEXT_PUBLIC_APP_URL** (e.g. `http://localhost:3000` for local).

## Deploy (Vercel)

See **[DEPLOY.md](DEPLOY.md)** for the full runbook. Summary:

1. **One-time:** In a terminal, run `npx vercel login` and `npx vercel link --yes` in this directory.
2. **Push (optional):** Add a Git remote (e.g. GitHub) and `git push origin main` so Vercel can auto-deploy from Git.
3. **Deploy:** Run `./scripts/deploy.sh` or `npx vercel --prod`. Or use a [Vercel token](https://vercel.com/account/tokens): `VERCEL_TOKEN=xxx ./scripts/deploy.sh`.

Vercel MCP is configured in `.cursor/mcp.json`; after Cursor reload and Vercel login in MCP, you can list projects and inspect deployments from Cursor.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Connect with eBay** to sign in. After connecting, use **Sync from eBay** on the dashboard to pull orders and customers.

## Card shows data

To load seed shows, call:

```bash
curl -X POST http://localhost:3000/api/shows/refresh
```

In production, run this periodically (cron) or add more source adapters in `src/lib/show-sources/`.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:push` — push schema to database
- `npm run db:migrate` — run migrations

## Environment variables

See `.env.example` for all required and optional variables.
