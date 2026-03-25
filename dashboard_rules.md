# Dashboard Implementation Rules

## Search Efficiency Rules
- Never run broad/exploratory greps. Always grep for the exact function name or variable first.
- Do not chain multiple search passes when one targeted grep suffices.
- For timeblock drag/resize fixes: functions are `tbOnUp`, `onRU`, `atbOnUp`, `onRM` in `overview.js`.

## File Structure (Source Split)

All files share global scope — no modules, no bundler. Load order matters.

| File | Lines | Contains |
|------|-------|----------|
| `index.html` | ~1,392 | HTML + all CSS + 4 `<script src>` tags |
| `core.js` | ~682 | Constants (CATS, KCATS), state (cfg, st, dayOff, wkOff), localStorage, Supabase helpers (sbReq, sbReqSilent, sbReqNullable), time block DB helpers, syncAll, date utils (getWkKey, getWkBounds, getDayDate, d2s), getRecurringWeekTasks, undo/redo (pushUndo, doUndo, doRedo, showToast), global keydown listener |
| `overview.js` | ~1,694 | renderAll, renderOv, renderToday, renderWkSummary, renderWkCal, renderRecOv, renderShopOv, renderUnassigned, renderKanban, renderDayTB, getAutoTBForDate, tRow, drag-and-drop on today list |
| `features.js` | ~2,661 | Quick-add (openQA/submitQA), task CRUD, renderTasksPage, recurring/shopping/travel/birthdays/recipes pages, unscheduleWRec, skipRecVirtThisWk, showPage, closeMod, init(), selection system (selTask, selectedTasks, clearSelection), context menus (showCtx, ctxDoDuplicate, ctxDoDelete), quick notes |
| `pup-skills.js` | ~433 | All pup skills logic |

**Where is X?** Overview page (today, calendar, time blocks, kanban) → `overview.js`. Secondary pages (recurring, shopping, travel, birthdays, recipes) + task CRUD + context menus → `features.js`. Pup skills → `pup-skills.js`. Shared utilities/Supabase/dates/undo → `core.js`.

### Key Rules for Making Changes
- **Adding a new shared function** (called from multiple files) → put it in `core.js`.
- **Cross-file function calls are safe** — all files share global scope.

---

## Recurring Task Logic

### Types
- **Weekly-reset** (`is_weekly_reset=true`): scheduled via `_dateOverrides[wkKey]` = date string. Remove via `unscheduleWRec`.
- **Non-weekly-reset**: appear automatically by cadence + `appears_on_date`. Built by `getRecurringWeekTasks(off)`. Skip via `skipRecVirtThisWk` → `__skip__`.

### getRecurringWeekTasks(off)
Filters `!r.is_weekly_reset && r.appears_on_date`. Returns `{_recId, _virtual:true, _wkKey}` — `_isWrec` is NOT set. Respects cadence: weekly/biweekly/monthly. Skips `__skip__` entries.

### skipRecVirtThisWk(rid, wkKey)
Sets `__skip__`, removes linked timeblocks, re-renders, PATCHes, pushes undo. Has WR safety guard (redirects to `unscheduleWRec` if `is_weekly_reset`). Calls renderWeeklyPage, renderToday, renderWkSummary, renderWkCal, renderDayTB. Does NOT call `renderRecOv`.

### syncAll race conditions
- Preserve all locally-pending `_dateOverrides` (including `__skip__`) not yet confirmed in DB.
- Only replace `st.recurring` when result is non-null.
- After POST: replace temp entry with `{...sv[0], _doneByWk:{}, _done:false, _dateOverrides:{}}` + `save()`.

### renderToday overdue filtering
Loop `for(w=0; w>=wkOff-4; w--)`. Cascading skip check: if `__skip__` for week `w` through `0`, exclude. `getOvRecurring()` must use same logic. WR tasks in `getOvRecurring` only at `w===0`, dedup key `'wrec-'+r.id+'-'+wkKey`.

### wrecToday
Uses `_wkKeyNow = getWkKey(wkOff)`. Shows WR tasks where `_dateOverrides[_wkKeyNow]===ds` OR overdue when `dayOff===0`.

### wrecThisWk (renderWkSummary)
Direct key lookup `r._dateOverrides[wkKey]` — NOT `Object.values()` scan (matches stale dates). Returns objects with `_wkKey` set.

### WR Done State
Per-week keyed by `getWkKey(wkOff)` in `_doneByWk`. Never use `r._done`. `togRec(id,done)` writes/deletes `_doneByWk[getWkKey(wkOff)]`. PATCHes `done_by_week`. `renderRecOv`/`renderWeeklyPage`: isDone = `!!(r._doneByWk&&r._doneByWk[getWkKey(wkOff)])`.

### Duplicating Recurring Tasks
- `uniqueRecName(base)`: appends ` (2)`, ` (3)` etc.
- Local copy: `{...r, id:tempId, name:dupName, starting_date:todayDs, _doneByWk:{}, _done:false, _dateOverrides:{}}`.
- DB payload: `name, is_weekly_reset, cadence, starting_date:todayDs` + optional fields. `starting_date` always = today.

---

## Persistence / Supabase

- All create/duplicate must POST with ALL required fields. Missing NOT NULL → silent 400 failure.
- `tasks` POST required: `name`, `category`, `due_date`, `done`, `important`.
- `recurring_tasks` POST required: `name`, `is_weekly_reset`, `cadence`. **Do NOT send `day_of_week` or `repeat_day`** (columns don't exist). Valid optional: `appears_on_date`, `starting_date`, `repeat_date`, `day_added`, `task_due_day`.
- **Local temp IDs**: tasks use `l-`, recurring use `rec-tmp-` (NOT `l-` — sync only preserves `rec-tmp-`/`rec-local-`).
- **Undo ID pattern**: `let serverId=null` captured by closure, set after POST resolves. Undo reads `serverId||localId`.
- `sbReq` error toast shows Supabase `message` field for 8 seconds.
- `pendingTravelIds` Set: add id before PATCH, remove after. `syncAll` skips overwriting entries in this set.
- `toggleTask`, `togRec`, `togShop`: must call `sbUpdateBlock(b.id, {done})` for every linked TB block.
- `drawTBBlock` derives `b._done` from linked item at render time (not stale block field).
- `rolloverOverdue()`: writes `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- On `init()`, `deletedRecIds` cleared before sync — DB is authoritative.

---

## Selection ID Prefixes

| Prefix | Source | Delete action |
|--------|--------|---------------|
| `String(t.id)` | regular task chip/row | permanent delete |
| `rec-virt-{id}` | recurring (WR or non-WR) | check `is_weekly_reset` first |
| `wrec-{id}` | WR chip in weekly calendar | unschedule only |
| `shop-cal-{id}` | shopping chip/row | null `due_date` |
| `tv-{id}` | travel banner | permanent delete |

- Drag ID: `wrec::{recId}` (WR), `rec::{recId}::{dueDate}` (non-WR). Parse recId with `split('::')[1]`.
- `tRowTodayVirt` drag: must set `effectAllowed='move'`, add `body-dragging`, call `showWkcEdges(true)`. Uses `_isWrec` for `wrec::`/`rec::` prefix.
- `dropOnTodayList` uses `getWkKey(wkOff)` when setting `_dateOverrides`.
- Multi-select Delete undo: single `pushUndo` handles all types. Undo for recurring does NOT restore `notes`, `pup_related`, or extra optional fields.

---

## Today List

- Sort order: done last → travel first → overdue → important → type priority → name.
- Type priority: regular=1, recurring=2, shopping=3, birthday=4. Travel has dedicated pre-check above overdue in both `sortByTypeOrder` and `sortTasksForDay`.
- Tasks render without category background color (`noColor:true`). Overdue and important backgrounds still show.
- `_hasTBToday(t)`: if `dayOff===0 && isOv(t.due_date) && !t.done`, any linked block counts as on-TB.

---

## Unassigned Tasks Badge

- `#unAssignedBadge` in `.wkc-foot`. Filter: `!due_date && !done && category !== 'Long term'`.
- Popup `#unMenu`: `position:fixed`, 300px. Opens upward above badge. Backdrop `#unMenuBack` closes on outside click.
- `dEnd` closes popup, restores backdrop pointer-events on drag end.
- Badge only visible on overview page (`activePg` variable).

---

## Weekly Reset Overview Filter

`renderRecOv()` uses `isWRecDueThisWeek(r, wkOff)` — same cadence logic as `getRecurringWeekTasks`. Weekly → always shows. Biweekly → alternating weeks by `starting_date`. Monthly → only during week containing target date. Sorts: done last, then cadence (weekly=0, biweekly=1, monthly=2, other=3), pup-related always last (order=10).

---

## Recurring Tasks Page

- Page ID: `page-weekly`. Two-column grid: WR left, non-WR right. 4 cadence groups each: `#rt-wr-weekly/biweekly/monthly/other` + `#rt-sch-*`.
- `renderRecurringPage()` renders all 8 groups via `renderRtGroup(containerId, tasks, isWr, cadence)`.
- Quick-add: `addRecDirect(inputEl, isWr, cadence)`. WR quick-add has 🐾 checkbox. "Other" bucket saves with cadence `weekly`.
- `duplicateRecDirect(rid)`: `uniqueRecName`, POST, supports undo.
- `pup_related`: boolean on `recurring_tasks`. WR card splits Regular/🐾 columns. `renderRtGroup` quick-add includes 🐾 checkbox (`id="qa-pup-{containerId}"`).
- `openRecModalForSection(type, cadence)` opens recModal pre-filled.
- Hidden compat elements kept `display:none`: `#wrBar #wrPct2 #wrPL #wrList #shopFull #shopCountLbl #shopSortBtn #nsN #nsS`.
- `isWRecDueThisWeek(r, off)` and `getRecurringWeekTasks()` must stay in sync.

---

## Notes Field

- `notes` column on `tasks` and `recurring_tasks`. Modals: `tModal`, `recModal`, `recEditModal`.
- `saveRecModal`/`saveRecEdit` include `notes` in POST/PATCH. `openRecEditModal` populates `recEditNotes`.
- Notes display in time blocks via `.tb-notes` when non-empty.

---

## pup_related Field

- Boolean on `recurring_tasks` (NOT NULL default false).
- `recModal` shows 🐾 checkbox only when type is `weekly_reset` (managed by `updateRecTypeUI()`).
- POST/PATCH include `pup_related` when true.

---

## Time Block System

- Auto blocks (`st.autoTimeblocks` + `st.autoTBOverrides`) participate in `computeTBLayout` alongside normal blocks.
- `getAutoTBForDate(ds)`: uses override if exists, else base times. Skips weekdays-only on Sat/Sun. `start_time=null` override = deleted sentinel.
- `delAutoTBForDay`: PATCH null times if override exists, else POST new override with null times.
- Drop-on-block: each `.tb-block`/`.atb-block` has dragover/dragleave/drop listeners. `dropOnTB(e, b.ds, null, null, b.sm)` — 5th param skips cursor math.
- `.tb-drop-over`: dashed purple outline on hover.
- `selAtbId`/`selAtbDs`: track selected auto block. Delete key triggers `delAutoTBForDay`.
- All auto block DB via `sbReqSilent`. Tables: `auto_timeblocks(id, label, start_time, end_time, day_scope, is_enabled, sort_order)` + `auto_timeblock_overrides(id, base_id, date, start_time, end_time)`.
- Auto blocks never appear in Today list, overdue banner, metrics, recurring page, or weekly calendar.

## Auto Block Duration (`autoDur`)

| Match | Duration |
|-------|----------|
| name `/\bheb\b/i` or `/pilates/i` | 60 min |
| category `'social'` or name `/social/i` | 120 min |
| everything else | 30 min |

---

## Travel System

- Table: `travel(id, name, destination, start_date, end_date, travel_mode, notes)`. `travel_mode`: `'plane'|'drive'|null`.
- Stored in `st.travel`. Fetched `?order=start_date.asc&select=*`. Local entries use `l-` prefix.
- `_PLANE_SVG` + `_CAR_SVG`: silhouette SVG constants in `overview.js`. `tmIcon(t)` returns icon for non-virtual tasks.
- `getTravelTasks` + `getExtrasForWeek`: pass through `travel_mode`, use clean name (no baked-in icon).
- `tRowExtra`: prepends `modeIcon` for travel type. Hides "Travel" pill label for travel rows (row background carries color).
- Banners use `innerHTML` (SVG requires it). Sorted by `start_date`. Lane algorithm: `colLanes` (weekly) / `rowLanes` keyed by `rowTop` (monthly). Top = `2 + lane*22px`.
- `openTravelModal(id, preStart, preEnd)`. Enter: overlay saves if target isn't SELECT; `tvTravelMode` uses `setTimeout(saveTravelModal, 0)`.
- Drag-to-create: `calDrag {active, startDs, endDs, moved}`. `mouseup` opens modal. `calDrag.moved` prevents modal on plain click.
- `delTravel`: restores synchronously, POSTs async. Skips DELETE for `l-` ids.
- After new travel POST resolves: call `renderAll()` + `renderTravelPage()` so banner gets real ID.
- `ban.dataset.tvid` for selection. Click → select, dblclick → `openTravelModal`, contextmenu → `showCtx`.
- **Drag to move trip**: banners are `draggable=true`. `dragId='travel::'+tv.id+'::0'`. Drop target column = new `start_date`; duration preserved. Handled in col drop, wkcWrap edge drop, setupEdge drop. Undo via `pushUndo`.
- **Week boundary rendering**: `addBanner` `ei` uses `findIndex` — if end date is beyond current week, `findIndex` returns -1; fix: `_eiRaw<0 ? 6 : Math.min(6,_eiRaw)`. Always clamp to week bounds so cross-week trips render correctly in both weeks.
- **Enter on empty travel modal name**: `saveTravelModal` calls `closeMod('travelModal')` before returning when name is empty.

---

## Shopping List

- Reorder column: `shop_order integer`. Fetch: `?order=shop_order.asc.nullslast,store.asc,name.asc`.
- Sort modes (`shopOvSortMode`): `'manual'` | `'store'` | `'alpha'`. Cycle: `cycleShopOvSort()`. Button `#shopOvSortBtn`. Grips only shown in manual mode.
- **Drag reorder MUST use mousedown/mousemove/mouseup — NOT HTML5 drag API** (HTML5 suppresses mousemove after dragstart).
- `renderShopOv()` uses `createElement` + `addEventListener` (not innerHTML).
- Grip `mousedown`: sets `_shopDrag.active`, adds doc-level `mousemove`/`mouseup` closures. `dragstart` listener cancels HTML5 drag when `_shopDrag.active`.
- `onUp`: splices to new position, reassigns sequential `shop_order`, re-renders, PATCHes affected rows.

---

## Pup Skills Page

- Page ID: `page-pups`. Table: `pup_skills(id, pup, skill, stage, level, category, skill_order, next_step, word, signal, comments, focus)`.
- `pup`: 'Mochi'|'Sunny'. `stage`: 'In Progress'|'Mastered'|'Not Started'. `focus`: boolean. `next_step`: TEXT, values `'1. Duration'|'2. Distance'|'3. Distraction'|null`. `word`: TEXT (verbal cue). `signal`: TEXT (hand signal).
- Layout: 3-col grid (Mochi card | Sunny card | All Skills table).
- **Sort/Filter**: 250ms header debounce — single click → `pupSortBy` (3-state none→asc→desc→none), dblclick → `pupFilterBy`. Popup `#pupFilterPop` positioned under live `<th>` (not `e.currentTarget`).
- **Inline cell edit**: `pupCellEdit(td, id, field)` — `td._editing` guard. next_step + category use selects. `setPupField()` calls `pupSnapshot()`, then `renderPupsPage()` (full re-render for all views). Empty string values converted to `null` before PATCH.
- **Focus → In Progress**: setting focus auto-sets stage=In Progress unless already Mastered.
- **Undo**: `pupSnapshot()` before any destructive op. `_pupUndoDirty` blocks silent auto-sync overwrite only. `_pupSyncToServer(prev,next)` diffs + fires minimal API calls.
- **Sync race protection**: `_pupPendingIds` (Set) tracks IDs with in-flight PATCHes. `syncAll` preserves local state for pending IDs instead of overwriting with stale DB data.
- **Outside-click deselect**: stored at `window._pupOutsideClick`, re-registered each `renderPupsPage()`.
- **Keyboard** (pup page only, first keydown listener): Cmd+Z → `pupUndo()`, Cmd+Shift+Z → `pupRedo()`, Del/Bksp → `pupCtxDelete()`, Cmd+C/V → copy/paste. Skips global Cmd+Z.
- Dog card header: 3-col grid (`1fr 92px 1fr`), headshot `position:absolute top:-36px`.
- Default table sort: mastered last → category (commands=0, manners=1, fun=2, other=9) → focus first → pup → level → `skill_order`.
- Section dividers only in default sort: category headers for non-mastered; "Mastered" header (green).
- `colIdx` for filter: `{pup:0, skill:1, word:2, level:3, stage:4, next_step:5, category:6}`.
- **Card view skill row layout**: Row 1 left: checkbox + skill name + `"word"` (omitted if same as skill name) + `☞` icon (if signal exists). Row 1 right: next_step. Row 2 (optional): comment. Hover entire row → signal tooltip.
- **Table view**: columns — `·, Skill, Word, Level, Stage, Next Step, Category, ···`. Word cell italic when set. Signal shown as tooltip on row hover. `colspan=8` for dividers.

---

## Birthdays Page

- Page ID: `page-birthdays`. Table: `birthdays(id, name, birthday, present_ideas)`. `present_ideas`: TEXT storing JSON array.
- Grid: 4×3 months. Rows use `grid-column:1/-1; grid-template-columns:subgrid` — 4 cols: name | right-badge | date | delete.
- **Right-badge**: countdown OR age pill (countdown priority ≤30d). Always one placeholder col — never two badge cols.
- Countdown: today=orange, tmrw=light-orange, ≤7d=yellow, ≤30d=green. Returns `''` >30d (triggers age fallback). Age only shown when birth year known.
- **Date normalization** (`_normBdayDate`): `7/5` → `1900-07-05` (sentinel = no year). `7/5/2025` → `2025-07-05`. 2-digit year: ≤30 → 2000+YY, >30 → 1900+YY.
- `_bdayHasYear(b)`: year ≠ 1900. `_bdayMD(b)`: extracts MM-DD. `_bdayFmtDate(b)`: display. `_bdayEditFmt(b)`: modal field.
- **Present ideas**: `#bdayPresentPopup` is `position:fixed` (survives re-renders). `addBdayPresentFromPopup`/`delBdayPresent` re-render page + refresh popup if open. Both guard against `l-` temp IDs.
- `saveBdayModal` does NOT include `present_ideas`. `delBday` guards temp IDs.
- `syncAll` merges local `present_ideas` if server returns null.
- **Keyboard**: Cmd+Z/Shift+Z → undo/redo, Del/Bksp → delete, Cmd+C/V → copy/paste.
- **Undo**: `bdaySnapshot()` + `_bdaySyncToServer(prev,next)`.
- Non-current month rows: `color:#777` uniform (no past/future distinction). Current month past `.bday-past`: lighter.

---

## Focus & Cursor Placement Rules

**Rule**: Whenever an edit input is opened with existing text, the cursor must land at the **end** of the text so the user can immediately continue typing. Use `setSelectionRange(el.value.length, el.value.length)` inside the same `setTimeout`/`requestAnimationFrame` as the `.focus()` call.

- New/empty inputs: cursor-at-end is a no-op — still apply for consistency.
- Never use `.select()` on edit inputs (selects all, overwrites on type). Exception: filter/search inputs where select-all is intentional (e.g. `rfText`, `pfText`).
- Applies to all pages: task modal, travel modal, birthday modal, recipe modal, recurring edit modal, shopping edit modal, pup modal, pup table inline edit, weekly inline edit, time block inline edit.
- Pattern for `setTimeout` focus: `setTimeout(()=>{const _el=document.getElementById('...');if(_el){_el.focus();const _l=_el.value.length;_el.setSelectionRange(_l,_l);}}, delay);`
- Pattern for `requestAnimationFrame` focus: `requestAnimationFrame(()=>{el.focus();const _l=el.value.length;el.setSelectionRange(_l,_l);});`

## Modal Enter / Escape Key Rules

**Pattern**: overlay `div` owns Enter/Escape. Individual inputs must NOT have their own save handlers (double-fire).

| Modal | Enter saves | SELECT excluded |
|-------|-------------|-----------------|
| `tModal` | overlay | no |
| `recModal` / `recEditModal` | overlay | yes (`tagName!=='SELECT'`) |
| `bdayModal` / `shopEditModal` | overlay | no |
| `pupModal` | overlay | yes |
| `travelModal` | overlay | yes — `tvTravelMode` uses `setTimeout(saveTravelModal,0)` |
| `recipeModal` | overlay | yes (excludes `.rm-ing-row` + textarea) |
| `bModal` | input `onkeydown` | — |

- All save functions: `if(!name){closeMod('modalId');return;}` — Enter cancels if empty.
- Document-level Enter fallback for `tModal`/`shopEdit`/`recEdit`/`recModal` when `.open`. Must NOT gate on field content.
- `tCat` select uses `addEventListener + e.stopPropagation()` — only legitimate per-element override.

---

## Recipes Page

- Table: `recipes(id, name, meal_type, cuisine, time, servings, notes, favorite, ingredients, instructions, source)`. Removed cols (don't reference): `protein, prep_time, cook_time, difficulty, last_made_date, substitutions, storage_reheating, total_time`.
- `_recFields(r)`: DB field subset for POST/PATCH. Variable: `_recipeEditId` (NOT `_recEditId` — taken by recurring).
- Page skeleton built once via `page._recInit` guard. Filter bar also built once in `_recInit` (not rebuilt on re-render). Filter bar: `position:relative; z-index:10`.
- Filter chips: `data-recmeal/data-recfav/data-rectime` attrs. `_applyRecFilterUI()` toggles `.active`. Search `oninput` → `recSearchChange` → `renderRecipeTable()` only.
- **Selection → Panel**: single-click selects only, dblclick/`···` → `openRecSidePanel(id)`. `openRecipeAddModal()` for add only.
- Panel `#recSidePanel` (400px, CSS transition). All fields inline-editable. `_saveSpField` → `setRecField(id,field,val,skipPanel=true)` to avoid focus loss.
- Panel ingredients (`_panelIngredients`): separate from modal (`_rmIngredients`). `onblur` → `_savePanelIngredients()`.
- **Ingredients**: JSON string `[{name,amount}]`. Legacy plain text supported. `_serializeIngredients` filters both-blank entries.
- Ingredient row keys: Enter in amount → focus name; Enter in name → `rmIngAdd()` new row; Backspace on empty → delete row.
- Search includes: name, meal_type, cuisine, notes, instructions, ingredient names+amounts. `_recPanelId` persists across re-renders.
- **Sort/Filter**: same 250ms debounce as pup skills. Popup `#recFilterPop/.rfopen`.
- **Undo**: `recSnapshot()` + `_recSyncToServer(prev,next)`. `_recUndoDirty` blocks auto-sync.
- **Keyboard**: same as pup skills pattern.
- Right-click context menu `#recCtxMenu`: view, edit, toggle fav, duplicate, delete. Single-item actions hidden on multi-select.

---

## Quick Notes

- Table: `quick_notes(id, note_text, is_visible, created_at, hidden_at)`.
- `loadQN()`: GET `?is_visible=eq.true&order=created_at.asc`. Called on panel open.
- `deleteQN(id)`: PATCH `{is_visible:false}`. Soft-delete only — never hard delete.
- Outside-click closes panel.

---

## Top-Right Controls

- Fixed position (`top:14px; right:20px; z-index:90`), visible on all pages.
- Order (left → right): **Sync bar** | **Settings button (⚙)**
- **Settings button** (`#settingsBtn`): opens/closes `#settingsPopup` via `toggleSettingsPopup()`.
- **Settings popup** contains: Night Mode toggle + Backup Sync button. Closes on outside click.
- Night Mode: `toggleDark()` toggles `body.dark`, updates `#darkToggleIcon` (🌙/☀️) and `#darkToggleLabel` (Night Mode/Light Mode). Persists in `cfg.dark`.
- No standalone dark-toggle button — night mode lives only in the settings popup.

---

## Local Backup System

- `backup.js` + cron `0 8 * * *` → `backup_auto.json`. `restore.js`: deletes all rows then re-inserts.
- Tables: `tasks, recurring_tasks, shopping_list, travel, birthdays, pup_skills, time_blocks, auto_timeblocks, auto_timeblock_overrides`.
- Manual backup: "Backup Sync" item in settings popup → browser download `backup_manual.json`. Button text resets to "Backup Sync" after save/fail.

---

## Git Workflow (Summary)

- Stop hook auto-commits and pushes to `origin/dev` after every turn.
- "Push to production": merge `origin/dev` → `main`, push `main`.
