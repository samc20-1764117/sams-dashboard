# Sam's Dashboard

## Response & Search Rules

STRICT — these override all defaults:
- Responses: short numbered list of changes only. No explanations unless asked.
- ALWAYS use the Grep tool (never `grep`/`rg`/`find` via Bash). Use `-C 1` or no context. Expand only if first result is insufficient.
- ALWAYS use the Read tool (never `cat`/`head`/`tail` via Bash). Grep for exact function/line first, then read only that range.
- NEVER read a full large file in one pass: overview.js, features.js, core.js. Always grep the section keyword first.
- Token budget: form a hypothesis after ≤5 searches. Make the fix. Do not keep searching to confirm — trust the fix.

---

## Git Workflow

Auto-commit after every turn via Stop hook (pushes to `dev`). No manual action needed.

**"push to production"** → follow steps in `rules/deploy.md`.

---

## Auto-Update Rules

When Sam says **"update rules"** (or "update the rules"): after completing the task, update only the rules files that are affected by changes made in that turn. Rules must be:
- Written as terse, reusable patterns (not task descriptions) — future-me should be able to apply the rule to new code without re-reading the implementation
- Merged into existing entries where possible; only add new bullets when the pattern is genuinely new
- Placed in the correct file (grep first if unsure)
- Skipped entirely if nothing changed that affects documented behavior

---

## Rules Reference

Grep the relevant file only — do not read files not needed for the task:
- `rules/core.md` — architecture, auth, data/persistence, undo/redo
- `rules/tasks-ui.md` — overdue logic, task modals, interaction patterns, UI notes
- `rules/wr-system.md` — WR rules, non-WR recurring, X menus, skip behavior, drag IDs
- `rules/pages.md` — per-page rules (overview, shopping, travel, pup skills, birthdays, recipes, etc.)
- `rules/deploy.md` — push to production steps
