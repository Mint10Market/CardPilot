# Security

## Verify `.env.local` is not tracked

**Before pushing:**

1. **Don’t force-add it:** Never run `git add -f .env.local`; that would commit secrets.
2. **Confirm nothing secret is staged:** Run `git status` and ensure `.env.local` never appears under “Changes to be committed”.
3. **Optional check:** Run `npm run verify:secrets` (or manually: `git check-ignore -v .env.local` and `git ls-files .env.local`). The script ensures `.env.local` is ignored, not tracked, and not staged.

## If `.env.local` or any secrets were committed

**`.env.local` must never be committed.** It is listed in `.gitignore` (`.env*` and `.env*.local`). If it or any file containing real database passwords, eBay OAuth credentials, webhook tokens, session secrets, or Vercel OIDC tokens was ever committed, **treat all those secrets as compromised**.

**Rotate all exposed secrets immediately:**

1. **Database:** Supabase → Project Settings → Database → Reset database password. Update `DATABASE_URL` in Vercel, Trigger.dev, and local `.env.local`.
2. **eBay:** In the eBay Developer Portal, regenerate OAuth client credentials and set a new account-deletion webhook verification token. Update `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, and `EBAY_WEBHOOK_VERIFICATION_TOKEN` everywhere.
3. **Session:** Generate a new long random string (e.g. `openssl rand -hex 32`) and set `SESSION_SECRET` everywhere.
4. **Scheduled jobs:** Set a new `CRON_SECRET` in Vercel and in Trigger.dev (Environment Variables). Redeploy Trigger.dev tasks if needed.
5. **Remove secrets from git history** if the repo is shared or public (e.g. BFG Repo-Cleaner or `git filter-repo` to remove the file from history). Anyone who cloned the repo before the fix must treat credentials as compromised; rotating is still required.
6. **Never commit** `.env.local` or real values in `.env.example`. Use placeholders only in `.env.example`; keep real values only in env vars (Vercel, Trigger.dev) or local `.env.local` (gitignored).
