# Security

## If credentials were ever committed

If `.env.example`, `.env.local`, or any file containing real credentials was committed to version control:

1. **Rotate all exposed credentials immediately:**
   - **Supabase:** Change the database password (Project Settings → Database → Reset database password), then update `DATABASE_URL` in Vercel, Trigger.dev, and local `.env.local`.
   - **eBay:** In the eBay Developer Portal, regenerate or create new OAuth client credentials and update the account-deletion webhook verification token. Update `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, and `EBAY_WEBHOOK_VERIFICATION_TOKEN` everywhere.
   - **Session:** Generate a new long random string and set it as `SESSION_SECRET` everywhere.

2. **Remove secrets from git history** if the repo is shared or public (e.g. `git filter-branch` or BFG Repo-Cleaner to rewrite history and remove the sensitive files or their content from past commits). Prefer creating new credentials over rewriting history if the repo is already cloned by others.

3. **Never commit** `.env.local` or real values in `.env.example`. Use placeholders only in `.env.example` and keep real values in environment variables (Vercel, Trigger.dev) or local `.env.local` (which is gitignored).
