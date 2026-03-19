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

## Today List & Need to Assign

- Tasks in `#todList` and `#unList` render without category background color (`noColor:true`). Overdue (red) and important (yellow) backgrounds still show.
- `#todList .ti` has extra left margin (`margin-left:10px`) to shift slightly right.
- Shopping overview (`#shopOv`) items use `.chk-wrap` label for consistent spacing with weekly reset.

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

- Page ID: `page-pups`. Sidebar nav: `showPage('pups')`. Rendered by `renderPupsPage()`.
- Supabase table: `pup_skills(id, pup_name, skill_name, stage, level, success_rate, next_step, focus)`.
  - `pup_name`: 'Mochi' or 'Sunny'. `stage`: 'In Progress' | 'Mastered' | 'Not Started'. `focus`: boolean. `success_rate`: 0–1 float.
- Fetched in `syncAll` via `sbReqSilent` alongside other tables. Stored in `st.pup_skills`, persisted in localStorage.
- Layout: 3-column grid (`1fr 1fr 0.7fr`). Col 1 = Mochi, Col 2 = Sunny, Col 3 = Completed.
- Each pup column: progress donut (mastered%), mastered/in-progress counts, Train This Week (focus=true, top 3), Current Skills (stage=In Progress with next_step).
- Completed column: Sunny Mastered then Mochi Mastered, sorted by level then skill_name. Dense + scrollable.
- Colors: Mochi = `#8b5cf6` (purple), Sunny = `#f97316` (orange).
- CSS classes: `.pup-col`, `.pup-skill-row`, `.pup-skill-emphasis` (Current Skills), `.pup-focus-row` (Train This Week), `.pup-done-row` (Completed), `.pup-pill`, `.pup-pill-sr`, `.pup-pill-dim`, `.pup-stat`, `.pup-section-label`, `.pup-check`, `.pup-next-step`.

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

## Git Workflow

- Stop hook: auto-commits and pushes to `origin/dev` branch after every Claude turn.
- "Push to production": merge `origin/dev` into `main`, push `main`.
- Auto-commit format: `Auto-commit [Mar 12 13:45]`.
