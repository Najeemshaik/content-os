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

## Format axis (shorts vs long-form) + clip wormhole

- **`format` is a second first-class axis mirroring `type`** — same enum-tuple pattern (`VIDEO_FORMATS` in `lib/types.ts`), same pipeline stages, same workspace. Two views, not two silos.
- **One `clip_of` self-FK covers both directions** of cross-format lineage: on a short it means "clipped from that long", on a long "expanded from that short". The UI labels by comparing formats; `double_down_of` stays separate (same-format variation is a different relationship).
- **Capture inherits context**: board quick-add files to the active board's format; ⌘K defaults to short (capture speed wins) with Tab toggling Short/Long; the calendar day peek defaults to short (rhythm context).
- **The board defaults to Shorts each load**; `f` toggles. localStorage persistence deferred (SSR-hydration cost outweighs it for a two-option toggle).
- **Clicking a rhythm ghost switches to the Shorts board** — rhythm slots are short-form by definition. Long-form videos scheduled this week appear as separate outline "Long" chips on the rail, visible from either board.
- **Flagging and rolling averages are format-scoped** (`getFlagContext(format)`): a 200k-view long would otherwise poison the shorts baseline and vice versa. The board unions both formats' flag sets for flames.
- **Clip is non-destructive**: the selected passage is copied into the new short's script; the long-form script is untouched. Title = first line of the excerpt cut at a word boundary (~60 chars).
- **Expand seeds an outline** from the short's verbal hook + script rather than copying the script as-is — a long is a rewrite, not a paste.
- **Calendar rhythm ghosts hide on the Long filter** and are only satisfied by scheduled *shorts* of the slot's type.
- **Old export files import cleanly**: rows missing `format` take the column default (`short`); envelope stays version 1.

## Cloud deployment (owner request, 2026-07-16)

- **Driver: better-sqlite3 → libSQL (`@libsql/client`)** so the same code runs against a local `file:` database (no env vars, zero-setup dev preserved) and hosted Turso in production (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`). Stays SQLite-dialect, so schema, migrations, and queries carried over; the API is async, so `lib/db/client.ts` now exports `getDb(): Promise<Db>` (migrate+seed run once behind a cached promise) and `RunResult.changes` became `ResultSet.rowsAffected`.
- **Migrations still apply at runtime** on cold start; `outputFileTracingIncludes` ships `lib/db/migrations/` into the serverless bundle.
- **Auth is a single password** (`APP_PASSWORD`) checked by `proxy.ts` (Next 16's renamed middleware) against a static HMAC session cookie (`lib/auth.ts`, Web Crypto so it runs on any runtime). No user table, no auth library — single-user app. Unset password = auth disabled (local dev). Rotate sessions by changing `AUTH_SECRET`.
- **`/login` lives outside the `(app)` route group**, which now owns the sidebar/overlay shell; the root layout is chrome-free.
- **PWA over native app**: `app/manifest.ts` + icons; installed via Add to Home Screen. One codebase for web and phone.
- **No local↔cloud sync** — one source of truth (Turso when deployed). Export/Import JSON is the migration path and the backup story.

## Mobile pass (owner request, 2026-07-16)

- **Bottom tab bar replaces the top icon strip** — Pipeline, Calendar, a raised capture button (dispatches the existing `content-os:capture` event), Review, and a "More" sheet holding Banks/Series/Settings + theme. Fixed, blurred, safe-area padded; `(app)` layout pads `main` to clear it. Phones navigate with thumbs, not eyebrows.
- **Pipeline shows one stage at a time on phones** behind segmented tabs with live counts; the four-column grid starts at `md`. Cross-column drag isn't available on phones — stage changes happen in the workspace (Details select / advance button), which is the natural phone flow anyway.
- **Calendar week is a vertical agenda below `sm`** (stacked day sections, touch-visible "+ Add"); **month is always a true 7-column grid** with dot-only chips and no ghost slots below `lg` (48px cells carry dots, not words).
- **PWA chrome**: `viewportFit: "cover"` + light/dark `themeColor` so the installed app's status bar matches the canvas.
- Verified via Playwright at 390×844 (iPhone-ish) against dev and the live production deployment — the extension-driven Chrome window can't shrink below desktop widths.

## Card management (owner request, 2026-07-16)

- **Every board card gets a ⋯ menu** (hover-revealed on desktop, always visible on touch): Rename, Duplicate, Move to ⟨stage⟩, Make long-form/short, Archive, Delete. All optimistic through one `mutate()` helper (apply local → persist → revert + toast on failure).
- **Delete is real deletion** (confirmed dialog) alongside Archive: detaches `double_down_of`/`clip_of` references and drops revisions explicitly rather than relying on connection FK/cascade settings. The dialog steers toward Archive for anything you might want back.
- **Duplicate copies the content, not the record**: title + type/format/status/script/hooks/notes/structure carry over; metrics, schedule, series slot, and lineage do not. The copy lands right under the original with a client-generated id for optimistic identity.
- **Format switch from the menu** shows a toast with a "View" action that flips the board — the card visibly leaves the current board, so the toast explains where it went.
- The workspace Details card grows Duplicate and Delete alongside Archive.

## Production pass: scenes, tap-to-open, perceived speed (owner request, 2026-07-16)

- **Touch drags are press-and-hold** (`TouchSensor` delay 250ms/tolerance 8) with `MouseSensor` distance 6 for desktop — the old `PointerSensor` distance threshold read finger wobble as a drag and swallowed taps. Cards are now **stretched links** (whole surface navigates, Next prefetches); post-drag clicks suppressed via `onClickCapture` guard.
- **Perceived speed**: `loading.tsx` skeletons for the workspace and app routes + `animate-in` entrances; cards get `active:scale` press feedback.
- **Scenes are plain text**: a line starting with `/tag` (optional note after a space) opens a scene until the next `/` line. Everything stays one `scriptBody` string — autosave, revisions, clip-to-short, and export untouched. Parser in `lib/scenes.ts`.
- **The editor paints scenes with a backdrop layer**: the textarea's text is transparent (visible caret/selection) over an `aria-hidden` div rendering the same string with identical metrics — tinted band + left rule per scene, colored header lines. `field-sizing-content` means no internal scroll, so the layers can't drift; trailing newlines get a zero-width space so empty line boxes render. Header lines keep regular weight (bold would shift caret alignment).
- **Scene hues** are six art-directable tokens (`--scene-1…6`) assigned by tag-name hash — stable across sessions, no persistence needed.
- **Shot plan** (right column) groups tagged scenes by shot type with ×count/words/runtime and jump links — the filming batch view. Board cards show `N · M shot types` tallies, computed server-side so scripts never ship to the board.
- **Slash suggestions** render as a static row above the editor (starter vocabulary + tags already used); Tab completes the first match. No caret-anchored popover math.
- Deferred: cross-video "filming day" view grouping Production-stage scenes by tag across videos.
- **Iterated with the owner to final grammar**: `/tag` opens a scene marked by a solid gutter line spanning exactly its lines; a blank line ends it (caret-aware — the empty line a single Enter creates stays in the scene while writing); `>Name` opens a **collapsible section** (chevron header row with rename input, scene-count/runtime meta, and a remove-header button). Sections are one editor block each (a textarea can't fold lines), spliced back into the single `scriptBody` string on every edit; a caret handoff (`pendingCaretRef` + layout effect) keeps typing seamless when a `>` line splits a block. Empty between-scene lines render a zero-width-space line box so the transparent-textarea/backdrop layers never drift.

## Multi-series membership (owner request, 2026-07-21)

- **A video can now belong to several series** — new `video_series` join table (composite PK video_id+series_id, per-membership `episode_number`; migration 0003 backfills from the old single-series columns). `video_series` is the source of truth going forward.
- **Kept the vestigial `videos.seriesId`/`episodeNumber` columns** rather than dropping them: SQLite/libSQL `DROP COLUMN` chokes on a column that's the child of a FK constraint, and dropping them would break importing pre-existing export files. New code reads/writes only `video_series`; `deleteSeries` still nulls the vestigial `seriesId` so its FK stays valid (video_series rows cascade). Removed `seriesId`/`episodeNumber` from `updateVideoSchema` (UI no longer sets them).
- **Workspace Details** shows series as removable chips with a per-membership episode `#` input (500ms-debounced) + an "Add to series" select of the not-yet-added options; adding auto-numbers the next episode (server-assigned, adopted optimistically). Board card shows the first series (name · ep) with `+N` for the rest.
- **Episode numbering is per membership** — a video can be episode 3 of one series and episode 1 of another. Series detail / "Add episode N+1" / list counts all read through `video_series`.
- Export/import gained `videoSeries` (zod-optional); importing an old export with no `videoSeries` backfills memberships from each video's legacy `seriesId`.

## Empty start (owner request, 2026-07-16)

- **All hardcoded seed content removed** — the PRD §8 demo videos, structures, and rhythm slots no longer ship. `seedIfEmpty` now ensures only the `rolling_average_window` setting (and keys off the `settings` table, since `videos` is legitimately empty). The live DB's demo/test rows were deleted the same day. Rhythm is configured in Settings; structures are added in Banks.
