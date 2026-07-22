---
name: verify
description: Build, run, and drive Content OS locally to verify changes end-to-end in the browser.
---

# Verifying Content OS changes

## Launch

- `npx next dev -p 3100` — use a spare port; the user often has another
  Next app already on 3000 (a 404 on `/series` means you hit the wrong app).
- No env setup needed: `.env.local` has no `APP_PASSWORD`, so auth is
  disabled and the app uses the local SQLite file at `data/content.db`.
- Ready when `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/series`
  returns 200 (~10s).

## Drive

Use the Claude-in-Chrome tools. Key flows:

- **Pipeline** `/` — board with idea/scripted/production/published columns,
  quick-add per column, ⌘K capture dialog.
- **Series** `/series` → detail `/series/[id]` → "Add episode N" navigates
  straight into the video workspace with `?series=[id]` (back link then
  points to the series, not Pipeline).
- **Workspace** `/video/[id]` — script editor autosaves (500ms debounce);
  Details panel has format/type/status/series/schedule.

## Gotchas

- Mutations hit the user's real local DB. Name test records obviously
  (e.g. "UX Test Series") and delete them through the UI when done
  (video: Details → Delete video; series: trash icon on detail page).
- `find` element refs go stale after navigation — re-find after any
  route change.
- Typecheck is `pnpm typecheck` (runs `next typegen` first — needed for
  `PageProps` route types), but verification means driving the app.
