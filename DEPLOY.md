# Deploy Card Pilot (Vercel + Git push)

Do these in order. All commands from the project root: `"Card Pilot"`.

**Before pushing:** Run `npm run check` (lint + build) locally. Optionally run `npm run verify:secrets` (see SECURITY.md). To test like production: `npm run build && npm run start` then open http://localhost:3000.

**Keeping Vercel, Supabase, GitHub, and Cursor in sync:** See **ALIGNMENT.md**. In short: set `DATABASE_URL` in `.env.local` to the same value as Vercel Production; then Cursor can run migrations and keep the DB aligned. Run `npm run align:check` to verify.

---

## Do it all in one go (after one-time setup)

Once you have:

1. Run **once**: `npx vercel login` (and optionally `npx vercel link --yes` in this folder).
2. Created a GitHub repo (or set `GITHUB_TOKEN` to create it via API).

Run:

```bash
cd "/Users/alex/Library/CloudStorage/OneDrive-TellumIT/Card Pilot"
# With repo URL (if you created the repo manually):
./scripts/do-it-all.sh https://github.com/YOUR_USERNAME/YOUR_REPO.git
# Or with GITHUB_TOKEN set (script will create repo from package.json name):
GITHUB_TOKEN=xxx ./scripts/do-it-all.sh
# Or deploy only (remote already set): just deploy:
./scripts/do-it-all.sh
```

For **non-interactive** (CI or no browser): set `VERCEL_TOKEN` and optionally `GITHUB_TOKEN`, then run the script (see below).

---

## Where to get tokens (and where to put them)

### Vercel token

- **Get it:** Go to [vercel.com/account/tokens](https://vercel.com/account/tokens) → **Create** → name it (e.g. “Card Pilot deploy”) → copy the token. You won’t see it again.
- **Put it:** Only in your environment when you run the script. **Do not** commit it or add it to `.env.example`.

  **Option A – In the same command (recommended):**
  ```bash
  VERCEL_TOKEN=your_token_here ./scripts/do-it-all.sh https://github.com/USER/REPO.git
  ```

  **Option B – In your shell for the session:**
  ```bash
  export VERCEL_TOKEN=your_token_here
  ./scripts/do-it-all.sh https://github.com/USER/REPO.git
  ```

  **Option C – In `.env.local` (only if you want the script to read it):**  
  Add `VERCEL_TOKEN=your_token_here` to `.env.local`. The script does **not** load `.env.local` by default; you’d need to run `source .env.local` (or use `dotenv`/`env-cmd`) before the script. Easiest is Option A or B.

### GitHub token (optional – only if you want the script to create the repo for you)

- **Get it:** [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens) → **Generate new token (classic)** → enable scope **`repo`** → generate and copy the token.
- **Put it:** Same as Vercel – only in the environment when you run the script, never in a file you commit.

  ```bash
  GITHUB_TOKEN=your_github_token ./scripts/do-it-all.sh
  ```

  If you create the repo manually at [github.com/new](https://github.com/new), you don’t need a GitHub token; just pass the repo URL:  
  `./scripts/do-it-all.sh https://github.com/YOUR_USERNAME/card-pilot.git`

---

## 1. One-time: Vercel login and link

In a terminal (outside Cursor sandbox):

```bash
cd "/Users/alex/Library/CloudStorage/OneDrive-TellumIT/Card Pilot"
npx vercel login
npx vercel link --yes
```

- `vercel login` opens the browser; sign in to Vercel.
- `vercel link` links this folder to a Vercel project (create new or pick existing).

---

## 2. Add Git remote and push (so Vercel can deploy from Git)

If you use **GitHub**:

1. Create a new repo at [github.com/new](https://github.com/new) (e.g. `card-pilot`), **do not** add a README or .gitignore.
2. Run (replace `YOUR_USERNAME` and `YOUR_REPO`):

```bash
cd "/Users/alex/Library/CloudStorage/OneDrive-TellumIT/Card Pilot"
./scripts/set-remote-and-push.sh https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

Or manually: `git remote add origin <url>` then `git push -u origin main`. If the repo already exists and has a different name/branch, use the URL it shows (e.g. `git@github.com:...`).

---

## 3. Deploy to production

**Option A – Deploy from CLI (no Git needed)**

```bash
cd "/Users/alex/Library/CloudStorage/OneDrive-TellumIT/Card Pilot"
npx vercel --prod
```

Use the URL it prints (e.g. `https://card-pilot.vercel.app`).

**Option B – Deploy from Vercel (after push)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Add New → Project** and import the GitHub repo you pushed in step 2.
3. Add the same env vars you use in Supabase/Trigger (see `ENV_VARS_BY_PLATFORM.md`).
4. Deploy. Future pushes to `main` will auto-deploy.

**If Git doesn’t trigger deployments**

- Add a **Deploy Hook**: Vercel → project → **Settings → Git** → **Deploy Hooks** → Create (e.g. name “main”, branch `main`) → copy the URL. In GitHub → repo → **Settings → Secrets and variables → Actions** → New secret: name **VERCEL_DEPLOY_HOOK_URL**, value = that URL. Each push to `main` will then trigger a deploy via the workflow.

---

## 4. Scheduled jobs (Trigger.dev — free, replaces Vercel Cron)

Vercel Hobby does not support Cron. Use **Trigger.dev** (free tier) so eBay sync and shows refresh run on a schedule:

1. **Sign up:** [trigger.dev](https://trigger.dev) → create a project → copy your **project ref** (e.g. `proj_xxxx`).
2. **Config:** In `trigger.config.ts`, set `project` to your ref (or set env **TRIGGER_PROJECT_REF** when running the CLI).
3. **Env in Trigger.dev:** In the Trigger.dev dashboard → your project → **Environment Variables**, add:
   - **APP_URL** = your Vercel app URL (e.g. `https://card-pilot.vercel.app`)
   - **CRON_SECRET** = same value as in Vercel (the API routes require `Authorization: Bearer <CRON_SECRET>`)
4. **Deploy tasks:** From the project root run:
   ```bash
   npm run trigger:deploy
   ```
   Schedules are defined in `trigger/card-pilot-schedules.ts` (daily eBay sync, hourly shows refresh) and sync on deploy.

**Alternative:** Use a free external cron (e.g. [cron-job.org](https://cron-job.org)) to POST to `https://your-app.vercel.app/api/sync/scheduled` and `.../api/shows/refresh` with header `Authorization: Bearer YOUR_CRON_SECRET` on the desired schedule.

---

## 5. After first deploy

1. In Vercel → Project → **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_APP_URL` = `https://card-pilot.vercel.app`
   - `EBAY_REDIRECT_URI` = `https://card-pilot.vercel.app/api/auth/ebay/callback`
   - `SESSION_SECRET` = a long random string (**at least 32 characters**). Guest sign-in and eBay callback need this. Generate with: `openssl rand -hex 32`
2. In **eBay Developer Portal** → your app → OAuth / RuName, add this redirect URI:  
   `https://card-pilot.vercel.app/api/auth/ebay/callback`
3. (Optional) Run DB migrations if needed:  
   `DATABASE_URL=your_supabase_url npm run db:migrate`  
   (or `npm run db:push` if you use push). **Guest sign-in (“Continue without connecting”) requires migration `0005_users_optional_ebay_display_name.sql`**; without it, `/api/auth/guest` returns 500.

---

## Deployments show "Error" (build failing)

If Vercel lists deployments as **Error** (red), the build is failing. Deploys are triggered; the build step is what fails.

1. **Get the exact error**
   - In Vercel → **Deployments** → click one of the failed deployments (e.g. the latest red one).
   - Open the **Building** step (or **Logs**) and scroll to the bottom. You’ll see the failing command (e.g. `npm run build` / `next build`) and the error (e.g. TypeScript, missing file, or "middleware" deprecation).

2. **Common causes and fixes**
   - **TypeScript errors** (e.g. `Property 'finally' does not exist`, or type mismatches in collection/settings): ensure the branch that’s on `main` includes the TS fixes (Promise `.then` instead of `.finally`, `Partial<Settings>`, date serialization for Expense/Transaction edit pages).
   - **"middleware" deprecated / proxy**: Next.js 16 expects `src/proxy.ts` (export `proxy`), not `src/middleware.ts`. Ensure the repo has `proxy.ts` and no `middleware.ts` on the deployed branch.
   - **Missing env**: If the log says a secret or `DATABASE_URL` is missing, add it under Vercel → Project → **Settings → Environment Variables** for Production (and Preview if you use it).
   - **Database "Failed query" / "getaddrinfo ENOTFOUND db.xxx.supabase.co"**: Vercel cannot reach Supabase’s direct host. Use the **connection pooler** URL instead. In Supabase: open the **Connect** panel (click **Connect** on the project dashboard, or use the link in Database docs). Use the **Shared Pooler** URI (green “IPv4 COMPATIBLE” in Connect panel), not the Dedicated one—Vercel is IPv4-only and cannot resolve the direct/dedicated host. Copy that URI (host like `aws-0-<region>.pooler.supabase.com`, port **6543**), set as **`DATABASE_URL`** (or **`POSTGRES_URL`** or **`SUPABASE_DB_URL`**) in Vercel → **Settings → Environment Variables** for Production. Redeploy.
   - **Card shows refresh fails with "Failed query: insert into card_shows..."**: The production database is missing the `buyer_entry_cost` and `vendor_booth_cost` columns. Run the migration on the production DB: from the project root with `DATABASE_URL` set to your **production** connection string, run `npm run db:migrate` (or apply `drizzle/0004_card_shows_cost_columns.sql` manually in the SQL editor of your DB provider).

3. **After fixing**
   - Commit and push to `main` (or merge a PR into `main`). Vercel will create a new deployment; if the fix is correct, that deployment should turn **Ready** and become the new Production.

---

## Vercel MCP in Cursor

Vercel MCP is configured in `.cursor/mcp.json`. After adding it, Cursor may show “Needs login” for Vercel; use that to authorize. You can then use Vercel MCP to list projects, inspect deployments, and view logs. Creating new deployments is still done via CLI or Git push as above.

---

## Supabase and migrations from Cursor

**Option 1 – Drizzle CLI (recommended):** Put your Supabase **pooler** URL in `.env.local` as `DATABASE_URL` (same as in Vercel). Then you or the AI can run `npm run db:migrate` from the project root; it will apply all pending migrations in `drizzle/` to that database. Say e.g. "run the migrations" and the AI will run that command.

**Option 2 – Supabase MCP:** Supabase is added in `.cursor/mcp.json`. Restart Cursor, then go to **Settings → Tools & MCP** and authorize Supabase when prompted (browser login). The AI can then use Supabase tools to list tables, run SQL, or apply migration SQL from `drizzle/` via `execute_sql`. To limit access to one project, set the URL to `https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF` (get the ref from your Supabase dashboard URL or project Settings).
