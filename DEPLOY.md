# Deploy Card Pilot (Vercel + Git push)

Do these in order. All commands from the project root: `"Card Pilot"`.

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

For **non-interactive** (CI or no browser): set `VERCEL_TOKEN` from [vercel.com/account/tokens](https://vercel.com/account/tokens), then:

```bash
VERCEL_TOKEN=xxx ./scripts/do-it-all.sh https://github.com/USER/REPO.git
```

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

Use the URL it prints (e.g. `https://card-pilot-xxx.vercel.app`).

**Option B – Deploy from Vercel (after push)**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard).
2. **Add New → Project** and import the GitHub repo you pushed in step 2.
3. Add the same env vars you use in Supabase/Trigger (see `ENV_VARS_BY_PLATFORM.md`).
4. Deploy. Future pushes to `main` will auto-deploy.

---

## 4. After first deploy

1. In Vercel → Project → **Settings → Environment Variables**, set:
   - `NEXT_PUBLIC_APP_URL` = your live URL (e.g. `https://card-pilot-xxx.vercel.app`)
   - `EBAY_REDIRECT_URI` = `https://YOUR_VERCEL_APP_URL/api/auth/ebay/callback`
2. In **eBay Developer Portal** → your app → OAuth / RuName, add this redirect URI:  
   `https://YOUR_VERCEL_APP_URL/api/auth/ebay/callback`
3. (Optional) Run DB migrations if needed:  
   `DATABASE_URL=your_supabase_url npm run db:push`

---

## Vercel MCP in Cursor

Vercel MCP is configured in `.cursor/mcp.json`. After adding it, Cursor may show “Needs login” for Vercel; use that to authorize. You can then use Vercel MCP to list projects, inspect deployments, and view logs. Creating new deployments is still done via CLI or Git push as above.
