# Dashboard Rules

## Architecture
All files share global scope — no modules/bundler.
- `core.js`: state (`cfg`,`st`,`dayOff`,`wkOff`), auth, supabase helpers (`sbReq`,`sbReqSilent`,`sbReqNullable`), `syncAll`, date utils (`getWkKey`,`getWkBounds`,`getDayDate`,`d2s`,`dsToWkKey`), `getRecurringWeekTasks`, `isWRRuleDueThisWeek`, undo/redo (`pushUndo`,`doUndo`,`doRedo`,`showToast`)
- `overview.js`: `renderAll`,`renderOv`,`renderToday`,`renderWkSummary`,`renderWkCal`,`renderRecOv`,`renderRecMoCal`,`renderShopOv`,`renderUnassigned`,`renderKanban`,`renderDayTB`,`getAutoTBForDate`,`tRow`, drag-and-drop, WR rule CRUD, scope picker, `writeWrOverride`
- `features.js`: task CRUD, secondary pages (recurring/shopping/travel/birthdays/recipes), `showPage`,`closeMod`,`init()`,`selTask`,`clearSelection`,`showCtx`,`mkMCell`,`renderMoCal`, quick notes
- `pup-skills.js`: all pup skills logic

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + ctx menus + regular monthly cal → `features.js`. Pup → `pup-skills.js`. Utils/Supabase/auth/undo → `core.js`.

## Auth
Supabase Auth (email+password), RLS on all tables. `init()`→`checkAuth()`→no session→`#loginOverlay`. `doLogin()`→`signInWithPassword`→`_authToken`→`syncAll()`. All `sbReq*` use `_getAuthToken()` JWT + anon `apikey`. Token auto-refreshes hourly; refresh lasts 1 week.
- **Init flash prevention**: `#main` starts `opacity:0` in HTML; `renderAll()` sets it to `1` on first call (0.15s CSS transition). `history.scrollRestoration='manual'` set in `init()` to prevent scroll jump on soft refresh.
- **Overdue banner**: guarded by `_firstSyncDone` flag (features.js). `updateOvBanner()` is a no-op until after the first `syncAll()` completes, preventing stale localStorage overdue state from flashing.

## Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400.
- `tasks` POST required: `name,category,due_date,done,important`. Optional: `notes`.
- `wr_recurring_rules` POST required: `name,cadence,is_weekly_reset,is_enabled`. Non-WR adds `is_weekly_reset:false`. Optional: `appears_on_date,starting_date,pup_related,notes`.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-` (sync preserves `rec-tmp-`/`rec-local-`).
- Undo ID: `let serverId=null` in closure, set after POST. Undo reads `serverId||localId`.
- `sbReq` shows Supabase `message` field in toast 8s.
- `toggleTask`/`togRec`/`togShop`: call `sbUpdateBlock(b.id,{done})` for every linked TB block.
- `drawTBBlock` derives `b._done` from linked item at render time.
- `rolloverOverdue()`: write `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- On `init()`, `deletedRecIds` cleared — DB is authoritative.
- `localStorage` `save()`/`load()` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides.
- `syncAll` recurring fetch: `wr_recurring_rules` is single source. Split: `is_weekly_reset!==false`→`st.wrRules`; `is_weekly_reset===false`→`st.recurring`. `recurring_tasks` table no longer exists.
- `recQs(id)`: returns `?id=eq.${id}`.
- `renderAll()` does NOT call `renderDayTB()`. Ops changing TB state must also call `if(document.getElementById('tbGrid'))renderDayTB()` separately — including undo closures.
- Timeblock drag/resize: `tbOnUp`,`onRU`,`atbOnUp`,`onRM` in `overview.js`.

## Task Modals
- **`#tModal`**: add (`openTModal(cat='')`) + edit (`openEditTask(id)`). Fields: name,category,due date,important,notes. `setCatSel('tCat',cat)`. Save: `saveTModal()`.
- **`#qaPopup`** (`openQA(ctx,btn,ds,kcat)`): name,category,due date,important,notes. `submitQA` passes `notes` to POST. Cat defaults `kcat` in kanban, else `'Home'`.
- **Category dropdown** (`.cat-sel-wrap`): `catSelHTML(id,def)`, `setCatSel(id,v)`, `pickCat(id,v)`, `toggleCatDrop(id)`. Hidden `<input type="hidden">` + trigger div + drop panel. Colors from `CATS[v.toLowerCase()].bg/t/b`.

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`. Never `.select()` on edit inputs.
- **Outside-click close**: stable handler ref (e.g. `window._pageOutsideClick`), remove+re-register on every `renderPage()`. `!el.contains(e.target)`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay `div` owns Enter/Escape. Inputs must NOT have save handlers (double-fire). Empty name → close without saving. SELECT excluded from Enter-save on: recModal,recEditModal,pupModal,travelModal,recipeModal. Doc-level Enter fallback for tModal/shopEdit/recEdit/recModal/mModal/recMoModal when `.open`.
- **Cmd+Z in modals**: check `_isInput && !_ael.closest('.overlay:not(.open)')` → return early if true. Overlays use `opacity:0;pointer-events:none` NOT `display:none`. Undo closures re-find items by ID at undo time.
- **Page keyboard**: Cmd+Z/Shift+Z/Del/Bksp/Cmd+C/Cmd+V on pages with own undo (pup, birthdays, recipes).
- **Global shortcuts** (features.js, bottom): `n`=new task for today, `r`=reload, `s`=sync. Guard: skip if `activeElement` is INPUT/TEXTAREA/contentEditable or if meta/ctrl/alt held.
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; `rec-virt-{id}`→POST `is_weekly_reset:false`; task ID→POST `tasks`.
- **Sort/filter**: 250ms debounce, 3-state sort. Double-click→filter popup under `<th>`.
- **Per-page undo**: `pageSnapshot()` deep-clones state. `_pageUndoDirty` blocks `syncAll`. `_pageSyncToServer(prev,next)` diffs + fires minimal API calls.
- **Sync race**: `_pendingIds` Set — add before PATCH, remove in `.then()`. `syncAll` skips `_pendingIds`. For `due_date`: also `localOverrides[sid]={due_date:val}` before PATCH. **Always render before PATCH.**
- **Hover-X delete on chips**: chip `display:flex;align-items:center;gap:2px`. `.chip-del` last flex child, `opacity:1` on hover. Click guard: `if(e.target.closest('.chip-del,.chk-wrap'))return`. Delete: task→`delTask`; shop→null `due_date`; wRec→delete `_dateOverrides[wkKey]`; rec-virt→`__skip__`. Use `dsToWkKey(ds)` not `getWkKey(wkOff)`.
- **Chip checkboxes**: 8×8px, `insertBefore(chkWrap,chip.firstChild)`. Types: task→`toggleTask`; non-WR→`togRecVirt`; WRec→`togRec`; shop→`togShop`. Done: `opacity:.5` + `text-decoration:line-through`.
- **Chip indicator dot**: `5px` circle, `gc(type).d`. Regular recurring: when `r._dateOverrides[wkKey]` exists + `!=='__skip__'`. WR rules: when `st.wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`. recMoModal non-WR: badge+X shared slot, badge default/X on hover. WR items: X only. WR card: same + `margin-left:auto` when no dot. Style: `font-size:9px;font-weight:700;padding:1px 3px;border-radius:3px;background:rgba(0,0,0,.13)`.
- **TB X for shop/WR rule blocks**: `tb-bdel` always `delBlock` only. Keyboard Delete with `blk-{id}` → `delBlock` only. Shop/WR rule block selection uses `blk-{blockId}`.
- **Dragged shop/WR rule**: behave like tasks. X on shop chip→null `due_date`. X on WR chip→`showWrXPicker`→skip/delete. X removes from ALL views + linked blocks. Exception: X on TB block itself→`delBlock` only.
- **Virtual task objects**: `_isWrRule:true`, `_isWrec:true`, `_type:'shop'`. Source: `_ruleId` (WR rule), `_recId` (legacy WR), `_shopId` (shop). WR rules use `_wkKey`.
- **Modal stacking**: persistent bg modals `z-index:490`. Task/edit overlays default z-index:500.
- **renderAll + open modals**: `renderAll()` re-renders `#mModal`→`renderMoCal()`, `#recMoModal`→`renderRecMoCal()`. `renderRecOv()` calls `renderRecMoCal()` if open.

## Selection & Drag IDs
| Prefix | Source | Action |
|--------|--------|--------|
| `String(t.id)` | regular task | permanent delete |
| `wrrule-{id}` | WR rule | skip this week (override) |
| `rec-virt-{id}` | non-WR recurring | `skipRecVirtThisWk` |
| `wrec-{id}` | legacy WR chip | unschedule only |
| `shop-cal-{id}` | shopping chip | null `due_date` |
| `blk-{id}` | shop/WR rule in TB | keyboard Delete→`delBlock` only |
| `tv-{id}` | travel banner | permanent delete |
| `recmo::{recId}::{srcDs}` | non-WR chip in recMoModal | same-week drop only |
| `recmo-wr::{ruleId}::{srcWkKey}` | WR chip in recMoModal | cross-week drop |

- Weekly cal drag: `wrec::{recId}` (legacy WR), `rec::{recId}::{dueDate}` (non-WR), `wrrule::{ruleId}`, `shop::{shopId}`.
- recMoModal non-WR drop→scope picker: "This week only"→`_dateOverrides[wkKey]=ds`; "All future"→update `appears_on_date`.
- recMoModal WR drop→scope picker: "↻ All future"→shift `starting_date`; "⊞ This week only"→`writeWrOverride({override_type:'move'})`.
- Shift-click range: `#mCells`/`#recMoCells` use `.mcell-t[data-tid]` DOM order.
- Multi-select Delete: single `pushUndo`. Undo for recurring does NOT restore `notes`/`pup_related`/extra fields.

## UI Notes
- Top-right controls (`top:14px;right:20px;z-index:90`): three icon-only buttons — sync, refresh, settings — each `20×20px` circle (`.settings-btn` + `width:20px;height:20px;padding:0;border-radius:20px`), all using SVG icons at `10×10px`. `toggleDark()`→`body.dark`, persists `cfg.dark`.
- **Sync button** (`#syncBar`): `.sync-bar.settings-btn`, SVG sync icon. `setBadge(t,x)` sets `data-tip` on `#syncBar`/`#syncBar2` (no visible text). Tooltip shown on hover via CSS `::after{content:attr(data-tip)}`. Shows "Synced HH:MM", "Syncing…", or "Error".
- **Weekly Reset card header** (`#wrRecWkLbl`): shows "Weekly Reset" when `wrRecOff===0`, otherwise shows date range `Mon – Sun`.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously before chips render; `paddingTop` set on columns before DOM paint. `setTimeout(10ms)` only positions banner pixel coords + sets `bannerEl` height.
- Local backup: `backup.js` cron `0 8 * * *`→`backup_auto.json`.
- `.mcell` must include `min-width:0` (prevents CSS grid `1fr` blowout).

---

## WR Recurring Rules System

**Single table**: `wr_recurring_rules` stores WR (`is_weekly_reset=true`) + non-WR (`is_weekly_reset=false`). State: `st.wrRules` (WR), `st.wrOverrides`, `st.recurring` (non-WR).

**`wr_recurring_rules`** fields: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other), `is_weekly_reset`, `starting_date` (DATE, required for biweekly+), `appears_on_date` (TEXT, non-WR only), `pup_related,notes,is_enabled,sort_order`, `date_overrides` (JSONB, non-WR: `{wkKey: dateString|'__skip__'|'name::{wkKey}':{name,notes}}`), `done_by_week` (JSONB, non-WR: `{wkKey:true}`).

**`wr_recurring_overrides`** fields: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`. WR rules only.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff from anchor Mon mod 2===0; monthly=day-of-month in Mon–Sun span; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. Nulls unrelated fields. All via `sbReqSilent`.

**`_dateOverrides` on `st.wrRules`**: client-side only. `syncAll` preserves across sync via `prevPins`.

**Done state** (WR): `complete` override `done:true`. Written by `togWrRule`. DELETEd on uncheck.

**Display name**: check `st.wrOverrides` for `override_type:'edit'` on `(ruleId,wkKey)`→`custom_name` if present. Required in `renderRecOv` + `renderRecMoCal`.

**WR Edit modal** (`#wrEditModal`): "This week only" (custom name/notes/skip) vs "All future" (name,pup,cadence,starting_date,notes). Scope toggle hidden when `wkKey` null. `openWrEditModal(rid,wkKey,defaultScope)`.

**Unified Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?,type='wr')`. Toggle: Weekly Reset / Scheduled. WR: name,pup,cadence,starting_date,notes. Scheduled: same + `appears_on_date`. `_wrAddType` ('wr'/'sch'). All adds go here — `addRec()`, QA bar, overview `+`, recurring page `+`.

**Move prev/next week** (`wrCtxMovePrevWeek/Next`): shifts `starting_date` ±7 days — affects all future. Not a per-week override.

**WR card** (overview top-right): header `←`·`Month`·week label·`This Week`·`→`. `+` button: `position:absolute;bottom:8px;right:8px;z-index:10`. `#recList`: `flex:1;columns:2;column-gap:2px;column-fill:auto;overflow-y:auto;padding:0` (padding:0 overrides `.tlist` default). Sort: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup adds +1 within cadence. Cadence badge (`wr-cad-badge`): `position:absolute;right:3px`, hidden on hover/sel to reveal X. Changed+non-weekly: badge turns blue. Changed+weekly: blue dot (`wr-dot`) at right:5px. `wrRecOff` tracks week independently.

---

## Non-WR Recurring Task Logic

Non-WR (`is_weekly_reset=false`) in `wr_recurring_rules`→`st.recurring`. All CRUD to `wr_recurring_rules`; `recQs(id)=?id=eq.${id}`.

- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`→`{_recId,_virtual:true,_wkKey}`. Custom name: check `_dateOverrides['name::'+wkKey]`→use `{name}` if present. Skip: `skipRecVirtThisWk`→`__skip__`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo. Calls renderWeeklyPage/renderToday/renderWkSummary/renderWkCal/renderDayTB. NOT renderRecOv.
- After POST: `{...sv[0],_doneByWk:{},_done:false,_dateOverrides:{}}` + `save()`.
- **renderToday overdue**: `for(w=0;w>=wkOff-4;w--)`. Cascading `__skip__` check.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key, PATCHes `done_by_week`.
- **Duplicate**: `uniqueRecName` appends ` (2)/(3)`. POST: `name,is_weekly_reset:false,cadence,starting_date:today`.
- **Drag move** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Pass `oldDs` explicitly. Undo: restore `_dateOverrides`, remove new-date blocks, re-add `savedBlocks`.
- **`removeTBBlocksForDate` recId branch**: call `sbDeleteBlock(b.id)` before filtering `st.blocks`.
- **`appears_on_date` update** (all-future recMoModal move): day name (weekly/biweekly) or date-of-month string (monthly).
- **Edit this week only** (`wrCtxEditThisWeek` for rec): `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`, PATCHes `date_overrides`.

---

## Pages

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `noColor:true`. `_hasTBToday`: `dayOff===0 && isOv(due_date) && !done` + linked block. Sort helpers check `b.ruleId`/`b.shopId`/`b.recId`/`b.taskId`.
- **Layout**: `.overview-cols` `minmax(0,1.5fr) minmax(0,2.55fr)` gap 14px. `.row1-right-top` `1.05fr 0.9fr 0.6fr` gap 14px. `.ov-topbar` `position:fixed;left:0;right:0`→`left:186px` on sidebar open. `transition:left .25s`.
- **Unassigned badge**: `#unAssignedBadge` in `.wkc-foot`. Filter: `!due_date&&!done&&category!=='Long term'`. Popup `#unMenu` fixed 300px, opens upward. Backdrop `#unMenuBack`. Overview page only.
- **Time blocks**: auto blocks (`st.autoTimeblocks`+`st.autoTBOverrides`) in `computeTBLayout`. `getAutoTBForDate(ds)`: override or base times, skip Sat/Sun if weekdays-only, `start_time=null`=deleted. `delAutoTBForDay`: PATCH null if override, else POST null. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.
- **Auto block duration**: `/\bheb\b/i` or `/pilates/i`→60min; `social`→120min; else→30min.

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left (`#rt-wr-*`), non-WR right (`#rt-sch-*`). 4 cadence groups each.
- WR: `renderRtWrGroup`. Cols: Name|🐾|✕. Dblclick→`openWrEditModal(rid,null,'all')`. `+`→`openWrRuleAddModal(cadence,'wr')`.
- Non-WR: `renderRtGroup`. Cols: Name|Due On|Starting. Inline edit `rtDblEdit`. `+`→`openRecModalForSection`; Other `+`→`openWrRuleAddModal('quarterly','sch')`.
- Other group: `OTHER_CADS=['quarterly','biannual','annual']`.
- New rules appear instantly: `saveWrRuleAdd` calls `renderWeeklyPage()` after add, after POST, and in undo.

### Monthly Calendar (`features.js`, `#mModal`)
`renderMoCal`: fixed range Jan 1 (curYr-3) → Dec 31 (curYr+2), ~314 weeks. No year filtering — `_moNavYear` (min 2026, default current year) is navigation-only. Month seps: `.mo-sep`. Open: `scrollMoToday()` BEFORE `.open`, then `requestAnimationFrame(()=>modal.classList.add('open'))`. `scrollMoToday` uses offsetParent chain traversal (`while el!==mgrid`) with offset `-mdowH-64`. GPU: `backdrop-filter:none` on `#mModal`/`#recMoModal`. Orbs paused: `bg.classList.add('orbs-paused')`. `#mCells` uses `grid-template-columns:repeat(7,1fr)`. `.mcell` has `min-width:0`.

Non-WR in monthly cal: `_moRecMap` precomputed before cell loop via `getRecurringWeekTasks(wkOff)` per week, mapped by `due_date`.

Chip: `[checkbox][text][chip-del]`. Travel: no checkbox, span spacer for continuations. `margin-left:-13px;width:calc(100%+Npx)` bridges gap. `dsToWkKey(ds)` not `getWkKey(wkOff)`. `renderAll()`→`renderMoCal()` if open. Year picker `#moYearSel` (input, min 2026): `◀/▶` via `moYearStep(dir)`, type+Enter calls `jumpMoYear(yr)` which scrolls to that year's first `.mo-sep`. `moGoToday()` resets year input to current year and calls `scrollMoToday()`.

### Recurring Monthly View (`overview.js`, `#recMoModal`)
Opens via "Month" in WR card header. Same GPU/orb-pause rules as `#mModal`.

**Grid**: 8 cols — 7 day + 1 WR. `grid-template-columns:repeat(7,1fr) minmax(160px,1.8fr)`. WR col: blue-tinted bg, `columns:2;column-gap:2px`. `z-index:490`. Width: `min(98vw,1200px)`.

**Data** (22-week range): `wrWeekMap[w]` via `isWRRuleDueThisWeek`. Display name: check `st.wrOverrides` `override_type:'edit'`→`custom_name`. `dayMap[ds]` via `getRecurringWeekTasks`. `moved=true` if `_dateOverrides[dsToWkKey(due_date)]` exists + `!=='__skip__'`.

**Chip types**: WR rule `wrrule-{id}` `gc('weekly_reset')` draggable `recmo-wr::`. Non-WR `rec-virt-{id}` `gc('Recurring')` draggable `recmo::`. Both `cursor:grab`, 8×8 checkbox.

**X button** (`showWrScopePicker`): WR→skip/delete rule. WRec→skip/`delRec`. Non-WR virtual→`skipRecVirtThisWk`/`delRec`. `delRec` guards temp IDs.

**Dblclick**: WR→`openWrEditModal(ruleId,wkKey,'all')`; non-WR→`tiDblRec(e,recId)`.

**Right-click** (`showWrRuleCtx(e,id,wkKey)`): auto-detects type via `st.wrRules`. Sets `_wrCtxRuleId` or `_wrCtxRecId`. Menu `#wrRuleCtxMenu`:
- Skip this week: WR→`writeWrOverride({override_type:'skip'})`; WRec→`unscheduleWRec`; non-WR→`skipRecVirtThisWk`.
- Move prev/next: WR→`starting_date ±7`; rec→`_dateOverrides[wkKey] ±7`.
- Edit this week / Edit rule: WR→`openWrEditModal`; rec→`openRecEditModal(rid,wkKey,'this'/'all')`.
- Delete: WR→delete rule; rec→`delRec`.

**Drag non-WR** (`recmo::{recId}::{srcDs}`): same-week only (`dsToWkKey` guard). Drop→scope picker: "This week"→`_dateOverrides[wkKey]=ds`; "All future"→`appears_on_date`.

**Drag WR** (`recmo-wr::{ruleId}::{srcWkKey}`): WR col drop target. Drop diff week→scope picker: "↻ All future"→shift `starting_date`; "⊞ This week"→`writeWrOverride({override_type:'move'})`.

### Shopping List (`features.js`)
`shop_order integer`. Fetch `?order=shop_order.asc.nullslast,store.asc,name.asc`. Sort modes: manual/store/alpha via `cycleShopOvSort()`. **Drag MUST use mousedown/mousemove/mouseup — NOT HTML5.** `onUp`: splice, reassign sequential `shop_order`, re-render, PATCH. HTML5 drag `shop::{shopId}` onto other views sets `due_date`. X on chip→`unscheduleShop`: null `due_date`, remove `st.blocks`.

### Travel System (`features.js`+`overview.js`)
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. `travel_mode:'plane'|'drive'|null`. Local IDs `l-`. Weekly banners: `innerHTML` SVG, `colLanes` layout. Monthly: in-flow chips. Drag-to-create: `calDrag{active,startDs,endDs,moved}`. Drag-to-move: `dragId='travel::'+id+'::0'`, duration preserved. Week boundary: `ei` clamped `_eiRaw<0?6:Math.min(6,_eiRaw)`.

### Pup Skills (`pup-skills.js`, `page-pups`)
Table: `pup_skills(id,pup,skill,stage,level,category,skill_order,next_step,word,signal,comments,focus)`. `pup`: Mochi|Sunny. `stage`: In Progress|Mastered|Not Started. Layout: 3-col. Inline edit: `pupCellEdit(td,id,field)`, `td._editing` guard. Focus→In Progress unless Mastered. Sort: mastered last→category (commands=0,manners=1,fun=2,other=9)→focus first→pup→level→skill_order. Card header `1fr 92px 1fr`. Names: `pupSnapshot`,`_pupUndoDirty`,`_pupSyncToServer`,`_pupPendingIds`,`window._pupOutsideClick`.

### Birthdays (`features.js`, `page-birthdays`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas` JSON array TEXT. Grid: 4×3 months, `subgrid` 4 cols. Badge: countdown (≤30d priority) or age. `_normBdayDate`: `7/5`→`1900-07-05`; 2-digit: ≤30→2000s. `saveBdayModal` does NOT include `present_ideas`. `#bdayPresentPopup` `position:fixed`. `syncAll` merges local `present_ideas` if server null.

### Recipes (`features.js`)
Table: `recipes(id,name,meal_type,cuisine,time,servings,notes,favorite,ingredients,instructions,source)`. Do NOT reference: protein,prep_time,cook_time,difficulty,last_made_date,substitutions,storage_reheating,total_time. `_recipeEditId` (NOT `_recEditId`). Single-click selects, dblclick→`openRecSidePanel`. `#recSidePanel` 400px CSS transition. `_panelIngredients` (separate from `_rmIngredients`), `onblur`→`_savePanelIngredients()`. Ingredients: JSON `[{name,amount}]`. Search: name,meal_type,cuisine,notes,instructions,ingredients. Names: `recSnapshot`,`_recUndoDirty`,`_recSyncToServer`.

### Quick Notes (`features.js`)
Table: `quick_notes(id,note_text,is_visible,created_at,hidden_at)`. `loadQN()`: `?is_visible=eq.true&order=created_at.asc`. `deleteQN`: PATCH `{is_visible:false}` — soft delete only.
