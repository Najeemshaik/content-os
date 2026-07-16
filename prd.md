# PRD — Content OS (v1)

A local-first content operating system for a solo short-form creator. Single user, runs on localhost, owns all of its data on disk. Built to be extended over time by Claude Code / Cowork.

---

## How to use this document (instructions for Claude Code)

You are building this app for its owner, who is both the sole user and a designer with a decade of Apple-aesthetic experience. Build **in phases, in order**. After each phase: run the app, verify every acceptance criterion for that phase, fix all errors, then stop and present it before continuing. Do not ask questions this PRD can answer; when a genuinely open decision comes up, make the call and log it in `DECISIONS.md`. Verify current library versions/APIs against official docs at build time rather than assuming.

**Kickoff prompt (owner pastes this into Claude Code in an empty folder containing this file):**

> Read PRD.md fully before writing any code. Build Phase 0 and Phase 1 exactly as specified, then stop and walk me through the running app. Follow the stack, data model, and design-token rules in the PRD. After each phase, verify the acceptance criteria yourself, fix everything, and keep DECISIONS.md updated with any judgment calls.

---

## 1. Product overview

**Problem.** Ideas arrive randomly; execution needs structure. The owner needs one place where an idea can be captured in five seconds, developed into a fully scripted video (with hook stacks), scheduled against a weekly rhythm, tracked through production, and analyzed after publishing — with research banks (viral outliers, script structures) feeding the whole machine.

**The content system this app encodes** (do not redesign it — it is the spec):

- Every video is exactly one **type**: `take` (opinion), `teach` (education), `story` (personal narrative).
- Every video moves through exactly four **stages**: `idea → scripted → production → published`.
- Every script carries a **hook stack**: a verbal hook (first spoken line), a written hook (on-screen text in the first seconds), and a visual hook (what's happening in frame one).
- A **weekly rhythm** defines which type is due on which weekday (default: Mon take, Tue teach, Thu teach, Fri take, Sat story — editable in settings).
- **Outliers** are reference videos from other creators whose views ≥ 5× their follower count; they are farmed for hooks and templatized into **script structures** (fill-in-the-blank templates).
- **Double-down:** when one of the owner's published videos hits ≥ 5× his rolling average views, the app flags it and can spawn variant cards (same components, one variable changed).
- **Series** are planned sequences of related episodes (daily / progress / lesson types).

**Non-goals for v1:** no auth, no cloud sync, no multi-user, no Instagram/TikTok API integration, no AI features, no video file storage, no mobile app. Local, fast, private.

---

## 2. Stack & constraints

| Concern | Decision |
|---|---|
| Framework | Next.js 16, App Router, Server Actions for all mutations |
| UI | React 19, TypeScript (strict), Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui, lucide-react icons |
| Data | SQLite via `better-sqlite3` + Drizzle ORM + drizzle-kit migrations. DB file at `./data/content.db` (gitignored), WAL mode on |
| Drag & drop | `dnd-kit` |
| Dates | `date-fns` |
| Validation | `zod` on every server action input |
| IDs | UUID v4 (or `crypto.randomUUID()`) |
| Package manager | pnpm |
| Fonts | Geist Sans (ships with Next) unless the token file says otherwise |

Everything renders and mutates locally. No network calls at runtime. No environment variables required to run.

---

## 3. Data model (Drizzle schema)

All tables get `id`, `created_at`, `updated_at` unless noted. Use integer timestamps (ms).

**videos** — the central entity.
| Field | Type | Notes |
|---|---|---|
| title | text | Working title / hook line |
| type | text enum | `take` \| `teach` \| `story` |
| status | text enum | `idea` \| `scripted` \| `production` \| `published` |
| notes | text | Angle, context, loose thoughts |
| hook_verbal / hook_written / hook_visual | text | The hook stack |
| script_body | text | Markdown/plain script |
| shot_notes | text | B-roll, locations, props |
| structure_id | FK → structures, nullable | Template used |
| series_id | FK → series, nullable | + `episode_number` int nullable |
| scheduled_date | text (ISO date), nullable | Calendar placement |
| published_at | integer, nullable | |
| views / likes / comments / saves / shares | integer, default 0 | Manually logged |
| double_down_of | FK → videos, nullable | Variant lineage |
| sort_order | real | Manual ordering within a column |
| archived_at | integer, nullable | Soft delete |

**script_revisions** — autosave history: `video_id` FK, `script_body`, `hook_verbal`, `hook_written`, `hook_visual`, `created_at`. Snapshot rules in §6.

**series** — `name`, `description`, `type` (`daily` \| `progress` \| `lesson` \| `custom`), `target_episodes` int nullable, `status` (`active` \| `done` \| `paused`).

**structures** — the script-structure bank: `name`, `category` (`simple` \| `complex` \| `educational` \| `storytelling` \| `other`), `template` text (fill-in-the-blank with `{placeholders}`), `source_url`, `source_creator`, `notes`, `times_used` int.

**outliers** — the research bank: `url`, `creator`, `creator_followers` int, `views` int, `multiplier` real (computed = views / followers, stored), `niche`, `hook_verbal`, `hook_written`, `hook_visual`, `transcript` text, `why_it_worked` text, `status` (`unprocessed` \| `templatized`), `structure_id` FK nullable.

**rhythm_slots** — the weekly rhythm: `weekday` int 0–6, `type` (take/teach/story). Seed the default rhythm. Editable in settings.

**settings** — key/value (JSON text): rolling-average window, theme, etc.

---

## 4. Modules & pages

### 4.1 Pipeline (`/`) — home
Kanban with four fixed columns (Idea, Scripted, Production, Published), each with a count.
- Cards show: type badge, title, series chip (if any), scheduled-date chip (if any), a 5×-flame indicator if flagged (§4.6).
- Drag & drop between columns and within a column (persists `status` + `sort_order`). Full keyboard support per dnd-kit patterns.
- Quick-add input at the top of the Idea column: type the title, pick a type, Enter. Nothing else required.
- Filter chips: All / Take / Teach / Story. Search box filters by title.
- Clicking a card opens the Video workspace (§4.2).
- A **"This Week" rail** at the top: the current week's rhythm slots (from `rhythm_slots`) shown as chips — filled if a video is scheduled that day, ghosted with the due type if empty. Clicking an empty slot opens quick-add pre-set to that type + date.

### 4.2 Video workspace (`/video/[id]`) — the scripting studio
Single page, two-column on desktop (script left, meta right), stacked on mobile.
- **Header:** editable title, type selector, status selector, series + episode assignment, schedule date picker, archive.
- **Hook stack panel:** three labeled inputs — Verbal / Written / Visual — each with a "borrow" button opening a searchable picker of hooks from the outlier bank (copies text in, links nothing).
- **Script editor:** large plain-text/markdown editor. Toolbar actions:
  - *Insert template* → picker over `structures` (seeded with the three core templates, §8); inserting appends the template with `{placeholders}` visible and increments `times_used`.
  - *Word count + runtime estimate* always visible: `seconds = words / 2.5` (150 wpm), displayed as `~42s`.
  - *Revision history* → drawer listing snapshots with timestamps; view diff-free full text; one-click restore (restore itself creates a snapshot first).
- **Shot notes** textarea below the script.
- **Status shortcut:** a single primary button advances stage ("Mark Scripted →", "Start Production →", "Mark Published →"). Marking published sets `published_at` and prompts (non-blocking) for the post URL/metrics later.
- Everything autosaves (§6). A quiet "Saved" indicator sits in the header — never a save button.

### 4.3 Calendar (`/calendar`)
- Month view + week view toggle. Week is the default.
- Rhythm slots render as ghost placeholders on their weekdays ("Take due", "Teach due") until filled.
- A right-hand tray lists unscheduled videos (status ≥ scripted first, then ideas), draggable onto days. Dropping sets `scheduled_date`. Dragging off clears it.
- Scheduled cards show type badge + title; overdue (scheduled in the past, not published) get a subtle warning treatment.
- Clicking a day opens a day peek with its videos + "add to this day."

### 4.4 Banks (`/banks`)
Two tabs.
- **Outliers:** table/grid of saved outliers. Add form: URL, creator, followers, views (multiplier auto-computes and displays, e.g. "8.2×"), niche, the three hooks, transcript, why-it-worked. Filter by niche/status. Row actions: copy hook, "Templatize" → opens a pre-filled new-structure form (source fields carried over) and marks the outlier `templatized`.
- **Structures:** cards showing name, category, times used, template preview. Full CRUD. "Use in new video" action creates a video (status idea) with the template pre-inserted.

### 4.5 Series (`/series`)
- List of series with progress (episodes published / target).
- Series detail: episode roadmap (ordered list of linked videos with stage badges), inline "add episode N+1" that creates a video pre-linked with the next episode number and the series' default type.

### 4.6 Review (`/review`)
- Table of published videos: title, type, published date, metric inputs (views, likes, comments, saves, shares) editable inline.
- App computes a rolling average of views over the last N published videos (N configurable, default 10, min 3 before flagging activates).
- Any video ≥ 5× the rolling average gets flagged (flame icon here and on the pipeline).
- **Double down** action on any flagged video: dialog offering "what stays / what changes" (change hook / change value / change format), then creates a new idea card titled `DD: {original title}`, same type, `double_down_of` set, notes pre-filled with the chosen variation plan. Lineage is visible on both cards.
- A small per-type readout: average saves for teach, average shares for takes, average comments for story (the health metric per type).

### 4.7 Global
- **Quick capture** command palette (⌘K / Ctrl-K) available on every page: type an idea, arrow-key the type, Enter → lands in Ideas. Under 5 seconds end to end.
- **Spark panel** inside quick capture (toggle): generates title starters locally by combining static lists — take starters ("Everyone's wrong about ___", "___ is overrated, ___ is underrated", "Stop ___, start ___", "The real reason ___", "___ changed and nobody noticed") × topics (AI coding tools, vibe coding, design taste, what AI still can't do, building solo, speed vs quality); teach formats ("How I ___", "Why ___ feels ___", "3 things ___", "Watch me ___", "The mistake everyone makes with ___"); story prompts ("A time I failed at ___", "How I actually learned ___", "The moment I realized ___", "What building ___ taught me"). Clicking one prefills the capture input. Pure combinatorics, no AI.
- **Export/import:** Settings page button exports the entire DB as one JSON file; import restores it (with a confirmation that it replaces current data).
- Keyboard shortcuts: `n` new idea (on pipeline), `⌘K` capture, `1–4` switch pipeline filter, `esc` closes panels. Document them in a `?` shortcut sheet.

---

## 5. Design language

The owner is a designer and will art-direct after v1. The build's job is a disciplined, token-driven foundation he can restyle without touching component logic.

- **All visual decisions flow from tokens** in `globals.css` under Tailwind v4 `@theme`: color palette, radius scale, spacing scale, font stacks, shadow levels. No hardcoded hex/px values inside components — Tailwind utilities referencing tokens only.
- Ship **light and dark**, system-following with a manual toggle. Neutral, quiet surfaces; hairline borders; generous whitespace; an 8px spacing grid; one restrained accent.
- The **only persistent color coding** is content type — take/teach/story each own a hue used consistently in badges, calendar chips, and charts. Define the three hues as tokens.
- Typography: one family (Geist Sans), clear scale, tight tracking on headings, comfortable line-height in the editor (the script editor should feel like a writing tool, not a form field — larger type, ~68ch max width).
- Motion: minimal and functional (drag feedback, panel transitions ≤ 200ms, respects `prefers-reduced-motion`).
- Density: calm. Kanban cards and calendar cells breathe; no cramped dashboards.
- Empty states are directive one-liners, not illustrations.
- Quality floor: responsive to ~375px, visible keyboard focus everywhere, semantic HTML, no layout shift on autosave.

---

## 6. Persistence & autosave (core requirement — get this right)

- Every mutation goes through a Server Action writing to SQLite. Optimistic UI on the client; on failure, revert and show a small toast.
- **Text autosave:** debounce 500ms after the last keystroke, plus flush on blur and on route change. The header indicator shows `Saving…` → `Saved`.
- **Script revisions:** create a snapshot of script + hooks when (a) the editor has been idle 60s after changes, or (b) the user restores a revision, or (c) status advances. Cap 50 revisions per video, pruning oldest.
- **Durability tests that must pass:** kill the dev server mid-edit and restart — at most the last 500ms of typing is lost; hard-refresh mid-drag — board state is consistent; reboot the machine — everything is intact.
- DB file + `data/` directory are created automatically on first run; seed runs only when the `videos` table is empty.

---

## 7. Build phases & acceptance criteria

**Phase 0 — Scaffold.** Next.js 16 + TS strict + Tailwind v4 + shadcn/ui initialized; Drizzle + better-sqlite3 wired with migrations; app shell with sidebar nav (Pipeline, Calendar, Banks, Series, Review, Settings); token file established; seed script.
✓ `pnpm dev` runs clean. ✓ DB auto-creates. ✓ Dark/light toggle works. ✓ Lint + typecheck pass.

**Phase 1 — Pipeline + capture.** Board, drag & drop, quick-add, filters, This Week rail, seed data visible.
✓ Card dragged to Production survives restart. ✓ Quick-add → card in <5s. ✓ Reorder within column persists. ✓ Counts correct.

**Phase 2 — Video workspace.** Full studio: hook stack, editor, template insertion, runtime estimate, revisions, autosave, stage-advance button. Spark panel in quick capture.
✓ Type for 10s, close tab, reopen: text intact. ✓ Insert template shows placeholders + increments times_used. ✓ Revision restore round-trips. ✓ Runtime estimate updates live.

**Phase 3 — Calendar.** Month/week views, rhythm ghosts, drag-to-schedule, overdue states, unscheduled tray.
✓ Drop on a day sets the date everywhere (card chip, This Week rail). ✓ Empty Monday shows "Take due". ✓ Overdue styling appears for past unpublished dates.

**Phase 4 — Banks.** Outliers CRUD with auto multiplier, hook borrowing from the workspace, Templatize flow, Structures CRUD + "use in new video".
✓ Multiplier computes and displays. ✓ Borrow copies a hook into the workspace. ✓ Templatize links outlier → structure and flips status.

**Phase 5 — Series.** CRUD, episode linking, next-episode creation.
✓ Add episode 4 creates a linked idea card numbered 4. ✓ Progress reflects published count.

**Phase 6 — Review + double-down.** Metrics entry, rolling average, 5× flags, DD spawning with lineage, per-type health readout.
✓ Entering views that exceed 5× average flags the video on Review and Pipeline. ✓ DD card links back to parent.

**Phase 7 — Polish.** Export/import JSON, shortcut sheet, empty states, focus/a11y pass, 375px pass, performance sanity (board with 500 cards stays smooth).
✓ Export → wipe `data/` → import → identical app state.

---

## 8. Seed data

**Structures (3 core script templates):**
1. *Take* (storytelling/other): `{Claim, stated flat} / What most people believe instead: {assumption} / Proof from my own work: {example} / The reframe: {reframe} / {Follow CTA}`
2. *Teach* (educational): `The promise: {what they'll get} / {Point 1} / {Point 2} / {Point 3} / One-line recap + {CTA}`
3. *Story* (storytelling): `Open mid-scene at the most dramatic moment: {scene} / One line of context: {context} / What happened: {beat 1} → {beat 2} → {beat 3} / The lesson: {lesson} / {CTA}`

**Rhythm slots:** Mon take · Tue teach · Thu teach · Fri take · Sat story.

**Videos (status `idea`, in this order):**
| Type | Title | Notes |
|---|---|---|
| take | AI didn't make design skills worthless — it made them the whole game | Flag-planting thesis. 45s, face + camera. Claim → assumption → proof (10 yrs craft, 3 shipped products) → reframe. |
| teach | This app feels expensive. This one feels cheap. Here's why | 3 details doing the work — spacing, motion, type. Screen recordings of two real apps. |
| story | I spent 10 years on design and music before AI could build | Right order, it turns out. Compressed origin → lesson: taste compounds. |
| teach | AI built it in 20 minutes. I spent 2 hours on the last 5% | That 5% is the job now. Real polish-pass screen recording. |
| take | Reactive slot: this week's AI news through the craft lens | Recurring — swap in whatever moved this week. Film same-day, raw. |
| teach | My exact AI building stack — how one person ships real software | Deep-dive, end to end. Save-bait. |
| story | I posted beats daily for years and built the biggest channel in the niche | Lesson: output beats strategy. |
| take | Everyone can build now. Almost nobody can make it feel good | Short, quotable, comment-bait. One built-vs-felt example. |
| teach | 3 details Apple never skips — and your app shouldn't either | Concrete, screenshot-driven. "Save this" ending. |
| teach | Making AI-built software look hand-crafted — full design pass | Before/after of one screen, start to finish. |
| story | The app icon took longer than the feature. That was the right call | Build story → lesson: the parts people touch deserve the hours. |
| teach | 5 things AI still gets wrong in UI — and how to catch them | Listicle teach, examples from own builds. |
| story | What a build session actually looks like | Lectures by day, desk by night. B-roll heavy. |

---

## 9. Project conventions

- Repo name: `content-os`. Suggested layout: `app/` (routes), `components/` (ui + feature dirs), `lib/db/` (schema, client, seed), `lib/actions/` (server actions per entity), `lib/types.ts`, `data/` (gitignored DB).
- Strict TypeScript, no `any`. Zod-parse every action input. Errors surface as toasts, never silent.
- Keep components small and colocated by feature (pipeline/, calendar/, workspace/, banks/, series/, review/).
- `DECISIONS.md` at root logs every judgment call with one-line rationale.
- Write a concise `README.md`: run instructions (`pnpm install`, `pnpm dev`), where data lives, how to back up (copy `data/` or use export).