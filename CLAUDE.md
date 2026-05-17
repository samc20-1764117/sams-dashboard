# Sam's Dashboard

## Response & Search Rules

STRICT — these override all defaults:
- Responses: short numbered list of changes only. No explanations unless asked.
- ALWAYS use the Grep tool (never `grep`/`rg`/`find` via Bash). Use `-C 1` or no context. Expand only if first result is insufficient.
- ALWAYS use the Read tool (never `cat`/`head`/`tail` via Bash). Grep for exact function/line first, then read only that range.
- NEVER read a full large file in one pass: overview.js, features.js, core.js. Always grep the section keyword first.
- Token budget: form a hypothesis after ≤5 searches. Make the fix. Do not keep searching to confirm — trust the fix.
- **"update rules"**: update only affected rules files. Terse reusable patterns only. Merge into existing entries where possible. Skip if nothing changed.
- **Cleanup**: always delete temporary/mockup files (e.g. `*-mockup.html`) when done with them. Never leave test artifacts in the repo.

---

## Git Workflow

Auto-commit after every turn via Stop hook (pushes to `dev`). No manual action needed.

**"push to production"** → follow steps in `rules/deploy.md`.

---

## Rules Reference

Grep the relevant file only — do not read files not needed for the task:
- `rules/core.md` — architecture, auth, data/persistence, undo/redo
- `rules/tasks-ui.md` — overdue logic, task modals, interaction patterns, UI notes
- `rules/wr-system.md` — WR rules, non-WR recurring, X menus, skip behavior, drag IDs
- `rules/pages.md` — per-page rules (overview, shopping, travel, pup skills, birthdays, recipes, HEB/grocery, etc.)
- `rules/videos.md` — videos page (data model, views, stages, inline editing, grouping, keyboard shortcuts)
- `rules/deploy.md` — push to production steps
- `rules/mobile.md` — **mobile PWA only** (mobile.html/css/mobile-overview.js). Architecture, tab system, all interaction patterns, iOS rules, init flow. Read this before any mobile work. Do NOT read for desktop tasks.
