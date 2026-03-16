# Keeping Vercel, Supabase, GitHub, and Cursor in sync

This is the single place to understand how everything stays aligned. **Goal:** Cursor handles all technical changes (migrations, code, deploy); you only do a one-time setup below.

---

## One-time setup so Cursor can manage the production database

1. **Vercel** → Your project → **Settings → Environment Variables**. Copy the **Production** value of `DATABASE_URL` (the Supabase pooler URL, port 6543).
2. **This repo** → In the project root, open or create `.env.local`. Set:
   ```bash
   DATABASE_URL=paste_the_same_url_here
   ```
   Use the **exact same** URL as in Vercel. `.env.local` is gitignored and never committed.
3. After that, when you say **"run the migrations"** or **"sync the database"**, Cursor will run `npm run db:migrate` and it will apply to the **same** database Vercel uses. No further technical steps from you.

---

## What lives where

| System      | Role |
|------------|------|
| **GitHub** | Source of code. Push to `main` triggers Vercel deploy. |
| **Vercel** | Hosts the app. Needs env vars below; gets code from GitHub. |
| **Supabase** | Database only. No Card Pilot env vars go in Supabase; you only get `DATABASE_URL` from Supabase and put it in Vercel (and in `.env.local` for Cursor). |
| **Cursor** | Runs migrations (using `.env.local`’s `DATABASE_URL`), edits code, commits and pushes. After the one-time step above, Cursor keeps the DB in sync. |

---

## Vercel environment variables (must be set)

Ensure these exist in **Vercel → Project → Settings → Environment Variables** for **Production** (and Preview if you use it):

| Variable | Purpose |
|----------|----------|
| `DATABASE_URL` | Supabase **pooler** URI (port 6543). Same value as in `.env.local` for Cursor. |
| `SESSION_SECRET` | At least 32 characters. Required for guest sign-in and eBay callback. |
| `NEXT_PUBLIC_APP_URL` | e.g. `https://card-pilot.vercel.app` |
| `EBAY_REDIRECT_URI` | e.g. `https://card-pilot.vercel.app/api/auth/ebay/callback` |
| `EBAY_CLIENT_ID` | From eBay Developer Portal |
| `EBAY_CLIENT_SECRET` | From eBay Developer Portal |
| `EBAY_ENVIRONMENT` | `production` or `sandbox` |
| `EBAY_WEBHOOK_VERIFICATION_TOKEN` | 32–80 chars for webhooks |

See **ENV_VARS_BY_PLATFORM.md** for full list and copy-paste shapes.

---

## Database migrations

- Migrations live in the repo under **`drizzle/`** (e.g. `0005_users_optional_ebay_display_name.sql`).
- **Applying migrations:** Cursor runs `npm run db:migrate` (uses `DATABASE_URL` from `.env.local`). So long as `.env.local` matches Vercel’s `DATABASE_URL`, the production DB stays in sync.
- **Checking:** Run `npm run align:check` to verify migration 0005 (guest sign-in) is applied.
- **If Drizzle journal is out of sync:** Run `node scripts/apply-migration-0005.mjs` to apply the 0005 SQL directly to the DB (uses `.env.local`’s `DATABASE_URL`). Then run `npm run align:check` again.

---

## Quick verification

From the project root:

```bash
npm run align:check
```

This checks whether the database pointed to by `.env.local` has migration 0005 applied and reminds you of the Vercel env checklist. If you see "Migration 0005 is NOT applied", either run `npm run db:migrate` (or ask Cursor to "run the migrations") or ensure `.env.local`’s `DATABASE_URL` is the same as Vercel’s.

---

## Summary

- **One-time:** Set `DATABASE_URL` in `.env.local` to the same value as Vercel’s Production `DATABASE_URL`.
- **Ongoing:** Cursor handles code changes, migrations, and push; Vercel deploys from GitHub. You don’t need to run migrations or deploy manually.
