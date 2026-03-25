# Dashboard Implementation Rules

## File Structure (Source Split)

All files live in the same folder. `index.html` loads the JS files in order via `<script src="...">` tags. All files share the same global scope — no modules, no bundler.

### Files

| File | Lines | Contains |
|------|-------|----------|
| `index.html` | ~1,392 | HTML structure + all CSS (`<style>`) + 4 `<script src>` tags + small inline clock script |
| `core.js` | ~682 | Must load **first**. Constants (CATS, KCATS), state variables (cfg, st, dayOff, wkOff…), localStorage (load/save), Supabase helpers (sbReq, sbReqSilent, sbReqNullable), time block DB helpers (sbSaveBlock, sbDeleteBlock, sbUpdateBlock), syncAll, setBadge, date utilities (getWkKey, getWkBounds, getDayDate, d2s…), recurring virtual task helpers (getRecurringWeekTasks), undo/redo (pushUndo, doUndo, doRedo, showToast), global keydown listener |
| `overview.js` | ~1,694 | renderAll, renderOv, renderToday, renderWkSummary, renderWkCal, renderRecOv, renderShopOv, renderUnassigned, renderKanban, renderDayTB, auto-timeblock logic (getAutoTBForDate), virtual recurring row renderers, task row helper (tRow), drag-and-drop on today list |
| `features.js` | ~2,661 | Quick-add popup (openQA/submitQA), task CRUD (toggleTask, editTask, delTask, addTask), renderTasksPage, recurring tasks page (renderWeeklyPage/renderRecurringPage), shopping full page (renderShopFull), month modal/date picker, travel page (renderTravelPage), birthdays page (renderBdayPage) + all birthday interaction state, unscheduleWRec, skipRecVirtThisWk, recipes page (renderRecipesPage), showPage, closeMod, init, selection system (selTask, applySelHighlight), context menus (showCtx, ctxDoDuplicate, ctxDoDelete), quick notes (toggleQN) |
| `pup-skills.js` | ~433 | All pup skills state (_pupEditId, _selPupIds, _pupUndoStack…), renderPupsPage, renderPupTable, pupSnapshot/pupUndo/pupRedo/_pupSyncToServer, openPupAddModal/openPupEditModal/savePupModal, setPupField, selPupRow, applyPupSelHighlight, pupCellEdit, showPupCtx, pupSortBy, pupFilterBy, showPupTip/hidePupTip, togglePupMastered |

### Loading Order
```html
<script src="core.js"></script>       <!-- defines st, cfg, sbReq, dates, undo -->
<script src="overview.js"></script>   <!-- defines renderAll and all overview rendering -->
<script src="features.js"></script>   <!-- defines all pages, CRUD, init() — init() runs here -->
<script src="pup-skills.js"></script> <!-- defines pup skills feature -->
```

### Key Rules for Making Changes
- **Where is X?** — If it renders the Overview page (today, calendar, time blocks, kanban): `overview.js`. If it's a secondary page (recurring, shopping, travel, birthdays, recipes) or task CRUD or selection/context menu: `features.js`. If it's pup skills: `pup-skills.js`. If it's a shared utility, Supabase helper, date function, or undo/redo: `core.js`.
- **Adding a new shared function** (called from multiple files) → put it in `core.js`.
- **Cross-file function calls are safe** — all 4 files share global scope. A function defined in `core.js` can be called from `features.js` and vice versa.
- **`init()` is in `features.js`** — it runs at the end of that file and calls `renderAll()` (overview.js) and `syncAll()` (core.js). This works because scripts are synchronous — all 4 files are fully loaded before any user interaction.
- **`skipRecVirtThisWk` and `unscheduleWRec`** are in `features.js` (not core.js), even though they're called from the overview calendar chips. This is fine because the calls happen at event-fire time, after all scripts have loaded.
- **Pup skills `_pupUndoDirty` flag** interacts with `syncAll()` in `core.js` via the global `_pupUndoDirty` variable. Do not move either without updating the other.
- **CSS stays in `index.html`** — it's only ~674 lines and is tightly coupled to HTML class names. Do not split it out.

### What NOT to Split Further
- The CSS from `index.html` (too tightly coupled to HTML)
- The inline clock `<script>` in `index.html` (5 lines, standalone)
- `core.js` constants and state into separate files (everything depends on them loading together)

## Layout Structure

- **Root layout**: sidebar (fixed, 186px) + `.main` (flex:1, overflow-y:auto, padding:22px 56px 36px 56px)
- **`.overview-cols`**: 2-column grid (`2.2fr 2.55fr`, gap 14px, `height:664px`, margin-bottom:14px).
  - Col 1: `.overview-left` — flex column, gap 14px. Contains Today+TB card (`flex:1`) + Need to Assign card (`flex-shrink:0`, height:90px).
  - Col 2: `.row1-right-panel` — flex column, gap 14px, min-height:0. Contains `.row1-right-top` (fixed height 160px, 3-column grid: Weekly Reset, Shopping, Quick Links) + calendar card (`flex:1`).
- **Top-right fixed controls**: `.top-right-controls` (position:fixed, top:14px, right:20px) — dark toggle + sync bar.
- **`#backToOv`**: fixed button at top:52px, right:20px (below sync). Hidden on Overview; `display:flex` on all other pages. Controlled by `showPage()`. Never placed inside page content.

## Header Rules (All Pages)

- **`.ov-topbar`**: `position:fixed; top:14px; left:0; right:0; display:grid; grid-template-columns:1fr auto 1fr`. The **date is always the exact viewport center** — label+dot go in `.ov-topbar-left` (flex, justify-content:flex-end), dot+time in `.ov-topbar-right` (flex, justify-content:flex-start). `pointer-events:none`.
- **All pages use `padding-top:60px`** — identical regardless of whether Back to Overview is present. To change: search `padding-top:60px` (replace_all) and update height calcs below.
- **Back to Overview** is never inside page HTML. It lives as `#backToOv` (fixed, top:52px right:20px) and is shown/hidden by `showPage()`.
- **No `.back-btn`** elements in page content (`.back-btn { display:none }`).

### Page height calculations (tied to padding-top)
| Page | Element | Current value |
|------|---------|---------------|
| Overview | `.overview-cols` height | `min(740px, calc(100vh - 84px))` |
| Recurring | `#rt-outer` height | `calc(100vh - 84px)` |
| Pups | grid height | `calc(100vh - 80px)` |

If `padding-top` changes by N px, subtract N from each calc value above.
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

## Time Block Scroll Range

- **`HOURS`**: `[...Array(20)].map((_,i)=>i+4)` — 4am through 11pm (20 rows). Scrollable range covers 4am–midnight; day does not shift until scrolled past these bounds.
- **Default scroll on day change**: `scrollTop = Math.round((6.5 - HOURS[0]) * 60 * PX)` — positions 6:30am at top of view.
- Day shift triggers only when `atTop` (scrollTop ≤ 0, i.e., past 4am) or `atBot` (scrolled past 11pm/midnight).

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
  - `biweekly`: show every 2 weeks. Anchor = Monday of week containing `starting_date`. Show when `weekDiff % 2 === 0` and `weekDiff >= 0`. **Requires `starting_date`** — returns false if missing.
  - `monthly`: show on the week containing `repeat_date` day-of-month. `appears_on_date` is ignored for monthly.
- `getRecurringWeekTasks()` returns `{id, name, category, due_date, done, _recId, _virtual, _wkKey}`. It does **NOT** set `_isWrec`. Only `wrecForDay`, `wrecToday`, and `wrecThisWk` builders set `_isWrec:true`. Always check the builder, not the function, when looking for `_isWrec`.
- Overdue wrec tasks: detected via `_dateOverrides[wkKey] < today` and `!(r._doneByWk&&r._doneByWk[wkKey])` (use `_doneByWk`, not `_done`).
- **renderToday() overdue loop**: `for(let w=0; w>=wkOff-4; w--)` collects virtual recurring tasks from up to 4 weeks back. Each task is deduped by `_recId` — only the most-recent-week occurrence is kept. The cascading skip check (`for sw=w; sw<=0; sw++`) inspects ALL weeks from the occurrence week through today; if ANY week has `__skip__`, the entry is excluded. `getOvRecurring()` applies the same cascading check — they must stay in sync or the banner will count tasks not shown in the list.
- **wrecToday** uses `_wkKeyNow = getWkKey(wkOff)` (calendar view week, not always today's week). Shows WR tasks where `_dateOverrides[_wkKeyNow] === ds` OR overdue (`< ds`) when `dayOff===0`.
- **wrecThisWk** in `renderWkSummary()`: filters using direct key lookup `r._dateOverrides[wkKey]` (not `Object.values()` scan). Only shows WR tasks where `_dateOverrides[wkKey]` exists and is not `'__skip__'`. Returns objects with `_wkKey` set. This makes it immune to historical overrides from other weeks. Do NOT use `Object.values()` scan here — it can match stale dates from past weeks and produce inconsistent output.
- **wrecForDay / wrecForDayDone** in `renderWkCal()`: filter `r._dateOverrides[wkKey2] === ds`. Done vs undone split uses `_doneByWk[wkKey2]`. The `wkKey2 = getWkKey(wkOff)` is the same key for the entire week — not day-specific.
- **`isWRecDueThisWeek(r, off)`**: weekly → always true; biweekly → requires `starting_date`, computes `weekDiff` from Monday of `starting_date`'s week; monthly → checks if any week date matches the day-of-month. Same logic as `getRecurringWeekTasks()` — keep both in sync.
- DB save for recurring: `PATCH recurring_tasks { date_overrides: r._dateOverrides }` using `recQs(id)`.
- New recurring task payload must include: `name`, `is_weekly_reset`, `appears_on_date`, `cadence` (always, never omit — NOT NULL in DB). Do NOT send `day_of_week` — column does not exist in `recurring_tasks` schema.
- Optional columns to include when present: `appears_on_date`, `starting_date`, `repeat_date`, `day_added`, `task_due_day`. Do NOT send `day_of_week`, `repeat_day` — these do not exist in the schema.
- **Local temp ID must use `rec-tmp-` prefix** (not `l-`). The sync `localPending` filter only preserves `rec-tmp-` and `rec-local-` prefixes. Using `l-` causes the entry to be discarded on next sync if the POST hasn't resolved.
- After POST succeeds: replace temp entry with `{...sv[0], _doneByWk:{}, _done:false, _dateOverrides:{}}` and call `save()`.

## Weekly Reset Done State

- Done state is **per-week**, keyed by `getWkKey(wkOff)` in `_doneByWk`. Never use the hardcoded `'weekly-reset'` key.
- `togRec(id, done)`: writes `r._doneByWk[getWkKey(wkOff)] = true` (or deletes the key on uncheck). PATCHes `done_by_week` to Supabase.
- `renderRecOv()` and `renderWeeklyPage()`: compute `isDone` as `!!(r._doneByWk && r._doneByWk[getWkKey(wkOff)])` — not from `r._done`.
- Sync init: `isDone = !!(dbwk[getWkKey(0)])` — reads current week key from DB `done_by_week`.
- Result: tasks are unchecked at the start of each new week automatically.

## Duplicating Recurring Tasks

- Use `uniqueRecName(base)` to generate a unique name: appends ` (2)`, ` (3)`, etc. if `base` already exists in `st.recurring`.
- Local copy: `{...r, id:tempId, name:dupName, starting_date:todayDs, _doneByWk:{}, _done:false, _dateOverrides:{}}`.
- DB payload: `{name:dupName, is_weekly_reset, cadence, starting_date:todayDs}` + optional `appears_on_date`, `repeat_date`, `day_added`, `task_due_day`.
- `starting_date` is always set to today's date (`d2s(new Date())`), not copied from the original.
- All other attributes are copied from the original.

## Dropping Tasks onto Time Blocks (dropOnTB)

- **Regular tasks**: `due_date` updated to block's `ds`, PATCHed to Supabase `tasks`.
- **`wrec::` and `rec::` (recurring)**: `_dateOverrides[wkKeyFromDs(ds)] = ds` set and PATCHed to Supabase `recurring_tasks { date_overrides }`. This updates the task's date in all views (today, weekly calendar, overdue banner).
- **`shop::` (shopping)**: `due_date` updated to `ds`, PATCHed to Supabase `shopping_list`. Shows on correct day in all views.
- All three call `renderAll()` so every view updates immediately. Undo restores previous date.

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
- `recurring_tasks` POST must include: `name`, `is_weekly_reset`, `cadence` (all required/NOT NULL). `day_of_week` and `repeat_day` do NOT exist as columns — never send them. Valid optional columns: `appears_on_date`, `starting_date`, `repeat_date`, `day_added`, `task_due_day`.
- `sbReq` error toast shows actual Supabase error message text (parsed from JSON `message` field) for 8 seconds — use this to diagnose column/schema errors.
- **Undo ID pattern**: use a mutable `let serverId=null` captured by the undo closure. Set `serverId=String(sv[0].id)` after POST resolves. Undo reads `serverId||localId` at call-time so it always uses the correct DB id. This allows undo to be registered immediately (good UX) and still correctly DELETE from Supabase.
- Do NOT use `l-` prefix for recurring task temp IDs. Use `rec-tmp-` so sync preserves them as localPending.

## Sync Safety

- On `init()`, when Supabase config is present, `deletedRecIds` is cleared before sync (`deletedRecIds=new Set();save()`). DB is authoritative — stale deleted IDs from localStorage would otherwise filter out valid tasks.
- `syncAll` `if(rec)` guard: only replaces `st.recurring` when `rec` is non-null (error returns null, preserving local state).
- Race condition guard in `saveRecModal`/`ctxDoDuplicate`: after POST resolves, `findIndex` by localId; if not found (sync ran and replaced it), push only if DB id not already present.
- `syncAll` `_dateOverrides` preservation: all locally-set overrides not yet in DB are preserved (not just `__skip__`). This prevents WR scheduling dates from being lost in the 30s sync window.

## Recurring Task Skip / Delete Routing

- `skipRecVirtThisWk(rid, wkKey)`: starts with a WR safety guard — if task is `is_weekly_reset`, redirects to `unscheduleWRec`. Prevents WR tasks from ever receiving `__skip__` in their `_dateOverrides`.
- `unscheduleWRec` vs `skipRecVirtThisWk` render calls: `unscheduleWRec` calls `renderAll()` only. `skipRecVirtThisWk` calls `renderWeeklyPage()`, `renderToday()`, `renderWkSummary()`, `renderWkCal()`, and `renderDayTB()` if open. It does **NOT** call `renderRecOv()` — non-WR task removal must never touch the Weekly Reset card. Both remove linked time blocks (`isInWk(b.ds, wkOff)`).
- Multi-select Delete (keyboard): `rec-virt-{id}` items are checked for `is_weekly_reset` before acting. WR tasks → unschedule (same as `wrec-` path, stored in `wrecRestores`). Non-WR tasks → permanent delete (stored in `recCopies`, `deletedRecIds.add`). The `rec-virt-` prefix can represent EITHER type — always check `is_weekly_reset`.
- Multi-select Delete undo: single `pushUndo` closure handles all types — restores shop `due_date`, WR `_dateOverrides`, and re-POSTs deleted tasks/recurring. Undo for recurring does NOT restore `notes`, `pup_related`, or extra optional fields.
- `getOvRecurring()`: applies the same cascading `__skip__` check as `renderToday` — if a task is `__skip__`'d for week `w` or any later week up to the current, it is excluded from the overdue banner count. Without this, the banner can show a task that has been removed from the today list. WR tasks in `getOvRecurring` are only checked at `w===0` (current week) with composite dedup key `'wrec-'+r.id+'-'+wkKey`.

## Selection ID Prefixes

| Prefix | Source | Type | Delete action |
|--------|--------|------|---------------|
| `String(t.id)` | regular task chip/row | task | permanent delete |
| `rec-virt-{id}` | non-WR chip, renderRecOv row, management table row | recurring (non-WR or WR) | check `is_weekly_reset` first |
| `wrec-{id}` | WR chip in weekly calendar | WR recurring | unschedule only |
| `shop-cal-{id}` | shopping chip/row | shopping | remove from calendar (null due_date) |
| `tv-{id}` | travel banner | travel | permanent delete |

- `dragId` format for recurring: `wrec::{recId}` (WR tasks), `rec::{recId}::{dueDate}` (non-WR). When parsing drops, always use `split('::')[1]` for recId — the date suffix in `rec::` is ignored at lookup time.
- `dropOnTodayList` uses `getWkKey(wkOff)` (current calendar week) when setting `_dateOverrides`, not the task's `_wkKey`.

## Weekly Reset Card Sorting

`renderRecOv()` sorts WR tasks: done tasks last, then by cadence order (weekly=0, biweekly=1, monthly=2, other=3), with pup-related tasks always last (order=10).

## Dev Badge

- Fixed-position badge `id="devBadge"` at bottom-left. Tracks current batch (e.g. `DEV-11`). `display:none` by default (enabled in dev).

## Recurring Tasks Page

- Page ID: `page-weekly` (unchanged). Accessible via sidebar "Recurring Tasks" and Quick Link "🔄 Recurring Tasks" (`showPage('weekly')`).
- Layout: two-column grid (`1fr 1fr`). Left = "Weekly Reset Recurring", Right = "Non-Weekly Reset Recurring".
- Each column contains 4 cadence groups rendered into: `#rt-wr-weekly`, `#rt-wr-biweekly`, `#rt-wr-monthly`, `#rt-wr-other` (left) and `#rt-sch-weekly`, `#rt-sch-biweekly`, `#rt-sch-monthly`, `#rt-sch-other` (right).
- `renderRecurringPage()` renders all 8 groups. Called by `renderWeeklyPage()` (which also keeps hidden compat elements `#wrBar`, `#wrPct2`, `#wrPL` in sync).
- Each group rendered by `renderRtGroup(containerId, tasks, isWr, cadence)` as a `.card` with: header (cadence label + count + modal-open `+`), task list, quick-add row.
- Task rows: `onclick=selTask`, `ondblclick=openRecEditModal`, `oncontextmenu=showCtx`. For weekly reset rows: checkbox via `togRec`. For non-weekly rows: spacer in place of checkbox. Visible duplicate button `⧉` calls `duplicateRecDirect(rid)`.
- Quick-add row: text input + optional day select (weekly/biweekly: day-of-week; monthly: day-of-month). `addRecDirect(inputEl, isWr, cadence)` saves locally and POSTs to Supabase.
- `openRecModalForSection(type, cadence)` opens the existing recModal pre-filled with the right type and cadence.
- `duplicateRecDirect(rid)` is equivalent to `ctxDoDuplicate` for recurring tasks — generates unique name via `uniqueRecName`, POSTs to DB, supports undo.
- Hidden backward-compat elements on the page: `#wrBar`, `#wrPct2`, `#wrPL`, `#wrList`, `#shopFull`, `#shopCountLbl`, `#shopSortBtn`, `#nsN`, `#nsS` — all `display:none`. These prevent errors in `renderWeeklyPage()` and `renderShopFull()` which are still called on page show.
- "Other" cadence group catches any task where cadence is not weekly/biweekly/monthly. `addRecDirect` for "other" bucket saves with cadence `weekly`.

## pup_related Field

- `pup_related` is a boolean column on `recurring_tasks` (NOT NULL default false).
- Weekly reset card (`#recList` / `#recListPup`) splits into 2 columns: Regular (left) and 🐾 Pup (right).
- `renderRecOv()` routes each item to `#recList` or `#recListPup` based on `r.pup_related`.
- Quick-add in `renderRtGroup` for weekly reset includes a 🐾 checkbox (`id="qa-pup-{containerId}"`). Read via `pupEl.checked` in `addRecDirect`.
- `recModal` shows a 🐾 Pup related checkbox (`id="recPupRelated"`) only when type is `weekly_reset`. Hidden via `updateRecTypeUI()`.
- POST/PATCH payloads include `pup_related` when true.

## Today List

- Tasks in `#todList` render without category background color (`noColor:true`). Overdue (red) and important (yellow) backgrounds still show.
- `#todList .ti` has extra left margin (`margin-left:10px`) to shift slightly right.
- Shopping overview (`#shopOv`) items use `.chk-wrap` label for consistent spacing with weekly reset.

## Unassigned Tasks Badge & Popup

- **"Need to Assign" container removed** from overview-left. No `#unList` element in the DOM.
- **Badge**: `id="unAssignedBadge"` — 22px circle inside `.wkc-foot` (left side). Shows count of unassigned tasks. Hidden (`display:none`) when count is 0.
- **Filter**: `st.tasks.filter(t => !t.due_date && !t.done && t.category !== 'Long term')`.
- **`renderUnassigned()`**: updates badge count/visibility AND re-renders popup contents if `#unMenu` is currently open (for instant paste feedback).
- **`.wkc-foot`**: changed from `display:none` to `display:flex; align-items:center; padding:4px 8px; flex-shrink:0; min-height:30px`. Contains badge (left) + spacer.
- **`+ Add` button removed** from `.wkc-foot`.
- **Popup** `#unMenu`: `position:fixed`, body-level. Width 300px, max-height 360px. Renders `tRow(t, {cat:true, drag:true, noColor:true})` for full task interaction (click select, dblclick edit, right-click menu, delete button, drag).
- **Popup position**: `left = max(8, r.right - 300)` (right edge aligns with badge right edge), `bottom = window.innerHeight - r.top + 6` (opens upward above badge, overlapping weekly calendar area).
- **Backdrop** `#unMenuBack`: `position:fixed; inset:0; z-index:9996` — closes menu on outside click. Pointer-events disabled during drag so drop targets receive events.
- **Drag from popup**: uses `dStart(event, id)` / `dEnd(event)`. `dEnd` consolidates dragend cleanup: removes dragging class, clears body-dragging, hides wkc edges, closes popup, restores backdrop pointer-events.
- **`activePg`**: module-level variable tracking current page (set in `showPage`). `renderUnassigned` uses it to hide badge on non-overview pages (badge only meaningful on overview where wkc is visible).

## Notes Field

- `notes` is a text column on both `tasks` and `recurring_tasks`.
- Task modal (`tModal`) and recurring modals (`recModal`, `recEditModal`) all have a notes textarea.
- Notes display in time blocks via `.tb-notes` div when non-empty (already rendered by `drawTBBlock`).
- `saveRecModal` / `saveRecEdit` include `notes` in POST/PATCH payloads.
- `openRecEditModal` populates `recEditNotes` textarea from `r.notes`.

## Recurring Color System

- `'weekly_reset'` in CATS: `bg:'#eff6ff'` (lighter blue, same as Home) — used for weekly reset recurring tasks.
- `'recurring'` in CATS: `bg:'#e6fffa'` (light teal) — used for non-weekly-reset recurring tasks.
- `tRowTodayVirt` and `tRowWk` use `gc(t._isWrec?'weekly_reset':'recurring')` to apply the correct color.

## TB Arrow (Not on Timeblock)

- `_hasTBToday(t)` mirrors `getVisibleBlocks` overdue logic: if `dayOff===0 && isOv(t.due_date) && !t.done`, any block linked to the task counts as "on timeblock" (regardless of `b.ds`), since overdue blocks show on today's view.

## Move to Today Persistence

- `rolloverOverdue()` writes `localOverrides[sid]={due_date:today}` and `pendingLocal.add(sid)` for each task before the async PATCH, preventing sync from overwriting the new date. After PATCH resolves, the override is cleared.

## Weekly Reset Overview Filter

- `renderRecOv()` filters weekly reset tasks using `isWRecDueThisWeek(r, wkOff)` — same cadence logic as `getRecurringWeekTasks` but for `is_weekly_reset===true` tasks.
- Weekly cadence → always shows. Biweekly → alternating weeks based on `starting_date`. Monthly → only during the week containing the target date (day-of-month or Nth weekday).
- Tasks not scheduled this week (e.g., "Mirrors" on 1st Friday when it's not that week) are hidden from the overview card.

## Recurring Tasks Page UI

- Section labels (Weekly, Biweekly, Monthly): `font-size:12px;font-weight:800` (not uppercase/small-caps).
- "Adds On" and "Due On" `<th>` and `<td>`: `text-align:center`.
- "Starting" `<th>` and `<td>`: `text-align:right`.

## Quick Notes

- `#qnBtn`: fixed bottom-right (bottom:20px, right:20px), z-index:950, toggles panel.
- `#qnPanel`: fixed bottom-right slide-up panel (bottom:70px, right:20px), z-index:949. Opens with `.open` class via `transform/opacity` transition.
- Supabase table: `quick_notes(id, note_text, is_visible, created_at, hidden_at)`.
- `loadQN()`: GET `?is_visible=eq.true&order=created_at.asc`. Called on panel open.
- `addQN()`: POST `{note_text, is_visible:true}`. Pushes returned row to `_qnNotes`, re-renders.
- `deleteQN(id)`: PATCH `{is_visible:false, hidden_at:now()}`. Removes from local array immediately before PATCH (optimistic).
- Outside-click listener closes panel when clicking outside `#qnPanel` and `#qnBtn`.
- Do NOT hard delete rows — always soft-delete via `is_visible=false`.

## Pup Skills Page

- Page ID: `page-pups`. Sidebar nav: `showPage('pups')`. Rendered by `renderPupsPage()` + `renderPupTable()`.
- Supabase table: `pup_skills(id, pup, skill, stage, level, category, order, next_step, comments, focus)`.
  - `pup`: 'Mochi' | 'Sunny'. `stage`: 'In Progress' | 'Mastered' | 'Not Started'. `focus`: boolean. `category`: 'commands' | 'manners' | 'fun' | null. `order`: integer sort hint.
- Stored in `st.pup_skills`, persisted in localStorage. Fetched in `syncAll`.
- Layout: 3-column grid (`1fr 1fr 2.2fr`). Col 1 = Mochi card, Col 2 = Sunny card, Col 3 = All Skills table.
- Colors: Mochi = `#8b5cf6` (purple), Sunny = `#fbbf24` (yellow).

### Dog Cards (Mochi / Sunny)
- Header: circular headshot **92px**, overlaps card top — `position:absolute; top:-36px; left:50%; transform:translateX(-50%)`. Card is `overflow:visible; position:relative`. Glow via `box-shadow`: Mochi = `rgba(139,92,246,0.32)`, Sunny = `rgba(251,191,36,0.38)`, spread `0 0 22px 8px`.
- Header row is a **3-column grid** (`1fr 92px 1fr`, `min-height:52px`): pup name (left, `padding-left:13px`) | headshot spacer (center, empty) | "N in progress" (right, `padding-right:13px`).
- Grid container (`padding-top:26px`) gives headshots clearance above card top. To change headshot size, update img `width/height`, `top` (= `-height/2`), and center column width.
- **Themed skills container**: Train This Week + Up Next wrapped in one div with pup-colored background (Mochi `rgba(139,92,246,0.05)`, Sunny `rgba(251,191,36,0.07)`) and matching border. Only the container is tinted — inner skill cards are not.
- Progress bar (8px, bottom of card): green = mastered, yellow = in progress, grey = not started. Each segment has `onmouseenter` → `showPupStageTip(event, 'Stage: N', color)` colored tooltip.
- **Train This Week**: skills where `focus===true`. Shows skill name, next step, comments (not for mastered). Has mastered checkbox.
- **Up Next**: `stage==='In Progress'` AND `focus!==true`. Grouped by category (commands → manners → fun → other). Has mastered checkbox per row.
- Both sections use `skillCardRow(s, cls)`: mastered checkbox (purple accent), skill name (strikethrough if mastered), next step + comments hidden when mastered.
- Checking the mastered checkbox calls `togglePupMastered(id, checked)` → sets stage to 'Mastered' (or 'In Progress' on uncheck), snapshots, syncs.

### Table (All Skills)
- Columns (left→right): dot (pup color), Skill, Level, Stage, Next Step, Category, ··· (edit button).
- **Dot column**: mastered rows show a dimmed (50% opacity) colored dot (purple/yellow by pup). Non-mastered rows show a focus checkbox colored by pup (`accent-color`).
- **Mastered rows**: no background color. Non-mastered rows: pup-colored tint (purple 7% / yellow 8%).
- **Default sort** (no sort col active): mastered last → category order (commands=0, manners=1, fun=2, other=9) → focus first → pup → level (Easy/Medium/Hard) → `order` field.
- **Section dividers** (default sort only): category headers (muted text) for non-mastered; "Mastered" header (green text, green border) separating mastered section. No category headers within mastered section.
- Category column displays plain capitalized text (e.g. "Commands"), no chips or color.
- `colIdx` for filter popup: `{pup:0, skill:1, level:2, stage:3, next_step:4, category:5}`.
- Filter list: "—" always sorted to top; category values display capitalized.

### Modal (Add / Edit)
- No title text. Top row: Mochi/Sunny dog toggle pill (left) + focus checkbox (right, no label).
- Row 1 (2-col): Skill | Stage. Row 2 (3-col): Category | Level | Order.
- Next Step: dropdown — blank, "1. Duration", "2. Distance", "3. Distraction".
- Comments: text input. Hidden `<select id="pmPup">` synced by `setPupModalDog(val)`.
- `pmOrder`: number input for sort order.

### Logic Rules
- **Focus → In Progress**: checking focus (in modal save or `setPupField`) auto-sets `stage='In Progress'` unless already Mastered.
- **Mastered checkbox in cards**: `togglePupMastered(id, true)` sets stage=Mastered; false sets stage=In Progress.
- **Inline cell edit** (`pupCellEdit`): next_step uses a select (same 3 options as modal). Category uses select (commands/manners/fun).
- **Undo/Redo**: `pupSnapshot()` before any destructive op. `_pupUndoDirty` flag blocks auto-sync overwrite. `_pupSyncToServer(prev, next)` diffs and fires minimal API calls.
- **Outside-click deselect**: document-level handler stored at `window._pupOutsideClick`, re-registered each `renderPupsPage()`. Clears `_selPupIds` when click is outside `#pupTblBody` and page is active. Clicking same row again also deselects.

## Auto Timeblocks Overlap Layout

- Auto blocks participate in `computeTBLayout(ds, extraBlocks)` alongside normal blocks — they share columns when overlapping.
- `drawAutoTBBlock` applies same `left/right/width:auto` column math as `drawTBBlock`. Time label hidden when `_ncols > 1`.
- Weekday dot markers: faint grey dots (`rgba(180,175,200,.4)`, 3px) rendered at `left:8px` inside `.tb-tlbl` for h===8 and h===16 on weekday dates only.

## Auto Timeblocks

- Supabase tables: `auto_timeblocks(id, label, start_time, end_time, day_scope, is_enabled, sort_order, created_at)` and `auto_timeblock_overrides(id, base_id, date, start_time, end_time)`.
- Stored in `st.autoTimeblocks` and `st.autoTBOverrides`. Fetched silently in `syncAll` after main block fetch.
- `cfg.showAutoTB` (boolean, default `true`) toggles display. Toggle button `id="autoTBToggle"` in `tod-tb-header`.
- `getAutoTBForDate(ds)`: returns resolved blocks for a date — uses override if `auto_timeblock_overrides` row exists for `base_id+date`, else uses base times. Returns `{_atbId, _ovId, label, sm, dur, ds}`. Skips if `day_scope='weekdays'` and `ds` is Sat/Sun. Skips if override has `start_time=null` (deleted for that day).
- `drawAutoTBBlock(col, atb, ds)`: renders with `.atb-block` class (light grey, `z-index:1`, no glow on hover/select). Has X button (`.atb-del`) calling `delAutoTBForDay`. Draggable — on move creates/PATCHes `auto_timeblock_overrides` for that date only. Sets `selAtbId`/`selAtbDs` on mousedown for Delete key support.
- `delAutoTBForDay(atbId, ds, ovId)`: deletes for one day only. If override exists, PATCHes `start_time=null, end_time=null`. If not, POSTs a new override with null times. `null` start_time = deleted sentinel.
- `toggleAutoTB()`: flips `cfg.showAutoTB`, saves, re-renders TB, updates button opacity.
- `selAtbId`/`selAtbDs`: track currently selected auto block. Delete/Backspace key triggers `delAutoTBForDay` when set and no input is focused.
- Auto blocks never appear in Today list, overdue banner, metrics, recurring page, or weekly calendar — timeblock only.
- All DB interaction uses `sbReqSilent` (no error toasts).

## Pup Skills State Variables

- `_pupEditId` — id of skill being edited in modal (null = add mode).
- `_selPupIds` — Set of selected table row IDs (multi-select).
- `_lastSelPupId` — last clicked row ID (for shift-range select).
- `_copiedPups` — array of copied skill objects (Cmd+C).
- `_pupCtxId` — row ID that triggered right-click context menu.
- `_pupSortCol` / `_pupSortDir` — active sort column and direction (1=asc, -1=desc).
- `_pupFilter` — `{col, type:'text'|'set', text|vals}` or null.
- `_pupUndoStack` / `_pupRedoStack` — snapshot arrays (max 20).
- `_pupUndoDirty` — blocks auto-sync overwrite after undo/redo.
- `window._pupOutsideClick` — document-level deselect handler reference.

## Birthdays Page

- Page ID: `page-birthdays`. Sidebar nav: `showPage('birthdays')`. Rendered by `renderBdayPage()`.
- Supabase table: `birthdays(id, name, birthday, present_ideas)`. `present_ideas` is a TEXT column storing a JSON array of strings (must be added manually: `ALTER TABLE birthdays ADD COLUMN present_ideas TEXT;`). Parse with `_bdayPresentList(b)`.
- Stored in `st.birthdays`, persisted in localStorage. Fetched in `syncAll`.
- Layout: full-screen `.card` (no header) with `#bdayPageContent` filling the card. Page uses `display:flex; flex-direction:column; height:100vh; padding:clamp(12px,3vw,56px); padding-top:60px`.
- **Grid layout**: 4×3 month grid (`.bday-grid`), `grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(3,1fr)`. All 12 month cards equal size. Birthdays listed under their month, sorted by day ascending. Rows wrapped in `.bday-tbl`.

### Row Layout (`.bday-tbl` / `.bday-row`)
- `.bday-tbl`: `display:grid; grid-template-columns:1fr auto auto auto` — 4 columns.
- `.bday-row`: `display:grid; grid-column:1/-1; grid-template-columns:subgrid` — participates in parent grid so columns align across all rows in a card.
- **Children (always 4)**: `.bday-name-cell` (1fr) | right-badge (auto) | `.bday-date-lbl` (auto) | `.bday-del-btn` (auto).
- `.bday-name-cell`: `display:flex; align-items:center; gap:4px` — contains `.bday-name` + optional `.bday-gift-btn` inline.
- **Right-badge** (`rightBadge`): countdown OR age pill, whichever is non-empty. Countdown takes priority (≤30d). If neither, `<span></span>` placeholder. This ensures countdown and age always occupy the same column — no misalignment.
- Click/dblclick/contextmenu handlers are on `.bday-row` (not a `.bday-main` wrapper — that was removed).

### Countdown / Age
- **Countdown** (`.bday-countdown`): Today=orange, Tmrw=light orange, ≤7d=yellow, ≤30d=green. Returns `''` for >30d or past — triggers age pill fallback.
- **Age pill** (`.bday-age-pill`): shows age (past) or `"turns N"` (upcoming). Only rendered when birth year is known (`_bdayHasYear`). Styled as a small badge.
- Countdown and age share one column (merged as `rightBadge`) — never two separate columns.

### Color scheme
- **Non-current months**: all rows use `color:#777` (same for past and future — no dimming by past status).
- **Current month upcoming**: dark text `#222`, accent-colored age pill.
- **Current month past** (`.bday-month-current .bday-past`): lighter grey `#999` for name/date/pill.

### Current Month Card
- `.bday-month-current`: stronger glow (`box-shadow`), thin accent border, whiter background.
- Month name: accent color (dark in light mode).
- **+ button** (`.btn-plus`) inside card, `position:absolute; top:8px; right:8px` — opens `toggleBdayAddMenu(event)` dropdown showing "Add Birthday" + accepted date formats.
- **Double-click empty space** → `openBdayModal(null, monthIndex)` — opens add modal pre-filled with that month. Guard: `if(!event.target.closest('.bday-row'))`.

### Present Ideas (Gift Popup)
- **No inline panel** — presents managed via floating popup only.
- `.bday-gift-btn` (🎁 count): click → `openBdayPresentPopup(event, id)`. Hover → `showBdayPresentTip(event, id)` (reuses `#pupTooltip`). Rendered inside `.bday-name-cell` right of the name.
- `#bdayPresentPopup`: `position:fixed` popup outside page content — survives `renderBdayPage()` re-renders.
- `openBdayPresentPopup(e, id)`: sets `_bdayPresentPopupId`, calls `_renderBdayPresentPopup`, positions near button. Outside-click uses `_closeBdayPresentPopupOutside` (re-registers itself while popup contains click target).
- `_renderBdayPresentPopup(pop, id)`: builds popup HTML — gift list with per-item ✕ (`delBdayPresent`), add input + button (`addBdayPresentFromPopup`).
- `addBdayPresentFromPopup(id, inp)`: updates `b.present_ideas`, calls `renderBdayPage()`, refreshes popup in place, PATCHes `present_ideas` to Supabase.
- `delBdayPresent(id, idx)`: splices list, calls `renderBdayPage()`, refreshes popup if open (`_bdayPresentPopupId === id`), PATCHes Supabase.
- `showBdayPresentTip(e, id)`: shows bullet list of presents in `#pupTooltip`. Does nothing if list is empty.
- Both PATCH functions guard against temp IDs: `if(!String(id).startsWith('l-'))`.

### Modal
- `#bdayModal` — name + date fields only. Present ideas managed via popup, not modal.
- `openBdayModal(id, month)` — edit mode pre-fills name/date; add mode with `month` pre-fills `"${month}/"` in date field.
- `saveBdayModal()` — POST new (temp `l-` id) or PATCH existing. Does NOT include `present_ideas`.
- Date field display: `_bdayEditFmt(b)` → `"5/21"` (no year) or `"5/21/25"` (with year).

### Other Interactions
- `delBday(id)`: guards temp IDs (`l-` prefix → skip DELETE). Removes from `st.birthdays`, re-renders, DELETEs from Supabase.
- **Selection**: `selBdayRow(e,id)` on `.bday-row` onclick. Single/Cmd/Shift click. `applyBdaySelHighlight()` syncs `.bday-sel` class.
- **Context menu**: `#bdayCtxMenu` — Edit (hidden multi-select), Duplicate, Delete.
- **Keyboard**: `Cmd+Z` → `bdayUndo()`, `Cmd+Shift+Z` → `bdayRedo()`, `Delete/Backspace` → `bdayCtxDelete()`, `Cmd+C/V` → copy/paste.
- **Undo/Redo**: `bdaySnapshot()` before any destructive op. `_bdaySyncToServer(prev,next)` diffs + fires minimal API calls.
- **State**: `_bdaySelIds` (Set), `_lastBdaySelId`, `_copiedBdays`, `_bdayCtxId`, `_bdayUndoStack`, `_bdayRedoStack`, `_bdayPresentPopupId`.
- **syncAll merge**: when syncing, merges local `present_ideas` into server data if server returns null (prevents PATCH race from wiping local state).

## Modal Enter / Escape Key Rules

**Pattern**: the overlay `div` owns the Enter and Escape handlers. Individual inputs inside a modal must NOT have their own `onkeydown` calling the save function — that causes double-fires (task added twice, etc.).

### Per-modal rules
| Modal | Enter saves via | SELECT skipped | Escape closes |
|---|---|---|---|
| `tModal` | overlay `onkeydown` | no (no selects in path) | overlay `onkeydown` |
| `recModal` | overlay `onkeydown` | yes (`tagName!=='SELECT'`) | overlay `onkeydown` |
| `recEditModal` | overlay `onkeydown` | yes (`tagName!=='SELECT'`) | overlay `onkeydown` |
| `bdayModal` | overlay `onkeydown` | no | overlay `onkeydown` |
| `shopEditModal` | overlay `onkeydown` | no | overlay `onkeydown` |
| `pupModal` | overlay `onkeydown` | yes | overlay `onkeydown` |
| `bModal` | input `onkeydown` (title only) | — | — |
| `travelModal` | input `onkeydown` (name only) | — | — |

### Save-function empty-name behavior
All save functions must **close the modal** (not silently `return`) when the required name/title field is empty:
```js
if(!name){closeMod('modalId');return;}
```
This gives Enter a consistent cancel-if-empty contract.

### Textarea + Enter
Pressing Enter inside a textarea saves the modal (the overlay's `event.preventDefault()` prevents the newline). This is intentional — Enter saves everywhere.

### Document-level Enter fallback
`document.addEventListener('keydown')` also fires `saveTModal()` / `saveShopEdit()` / `saveRecEdit()` / `saveRecModal()` when the respective modal `.classList.contains('open')`. This is a fallback; the overlay fires first. The document handler must NOT gate on field content (e.g. `&&tName.value.trim()`) — the save function itself handles the empty case.

### Never add per-input Enter handlers
The `tCat` select in `tModal` uses a JS `addEventListener` with `e.stopPropagation()` to prevent Enter from bubbling (selecting from a dropdown fires Enter) — that is the only legitimate per-element override.

---

## Birthday Date Format (`_normBdayDate`)

All dates sent to Supabase as `YYYY-MM-DD` (PostgreSQL `date` type requires this). Sentinel year `1900` means "no year stored."

Accepts and normalizes any of these input formats:

| Input example | Stored as |
|---|---|
| `7/5` or `1/23` | `1900-07-05` (sentinel no-year) |
| `Jan 23` or `January 23` | `1900-01-23` (sentinel no-year) |
| `7/5/2025` | `2025-07-05` |
| `7/5/25` | `2025-07-05` (2-digit: ≤30 → 2000+YY, >30 → 1900+YY) |
| `Jan 23 1990` | `1990-01-23` |
| `1900-07-05` | passthrough (sentinel) |
| `2025-07-05` | passthrough |

**Helpers**:
- `_bdayHasYear(b)`: true if `birthday` is `YYYY-MM-DD` and year ≠ 1900.
- `_bdayMD(b)`: extracts `MM-DD` from either `YYYY-MM-DD` or legacy `MM-DD`.
- `_bdayFmtDate(b)`: display format — `"7/5"` (no year) or `"7/5/2025"` (with year).
- `_bdayEditFmt(b)`: modal field format — `"7/5"` or `"7/5/25"` (2-digit year).
- `_bdayAge(b, forDate)`: returns numeric age or null if no year.

---

## TB Block Done State Persistence

- `toggleTask`, `togRec`, and `togShop` must all call `sbUpdateBlock(b.id, {done})` for every linked TB block when the task/item is toggled. Without this, blocks revert to unchecked after next sync (the `time_blocks` table is the source of truth for `_done` on reload).
- Pattern (follow `toggleTask`): capture `linkedBlocks` before async calls, call `sbUpdateBlock` on each, and repeat in the undo closure with the previous value.
- `togRec` and `togShop` previously only updated `b._done` in memory but never wrote to `time_blocks`.

## Weekly Calendar (wkc) Wrec Done State

- `wrecForDay`/`wrecForDayDone` in `renderWkCal` and `wrecThisWk` in `renderWkSummary` must use `r._doneByWk[wkKey]` (not `r._done`) to determine done state. Using `r._done` is always falsy for wrec tasks, causing them to always appear undone in the weekly calendar chips regardless of whether they've been checked off.

## Drag-to-Overlap on Existing TB Blocks

- `.body-dragging .tb-block { pointer-events: none }` was removed — blocks now receive drag events so tasks can be dropped directly onto them.
- `dropOnTB(e, ds, h, row, smOverride)` accepts an optional 5th param. When `smOverride` is set, cursor-position math is skipped and the block is placed at exactly that `sm`.
- Each `.tb-block` in `drawTBBlock` and `.atb-block` in `drawAutoTBBlock` has `dragover`/`dragleave`/`drop` listeners. Drop calls `dropOnTB(e, b.ds, null, null, b.sm)` to create an overlapping block at the same start time.
- Visual feedback: `.tb-block.tb-drop-over` and `.atb-block.tb-drop-over` show a dashed purple outline during hover.

## Virtual Recurring Tasks — Drag Behavior

- `tRowTodayVirt` must set `effectAllowed='move'`, add `body-dragging` to document.body, and call `showWkcEdges(true)` on dragstart — matching `tRowShopVirt` and `dStart`. Without this, the browser does not reliably fire drop events on target elements.
- `tRowTodayVirt` uses `t._isWrec` to set the correct `dragId` prefix: `wrec::recId` for weekly reset tasks, `rec::recId::date` for others. Previously all virtual tasks used `rec::` prefix regardless of type.

## TB Block Done State — Render-Time Derivation

- `drawTBBlock` derives `b._done` from the linked item at render time (not from the stale block field): `linkedTask.done`, `linkedRec._doneByWk[wkKey]`, or `linkedShop.done`. This prevents stale `time_blocks.done` values from causing visual mismatch after sync.

## Auto Block Duration (`autoDur`)

- `dropOnTB` uses `autoDur(name, category)` helper to set default block duration on drop. Rules:
  - Name matches `/\bheb\b/i` → **60 min**
  - Name matches `/pilates/i` → **60 min**
  - Category is `'social'` or name matches `/social/i` → **120 min**
  - Everything else → **30 min**
- Applied to all four drop paths: wrec, rec, shop, regular task.
- To add new rules, edit `autoDur` inside `dropOnTB`.

## Git Workflow

- Stop hook: auto-commits and pushes to `origin/dev` branch after every Claude turn.
- "Push to production": merge `origin/dev` into `main`, push `main`.
- Auto-commit format: `Auto-commit [Mar 12 13:45]`.

## Local Backup System

- **`backup.js`**: Node.js script in `/sams-dashboard/`. Fetches all 9 Supabase tables and writes to disk. Runs independently of Claude — no dependency on AI tooling.
- **`backup_auto.json`**: Written by cron job daily at 8am. Overwrites the same file every run (no accumulation). Located in `/sams-dashboard/`.
- **`backup_manual.json`**: Downloaded via "Backup" button in dashboard top-right controls (next to Sync). Triggers a browser download to the Downloads folder.
- **Cron job**: `0 8 * * * /usr/local/bin/node /Users/samanthacohn/Documents/sams-dashboard/backup.js auto`. Laptop must be on and awake at 8am. Logs to `backup_cron.log`.
- **`restore.js`**: Restore script. Usage: `node restore.js backup_auto.json`. Deletes all existing rows then re-inserts from backup. To restore to a new Supabase project, update `SUPABASE_URL` and `SUPABASE_KEY` at the top of the file.
- **Backup structure**: `{ exported_at, mode, tables: { tasks, recurring_tasks, shopping_list, travel, birthdays, pup_skills, time_blocks, auto_timeblocks, auto_timeblock_overrides } }`.
- `backup_auto.json` date modified updates every time the cron overwrites it — use this to verify the cron ran.

## Recipes Page

### Schema
Supabase table `recipes`. Active columns: `id`, `name`, `meal_type`, `cuisine`, `time` (minutes, integer), `servings`, `notes`, `favorite`, `ingredients`, `instructions`, `source`, `created_at`. Removed columns (do not reference): `protein`, `prep_time`, `cook_time`, `difficulty`, `last_made_date`, `substitutions`, `storage_reheating`, `total_time`.

### State & Persistence
- `st.recipes` — array synced from Supabase, saved to localStorage under key `recipes`.
- `syncAll`: fetched with `sbReqSilent('GET','recipes',null,'?order=name.asc&select=*')`. Uses `_recUndoDirty` flag (same pattern as `pup_skills`) to prevent sync from overwriting local undo state.
- `_recFields(r)`: helper returning the DB field subset for POST/PATCH — `{name, meal_type, cuisine, time, servings, notes, favorite, ingredients, instructions, source}`.

### Page Structure
- `id="page-recipes"`, padding `22px 56px 36px 56px`, `padding-top:60px`. Populated by `renderRecipesPage()`.
- `page._recInit` guard: DOM skeleton (topbar, filter bar, card+table, side panel) is built once on first call. Subsequent calls rebuild only the filter bar and re-render the table.
- On `showPage('recipes')` and in `renderAll()`, `renderRecipesPage()` is called.

### Variables
- `_recipeEditId` — id of recipe being edited (null = add mode). **Not** `_recEditId` — that name is taken by recurring tasks.
- `_selRecIds` (Set), `_lastSelRecId`, `_copiedRecs`, `_recCtxId`
- `_recSortCol`, `_recSortDir` (1=asc, -1=desc)
- `_recFilter` — `{col, type:'text'|'set', text|vals}` or null (column header filter)
- `_recUndoStack`, `_recRedoStack`, `_recHdrClickTimer`, `_recUndoDirty`
- `_recSearch` — search bar value
- `_recMealFilter`, `_recTimeFilter`, `_recFavFilter` — active filter chip values
- `_recPanelId` — id of recipe currently shown in the side panel (null = closed)

### Table
Columns: ♥ (fav toggle) | Name | Meal Type | Time | Serves | Notes | ···
- Single-click header → `recHdrClick(col)` (250ms debounce) → `recSortBy(col)`. 3-state cycle: asc → desc → none.
- Double-click header → `recHdrDbl(e,col)` → `recFilterBy(e,col)`. Text filter for `name`/`cuisine`; set filter for other columns. Popup: `#recFilterPop` / `#rfContent`, class `.rfopen`.
- Empty table state: colspan 7.

### Filter Bar
Single row of chips + search. Built by `_buildRecFilterBar()`, injected into `#recFilterBarWrap` on every `renderRecipesPage()` call (focus preserved on `#recSearchInp` if active). Chips: meal type buttons (Breakfast/Lunch/Dinner/Snack/Dessert/Drink/Side), ♥ Favs, ≤30m, ≤1h.
- `recToggleMealFilter(m)` / `recToggleFavFilter()` / `recToggleTimeFilter(t)` — toggle state then call `renderRecipesPage()`.
- `recSearchChange(v)` — updates `_recSearch`, calls `renderRecipeTable()` only (no full re-render, no focus loss).

### Selection & Side Panel
- Single-click → `selRecRow(e,sid)` — selects row only (does NOT open panel). Clicking same selected row alone deselects and closes panel. Cmd/Ctrl+click toggles; Shift-click range. `applyRecSelHighlight()` adds `.rec-sel` class.
- Double-click row → `openRecSidePanel(id)`. `···` dots button → `openRecSidePanel(id)`.
- Outside click (anywhere not in table/panel/chips/search) → clears selection AND closes panel (`closeRecSidePanel()`). Outside click handler excludes `#recTblBody`, `#recSidePanel`, `[data-recmeal]`, `[data-recfav]`, `[data-rectime]`, `#recSearchInp`, `.rec-filter-bar`.
- Side panel: `#recSidePanel`, class `rec-side-panel`. CSS transition width 0 → 400px. Table wrap (`#recTableWrap`) gets `marginRight:400px` when open.
- `_recPanelId` persists across re-renders; `renderRecipesPage()` re-opens panel if set.
- Panel shows: name, fav button, meal type + cuisine pills, time + servings detail row, notes, ingredients, instructions, source, Edit button.

### Undo/Redo
`recSnapshot()` / `recUndo()` / `recRedo()`. Server-aware diff via `_recSyncToServer(prev,next)` — same pattern as `_pupSyncToServer`. `_recUndoDirty` blocks auto-sync from overwriting state after undo.

### Modal
`id="recipeModal"`. Fields: name*, meal_type, cuisine, time (number), servings (number), notes, ingredients, instructions, source. `saveRecipeModal()` handles both add and edit. Enter key submits (blocked for textarea/select).

### Context Menu
`id="recCtxMenu"`. Items: view details, edit, toggle favorite, duplicate, delete. Single-item actions (view/edit/fav) hidden when multi-select is active.

### Keyboard Shortcuts (recipes page only)
Cmd+Z → `recUndo()`, Cmd+Shift+Z → `recRedo()`, Delete/Backspace → `recCtxDelete()` (if selection), Cmd+C → copy to `_copiedRecs`, Cmd+V → paste (snapshot first).

### Interactions
- Double-click empty page area → `openRecipeAddModal()`.
- Double-click row → `openRecipeEditModal(sid)`.
- + button in card header → `openRecipeAddModal()`.
- Right-click row → `showRecCtx(e,sid)`.
- Escape → closes filter popup, context menu, and side panel.

---

## Travel System

### Table & Fields
- Supabase table: `travel(id, name, destination, start_date, end_date, travel_mode, notes)`.
- `travel_mode`: `'plane'` | `'drive'` | `null` (none). SQL to add: `ALTER TABLE travel ADD COLUMN travel_mode text;`
- Stored in `st.travel`. Fetched in `syncAll` with `?order=start_date.asc&select=*`.
- Local entries use `l-` prefix IDs before server confirmation.

### Sync Protection
- `pendingTravelIds` Set: add travel id before PATCH, remove after. `syncAll` skips overwriting entries in this set (same pattern as `pendingLocal` for tasks).
- `syncAll` travel merge also preserves local `travel_mode` if server data doesn't have it (fallback for missing column).

### Icons
- `tmIcon(t)`: returns `'✈️ '` for plane, `_CAR_SVG` inline SVG for drive, `''` for none/null. Used in task rows and chips.
- `_CAR_SVG`: inline SVG car silhouette constant defined near `tmIcon`.
- Banner label uses `modeIconHtml` (same values) + `escHtml()` for name/destination since banners use `innerHTML`.
- All banner `textContent` → `innerHTML` when mode icons are involved (SVG requires innerHTML).

### Modal (`travelModal`)
- Fields: name*, destination, start date*, end date, travel mode (select), notes.
- `openTravelModal(id, preStart, preEnd)`: pre-fills dates from drag-to-create.
- `saveTravelModal()`: reads `tvTravelMode`, includes `travel_mode` in POST and PATCH to Supabase.
- Enter key: overlay `onkeydown` saves if `event.target.tagName !== 'SELECT'`. The `tvTravelMode` select has its own `onkeydown` using `setTimeout(saveTravelModal, 0)` so the browser commits the selection before reading `.value`.

### Weekly Calendar Banners
- Sorted by `start_date` before rendering so earlier trips always take the top lane.
- Lane algorithm (`colLanes` array of Sets): `pickLane(si,ei)` finds first unoccupied lane across all columns the banner spans.
- Banner `top = 2 + lane*22px`. Per-column `paddingTop` set after all banners placed.
- `addBanner(labelHtml, startDs, endDs, s, onClick, isPast)`: uses `innerHTML` (not `textContent`) for the label.
- × delete button only rendered when trip ends this week (`ed <= wkDss[6]`).

### Monthly Calendar Banners
- Same lane algorithm using `rowLanes` Map keyed by `rowTop`.
- `getMoLane(rowTop, si, ei)` for per-row lane assignment.
- Continuation rows show `↳ label`.

### Travel Banner Interactions
- `ban.dataset.tvid` set for selection system (`tv-` prefix in `selectedTasks`).
- Click → select, dblclick → `openTravelModal(tv.id)`, contextmenu → `showCtx(..., tv.id)`.
- `applySelHighlight` handles `.wkc-banner[data-tvid]` elements with `tv-` prefix.

### Drag-to-Create
- `calDrag` object: `{active, startDs, endDs, view, moved}`.
- `mousedown` on week column day → starts drag; `mouseenter` extends range; `mouseup` opens travel modal with pre-filled dates.
- `calDrag.moved` prevents modal from opening on a plain click.
- `dsToWkKey(ds)`: helper returning Monday date string for any date string. Used for recurring task week-key lookups in timeblock.

### Undo
- `delTravel(id)`: restores state synchronously (pushes copy back immediately), then fires server POST async. Skips DELETE if id starts with `l-`.

---

## Shopping List — Manual Reorder

### Schema
- `shop_order integer` column on `shopping_list`. SQL: `ALTER TABLE shopping_list ADD COLUMN shop_order integer;`
- Initialize existing rows: `WITH ranked AS (SELECT id, ROW_NUMBER() OVER (ORDER BY store, name) - 1 AS rn FROM shopping_list WHERE done = false) UPDATE shopping_list SET shop_order = ranked.rn FROM ranked WHERE shopping_list.id = ranked.id;`
- Fetch query: `?order=shop_order.asc.nullslast,store.asc,name.asc&select=*`

### Sort Modes (`shopOvSortMode`)
- `'manual'` (default): sort by `shop_order` ascending (nulls last).
- `'store'`: sort by store then name.
- `'alpha'`: sort by name.
- `cycleShopOvSort()`: cycles manual → store → alpha → manual. Updates `#shopOvSortBtn` label.
- Sort button in shopping card header: `id="shopOvSortBtn"`.
- Grip handles (`⠿`) only shown in manual mode.

### Drag-to-Reorder Pattern (Critical)
**Must use mousedown/mousemove/mouseup — NOT HTML5 drag API.** HTML5 drag suppresses mousemove events once dragstart fires, breaking custom reorder.

- `renderShopOv()` uses `createElement` + `addEventListener` (NOT `innerHTML` with inline handlers). This is required for the closure-based drag pattern.
- Each row has `draggable="true"` for calendar-assign drag. The `dragstart` listener checks `if(_shopDrag.active){e.preventDefault();return;}` to cancel HTML5 drag when reorder grip is active.
- Grip handle (`.shop-grip` span) has a `mousedown` addEventListener that:
  1. `e.preventDefault()` + `e.stopPropagation()`
  2. Sets `_shopDrag.active=true`, `_shopDrag.id=s.id`
  3. Defines local `onMove` and `onUp` closures (same pattern as timeblock `tbOnMove`/`tbOnUp`)
  4. Adds them to document: `document.addEventListener('mousemove', onMove)` + `document.addEventListener('mouseup', onUp)`
- `onMove`: 5px threshold before `dragging=true`. Dims dragged row to `.4` opacity. Adds `.shop-dov` class to hovered row (border indicator).
- `onUp`: removes listeners, clears opacity/indicators, splices item to new position, reassigns `shop_order` as sequential index, calls `renderShopOv()`, PATCHes all affected items via `sbReqNullable`.

### State
- `_shopDrag = {active: false, id: null}` — module-level, tracks active reorder drag.
- `_shopOvSort(arr)` — shared sort helper used by both render and drop logic.

### Why HTML5 Drag Fails for Reorder
Once the browser fires `dragstart` on a `draggable` element, it suppresses subsequent `mousemove` events on the document. Even if `dragstart` is `preventDefault()`'d, the suppression can still occur in some browsers. Using pure mouse events (mousedown/mousemove/mouseup) avoids this entirely.

---

## Travel Mode on Tasks

- `travel_mode` field on `tasks` table: `'plane'` | `'drive'` | `null`.
- Shown in task modal (`tModal`) via `#tTravelMode` select.
- `tmIcon(t)` renders the icon inline before task name in all views (tRow, weekly chip, monthly chip).
- Included in POST/PATCH for tasks alongside other fields.

---

## Modal Enter Key — Travel Modal Update

- `travelModal` overlay: `onkeydown` saves if `event.target.tagName !== 'SELECT'` (prevents double-fire and browser select-commit issues).
- `tvTravelMode` select: `onkeydown="if(event.key==='Enter')setTimeout(saveTravelModal,0)"` — the `setTimeout(0)` lets the browser commit the selected option before reading `.value`.
- `tvName` input no longer has its own `onkeydown` — the overlay handles it.

---

## Recipes Page — Ingredient List

### Storage Format
`ingredients` field stores a JSON string: `[{"name":"...","amount":"..."},...]`.
Legacy recipes may store plain text (one ingredient per line). `_parseIngredients(str)` handles both:
- If `str.startsWith('[')` → try `JSON.parse`, map to `{name, amount}` objects
- Otherwise → split by newline, each line becomes `{name: line, amount: ''}`

`_serializeIngredients(arr)` → filters entries where BOTH name AND amount are blank (keeps entries with either name or amount filled), returns JSON string or `null`.

### Modal (Add / Edit Recipe)
- **No source/URL field** — removed from UI (kept in `_recFields` for data compat).
- **Notes moved to bottom** — below Instructions, styled with muted label.
- **Ingredients rendered as task list** — `#rmIngList` inside `.rm-ing-wrap`.
  - Each row: `[●] [amount input] [ingredient name input] [×]`
  - Inputs always editable (no double-click needed — modal context).
  - Enter in amount → focuses name input of same row.
  - Enter in name → `rmIngAdd()`: saves, appends new empty row, focuses new amount input.
  - Backspace on empty input → `rmIngDel(i)` deletes that row.
  - ArrowUp/ArrowDown → navigate between rows.
  - `rmIngAdd()` button at bottom of container.
- `_rmIngredients = []` — modal state array of `{name, amount}` objects.
- `_flushIngInputs()` — reads live DOM input values into `_rmIngredients` before save.
- `renderIngList()` — re-renders `#rmIngList` from `_rmIngredients`.

### Modal Keydown Guard
`recipeModal` onkeydown Enter handler excludes `.rm-ing-row` inputs:
```
!event.target.closest('.rm-ing-row')
```
Otherwise Enter in ingredient inputs would prematurely save the whole modal.

### Side Panel — Ingredients
`renderRecSidePanel` calls `_parseIngredients(r.ingredients)` and renders each as:
`[●] [amount (muted, min-width 52px)] [name]` with a subtle bottom border per row.

### Search
`recSearchChange(v)` → updates `_recSearch`, calls `renderRecipeTable()`, updates `#recCount` with filtered match count.
Search includes: name, meal_type, cuisine, notes, instructions, ingredient names+amounts.
Filter bar uses both `oninput` and `onchange` on the search input.

---

## Recipes Page — Filter/Search Architecture

### Key Rule: Static Filter Bar
The filter bar HTML is built ONCE inside the `_recInit` block in `renderRecipesPage`. It is NOT rebuilt on every render call. Filter chips use `data-recmeal`, `data-recfav`, `data-rectime` attributes for state-based CSS toggling.

The filter bar wrapper div has `position:relative;z-index:10` to ensure it sits above any `position:fixed` elements (`.ov-topbar` at z-index:89, `.rec-side-panel` at z-index:95) that could otherwise intercept pointer events.

### `_applyRecFilterUI()`
Called after every filter/search change. Toggles `.active` class on chips using data attributes. Updates search input value only when input is NOT focused.

### Filter/Search Functions
`recToggleMealFilter(m)`, `recToggleFavFilter()`, `recToggleTimeFilter(t)` → update state var → call `renderRecipeTable()` + `_applyRecFilterUI()`. Do NOT call `renderRecipesPage()`.

Search input has BOTH an inline `oninput="recSearchChange(this.value)"` attribute AND an `addEventListener('input', ...)` attached in `_recInit`. The inline handler is the reliable fallback.

---

## Recipes Page — Side Panel as Primary Edit Interface

### Editing Flow
- Single-click row → `selRecRow` → selects only (does NOT open panel)
- Double-click row → `openRecSidePanel(id)` (panel, NOT edit modal)
- `···` dots button → `openRecSidePanel(id)`
- Right-click context menu "Edit" → `openRecSidePanel(id)`
- `+` button → `openRecipeAddModal()` (modal only for ADD)

### Side Panel Inline Editing
`renderRecSidePanel(id)` renders all fields as editable inputs/selects/textareas:
- Name: `<input class="rec-sp-title-inp">`, blur → `_saveSpField(id,'name',val)`
- Meal type: `<select class="rec-sp-sel">`, onchange → `_saveSpField`
- Cuisine, time, servings: `<input class="rec-sp-inp">`, blur/Enter → `_saveSpField`
- Instructions, Notes: `<textarea class="rec-sp-ta">`, blur → `_saveSpField`; `oninput` auto-resizes height
- Ingredients: `#panIngList` with `_panelIngredients` state, same `.rm-ing-*` classes

### `_saveSpField(id, field, val)`
Calls `setRecField(id, field, val, skipPanel=true)` — the `skipPanel=true` prevents the panel from re-rendering on each individual field save (which would lose focus).

### Panel Ingredients
`_panelIngredients` — separate from `_rmIngredients` (modal). Functions: `panIngAdd`, `panIngDel`, `panIngKey`, `renderPanelIngList`, `_flushPanelIngInputs`, `_savePanelIngredients`. Ingredient input `onblur` calls `_savePanelIngredients()` which persists to Supabase immediately.

### `setRecField` — skipPanel parameter
`setRecField(id, field, val, skipPanel=false)` — when `skipPanel=true`, does not call `renderRecSidePanel` after saving. Used by panel saves to avoid focus disruption.

### Recipe Modal (Add only)
The edit modal (`recipeModal`) is now ONLY used for adding new recipes. Enter key saves (any input except textarea and `.rm-ing-row` inputs). No SELECT exclusion.
