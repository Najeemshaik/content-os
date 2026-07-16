# Content OS

A content operating system for a solo creator — idea capture → scripting → scheduling → production → review, for shorts and long-form. Runs locally against a file database with zero setup, or deployed (Vercel + Turso) with password login and PWA install for phone access. See `prd.md` for the full spec and `DECISIONS.md` for judgment calls made during the build.

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No environment variables needed — with none set, data lives in `./data/content.db` (gitignored, auto-created, starts empty) and there is no login.

**Back up** by copying the `data/` directory, or use Settings → Export JSON (Import restores a snapshot, replacing current data).

## Deploy (Vercel + Turso)

1. **Database** — create a Turso database and grab its credentials:

   ```bash
   turso db create content-os
   turso db show content-os --url      # → TURSO_DATABASE_URL
   turso db tokens create content-os   # → TURSO_AUTH_TOKEN
   ```

2. **Environment variables** (Vercel → Project → Settings → Environment Variables, or `vercel env add`): see `.env.example` — set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `APP_PASSWORD`, and `AUTH_SECRET` (`openssl rand -hex 32`).

3. **Deploy** — `vercel` from the repo root (or connect the repo in the Vercel dashboard). Migrations apply automatically on first request; the same is true for every future migration.

4. **Phone** — open the deployed URL, sign in, then Share → **Add to Home Screen**. It installs as a full-screen PWA.

To move existing local data to the cloud: Settings → Export JSON locally, then Import on the deployed app.

## Development

- `pnpm lint` / `pnpm typecheck` — checks
- `pnpm db:generate` — generate a migration after editing `lib/db/schema.ts` (migrations apply automatically at startup)
- `pnpm db:studio` — browse the local DB with Drizzle Studio

## Stack

Next.js 16 (App Router, Server Actions, proxy auth) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · SQLite via libSQL/Turso + Drizzle ORM · dnd-kit · date-fns · zod
