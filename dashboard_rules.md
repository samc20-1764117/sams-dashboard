# Dashboard Implementation Rules

---

## Global Rules

> **Applying to a new page/item type:** All subsections below define the standard patterns. When adding a new page, field, or data type, apply each relevant pattern by default. Page sections only document deviations or page-specific values.

### Architecture
All files share global scope — no modules, no bundler.

| File | Contains |
|------|----------|
| `index.html` | HTML + CSS + 4 `<script src>` tags |
| `core.js` | State (cfg, st, dayOff, wkOff), Supabase helpers (sbReq, sbReqSilent, sbReqNullable), syncAll, date utils (getWkKey, getWkBounds, getDayDate, d2s), getRecurringWeekTasks, undo/redo (pushUndo, doUndo, doRedo, showToast), global keydown |
| `overview.js` | renderAll, renderOv, renderToday, renderWkSummary, renderWkCal, renderRecOv, renderShopOv, renderUnassigned, renderKanban, renderDayTB, getAutoTBForDate, tRow, drag-and-drop |
| `features.js` | Task CRUD, all secondary pages (recurring/shopping/travel/birthdays/recipes), showPage, closeMod, init(), selTask, clearSelection, showCtx, quick notes |
| `pup-skills.js` | All pup skills logic |

**Where is X?** Overview/today/calendar/kanban/timeblocks → `overview.js`. Secondary pages + CRUD + context menus → `features.js`. Pup → `pup-skills.js`. Shared utils/Supabase/undo → `core.js`. New shared function → `core.js`.

- Grep exact function/variable name first. Never broad greps. Don't chain passes when one suffices.
- Timeblock drag/resize: `tbOnUp`, `onRU`, `atbOnUp`, `onRM` in `overview.js`.
- `renderAll()` does NOT call `renderDayTB()`. Any operation that changes timeblock state must also call `if(document.getElementById('tbGrid'))renderDayTB()` separately — including undo closures.

### Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400 failure.
- `tasks` POST required: `name`, `category`, `due_date`, `done`, `important`.
- `recurring_tasks` POST required: `name`, `is_weekly_reset`, `cadence`. Do NOT send `day_of_week`/`repeat_day`. Optional: `appears_on_date`, `starting_date`, `repeat_date`, `day_added`, `task_due_day`.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-` (sync only preserves `rec-tmp-`/`rec-local-`).
- Undo ID: `let serverId=null` in closure, set after POST resolves. Undo reads `serverId||localId`.
- `sbReq` shows Supabase `message` field in toast for 8s.
- `toggleTask`/`togRec`/`togShop`: call `sbUpdateBlock(b.id,{done})` for every linked TB block.
- `drawTBBlock` derives `b._done` from linked item at render time.
- `rolloverOverdue()`: write `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- On `init()`, `deletedRecIds` cleared — DB is authoritative.
- Notes: `notes` column on `tasks` + `recurring_tasks`. Include in POST/PATCH. Show via `.tb-notes` in time blocks.

### Interaction Patterns

**Focus & Cursor** — cursor lands at end of text on every input open. Use `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`. Never `.select()` on edit inputs (exception: filter/search inputs). Applies to all modals and inline edits — including WR edit modal (`openWrEditModal`) and add modal (`openWrRuleAddModal`).

**Outside-Click Close** — all popups/panels that close on outside click:
- Store handler at stable ref (e.g. `window._pageOutsideClick`), remove + re-register on every `renderPage()`.
- Handler: `!el.contains(e.target)` before closing.
- Add listener via `setTimeout(0)` after open to avoid immediate re-close.
- Backdrop (`position:fixed;inset:0`) alternative for popups needing pointer-events blocking during drag.

**Modal Enter / Escape** — overlay `div` owns Enter/Escape. Individual inputs must NOT have save handlers (double-fire).
- Default: overlay keydown handles Enter → save, Escape → `closeMod`.
- Enter with empty name field: close modal without saving — `if(!name){closeMod('id');return;}`. Applies to all add and edit modals including `wrRuleAddModal`, `wrEditModal`.
- Add modals: Enter on empty name = close (do not silently ignore). Edit modals: Enter on empty name = close (revert).
- SELECT elements excluded from Enter-save on: recModal, recEditModal, pupModal, travelModal, recipeModal.
- `travelModal`: `tvTravelMode` SELECT uses `setTimeout(saveTravelModal,0)`.
- `bModal` exception: input `onkeydown` (not overlay).
- `tCat` select: `addEventListener + e.stopPropagation()` — only legitimate per-element override.
- Document-level Enter fallback for tModal/shopEdit/recEdit/recModal when `.open`. Must NOT gate on field content.

**Cmd+Z in Modals** — global keydown in `core.js`. Check: `_isInput && !_ael.closest('.overlay:not(.open)')` — if true, return early (native undo). Overlays use `opacity:0;pointer-events:none` NOT `display:none`, so focused input persists after close. Never add `stopPropagation` for Cmd+Z to overlay attributes. Undo closures must re-find items by ID at undo time, not capture by reference.

**Page-Level Keyboard Shortcuts** — pages with own undo stack (pup, birthdays, recipes) register keydown as first listener:
- Cmd+Z → page undo, Cmd+Shift+Z → page redo, Del/Bksp → delete (skip if input focused), Cmd+C → copy, Cmd+V → paste.
- Must check `e.target.tagName` to skip when input focused.

**Sort/Filter with Debounce** — table pages (pup, recipes):
- 250ms debounce on header click/dblclick.
- Single click → 3-state sort: none→asc→desc→none.
- Double click → filter popup positioned under live `<th>` (re-query DOM at open time, not `e.currentTarget`).
- Filter popup uses Outside-Click Close. Sort state in module variable.

**Per-Page Undo Stack** — pages with own undo (pup, birthdays, recipes):
- `pageSnapshot()` deep-clones state before any destructive op.
- `_pageUndoDirty` flag blocks `syncAll` from overwriting pending local changes.
- `_pageSyncToServer(prev,next)` diffs and fires minimal API calls.
- Undo: restore snapshot locally → call `_pageSyncToServer`. Redo: store forward snapshot before applying.

**Sync Race Protection** — pages/features with in-flight PATCHes:
- `_pendingIds` Set: add ID before PATCH, remove in `.then()`.
- `syncAll` skips overwriting entries in `_pendingIds`.
- Instances: pup=`_pupPendingIds`, travel=`pendingTravelIds`, tasks=`pendingLocal`.
- For `due_date` changes: also set `localOverrides[sid]={due_date:val}` before PATCH; clear in `.then()`. Undo closure must also set `localOverrides+pendingLocal` and use `.then()` for cleanup.
- **Render before PATCH** — always update local state and re-render BEFORE firing the PATCH (use `.then()` not `await`). This makes changes feel instant. Never `await` a PATCH before rendering.

**Hover-X Delete on Chips** — any chip-based view (calendar cells, popups, lists):
- Chip must be `display:flex;align-items:center;gap:2px`. Text in `<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">`.
- Add `.chip-del` button (`✕`) as last flex child. CSS: `[container]:hover .chip-del{opacity:1}`.
- Click handler: `e.stopPropagation()`, then delete based on chip type (no confirm dialog).
- Chip click handler must guard: `if(e.target.closest('.chip-del'))return` before any selection logic.
- Delete logic per chip type: regular task→`delTask`; shop chip→clear `due_date` (unschedule); wRec chip→delete `_dateOverrides[wkKey]`; rec-virt chip→set `_dateOverrides[wkKey]='__skip__'`. Always use `dsToWkKey(ds)` for date-relative wkKey, NOT `getWkKey(wkOff)`.
- After any delete, call the view's own render function (e.g. `renderMoCal()`) in addition to `renderAll()`.

**Modal Stacking / Z-index** — when a persistent modal (like monthly calendar) can have task/edit modals open on top of it:
- The persistent background modal must have a lower z-index than the standard overlay z-index (500). Set inline `style="z-index:490"` on the background modal.
- Task/edit overlays stay at the default z-index:500 and will always render in front.

**renderAll and open modals** — `renderAll()` must also re-render any persistent modal that is currently open (e.g. monthly calendar). Check `el.classList.contains('open')` and call its render function. This ensures operations like duplicate, paste, undo, and delete always refresh all visible views.

### Selection & Drag IDs

| Prefix | Source | Delete action |
|--------|--------|---------------|
| `String(t.id)` | regular task | permanent delete |
| `wrrule-{id}` | WR recurring rule (new system) | skip this week (override) |
| `rec-virt-{id}` | non-WR recurring (scheduled) | `skipRecVirtThisWk` |
| `wrec-{id}` | legacy WR chip in weekly cal (old system) | unschedule only |
| `shop-cal-{id}` | shopping chip | null `due_date` |
| `tv-{id}` | travel banner | permanent delete |

- Drag ID: `wrec::{recId}` (WR), `rec::{recId}::{dueDate}` (non-WR). Parse: `split('::')[1]`.
- Multi-select Delete: single `pushUndo`. Undo for recurring does NOT restore `notes`/`pup_related`/extra fields.

### UI
- **Top-right controls** (`top:14px;right:20px;z-index:90`): Sync bar | Settings ⚙. Settings popup: Night Mode toggle + Backup Sync. Closes on outside click. `toggleDark()` → `body.dark`, persists in `cfg.dark`. Night mode only in settings popup.
- **Local backup**: `backup.js` cron `0 8 * * *` → `backup_auto.json`. Manual: settings popup → `backup_manual.json`. Tables: tasks, recurring_tasks, shopping_list, travel, birthdays, pup_skills, time_blocks, auto_timeblocks, auto_timeblock_overrides, wr_recurring_rules, wr_recurring_overrides.

---

## WR Recurring Rules System

Tables: `wr_recurring_rules` (base definitions) + `wr_recurring_overrides` (per-week exceptions). State: `st.wrRules`, `st.wrOverrides`. Both fetched in `syncAll`.

**`wr_recurring_rules`** fields: `id, name, cadence` (weekly/biweekly/monthly/other), `day_of_week` (0=Sun), `anchor_date` (DATE, biweekly cycle reference — any past Monday in the correct cycle), `monthly_rule_type` (nth_weekday/date_of_month), `monthly_nth` (-1=last), `monthly_weekday`, `monthly_date` (1–28), `pup_related`, `notes`, `is_enabled`, `sort_order`.

**`wr_recurring_overrides`** fields: `id, rule_id, wk_key` (Monday YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done`, `moved_to_wk_key`, `custom_name`, `custom_notes`. UNIQUE on `(rule_id, wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek(rule, off)` in `core.js`):
- weekly/other: always due
- biweekly: `anchor_date` → compute week diff mod 2 → due if diff===0
- monthly nth_weekday: `getNthWeekday(y,m,nth,weekday)` — if occurrence falls within Mon–Sun span of the target week
- monthly date_of_month: same check for fixed date
- Changes take effect immediately — re-anchor or rule change shows in current week if it now qualifies

**Override upsert** (`writeWrOverride(ruleId, wkKey, payload, opts)` in `overview.js`): PATCH if override exists for `(ruleId, wkKey)`, POST new row if not. Nulls out unrelated fields to prevent stale data. All WR DB ops via `sbReqSilent`.

**Done state**: `complete` override with `done=true`. Written by `togWrRule`. DELETEd when un-checking.

**Edit modal** (`#wrEditModal`): unified scope toggle — "This week only" (custom name/notes + skip action) vs "All future" (full rule fields). Scope toggle hidden when opened without `wkKey` (recurring page always goes to all-future). Dblclick on WR card row → `openWrEditModal(rid, wkKey, 'this')`. Recurring page dblclick → `openWrEditModal(rid, null, 'all')`.

**Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal()` → `saveWrRuleAdd()`. Uses temp ID pattern (`wrrule-tmp-*`). All WR adds go through this modal — `addRec()`, QA bar 'rec' context, and recurring page `+` all redirect here.

**Override indicator**: small colored dot right-aligned on row. Blue=moved, amber=edited. Only shown when value actually differs from base rule.

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
- **Drag move to another day** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Pass `oldDs:origDate` explicitly. Undo: restore `_dateOverrides`, remove new-date blocks, re-add `savedBlocks` via `sbSaveBlock`, then `renderAll()+renderDayTB()`.
- **`removeTBBlocksForDate` — `recId` branch**: call `sbDeleteBlock(b.id)` before filtering `st.blocks`.

---

## Pages

### Overview (`overview.js`)

**Today List** — sort: done last → travel → overdue → important → type (regular=1,recurring=2,shopping=3,birthday=4) → name. No category bg (`noColor:true`). `_hasTBToday(t)`: `dayOff===0 && isOv(due_date) && !done` + linked block.

**Weekly Reset filter** — `renderRecOv()` uses `isWRRuleDueThisWeek(rule, off)` on `st.wrRules`. Merges overrides (skip removes, move redirects, edit applies custom name, complete marks done). Sort: done last → cadence (weekly=0,biweekly=1,monthly=2,other=3) → pup-related last (order=10). Week nav via `wrRecOff` (independent of `wkOff`). Override dot indicator: blue=moved, amber=edited (only when value differs from base rule).

**Unassigned badge** — `#unAssignedBadge` in `.wkc-foot`. Filter: `!due_date&&!done&&category!=='Long term'`. Popup `#unMenu`: fixed 300px, opens upward. Backdrop `#unMenuBack` (outside-click). `dEnd` restores backdrop. Visible only on overview page.

**Time Blocks** — auto blocks (`st.autoTimeblocks`+`st.autoTBOverrides`) in `computeTBLayout`. `getAutoTBForDate(ds)`: override or base times, skip Sat/Sun if weekdays-only, `start_time=null`=deleted. `delAutoTBForDay`: PATCH null if override exists, else POST null override. Drop: `dropOnTB(e,ds,null,null,b.sm)` (5th param skips cursor math). `.tb-drop-over`: dashed purple. `selAtbId`/`selAtbDs` track selected auto block. All auto block DB via `sbReqSilent`. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.

**Auto block duration**: name `/\bheb\b/i` or `/pilates/i`→60min; category/name `social`→120min; else→30min.

---

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left (`#rt-wr-*`), non-WR right (`#rt-sch-*`). 4 cadence groups each.
- **WR left**: `renderRtWrGroup(containerId, rules, cadence)` — reads `st.wrRules`. Columns: Name | 🐾 | Schedule. Dblclick → `openWrEditModal(rid, null, 'all')` (always edits base rule, no scope toggle). 🐾 toggle → `rtToggleWrPup` → PATCH `wr_recurring_rules`. Delete → `delWrRule` (with undo). `+` → `openWrRuleAddModal()`. Schedule display: `wrRuleScheduleStr(rule)` (e.g. "Mon", "Tue (biweekly)", "2nd Fri", "15th").
- **Non-WR right**: `renderRtGroup(containerId, tasks, cadence)` — reads `st.recurring` (non-WR). Columns: Name | Adds On | Due On | Starting. Inline edit via `rtDblEdit`. `+` → `openRecModalForSection('scheduled', cadence)`. `duplicateRecDirect`: `uniqueRecName`, POST, undo.
- **Stats bar** (`#wrPL`, `#wrPct2`, `#wrBar`): computed from `st.wrRules` due this week + `st.wrOverrides` with `override_type='complete'&&done=true`.
- Hidden compat elements: `#wrBar #wrPct2 #wrPL #wrList #shopFull #shopCountLbl #shopSortBtn #nsN #nsS`.

---

### Monthly Calendar (`overview.js`)
`renderMoCal`: 22 weeks (8 past + 14 future) from current Monday, no pagination. Month separators: `.mo-sep` (`grid-column:1/-1`). Open: `scrollMoToday()` via `setTimeout(30ms)`. No `moOff`/`shiftMo`. Native wheel scroll. Cell: `max(70px,calc((94vh-100px)/4-4px))`. Structure: `.mcell`→`hdr`→`.mcell-body`. Travel tasks render in-flow within the normal chip stack (sorted first), count toward per-day visible limit (5). CSS negative-margin spanning trick: non-first cells use `margin-left:-13px; width:calc(100%+Npx)` to bridge the 13px cell gap; non-last cells extend right similarly; `position:relative;z-index:1`. `isVisualFirst=t.due_date===ds||dow===0`; `isVisualLast=!t.end_date||t.end_date===ds||dow===6`. First cell shows label+icon; continuation cells show empty spacer. All travel cells get `.chip-del` calling `delTravel`. Selection outline suppressed on travel chips: `.mcell-t[data-tid^="tv-"].sel-row{outline:none!important}`. `addMoTravelBanners` deleted. Chip click: `selTask(e,tid)`. "+X more": `showMcellMorePop` — full overlay, all task interactions, outside-click/Escape/Enter closes. Shift-click: `#mCells .mcell-t[data-tid]`. **Year dropdown** `#moYearSel`: −3 to +2 + "All". `jumpMoYear(yr)` sets `_moYrFilter`, renders weeks for full year, scrolls to first `.mo-sep` with year. "All" resets to 22-week view. **Layout**: `.mhead` `border-radius:8px`; `.mdow` `border-radius:8px`, `position:sticky;top:0`; `.mgrid` `scroll-padding-top:21px`. `scrollMoToday` subtracts `mdow.offsetHeight` when computing scroll position.

**Monthly chip interactions**: chip structure, hover-X delete (`moChipDel(t,ds,e)`), and sync race protection follow Global Interaction Patterns. Delete uses `dsToWkKey(ds)` (not `getWkKey(wkOff)`) — required because monthly view spans multiple weeks. `showMcellMorePop` chips also call `closeMorePop()` before delete. `renderAll()` calls `renderMoCal()` when `#mModal` is open. `#mModal` has `style="z-index:490"`.

---

### Shopping List (`features.js`)
`shop_order integer`. Fetch: `?order=shop_order.asc.nullslast,store.asc,name.asc`. Sort modes: `manual`|`store`|`alpha` via `cycleShopOvSort()` (`#shopOvSortBtn`). Grips only in manual mode. **Drag MUST use mousedown/mousemove/mouseup — NOT HTML5 drag** (suppresses mousemove). `renderShopOv()` uses `createElement`. Grip mousedown: `_shopDrag.active` + doc-level listeners. `dragstart` cancels HTML5 when active. `onUp`: splice, reassign sequential `shop_order`, re-render, PATCH affected rows.

---

### Travel System (`features.js` + `overview.js`)
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. `travel_mode`: `'plane'|'drive'|null`. Stored in `st.travel`. Local IDs: `l-`. `_PLANE_SVG`/`_CAR_SVG` in `overview.js`. Weekly banners use `innerHTML` (SVG); `colLanes` for weekly lane layout. Monthly: in-flow chips (no absolute banners). Drag-to-create: `calDrag{active,startDs,endDs,moved}`. `delTravel`: sync restore, async DELETE (skip `l-`). After POST: `renderAll()+renderTravelPage()`. Drag-to-move: `draggable=true`, `dragId='travel::'+id+'::0'`, duration preserved. Week boundary: clamp `ei` → `_eiRaw<0?6:Math.min(6,_eiRaw)`. Enter on empty name → `closeMod` immediately.

---

### Pup Skills (`pup-skills.js`, `page-pups`)
Table: `pup_skills(id,pup,skill,stage,level,category,skill_order,next_step,word,signal,comments,focus)`. `pup`: Mochi|Sunny. `stage`: In Progress|Mastered|Not Started. `next_step`: 1.Duration|2.Distance|3.Distraction|null. Layout: 3-col (Mochi card | Sunny card | table). **Sort/Filter**: see §Interaction Patterns. Sort var: `pupSortBy`. Filter: `#pupFilterPop`. **Inline edit**: `pupCellEdit(td,id,field)`, `td._editing` guard, selects for next_step+category, empty→null before PATCH. Focus→In Progress unless Mastered. **Undo/sync/keyboard/outside-click**: see §Interaction Patterns. Pup-specific names: `pupSnapshot`, `_pupUndoDirty`, `_pupSyncToServer`, `_pupPendingIds`, `window._pupOutsideClick`. Default sort: mastered last → category (commands=0,manners=1,fun=2,other=9) → focus first → pup → level → skill_order. Dividers only in default sort. Card header: `1fr 92px 1fr`, headshot `position:absolute top:-36px`. Card row: checkbox+skill+`"word"`(if≠skill)+☞(if signal) | next_step | comment. Table cols: `·,Skill,Word,Level,Stage,Next Step,Category,···`. `colIdx`: `{pup:0,skill:1,word:2,level:3,stage:4,next_step:5,category:6}`.

---

### Birthdays (`features.js`, `page-birthdays`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas`: JSON array TEXT. Grid: 4×3 months, `subgrid` 4 cols (name|badge|date|delete). Badge: countdown (priority ≤30d) OR age. Countdown colors: today=orange, tmrw=light-orange, ≤7d=yellow, ≤30d=green, >30d=`''`. Age only if year known. `_normBdayDate`: `7/5`→`1900-07-05` (no-year sentinel); 2-digit: ≤30→2000s, >30→1900s. `saveBdayModal` does NOT include `present_ideas`. `#bdayPresentPopup` is `position:fixed`. `syncAll` merges local `present_ideas` if server null. **Undo/keyboard**: see §Interaction Patterns. Names: `bdaySnapshot`, `_bdaySyncToServer`.

---

### Recipes (`features.js`)
Table: `recipes(id,name,meal_type,cuisine,time,servings,notes,favorite,ingredients,instructions,source)`. Do NOT reference removed cols: protein,prep_time,cook_time,difficulty,last_made_date,substitutions,storage_reheating,total_time. `_recipeEditId` (NOT `_recEditId`). Page skeleton + filter bar built once via `page._recInit`. Selection→Panel: single-click selects, dblclick/`···`→`openRecSidePanel`. `#recSidePanel` 400px CSS transition. `_saveSpField`→`setRecField(id,field,val,skipPanel=true)`. Panel ingredients: `_panelIngredients` (separate from modal `_rmIngredients`), `onblur`→`_savePanelIngredients()`. Ingredients: JSON `[{name,amount}]`, `_serializeIngredients` filters blank entries. Enter in amount→focus name; Enter in name→new row; Bksp on empty→delete row. Search: name,meal_type,cuisine,notes,instructions,ingredient names+amounts. **Sort/filter/undo/keyboard**: see §Interaction Patterns. Names: `recSnapshot`, `_recUndoDirty`, `_recSyncToServer`. Filter popup: `#recFilterPop/.rfopen`. Context menu `#recCtxMenu`: view,edit,fav,duplicate,delete.

---

### Quick Notes (`features.js`)
Table: `quick_notes(id,note_text,is_visible,created_at,hidden_at)`. `loadQN()`: `?is_visible=eq.true&order=created_at.asc`, called on panel open. `deleteQN`: PATCH `{is_visible:false}` — soft delete only. Outside-click closes panel (see §Interaction Patterns).
