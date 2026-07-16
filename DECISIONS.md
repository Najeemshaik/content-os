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

## Phases 2–7 (workspace, calendar, banks, series, review, polish)

- **Workspace state is local-first**: one editable state object, all writes funnel through a `patch()` helper — text fields debounce 500ms, selects/date save immediately, everything flushes on blur/unmount/beforeunload. Failed saves re-queue their fields and retry on the next edit.
- **Revision restore returns the restored fields from the action** and applies them to local state directly — prop-based resync would fight the autosave and remount the editor mid-typing.
- **Snapshot triggers**: idle 60s after script/hook changes (client timer → `createSnapshot`), on every stage advance, and before every restore. Status changes via the header *select* don't snapshot — only the advance button does (the select is a correction tool).
- **5× flagging uses a leave-one-out average**: each video is compared against the average of the *other* videos in the rolling window. Including a breakout video in its own baseline made flagging mathematically impossible with a small window (e.g. 3 published: v ≥ 5·(v+rest)/3 has no solution).
- **Templatize marks the outlier `templatized` when the structure is actually created**, not when the form opens — cancelling leaves the outlier untouched (tightens the PRD's letter to its intent).
- **"Use in new video"** derives the video type from the structure category (educational→teach, storytelling→story, else take).
- **Next episode type** = the type of the series' latest episode, falling back to `story` (series types daily/progress/lesson/custom aren't video types).
- **Calendar tray excludes published videos** — nothing to schedule after publishing; statuses rank production > scripted > idea.
- **Day-peek quick-add defaults its type to the day's rhythm slot.**
- **Rhythm editor is one slot per weekday** (select take/teach/story/rest) — the schema still allows multiples, the UI keeps the default shape.
- **Deletes detach, never cascade** (except revisions): deleting a structure/series nulls references so videos keep their scripts and episodes become standalone.
- **Import validates the envelope with zod and trusts the DB schema for row shapes** — everything runs in one transaction, so a bad file rolls back completely.
- **⌘K capture closes on Enter** (capture-and-go under 5s); the toast carries an "Open" action for immediate scripting.
- **Spark uses `Math.random()` client-side only** — pure combinatorics from the PRD's static lists, deduped, 3×3 grid, shuffleable.
- **Base UI quirk**: `SelectValue` renders the raw value, not the item label — triggers render their own labels where they differ.
- **shadcn's CommandDialog no longer wraps children in `<Command>`** — pickers must include it themselves.

## UX refinement pass

- **Cards carry a type-colored left accent bar + colored uppercase micro-label** instead of pill badges — the board scans by color at a glance. Added a `--text-2xs` (11px) type token for micro-labels rather than hardcoding sizes.
- **Content widths are capped** via container tokens (`--container-8xl/9xl`): board and calendar at 9xl, tables at 7xl — cards stop stretching into unscannable strips on wide monitors.
- **Workspace meta moved from a scattered header row into a "Details" panel** (type/status/series/date/archive) in the right column; the header keeps only back · save state · the one primary action. Title and script auto-grow via `field-sizing-content`.
- **Capture got a visible affordance**: a "Capture idea ⌘K" button at the top of the sidebar dispatches a `content-os:capture` event that the global overlay listens for.
- **Stage columns have icons** (idea/scripted/production/published) and dashed ghost empty states; quick-add renders as a ghost card that solidifies on focus.
- **Calendar week view gained a weekday header row** (with a "Today" marker and tinted today column); cells fill the viewport height.
- **Filters are a connected segmented control** with type dots (ToggleGroup `spacing={0}`).
