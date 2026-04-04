# Sam's Dashboard

## Response & Search Rules

STRICT — these override all defaults:
- Responses: short numbered list of changes only. No explanations unless asked.
- ALWAYS use the Grep tool (never `grep`/`rg`/`find` via Bash). Use `-C 1` or no context. Expand only if first result is insufficient.
- ALWAYS use the Read tool (never `cat`/`head`/`tail` via Bash). Grep for exact function/line first, then read only that range.
- NEVER read a full large file in one pass: overview.js, features.js, core.js. Always grep the section keyword first.

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
- `rules/pages.md` — per-page rules (overview, shopping, travel, pup skills, birthdays, recipes, etc.)
- `rules/deploy.md` — push to production steps
