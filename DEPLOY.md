# Deploy Card Pilot (Vercel + Git push)

Do these in order. All commands from the project root: `"Card Pilot"`.

**Before pushing:** Run `npm run check` (lint + build) locally. To test like production: `npm run build && npm run start` then open http://localhost:3000.

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

**Make sure PRs and main redeploy Vercel**

- With the project **connected to GitHub** (imported in step 2), Vercel automatically:
  - **Production:** redeploys when you push (or merge a PR) to the **Production Branch** (e.g. `main`).
  - **Preview:** creates a preview deployment for every push to any branch, including branches that have an open PR.
- To confirm: Vercel → your project → **Settings → Git** → check **Production Branch** (e.g. `main`) and that **Vercel for GitHub** is connected. No code change is required; re-deploys are triggered by Git events.

---

## 4. After first deploy

1. In Vercel → Project → **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_APP_URL` = `https://card-pilot.vercel.app`
   - `EBAY_REDIRECT_URI` = `https://card-pilot.vercel.app/api/auth/ebay/callback`
2. In **eBay Developer Portal** → your app → OAuth / RuName, add this redirect URI:  
   `https://card-pilot.vercel.app/api/auth/ebay/callback`
3. (Optional) Run DB migrations if needed:  
   `DATABASE_URL=your_supabase_url npm run db:push`

---

## Vercel MCP in Cursor

Vercel MCP is configured in `.cursor/mcp.json`. After adding it, Cursor may show “Needs login” for Vercel; use that to authorize. You can then use Vercel MCP to list projects, inspect deployments, and view logs. Creating new deployments is still done via CLI or Git push as above.
