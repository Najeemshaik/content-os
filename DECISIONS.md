# Decisions

Judgment calls made while building, per the PRD's instruction to decide and log rather than ask.

## Phase 0 — Scaffold

- **Full Drizzle schema defined up front** (all 7 tables in one initial migration) — later phases add features, never migrations churn.
- **ESLint over Biome** at scaffold. `next lint` is removed in Next 16, so scripts are `eslint .` and `next typegen && tsc --noEmit`.
- **shadcn 4.x with Base UI primitives** (the CLI's current default, `base-nova` preset) rather than the legacy Radix line; composition uses `render` props instead of `asChild`.
- **sonner for toasts** — shadcn's `toast` component is deprecated.
- **Runtime `migrate()` + seed at first DB import** (synchronous with better-sqlite3) instead of a CLI migrate step — zero-setup first run per PRD §6. `drizzle-kit push` is banned; migrations are the record.
- **Timestamps stored as raw ms numbers** (Drizzle `mode: "number"`), matching PRD "integer timestamps (ms)"; formatted with date-fns at render.
- **`rhythm_slots.weekday` uses 0 = Sunday** (JS `Date#getDay()` parity); display order starts Monday via date-fns `weekStartsOn: 1`.
- **`settings` uses `key` as primary key** (no surrogate id) — it's a key/value table.
- **Seed templates stored with newlines** between beats instead of the PRD's inline "/" separators — pastes cleanly into the script editor.
- **Seed structure categories**: Take → `other`, Teach → `educational`, Story → `storytelling` (PRD lists "storytelling/other" for Take; single value required).
- **Tailwind's default `--spacing` kept** — redefining it to 8px would silently break shadcn component sizing; the 8px grid is enforced by using even spacing steps.
- **Type hues are placeholders** (take = warm ember, teach = blue, story = violet, oklch) — art-direct by editing only `:root`/`.dark` in `globals.css`.
- **Slim custom sidebar** instead of shadcn's sidebar block — 6 nav items don't need collapsing machinery; calmer and fully token-driven. Mobile gets a top nav bar.
- **React Compiler declined** at scaffold (default).
- **`prd.md` temporarily moved out** during `create-next-app` (its non-empty-directory whitelist doesn't cover it), restored after.
- **pnpm 10 risk noted**: current pnpm 9 runs better-sqlite3's native install script; pnpm 10 blocks lifecycle scripts by default (would need `pnpm approve-builds`). See README.

## Phase 1 — Pipeline + capture

- **Client board state is authoritative in-session**; server actions persist in the background with snapshot-revert + toast on failure. No `useOptimistic` — avoids a router refresh clobbering state mid-drag.
- **Client-generated UUIDs** passed into `createVideo` so the optimistic card and the persisted row share identity.
- **Fractional `sort_order`** (reals; seeds gapped 1000, drops take the midpoint of neighbors). Renormalization deferred to the Phase 7 perf pass (~50 bisections of headroom per gap).
- **Column counts reflect the filtered view**, not the full column.
- **Drag while filtered is allowed**; the drop position is computed between *visible* neighbors, so the card may interleave with hidden cards — acceptable for v1.
- **This Week slot fill rule**: a slot is filled by a video scheduled on its date whose type matches the slot, falling back to any video scheduled that day.
- **Card click vs. drag**: PointerSensor `distance: 6` activation + a just-dragged guard lets plain clicks open the workspace; the card title is a real link for keyboard users (keydown stops propagation so Enter doesn't lift the card).
- **⌘K quick-capture palette + Spark panel ship with Phase 2**, where the PRD's phase list places them; Phase 1's capture is the Idea-column quick-add.
- **Pages that read the DB set `dynamic = "force-dynamic"`** so nothing is frozen at build time.
