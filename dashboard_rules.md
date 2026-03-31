# Dashboard Implementation Rules

---

## Global Rules

> **Applying a new page/item type:** All subsections define standard patterns. Page sections document deviations and page-specific values only.

### Architecture
All files share global scope — no modules, no bundler.

| File | Contains |
|------|----------|
| `index.html` | HTML + CSS + 4 `<script src>` tags |
| `core.js` | State (`cfg`, `st`, `dayOff`, `wkOff`), Supabase helpers (`sbReq`, `sbReqSilent`, `sbReqNullable`), `syncAll`, date utils (`getWkKey`, `getWkBounds`, `getDayDate`, `d2s`, `dsToWkKey`), `getRecurringWeekTasks`, `isWRRuleDueThisWeek`, undo/redo (`pushUndo`, `doUndo`, `doRedo`, `showToast`) |
| `overview.js` | `renderAll`, `renderOv`, `renderToday`, `renderWkSummary`, `renderWkCal`, `renderRecOv`, `renderRecMoCal`, `renderShopOv`, `renderUnassigned`, `renderKanban`, `renderDayTB`, `getAutoTBForDate`, `tRow`, drag-and-drop, WR rule CRUD, scope picker, `writeWrOverride` |
| `features.js` | Task CRUD, all secondary pages (recurring/shopping/travel/birthdays/recipes), `showPage`, `closeMod`, `init()`, `selTask`, `clearSelection`, `showCtx`, `mkMCell`, `renderMoCal`, quick notes |
| `pup-skills.js` | All pup skills logic |

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + context menus + regular monthly cal → `features.js`. Pup → `pup-skills.js`. Shared utils/Supabase/undo → `core.js`.

- Grep exact function/variable name first. Never broad greps.
- Timeblock drag/resize: `tbOnUp`, `onRU`, `atbOnUp`, `onRM` in `overview.js`.
- `renderAll()` does NOT call `renderDayTB()`. Any op changing timeblock state must also call `if(document.getElementById('tbGrid'))renderDayTB()` separately — including undo closures.

### Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400 failure.
- `tasks` POST required: `name`, `category`, `due_date`, `done`, `important`.
- `recurring_tasks` POST required: `name`, `is_weekly_reset`, `cadence`. Do NOT send `day_of_week`/`repeat_day`. Optional: `appears_on_date`, `starting_date`, `repeat_date`, `day_added`, `task_due_day`.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-` (sync only preserves `rec-tmp-`/`rec-local-`).
- Undo ID: `let serverId=null` in closure, set after POST resolves. Undo reads `serverId||localId`.
- `sbReq` shows Supabase `message` field in toast for 8s.
- `toggleTask`/`togRec`/`togShop`: call `sbUpdateBlock(b.id,{done})` for every linked TB block.
- `drawTBBlock` derives `b._done` from linked item at render time.
- `rolloverOverdue()`: write `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- On `init()`, `deletedRecIds` cleared — DB is authoritative.
- `localStorage` (`save()`/`load()`) persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, **wrRules, wrOverrides** — all load instantly before `syncAll` completes.
- Notes: `notes` column on `tasks` + `recurring_tasks`. Include in POST/PATCH. Show via `.tb-notes` in time blocks.

### Interaction Patterns

**Focus & Cursor** — cursor lands at end of text on every input open. Use `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`. Never `.select()` on edit inputs (exception: filter/search inputs).

**Outside-Click Close** — all popups/panels that close on outside click:
- Store handler at stable ref (e.g. `window._pageOutsideClick`), remove + re-register on every `renderPage()`.
- Handler: `!el.contains(e.target)` before closing. Add listener via `setTimeout(0)` to avoid immediate re-close.
- Backdrop (`position:fixed;inset:0`) alternative for popups needing pointer-events blocking during drag.

**Modal Enter / Escape** — overlay `div` owns Enter/Escape. Individual inputs must NOT have save handlers (double-fire).
- Default: overlay keydown handles Enter → save, Escape → `closeMod`.
- Enter with empty name field: close modal without saving. Applies to all add/edit modals.
- SELECT elements excluded from Enter-save on: recModal, recEditModal, pupModal, travelModal, recipeModal.
- `travelModal`: `tvTravelMode` SELECT uses `setTimeout(saveTravelModal,0)`. `bModal` exception: input `onkeydown`.
- Document-level Enter fallback for tModal/shopEdit/recEdit/recModal/mModal/recMoModal when `.open`.
- `recMoModal`: Enter closes when open + no input focused + `!selectedTasks.size`. Space closes `mModal` and `recMoModal`.

**Cmd+Z in Modals** — global keydown in `core.js`. Check: `_isInput && !_ael.closest('.overlay:not(.open)')` — if true, return early (native undo). Overlays use `opacity:0;pointer-events:none` NOT `display:none`. Never add `stopPropagation` for Cmd+Z to overlay attributes. Undo closures must re-find items by ID at undo time, not capture by reference.

**Page-Level Keyboard Shortcuts** — pages with own undo stack (pup, birthdays, recipes):
- Cmd+Z → page undo, Cmd+Shift+Z → page redo, Del/Bksp → delete (skip if input focused), Cmd+C → copy, Cmd+V → paste.

**Global Cmd+C / Cmd+V (task selection)** — copies `selectedTasks` into `_copiedTasks[]`. Paste branches:
- `wrrule-{id}` → POST to `wr_recurring_rules`, renders `renderRecOv()+renderWeeklyPage()`.
- `rec-virt-{id}` → POST to `recurring_tasks`.
- regular task ID → POST to `tasks`.
- Skip when input focused.

**Sort/Filter with Debounce** — table pages (pup, recipes): 250ms debounce. Single click → 3-state sort (none→asc→desc→none). Double click → filter popup under live `<th>`. Outside-Click Close. Sort state in module variable.

**Per-Page Undo Stack** — pages with own undo (pup, birthdays, recipes):
- `pageSnapshot()` deep-clones state before any destructive op. `_pageUndoDirty` flag blocks `syncAll`. `_pageSyncToServer(prev,next)` diffs and fires minimal API calls.

**Sync Race Protection** — `_pendingIds` Set: add ID before PATCH, remove in `.then()`. `syncAll` skips entries in `_pendingIds`. Instances: pup=`_pupPendingIds`, travel=`pendingTravelIds`, tasks=`pendingLocal`. For `due_date`: also set `localOverrides[sid]={due_date:val}` before PATCH; clear in `.then()`. **Render before PATCH** — always update local state and re-render BEFORE firing PATCH. Never `await` a PATCH before rendering.

**Hover-X Delete on Chips** — any chip-based view:
- Chip: `display:flex;align-items:center;gap:2px`. Text: `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">`.
- `.chip-del` button (`✕`) as last flex child. CSS: `[container]:hover .chip-del{opacity:1}`.
- Click guard on chip click: `if(e.target.closest('.chip-del,.chk-wrap'))return`.
- Delete logic: regular task→`delTask`; shop→null `due_date`; wRec→delete `_dateOverrides[wkKey]`; rec-virt→`__skip__`. Always use `dsToWkKey(ds)`, NOT `getWkKey(wkOff)`.
- After any delete, call the view's own render function in addition to `renderAll()`.

**Chip Checkboxes** — chips in monthly views (`#mCells`, `#recMoCells`) have 8×8px checkboxes:
- Insert as first flex child via `chip.insertBefore(chkWrap, chip.firstChild)`. Label `.chk-wrap` with `padding:2px 3px;margin:-2px -1px;flex-shrink:0`. Input `.chk` with `style="width:8px;height:8px"`. `addEventListener('click',e=>e.stopPropagation())` on label.
- Route by type: regular task→`toggleTask(id,checked)`; non-WR recurring→`togRecVirt(recId,checked,dsToWkKey(ds))`; WRec (legacy)→`togRec(recId,checked)`; shop→`togShop(shopId,checked)`. Travel: no checkbox.
- Done display: `opacity:.5` on chip, `text-decoration:line-through` on name span.

**Chip Indicator Dot** — small dot showing a chip's data was changed for this week only:
- `width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-left:2px`. Color: `gc(type).d` (darker shade of chip color scheme). `box-shadow:0 0 0 1px rgba(0,0,0,.15)`.
- Regular recurring: shown when `r._dateOverrides[wkKey]` exists and `!=='__skip__'` (moved this week).
- WR rules: shown when `st.wrOverrides` has `override_type:'edit'` for `(ruleId, wkKey)` with `custom_name` or `custom_notes` (edited this week).

**Timeblock X for shop/WR rule blocks** — X button (`tb-bdel`) always calls `delBlock` (timeblock only). Keyboard Delete with `blk-{id}` in `selectedTasks` → `delBlock` only. Does NOT unschedule or remove from other views. Selection of shop/WR rule blocks in timeblock uses `blk-{blockId}` (not `shop-cal-` or `wrrule-`), preventing cross-view highlight/delete.

**Dragged shop/WR rule items on daily/weekly views** — behave like regular tasks (all keyboard shortcuts, editing, selection). Sort follows timeblock start time via `sortTasksForDay`/`sortByTBWeek`/`_hasTBToday` (check `b.ruleId` for WR rule blocks, `b.shopId` for shop blocks). X on shop chip outside shopping list page: nulls `due_date` (removes from views, does NOT delete from list). X on WR rule chip: shows scope picker (`showWrXPicker`) → "Skip this week only" or "Delete rule (all future)". X removes from ALL views including timeblock (linked `st.blocks` entries deleted). Exception: X on timeblock block itself → `delBlock` only (see above).

**Virtual task objects for dragged items** — `_isWrRule:true` (WR rule), `_isWrec:true` (legacy WR), `_type:'shop'` (shopping). Distinguish source: `_ruleId` (WR rule), `_recId` (legacy WR), `_shopId` (shopping). WR rules use `_wkKey` for the week context.

**Modal Stacking / Z-index** — persistent background modals: `style="z-index:490"`. Task/edit overlays stay at default z-index:500.

**renderAll and open modals** — `renderAll()` re-renders any open persistent modal (`#mModal`→`renderMoCal()`, `#recMoModal`→`renderRecMoCal()`). `renderRecOv()` also calls `renderRecMoCal()` if `#recMoModal` is open — so any op calling `renderRecOv` automatically syncs the recurring monthly view.

### Selection & Drag IDs

| Prefix | Source | Notes |
|--------|--------|-------|
| `String(t.id)` | regular task | permanent delete |
| `wrrule-{id}` | WR recurring rule (selected) | skip this week (override) |
| `rec-virt-{id}` | non-WR recurring | `skipRecVirtThisWk` |
| `wrec-{id}` | legacy WR chip in weekly cal | unschedule only |
| `shop-cal-{id}` | shopping chip on daily/weekly views | null `due_date` |
| `blk-{id}` | shop/WR rule block selected in timeblock | keyboard Delete → `delBlock` only, no item-level change |
| `tv-{id}` | travel banner | permanent delete |
| `recmo::{recId}::{srcDs}` | recurring chip in `recMoModal` | scope picker on drop |

- Weekly cal drag: `wrec::{recId}` (legacy WR), `rec::{recId}::{dueDate}` (non-WR), `wrrule::{ruleId}` (WR rule from overview), `shop::{shopId}` (shopping from overview).
- Drag from overviews onto today/timeblock/weekly cal: `wrrule::{ruleId}` (WR rules panel), `shop::{shopId}` (shopping overview). Dropped WR rules use `_dateOverrides[wkKey]` as scheduled marker; dropped shop items set `due_date`.
- recMoModal drag: `recmo::{recId}::{srcDs}`. Drop on day cell → `showWrScopePicker`: "This week only"→`_dateOverrides[wkKey]=ds`; "All future"→update `appears_on_date` (day name for weekly/biweekly, date-of-month number for monthly).
- Shift-click range: `#mCells` and `#recMoCells` both use `.mcell-t[data-tid]` DOM order.
- Multi-select Delete: single `pushUndo`. Undo for recurring does NOT restore `notes`/`pup_related`/extra fields.

### UI
- **Top-right controls** (`top:14px;right:20px;z-index:90`): Sync bar | Settings ⚙. Settings popup: Night Mode toggle + Backup Sync. `toggleDark()` → `body.dark`, persists in `cfg.dark`.
- **Local backup**: `backup.js` cron `0 8 * * *` → `backup_auto.json`. Manual: settings → `backup_manual.json`. Tables: tasks, recurring_tasks, shopping_list, travel, birthdays, pup_skills, time_blocks, auto_timeblocks, auto_timeblock_overrides, wr_recurring_rules, wr_recurring_overrides.
- **`.mcell` CSS**: must include `min-width:0` to prevent CSS grid `1fr` column blowout from chip content.

---

## WR Recurring Rules System

Tables: `wr_recurring_rules` (base definitions) + `wr_recurring_overrides` (per-week exceptions). State: `st.wrRules`, `st.wrOverrides`. Both fetched in `syncAll`.

**`wr_recurring_rules`** fields: `id, name, cadence` (weekly/biweekly/monthly/other), `day_of_week` (0=Sun), `anchor_date` (DATE, biweekly cycle ref — past Monday in correct cycle), `monthly_rule_type` (nth_weekday/date_of_month), `monthly_nth` (-1=last), `monthly_weekday`, `monthly_date` (1–28), `pup_related`, `notes`, `is_enabled`, `sort_order`.

**`wr_recurring_overrides`** fields: `id, rule_id, wk_key` (Monday YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done`, `moved_to_wk_key`, `custom_name`, `custom_notes`. UNIQUE on `(rule_id, wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek(rule, off)` in `core.js`):
- weekly/other: always due. biweekly: `anchor_date` → week diff mod 2 → due if diff===0.
- monthly nth_weekday: `getNthWeekday(y,m,nth,weekday)` — due if occurrence falls in Mon–Sun of target week.
- monthly date_of_month: same check for fixed date.

**Override upsert** (`writeWrOverride(ruleId, wkKey, payload, {onDone, undoLabel})` in `overview.js`): PATCH if override exists for `(ruleId, wkKey)`, POST if not. Nulls out unrelated fields. All WR DB ops via `sbReqSilent`.

**`_dateOverrides` on `st.wrRules`** — client-side only (no DB column). Stores `{[wkKey]: dateString}` when a rule is dragged onto a view for that week. `syncAll` preserves these: save `prevPins` keyed by rule ID before replacing `st.wrRules` from DB, then restore after. Views (today, weekly cal, weekly summary) read `r._dateOverrides[wkKey]` to determine if rule is scheduled for that day.

**Done state**: `complete` override with `done=true`. Written by `togWrRule`. DELETEd when un-checking.

**Display name**: always check `st.wrOverrides` for `override_type:'edit'` on `(ruleId, wkKey)` → use `custom_name` if present, else `r.name`. Required in both `renderRecOv` and `renderRecMoCal`.

**Edit modal** (`#wrEditModal`): "This week only" (custom name/notes) vs "All future" (full rule fields). Scope toggle hidden when `wkKey` is null (always all-future). `openWrEditModal(rid, wkKey, defaultScope)`.

**Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?)` → `saveWrRuleAdd()`. Temp ID `wrrule-tmp-*`. All WR adds go through here — `addRec()`, QA bar, recurring page `+` all redirect.

**Weekly Reset card** (overview, top-right panel):
- Header: `←` · `Month` button (`openRecMoModal()`) · week label · `This Week` · `→`.
- Footer (bottom-left): `+` button (`openWrRuleAddModal()`).
- Sort: done last → cadence (weekly=0,biweekly=1,monthly=2,other=3) → pup-related last (order=10).
- `wrRecOff` tracks week offset independently of `wkOff`.
- `renderRecOv()` calls `renderRecMoCal()` at end if `#recMoModal` is open.

---

## Non-WR Recurring Task Logic

- **Scheduled** (`is_weekly_reset=false`): auto by cadence+`appears_on_date`. Built by `getRecurringWeekTasks(off)` → `{_recId,_virtual:true,_wkKey}`. Skip via `skipRecVirtThisWk` → `__skip__`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes, pushes undo. Calls renderWeeklyPage/renderToday/renderWkSummary/renderWkCal/renderDayTB. NOT renderRecOv.
- `syncAll`: preserve locally-pending `_dateOverrides` (incl. `__skip__`). Only replace `st.recurring` when non-null. After POST: `{...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}}` + `save()`.
- **renderToday overdue**: `for(w=0;w>=wkOff-4;w--)`. Cascading `__skip__` check.
- **wrecToday** (legacy WR chips from old `recurring_tasks` system): `_wkKeyNow=getWkKey(wkOff)`. Shows where `_dateOverrides[_wkKeyNow]===ds`.
- **wrecThisWk**: direct key lookup `r._dateOverrides[wkKey]` — NOT `Object.values()`.
- **Non-WR done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key, PATCHes `done_by_week`.
- **Duplicate**: `uniqueRecName` appends ` (2)/(3)`. DB: `name,is_weekly_reset,cadence,starting_date:today`.
- **Drag move** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Pass `oldDs:origDate` explicitly. Undo: restore `_dateOverrides`, remove new-date blocks, re-add `savedBlocks` via `sbSaveBlock`, then `renderAll()+renderDayTB()`.
- **`removeTBBlocksForDate` — `recId` branch**: call `sbDeleteBlock(b.id)` before filtering `st.blocks`.
- **`appears_on_date` update** (all-future move from recMoModal): day name string for weekly/biweekly; date-of-month number string for monthly. PATCH `recurring_tasks` with `{appears_on_date:newVal}`.

---

## Pages

### Overview (`overview.js`)

**Today List** — sort: done last → travel → overdue → important → type (regular=1,recurring=2,shopping=3,birthday=4) → name. No category bg (`noColor:true`). `_hasTBToday(t)`: `dayOff===0 && isOv(due_date) && !done` + linked block. Sort helpers `_hasTBToday`, `sortTasksForDay`, `sortByTBWeek`: check `b.ruleId` (WR rule blocks), `b.shopId` (shop blocks), `b.recId` (recurring), `b.taskId` (regular) when finding linked blocks.

**Weekly Reset container** — see WR Recurring Rules System section above.

**Unassigned badge** — `#unAssignedBadge` in `.wkc-foot`. Filter: `!due_date&&!done&&category!=='Long term'`. Popup `#unMenu`: fixed 300px, opens upward. Backdrop `#unMenuBack` (outside-click). `dEnd` restores backdrop. Visible only on overview page.

**Time Blocks** — auto blocks (`st.autoTimeblocks`+`st.autoTBOverrides`) in `computeTBLayout`. `getAutoTBForDate(ds)`: override or base times, skip Sat/Sun if weekdays-only, `start_time=null`=deleted. `delAutoTBForDay`: PATCH null if override exists, else POST null override. Drop: `dropOnTB(e,ds,null,null,b.sm)`. `.tb-drop-over`: dashed purple. `selAtbId`/`selAtbDs` track selected auto block. All auto block DB via `sbReqSilent`. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.

**Auto block duration**: name `/\bheb\b/i` or `/pilates/i`→60min; category/name `social`→120min; else→30min.

---

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left (`#rt-wr-*`), non-WR right (`#rt-sch-*`). 4 cadence groups each.
- **WR left**: `renderRtWrGroup(containerId, rules, cadence)`. Cols: Name | 🐾 | Schedule. Dblclick → `openWrEditModal(rid, null, 'all')`. 🐾 → `rtToggleWrPup`. Delete → `delWrRule`. `+` → `openWrRuleAddModal(cadence)`. Schedule: `wrRuleScheduleStr(rule)`.
- **Non-WR right**: `renderRtGroup(containerId, tasks, cadence)`. Cols: Name | Adds On | Due On | Starting. Inline edit via `rtDblEdit`. `+` → `openRecModalForSection('scheduled', cadence)`. `duplicateRecDirect`: `uniqueRecName`, POST, undo.
- **Stats bar** (`#wrPL`, `#wrPct2`, `#wrBar`): hidden compat elements only.
- Hidden compat elements: `#wrBar #wrPct2 #wrPL #wrList #shopFull #shopCountLbl #shopSortBtn #nsN #nsS`.

---

### Monthly Calendar (`features.js`, `#mModal`)
`renderMoCal`: 22 weeks (8 past + 14 future). Month separators: `.mo-sep` (`grid-column:1/-1`). Open: `scrollMoToday()` **before** adding `.open` class (overlay at `opacity:0` still participates in layout; scroll must happen before reveal transition). Then `requestAnimationFrame(()=>modal.classList.add('open'))`. GPU: `backdrop-filter:none` on `#mModal`/`#recMoModal` (prevents continuous repaint from orbs behind overlay). Orb animations paused on open: `bg.classList.add('orbs-paused')` (CSS: `.bg-canvas.orbs-paused .orb{animation-play-state:paused}`); removed on close. CSS: `#mCells` uses `.mcells` (`grid-template-columns:repeat(7,1fr)`). `.mcell` has `min-width:0`.

**Non-WR recurring tasks in monthly cal**: `renderMoCal` precomputes `_moRecMap` (module-level `let _moRecMap={}`) before the cell loop — iterates all weeks, calls `getRecurringWeekTasks(wkOff)` for each, maps results by `due_date`. `mkMCell` adds `recOnDay=(_moRecMap[ds]||[]).filter(t=>!t.done)` to the `undone` array. These render as teal Recurring chips alongside normal tasks.

Chip structure: `[checkbox][text span][chip-del]`. Non-travel chips get 8×8px checkbox (see Global Chip Checkboxes). Travel chips: no checkbox; non-visual-first cells get `<span style="flex:1"></span>` only. Click guard: `.chip-del,.chk-wrap`.

Travel span trick: `margin-left:-13px;width:calc(100%+Npx)` bridges 13px gap. `isVisualFirst=t.due_date===ds||dow===0`. First cell shows label; continuation = empty spacer. All travel cells get `.chip-del`→`delTravel`.

Chip interactions: `moChipDel(t,ds,e)` for delete. `dsToWkKey(ds)` (not `getWkKey(wkOff)`). `showMcellMorePop` chips call `closeMorePop()` before delete. `renderAll()` calls `renderMoCal()` when `#mModal` is open. `#mModal` `style="z-index:490"`. Year dropdown `#moYearSel`: `jumpMoYear(yr)`. Space key closes `#mModal`.

---

### Recurring Monthly View (`overview.js`, `#recMoModal`)

Opens via "Month" button in weekly reset card header. `openRecMoModal()` → `renderRecMoCal()` → `scrollRecMoToday()` (before `.open`) → `requestAnimationFrame(()=>modal.classList.add('open'))`. Same GPU/orb-pause rules as `#mModal` (see Monthly Calendar section).

**Grid**: 8 columns — 7 day columns (Mon–Sun) + 1 WR column. CSS: `#recMoDow,#recMoCells{grid-template-columns:repeat(7,1fr) minmax(160px,1.8fr)}`. DOW header: Mon–Sun labels + "Weekly Reset" label (blue, left border). `#recMoModal` `style="z-index:490"`. Width: `min(98vw,1200px)`.

**Data building** (`renderRecMoCal`, 22-week range):
- `wrWeekMap[w]`: WR rules firing that week (`isWRRuleDueThisWeek(r, wkOff)`). Display name: check `st.wrOverrides` for `override_type:'edit'` on `(ruleId, monDs)` → use `custom_name` if present. Flag `edited=true` if override has `custom_name` or `custom_notes`.
- `dayMap[ds]`: regular recurring tasks via `getRecurringWeekTasks(wkOff)`. Flag `moved=true` if `r._dateOverrides[dsToWkKey(due_date)]` exists and `!=='__skip__'`.

**WR column** (8th cell per week row): blue-tinted bg (`rgba(239,246,255,.4)`), no border. Body: `columns:2;column-gap:2px` for overflow.

**Chip types**:

| Type | `dataset.tid` | Color scheme | Draggable | Done check |
|------|--------------|-------------|-----------|-----------|
| WR rule | `wrrule-{id}` | `gc('weekly_reset')` | No | `wrOverrides` `complete` override |
| Non-WR recurring | `rec-virt-{id}` | `gc('Recurring')` | Yes | `r._doneByWk[wkKey]` |

Checkbox: 8×8px, `togWrRule(ruleId, checked, wkKey)` / `togRec(recId, checked, wkKey)`. Done: `opacity:.5` + `text-decoration:line-through`.

Indicator dot: WR if `item.edited`, non-WR if `item.moved`. Color = `gc(type).d`. See Global Chip Indicator Dot.

**X button** → `showWrScopePicker`:
- WR: "Skip this week only"→`writeWrOverride({override_type:'skip'})` / "Delete rule"→`wrCtxDeleteRule`.
- Non-WR: "Skip this week only"→`_dateOverrides[wkKey]='__skip__'` + PATCH / "Delete recurring task"→`delRec`.

**Dblclick**: WR→`openWrEditModal(ruleId, wkKey, 'all')`; non-WR→`tiDblRec(e, recId)`.

**Drag** (non-WR only): `dragId='recmo::{recId}::{srcDs}'`. Day cells are drop targets (guard: `dragId.startsWith('recmo::')` on dragover). Drop → `showWrScopePicker`: "This week only"→`_dateOverrides[wkKey]=ds`; "All future"→update `appears_on_date` (see Non-WR section). Both with undo + `renderAll()+renderRecMoCal()`.

**Keyboard**: Enter closes when `!selectedTasks.size && !input:focus`. Space closes unconditionally. Both in `core.js` global keydown.

**Sync**: `renderRecOv()` calls `renderRecMoCal()` at end if modal open. `renderAll()` calls `renderRecMoCal()` if modal open.

---

### Shopping List (`features.js`)
`shop_order integer`. Fetch: `?order=shop_order.asc.nullslast,store.asc,name.asc`. Sort modes: `manual`|`store`|`alpha` via `cycleShopOvSort()`. Grips only in manual mode. **Drag MUST use mousedown/mousemove/mouseup — NOT HTML5 drag**. `renderShopOv()` uses `createElement`. `onUp`: splice, reassign sequential `shop_order`, re-render, PATCH affected rows.

**Drag onto other views** — `renderShopOv` rows are HTML5-draggable with `dragId='shop::{shopId}'`. Drop onto today list/timeblock/weekly cal sets `due_date` on the shop item. Once on a view, X on chip/row calls `unscheduleShop(id)`: nulls `due_date`, removes linked `st.blocks` entries, renders. Does NOT delete from shopping list. X on timeblock block → `delBlock` only (see Global Timeblock X rule).

---

### Travel System (`features.js` + `overview.js`)
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. `travel_mode`: `'plane'|'drive'|null`. Local IDs: `l-`. Weekly banners: `innerHTML` (SVG), `colLanes` layout. Monthly: in-flow chips. Drag-to-create: `calDrag{active,startDs,endDs,moved}`. `delTravel`: sync restore, async DELETE (skip `l-`). Drag-to-move: `dragId='travel::'+id+'::0'`, duration preserved. Week boundary: `ei` clamped → `_eiRaw<0?6:Math.min(6,_eiRaw)`.

---

### Pup Skills (`pup-skills.js`, `page-pups`)
Table: `pup_skills(id,pup,skill,stage,level,category,skill_order,next_step,word,signal,comments,focus)`. `pup`: Mochi|Sunny. `stage`: In Progress|Mastered|Not Started. Layout: 3-col (Mochi card | Sunny card | table). Inline edit: `pupCellEdit(td,id,field)`, `td._editing` guard. Focus→In Progress unless Mastered. Default sort: mastered last → category (commands=0,manners=1,fun=2,other=9) → focus first → pup → level → skill_order. Card header: `1fr 92px 1fr`, headshot `position:absolute top:-36px`. Names: `pupSnapshot`, `_pupUndoDirty`, `_pupSyncToServer`, `_pupPendingIds`, `window._pupOutsideClick`.

---

### Birthdays (`features.js`, `page-birthdays`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas`: JSON array TEXT. Grid: 4×3 months, `subgrid` 4 cols. Badge: countdown (≤30d priority) OR age. `_normBdayDate`: `7/5`→`1900-07-05`; 2-digit: ≤30→2000s, >30→1900s. `saveBdayModal` does NOT include `present_ideas`. `#bdayPresentPopup` is `position:fixed`. `syncAll` merges local `present_ideas` if server null. Names: `bdaySnapshot`, `_bdaySyncToServer`.

---

### Recipes (`features.js`)
Table: `recipes(id,name,meal_type,cuisine,time,servings,notes,favorite,ingredients,instructions,source)`. Do NOT reference removed cols: protein,prep_time,cook_time,difficulty,last_made_date,substitutions,storage_reheating,total_time. `_recipeEditId` (NOT `_recEditId`). Selection→Panel: single-click selects, dblclick/`···`→`openRecSidePanel`. `#recSidePanel` 400px CSS transition. Panel ingredients: `_panelIngredients` (separate from `_rmIngredients`), `onblur`→`_savePanelIngredients()`. Ingredients: JSON `[{name,amount}]`. Search: name,meal_type,cuisine,notes,instructions,ingredient names+amounts. Names: `recSnapshot`, `_recUndoDirty`, `_recSyncToServer`. Filter: `#recFilterPop/.rfopen`. Context menu `#recCtxMenu`: view,edit,fav,duplicate,delete.

---

### Quick Notes (`features.js`)
Table: `quick_notes(id,note_text,is_visible,created_at,hidden_at)`. `loadQN()`: `?is_visible=eq.true&order=created_at.asc`, on panel open. `deleteQN`: PATCH `{is_visible:false}` — soft delete only.
