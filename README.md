# Content OS

A local-first content operating system for a solo short-form creator. Single user, runs on localhost, owns all of its data on disk. See `prd.md` for the full spec and `DECISIONS.md` for judgment calls made during the build.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. No environment variables, no network calls at runtime.

## Where data lives

Everything is in `./data/content.db` (SQLite, WAL mode). The `data/` directory is gitignored and created automatically on first run; seed data loads only when the videos table is empty.

**Back up** by copying the `data/` directory (or, once Phase 7 lands, using Settings → Export).

## Development

- `pnpm lint` / `pnpm typecheck` — checks
- `pnpm db:generate` — generate a migration after editing `lib/db/schema.ts` (migrations apply automatically at startup)
- `pnpm db:studio` — browse the DB with Drizzle Studio

> **Note:** the project currently uses pnpm 9. pnpm 10+ blocks dependency lifecycle scripts by default, which breaks better-sqlite3's native install — if you upgrade, run `pnpm approve-builds` for `better-sqlite3`.

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript strict · Tailwind CSS v4 · shadcn/ui · SQLite via better-sqlite3 + Drizzle ORM · dnd-kit · date-fns · zod
