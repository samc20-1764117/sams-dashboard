# Sam's Dashboard

## Git Workflow

### Auto-commit
After every turn, all changes are automatically committed and pushed to the `dev` branch via a Stop hook. No manual action is required.

After each successful push to `dev`, update the Dev indicator in the bottom left of the dashboard. The Dev button should display:

dev - X

Where X is a randomly generated number (e.g., dev - 12, dev - 47, dev - 3). This is used as a visual confirmation that the latest changes were successfully pushed to the dev branch.

### Push to Production
When the user says **"push to production"**, run these git commands in sequence using the Bash tool:

1. git checkout main
2. git pull origin main
3. git merge origin/dev --no-ff -m "Merge dev into main"
4. git push origin main
5. git checkout main (stay on main or switch back as needed)

After pushing, confirm success by reporting the pushed commit hash.

---

## Overview Page — Recurring Task Logic

### Two types of recurring tasks
- **Weekly-reset** (`is_weekly_reset=true`): appear only when scheduled via `_dateOverrides[wkKey]` = date string. Remove via `unscheduleWRec(rid, wkKey)`.
- **Non-weekly-reset**: appear automatically based on cadence + `appears_on_date`. Built by `getRecurringWeekTasks(off)`. Remove for a week via `skipRecVirtThisWk(rid, wkKey)` → sets `_dateOverrides[wkKey]='__skip__'`.

### X button routing
| Location | Task type | Function |
|----------|-----------|----------|
| Weekly cal chip | `_isWrec=true` | inline: `delete _dateOverrides[wkKey]` + PATCH |
| Weekly cal chip | `_virtual=true` (non-wrec) | `skipRecVirtThisWk` |
| Today list row | `_isWrec=true` | `unscheduleWRec` |
| Today list row | `_virtual=true` (non-wrec) | `skipRecVirtThisWk` |
| Weekly summary row | `_isWrec=true` | `unscheduleWRec` |
| Weekly summary row | `_virtual=true` (non-wrec) | `skipRecVirtThisWk` |
| Context menu delete | `_isWrec=true` | `unscheduleWRec` |
| Context menu delete | non-wrec recurring | `skipRecVirtThisWk` |

### Key rules
- `getRecurringWeekTasks(off)`: `_isWrec` is NOT set on returned objects.
- `skipRecVirtThisWk` has WR safety guard — redirects to `unscheduleWRec` if task is `is_weekly_reset`. Does NOT call `renderRecOv`.
- `syncAll` must preserve all locally-pending `_dateOverrides` (including `__skip__`) not yet confirmed in DB.
- `renderToday` overdue loop `for(w=0; w>=wkOff-4; w--)`: cascading skip check — if `__skip__` for any week from occurrence through today, exclude. `getOvRecurring()` must use same logic.
- `wrecThisWk` in `renderWkSummary` uses direct key lookup `r._dateOverrides[wkKey]` — NOT `Object.values()` scan.
- `rec-virt-{id}` prefix can be WR or non-WR — always check `is_weekly_reset` before acting.
- WR done state: per-week via `_doneByWk[getWkKey(wkOff)]`. Never use `r._done`.

### Known issue (unresolved)
After clicking X on a non-weekly-reset recurring task, it can sometimes reappear in today's list as overdue. Root cause unconfirmed — suspect `renderToday` overdue filtering not running in all code paths.
