# Card Pilot - Agent Instructions

## Cursor Cloud specific instructions

### Services

- **Next.js app** (port 3000): `DATABASE_URL="postgresql://cardpilot:cardpilot@127.0.0.1:5432/cardpilot" npm run dev`
- **PostgreSQL** (port 5432): local Postgres 16 with database `cardpilot`, user `cardpilot`, password `cardpilot`

### Important caveats

- **DATABASE_URL override**: A system-level `DATABASE_URL` env var is injected that points to an external (unreachable IPv6) host. Next.js `.env.local` files do **not** override existing process env vars, so you **must** prefix the dev server command with the local `DATABASE_URL`. Similarly, prefix `npm run db:push` (drizzle-kit) with the local `DATABASE_URL`.
- **drizzle-kit** does not read `.env.local` (that's a Next.js convention). A `.env` file exists with the local `DATABASE_URL` for drizzle-kit, but it is also overridden by the system env var. Always pass `DATABASE_URL` explicitly: `DATABASE_URL="postgresql://cardpilot:cardpilot@127.0.0.1:5432/cardpilot" npm run db:push`
- **PostgreSQL must be started** before running the dev server: `sudo pg_ctlcluster 16 main start`
- **Authentication** is eBay OAuth only. Pages like `/shows`, `/dashboard`, `/customers`, etc. require an authenticated session. Without real eBay credentials, you can still test API routes directly (e.g. `curl http://localhost:3000/api/shows`).
- **Seeding card shows**: `curl -X POST http://localhost:3000/api/shows/refresh` populates 3 seed card shows.

### Standard commands

See `package.json` scripts and `README.md` for full reference:
- Lint: `npm run lint`
- Build: `npm run build`
- Dev: `DATABASE_URL="postgresql://cardpilot:cardpilot@127.0.0.1:5432/cardpilot" npm run dev`
- Schema push: `DATABASE_URL="postgresql://cardpilot:cardpilot@127.0.0.1:5432/cardpilot" npm run db:push`
