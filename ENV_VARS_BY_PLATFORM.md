# Environment Variables by Platform

Use this as a checklist. Production app URL: `https://card-pilot.vercel.app`.

---

## Supabase

You **don’t add** Card Pilot env vars into Supabase. Supabase is the database.

- **Get from Supabase:** In the Supabase dashboard go to **Project Settings → Database**. Copy the **Connection string (URI)** and use it as `DATABASE_URL` in **Vercel** and **Trigger.dev** (below).
- If your Supabase project has a **Vault** or **Secrets** section, you only put Supabase’s own secrets there (e.g. for Edge Functions). Your Next.js app’s secrets live in Vercel and Trigger.dev.

---

## Vercel (Next.js app – required)

Add these in **Vercel → Your Project → Settings → Environment Variables**. Apply to **Production**, **Preview**, and **Development** as needed.

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | Local/direct: `...@db.[PROJECT_REF].supabase.co:5432/postgres`. Vercel: use Shared Pooler (port **6543**) from Supabase Connect panel to avoid ENOTFOUND. |
| `EBAY_CLIENT_ID` | Your eBay app Client ID |
| `EBAY_CLIENT_SECRET` | Your eBay app Client Secret |
| `EBAY_REDIRECT_URI` | `https://card-pilot.vercel.app/api/auth/ebay/callback` |
| `EBAY_ENVIRONMENT` | `production` (or `sandbox` for testing) |
| `EBAY_WEBHOOK_VERIFICATION_TOKEN` | Your 32–80 char webhook verification token |
| `NEXT_PUBLIC_APP_URL` | `https://card-pilot.vercel.app` |
| `SESSION_SECRET` | A long random string (min 32 chars) for signing sessions |

---

## Trigger.dev (background jobs)

Add these in **Trigger.dev → Your Project → Environment Variables** (or per-environment). Workers need DB access and, if they call eBay (e.g. sync or show refresh), the eBay keys.

| Variable | Example / notes |
|----------|------------------|
| `DATABASE_URL` | Same PostgreSQL connection string as in Vercel (from Supabase) |
| `EBAY_CLIENT_ID` | Same as Vercel (if jobs call eBay APIs) |
| `EBAY_CLIENT_SECRET` | Same as Vercel (if jobs call eBay APIs) |
| `EBAY_ENVIRONMENT` | `production` (or `sandbox`) – same as Vercel |

You do **not** need to add these to Trigger.dev unless your jobs use them:

- `EBAY_REDIRECT_URI` – only for browser OAuth (runs on Vercel).
- `EBAY_WEBHOOK_VERIFICATION_TOKEN` – only for the webhook endpoint (runs on Vercel).
- `NEXT_PUBLIC_APP_URL` – only for the frontend/API on Vercel.
- `SESSION_SECRET` – only for the web app on Vercel.

---

## Quick copy-paste (Vercel)

Use your real values; this is the shape. For `DATABASE_URL` on Vercel use the **Shared Pooler** URI (port **6543**) from Supabase Connect, not the direct URI (5432).

```
DATABASE_URL=postgresql://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_REDIRECT_URI=https://card-pilot.vercel.app/api/auth/ebay/callback
EBAY_ENVIRONMENT=production
EBAY_WEBHOOK_VERIFICATION_TOKEN=your_webhook_token
NEXT_PUBLIC_APP_URL=https://card-pilot.vercel.app
SESSION_SECRET=your_session_secret_min_32_chars
```

---

## Quick copy-paste (Trigger.dev)

Use direct (5432) or pooler (6543) per Supabase/Trigger.dev docs:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
EBAY_CLIENT_ID=your_ebay_client_id
EBAY_CLIENT_SECRET=your_ebay_client_secret
EBAY_ENVIRONMENT=production
```
