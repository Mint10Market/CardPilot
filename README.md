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
   - Add OAuth redirect URI: `http://localhost:3000/api/auth/ebay/callback` (local) and `https://card-pilot.vercel.app/api/auth/ebay/callback` (production).
   - Set **EBAY_CLIENT_ID**, **EBAY_CLIENT_SECRET**, **EBAY_REDIRECT_URI**, **EBAY_ENVIRONMENT** (e.g. `sandbox`) in `.env.local`.
   - For Marketplace Account Deletion: set **EBAY_WEBHOOK_VERIFICATION_TOKEN** (32–80 chars) and register the webhook URL in the portal (Alerts and Notifications).

4. **Session**

   Set **SESSION_SECRET** in `.env.local` (at least 32 characters).

5. **App URL**

   Set **NEXT_PUBLIC_APP_URL** (e.g. `http://localhost:3000` for local; production: `https://card-pilot.vercel.app`).

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

Open [http://localhost:3000](http://localhost:3000) (local) or [https://card-pilot.vercel.app](https://card-pilot.vercel.app) (production). Click **Connect with eBay** to sign in. After connecting, use **Sync from eBay** on the dashboard to pull orders and customers.

### OneDrive / cloud-synced folders

If the project lives in OneDrive (or iCloud, Dropbox, etc.), `npm run lint` and `npm run build` can hit `ETIMEDOUT` because the sync layer slows disk reads. Fix: keep the repo in the cloud folder but put **node_modules** on local disk via a symlink (`.next` stays in the project so the build works):

```bash
chmod +x scripts/setup-local-symlinks.sh
./scripts/setup-local-symlinks.sh
npm install
npm run lint
npm run build
```

This links `node_modules` to `~/.local-dev/card-pilot/node_modules` so dependency I/O is local; your source and `.next` stay in OneDrive.

## Card shows data

Card shows are stored in the `card_shows` table and populated by `/api/shows/refresh` from one or more **show source adapters** in `src/lib/show-sources/`:

- `json-feed` — optional adapter that reads from `CARD_SHOWS_FEED_URL` (a JSON array of shows you host).
- `static` — seed data for local/dev (a few example Texas shows).

### JSON feed (recommended)

Set **CARD_SHOWS_FEED_URL** in `.env.local` (and in Vercel env for production) to point at a JSON feed:

```bash
CARD_SHOWS_FEED_URL=https://your-domain.com/card-shows.json
```

Expected JSON shape (example):

```json
[
  {
    "id": "dallas-2026-07-14",
    "name": "Dallas Card Show",
    "startDate": "2026-07-14T09:00:00Z",
    "endDate": "2026-07-14T17:00:00Z",
    "venue": "Dallas Convention Center",
    "address": "123 Main St",
    "city": "Dallas",
    "state": "TX",
    "country": "US",
    "buyerEntryCost": "$5",
    "vendorBoothCost": "$150",
    "organizerName": "Dallas Card Events",
    "organizerEmail": "info@dallascardevents.com",
    "organizerPhone": "555-123-4567",
    "vendorCount": 120
  }
]
```

Only `id`, `name`, and `startDate` are strictly required; other fields improve the detail view and filters.

### Refreshing shows

To refresh shows manually (and aggregate from all configured adapters), call `/api/shows/refresh` with **CRON_SECRET**:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/shows/refresh
```

In production run this periodically via **Trigger.dev** (recommended, free tier) or an external cron (see below).

## Scheduled jobs (Trigger.dev — free, no Vercel Pro)

Vercel Cron is not available on Hobby. This project uses **[Trigger.dev](https://trigger.dev)** (free tier: 10 schedules) to run:

- **eBay sync** — daily at midnight UTC: `POST /api/sync/scheduled` (syncs last 90 days for all users).
- **Card shows refresh** — every hour: `POST /api/shows/refresh`.

### One-time Trigger.dev setup

1. Sign up at [trigger.dev](https://trigger.dev) and create a project. Copy your **project ref** (e.g. `proj_xxxx`).
2. In the project root, set the ref:  
   `trigger.config.ts` has `project: process.env.TRIGGER_PROJECT_REF ?? "proj_card-pilot"` — either set env **TRIGGER_PROJECT_REF** or replace the default with your ref.
3. In Trigger.dev dashboard → your project → **Environment Variables**, add:
   - **APP_URL** = `https://card-pilot.vercel.app` (your Vercel app URL)
   - **CRON_SECRET** = same long random string as in Vercel (so the API accepts the request)
4. Deploy tasks:  
   `npm run trigger:deploy`  
   (or `npx trigger.dev@latest deploy`). Schedules sync automatically from the `trigger/` folder.

See `DEPLOY.md` for more detail. To run schedules locally: `npm run trigger:dev`.

### Alternative: external cron (free)

If you prefer not to use Trigger.dev, use a free external cron (e.g. [cron-job.org](https://cron-job.org)):

- **eBay sync:** daily, POST `https://your-app.vercel.app/api/sync/scheduled` with header `Authorization: Bearer YOUR_CRON_SECRET`.
- **Shows refresh:** hourly, POST `https://your-app.vercel.app/api/shows/refresh` with the same header.

Keep **CRON_SECRET** set in Vercel so the routes accept these requests.

## Run checks before push

Before committing or pushing, run:

```bash
npm run check
```

This runs `next lint` and `next build` so you catch lint and build failures locally. For full checks including unit tests:

```bash
npm run check:full
```

To test like production locally: `npm run build && npm run start`, then open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — Next.js ESLint
- `npm run check` — lint + build (run before push)
- `npm run check:full` — check + unit tests
- `npm run test` — run unit tests (Vitest)
- `npm run test:watch` — run tests in watch mode
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:push` — push schema to database
- `npm run db:migrate` — run migrations (uses `DATABASE_URL` from `.env.local`). If you use Supabase and migrate fails locally, run `scripts/run-migration-0003.sql` in Supabase → SQL Editor instead.

## Environment variables

See `.env.example` for all required and optional variables.
