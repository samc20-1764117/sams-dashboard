# Dashboard Implementation Rules

## Layout Structure

- **Root layout**: sidebar (fixed, 186px) + `.main` (flex:1, overflow-y:auto, padding:22px 56px 36px 56px)
- **`.overview-cols`**: 2-column grid (`2.2fr 2.55fr`, gap 14px, `height:664px`, margin-bottom:14px).
  - Col 1: `.overview-left` — flex column, gap 14px. Contains Today+TB card (`flex:1`) + Need to Assign card (`flex-shrink:0`, height:110px).
  - Col 2: `.row1-right-panel` — flex column, gap 14px, min-height:0. Contains `.row1-right-top` (fixed height 160px, 3-column grid: Weekly Reset, Shopping, Quick Links) + calendar card (`flex:1`).
- **Top-right fixed controls**: `.top-right-controls` (position:fixed, top:14px, right:20px) — dark toggle + sync bar.
- **`.row3`**: full width (kanban).

## Today+TB Card Header

- **Single header strip** (`tod-tb-header`, ~36px tall): ← | date + · + live clock | + Today → | dark toggle | sync bar
- `id="ovTitle"` (date, e.g. "Thursday, March 12") and `id="liveClock"` (time) live here.
- `id="todTitle"`, `id="todPB"`, `id="todPct"`, `id="todPL"` are hidden (`display:none`) to avoid JS errors.
- No progress bar visible in the header.

## Today+TB Body

- **`.tod-tb-body`**: flex row. Left = `.tod-section` (flex:1). Divider. Right = `.tb-section` (flex:1).
- **`.tod-section`**: flex column, overflow hidden. Contains overdue banner + `#todList`.
- **`.tb-section`**: flex column, overflow hidden. Contains `#tbScroll` (no nav header).

## Time Block

- **`const PX = 40/60`** px per minute (1 hour = 40px).
- **`let HOURS = [...Array(13)].map((_,i)=>i+7)`** — 7am through 7pm (13 hours). Default view shows full 7am–7pm range.
- **`.tb-hour { height: 40px }`**, **`.tb-tlbl { height: 40px }`**.
- On day change, `tbScroll.scrollTop = 0` (defaults to 7am, top of HOURS).
- Scroll past top (at 7am) → `shiftDay(-1)`. Scroll past bottom (7pm) → `shiftDay(1)`.
- Now line uses `nmins = (now.getHours() - HOURS[0]) * 60 + now.getMinutes()`.
- Block positions: `top = (b.sm - HOURS[0]*60) * PX`, `height = Math.max(b.dur * PX, 16)`.

## Overdue Banner

- Shows only when `dayOff === 0`.
- Counts: overdue tasks + overdue recurring (non-wrec) + overdue weekly reset tasks + overdue shopping.
- `getOvRecurring()` iterates `wkOff-4` to current week, includes both `getRecurringWeekTasks(w)` results AND weekly reset tasks whose `_dateOverrides[wkKey] < today`.
- `rolloverOverdue()`: moves all to today, calls `save()`, patches tasks/shopping/recurring to Supabase.

## Today List Sorting & Content

- Shows tasks, recurring virtual tasks, weekly reset virtual tasks (wrecToday), and overdue shopping due today.
- Overdue shopping included when `dayOff === 0` and `isOv(s.due_date)`.
- Sort: overdue first → important → rest → done last.
- **TB arrow `›`** shown on tasks not yet placed in a time block. Positioned `position:absolute; right:4px`, always visible. Fades to `opacity:0` on `.ti:hover` so the ✕ button shows through.
- Tasks of type travel/birthday always have `tbArrow=false` (they're virtual, not placeable).

## Today List Header (renderToday)

- `ovTitle.textContent` = `weekday long, month long, day numeric` (e.g. "Thursday, March 12").
- `todTitle.textContent` = `"Today • ${_fullDateStr}"` when viewing today, else just the date string (hidden element, not rendered).
- `dayLbl` (in TB nav, if present) = "Today Mar 12" or "Thu Mar 12".

## Overdue Highlighting (`.ov-row`)

- Applied to: tasks with `due_date < today` and `!done`.
- Applied to: recurring virtual tasks where `due_date < today`.
- Applied to: weekly reset tasks where `_dateOverrides[wkKey] < today`.
- Applied to: shopping items where `due_date < today` and `!done`.
- Color scheme `OV`: `bg:#fff0f0`, `t:#b91c1c`, `d:#ef4444`, `b:rgba(239,68,68,.28)`.
- Date labels on overdue items use `.dlbl.ov` class.

## Important Highlighting (`.imp-row`)

- Color scheme `IMP`: `bg:#fefce8`, `t:#854d0e`, `d:#eab308`, `b:rgba(234,179,8,.35)`.

## Checkbox Styles

All three checkbox types share identical visual style:
- **`.chk`**, **`.wchk`**, **`.tb-chk`**: 10px × 10px, `border-radius:50%`, `border:1.5px solid rgba(180,170,210,.5)`, `background:rgba(255,255,255,.8)`.
- Checked state: `background:#a3c41a`, `border-color:#a3c41a`, green checkmark SVG via `background-image`.

## Completed Task Handling

- **Today list**: done tasks remain visible, styled with `done` class (strikethrough, muted).
- **Weekly calendar**: done tasks sorted to bottom of each day column. Rendered as `.chip.done-chip` with `opacity:0.25`.
- **Time block**: done blocks get `.done-block` class (`opacity:0.45`, text `text-decoration:line-through`).

## Weekly Calendar Sorting (renderWkCal)

- Per day: undone tasks first (sorted by overdue → important → rest), done tasks appended at bottom.
- Recurring virtual tasks and weekly reset tasks included per day based on `due_date === ds`.
- Shopping items included per day.

## Summary Metrics Banner

- `#summaryMetrics`: empty thin banner, `min-height:32px`, `flex-shrink:0`. Sits above the 3 right-side cards.
- `renderSummaryMetrics()` reads `todPct`, `wkPct`, `st.blocks`, and overdue count. Elements: `#smTodayPct`, `#smWkPct`, `#smBlocked`, `#smOverdue`.
- If empty, renders nothing (no content shown by default).

## Recurring Tasks

- **Weekly reset** (`is_weekly_reset: true`): appear in Weekly Reset card, wrecToday list, weekly calendar per their `_dateOverrides[wkKey]` date.
- **Non-weekly-reset**: appear in This Week calendar based on `appears_on_date` day of week and `cadence`.
- `getRecurringWeekTasks(off)` filters `!r.is_weekly_reset` and applies cadence logic:
  - `weekly`: show every week.
  - `biweekly`: show every 2 weeks. Anchor = Monday of week containing `starting_date`. Show when `weekDiff % 2 === 0` and `weekDiff >= 0`.
  - `monthly`: show on the week containing `repeat_date` day-of-month. `appears_on_date` is ignored for monthly.
- Overdue wrec tasks: detected via `_dateOverrides[wkKey] < today` and `!r._done`.
- DB save for recurring: `PATCH recurring_tasks { date_overrides: r._dateOverrides }` using `recQs(id)`.
- New recurring task payload must include: `name`, `is_weekly_reset`, `appears_on_date`, `cadence` (always, never omit — NOT NULL in DB). Do NOT send `day_of_week` — column does not exist in `recurring_tasks` schema.
- **Local temp ID must use `rec-tmp-` prefix** (not `l-`). The sync `localPending` filter only preserves `rec-tmp-` and `rec-local-` prefixes. Using `l-` causes the entry to be discarded on next sync if the POST hasn't resolved.
- After POST succeeds: replace temp entry with `{...sv[0], _doneByWk:{}, _done:false, _dateOverrides:{}}` and call `save()`.

## Shopping List (Today View)

- Use `tRowShopVirt(t, noDate=true, tbArrow)` in today list — date label hidden.
- Use `tRowShopVirt(t, noDate=false, tbArrow)` in This Week view — date label shown.
- Overdue shopping in today list gets `.ov-row` styling.

## Close Icons / Section Headers

- Each card section has only **one** close/collapse icon (right-side `›`). No duplicate left+right close icons.
- "Overview ·" prefix text removed from topbar.

## Clock / Date Display

- `tickClock()`: runs every minute via `setInterval`. Sets `id="liveClock"` (in card header) and any secondary clock element if present.
- `id="ovTitle"` updated by `renderToday()` on every day shift.

## Persistence (Supabase Saves)

- **All create/duplicate actions must POST to Supabase immediately** and include ALL required fields. Missing fields cause silent 400 failures.
- `tasks` POST must include: `name`, `category`, `due_date`, `done`, `important` (NOT NULL — omitting it causes insert failure).
- `recurring_tasks` POST must include: `name`, `is_weekly_reset`, `cadence` (all required/NOT NULL). `day_of_week` does NOT exist as a column — never send it.
- **Undo ID pattern**: use a mutable `let serverId=null` captured by the undo closure. Set `serverId=String(sv[0].id)` after POST resolves. Undo reads `serverId||localId` at call-time so it always uses the correct DB id. This allows undo to be registered immediately (good UX) and still correctly DELETE from Supabase.
- Do NOT use `l-` prefix for recurring task temp IDs. Use `rec-tmp-` so sync preserves them as localPending.

## Dev Badge

- Fixed-position badge `id="devBadge"` at bottom-left. Tracks current batch (e.g. `DEV-11`). `display:none` by default (enabled in dev).

## Git Workflow

- Stop hook: auto-commits and pushes to `origin/dev` branch after every Claude turn.
- "Push to production": merge `origin/dev` into `main`, push `main`.
- Auto-commit format: `Auto-commit [Mar 12 13:45]`.
