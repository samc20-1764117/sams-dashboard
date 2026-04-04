# Dashboard Rules

## Architecture
All files share global scope — no modules/bundler.
- `core.js`: state (`cfg`,`st`,`dayOff`,`wkOff`), auth, supabase helpers (`sbReq`,`sbReqSilent`,`sbReqNullable`), `syncAll`, date utils (`getWkKey`,`getWkBounds`,`getDayDate`,`d2s`,`dsToWkKey`), `getRecurringWeekTasks`, `isWRRuleDueThisWeek`, undo/redo (`pushUndo`,`doUndo`,`doRedo`,`_stateSnap`,`_stateRestore`,`_syncRedoDiff`,`showToast`)
- `overview.js`: `renderAll`,`renderOv`,`renderToday`,`renderWkSummary`,`renderWkCal`,`renderRecOv`,`renderRecMoCal`,`renderShopOv`,`renderUnassigned`,`renderKanban`,`renderDayTB`,`tRow`, drag-and-drop, WR rule CRUD, scope picker, `writeWrOverride`, `unSkipWrRule`,`unSkipWRec`,`openWrSkipped`
- `features.js`: task CRUD, secondary pages, `showPage`,`closeMod`,`init()`,`selTask`,`clearSelection`,`showCtx`,`mkMCell`,`renderMoCal`, quick notes, `getOvRecurring`,`rolloverOverdue`,`updateOvBanner`,`skipWRec`
- `pup-skills.js`: all pup skills logic

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + ctx menus + regular monthly cal → `features.js`. Utils/Supabase/auth/undo → `core.js`.

## Auth
Supabase Auth (email+password), RLS on all tables. `init()`→`checkAuth()`→no session→`#loginOverlay`. `doLogin()`→`signInWithPassword`→`_authToken`→`syncAll()`. All `sbReq*` use `_getAuthToken()` JWT + anon `apikey`. Token auto-refreshes hourly; refresh lasts 1 week.
- **Init flash prevention**: `#main` starts `opacity:0` in HTML; `renderAll()` sets it to `1` on first call. `history.scrollRestoration='manual'` set in `init()`.
- **Overdue banner**: guarded by `_firstSyncDone` flag. `updateOvBanner()` no-op until first `syncAll()` completes.

## Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400.
- `tasks` POST required: `name,category,due_date,done,important`. Optional: `notes`.
- `wr_recurring_rules` POST required: `name,cadence,is_weekly_reset,is_enabled`. Non-WR adds `is_weekly_reset:false`. Optional: `appears_on_date,starting_date,pup_related,notes`.
- `time_blocks` fields used: `id,title,day_date,start_time,start_minutes,duration_minutes,category,task_id,rec_id,shop_id,rule_id,done`. `rule_id` links WR rule blocks — requires DB column `rule_id uuid REFERENCES wr_recurring_rules(id)`. `sbSaveBlock` saves all fields incl. `rule_id`. `syncAll` maps `rule_id`→`ruleId`.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-`.
- `sbReq` shows Supabase `message` field in toast 8s.
- `toggleTask`/`togRec`/`togShop`: call `sbUpdateBlock(b.id,{done})` for linked TB blocks.
- `drawTBBlock` derives `b._done` from linked item at render time.
- `rolloverOverdue()`: stores `prevDate` per WR rule/rec before rollover. Undo restores original overdue date (not delete). Undo also patches `wr_recurring_rules` DB. Stores `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- `localStorage` `save()`/`load()` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides.
- `syncAll` recurring fetch: `wr_recurring_rules` single source. `is_weekly_reset!==false`→`st.wrRules`; `is_weekly_reset===false`→`st.recurring`.
- `recQs(id)`: returns `?id=eq.${id}`.
- `renderAll()` does NOT call `renderDayTB()`. Ops changing TB state must also call `if(document.getElementById('tbGrid'))renderDayTB()` — including undo closures.

## Undo / Redo
- `pushUndo(fn,msg)`: snapshots state BEFORE action via `_stateSnap()`, pushes `{fn,snapBeforeUndo}`. Toast shows 4s.
- `doUndo()`: pops entry, captures current snap for redo, calls `entry.fn()`.
- `doRedo()`: restores snap via `_stateRestore(snap)`, diffs + patches DB via `_syncRedoDiff(before,after)`.
- **`_stateSnap`** captures: `tasks,recurring,shopping,travel,birthdays,blocks,wrRules,wrOverrides`.
- **`_stateRestore`** restores all above fields, calls `renderAll()`,`renderDayTB()`,`renderWkCal()`,`renderRecOv()`,`renderWeeklyPage()`.
- **`_syncRedoDiff`** diffs: tasks (PATCH/POST/DELETE), recurring `_dateOverrides` (PATCH), wrRules `_dateOverrides` (PATCH), wrOverrides (POST/PATCH/DELETE), shopping `due_date`, travel dates, blocks (save/delete).

## Overdue Logic
- **Tasks**: `due_date < today && !done`.
- **Shopping**: `due_date < today && !done`.
- **Non-WR recurring**: `getRecurringWeekTasks(w)` for w=0 to wkOff-4. Cascading `__skip__` check across weeks. Seen set prevents duplicates.
- **WR recurring** (`is_weekly_reset=true` in `st.recurring`): overdue if `_dateOverrides[wkKey] < today && !_doneByWk[wkKey]`. Looks back 4 weeks. Uses `wrRecHandled` set — once any wkKey override is encountered for a task, older weeks are not checked (prevents re-trigger after rollover).
- **WR rules** (`st.wrRules`): overdue if `_dateOverrides[wkKey] < today && !isDoneWRRule`. Same 4-week lookback + `wrRuleHandled` set.
- Tasks/shopping/non-WR recurring only count as overdue if assigned to a date (has `due_date` / `_dateOverrides`).
- `updateOvBanner()` called from `renderToday()`.

## Task Modals
- **`#tModal`**: add (`openTModal(cat='')`) + edit (`openEditTask(id)`). Fields: name,category,due date,important,notes. Save: `saveTModal()`.
- **`#qaPopup`** (`openQA(ctx,btn,ds,kcat)`): name,category,due date,important,notes. Cat defaults `kcat` in kanban, else `'Home'`.
- **Category dropdown** (`.cat-sel-wrap`): `catSelHTML(id,def)`, `setCatSel(id,v)`, `pickCat(id,v)`, `toggleCatDrop(id)`.

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`.
- **Outside-click close**: stable handler ref, remove+re-register on every `renderPage()`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay `div` owns handlers. Inputs must NOT have save handlers.
- **Cmd+Z in modals**: check `_isInput && !_ael.closest('.overlay:not(.open)')` → return early.
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=sync. Skip if INPUT/TEXTAREA/contentEditable or meta held.
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; task ID→POST `tasks`.
- **Hover-X delete on chips**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself→`delBlock` only.
- **Chip checkboxes**: 8×8px. Done: `opacity:.5` + `text-decoration:line-through`.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + `!=='__skip__'`. WR rules: when `st.wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot in weekly cal chips or WR panel.
- **WR tasks in timeblock**: render blue (same as `weekly_reset`/Home color). `drawTBBlock` looks up `linkedRule` from `st.wrRules` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true`, `_isWrec:true`, `_type:'shop'`. Source: `_ruleId`, `_recId`, `_shopId`. WR rules use `_wkKey`.

## X Button Menu — WR Tasks
`showWrScopePicker(e, thisLabel, allLabel, onThis, onAll, removeLabel?, onRemove?)` — supports optional 3rd "remove" option shown first.

**In today list / weekly cal / week summary** — WR rule X:
- "⊠ Remove from views" → `unscheduleWrRule(ruleId, wkKey)`
- "⊘ Skip this week only" → `writeWrOverride({override_type:'skip'})` (removes linked TB blocks for the week; undo restores them)
- "✕ Delete rule (all future)" → `wrCtxDeleteRule(ruleId)`

**WR recurring (legacy `_isWrec`) X:**
- "⊠ Remove from views" → `unscheduleWRec(recId, wkKey)`
- "⊘ Skip this week only" → `skipWRec(recId, wkKey)`
- "✕ Delete recurring task" → `delRec(recId)`

`#wrScopePicker` HTML order: `#wrScopeRemove` (hidden by default), `#wrScopeThis`, `#wrScopeAll`.

## Skip Behavior
- **WR rule skip** (`writeWrOverride({override_type:'skip'})`): adds to `st.wrOverrides`. Captures linked TB blocks (`b.ruleId===ruleId && dsToWkKey(b.ds)===wkKey`, with fallback: title+date match for blocks missing `ruleId`). Removes them from `st.blocks` + `sbDeleteBlock`. Undo restores blocks + removes override. Calls `renderToday()`,`renderWkCal()`,`renderRecOv()`,`renderWeeklyPage()`,`renderDayTB()`.
- **WR recurring skip** (`skipWRec(rid,wkKey)`): sets `_dateOverrides[wkKey]='__skip__'`. Removes linked TB blocks (`b.recId===rid && isInWk(b.ds,wkOff)`). Calls `renderAll()`,`renderDayTB()`. PATCHes `wr_recurring_rules`.
- **Skip filtering**: `wrRulesToday`, `wrRulesForDay`, `wrRulesForDayDone` all filter out rules where `st.wrOverrides` has `override_type:'skip'` for that wkKey. `wrecToday`/`wrecForDay` filter `_dateOverrides[wkKey]!=='__skip__'`.

## Skipped-This-Week Popup
- **Button** `#wrSkippedBtn`: `position:absolute;bottom:8px;left:8px` in WR container. Shows `↩ N` count. Hidden when N=0. Updated by `renderRecOv()`.
- **Popup** `#wrSkippedPicker`: fixed, z-index 10001, appears above button. Lists skipped WR rules + WR recurring for `wrRecOff` week. Click item → un-skip.
- **`unSkipWrRule(ruleId,wkKey)`**: removes skip override from `st.wrOverrides` + DELETE from DB. Also clears `_dateOverrides[wkKey]` so task returns to WR container ONLY (not other views). Undo restores both. Re-renders all views.
- **`unSkipWRec(rid,wkKey)`**: deletes `_dateOverrides[wkKey]` (`__skip__` entry). Task no longer skipped; not auto-assigned to views. PATCHes DB. Undoable.
- Close: outside click or Escape.

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

- Weekly cal drag: `wrec::{recId}`, `rec::{recId}::{dueDate}`, `wrrule::{ruleId}`, `shop::{shopId}`.
- recMoModal non-WR drop→scope picker: "This week"→`_dateOverrides[wkKey]=ds`; "All future"→`appears_on_date`.
- recMoModal WR drop→scope picker: "↻ All future"→shift `starting_date`; "⊞ This week"→`writeWrOverride({override_type:'move'})`.

## UI Notes
- Top-right controls (`top:14px;right:20px;z-index:90`): sync, refresh, settings — `20×20px` circles. `toggleDark()`→`body.dark`.
- **Sync button** (`#syncBar`): `setBadge(t,x)` sets `data-tip`. Tooltip via CSS `::after{content:attr(data-tip)}`.
- **Weekly Reset card header** (`#wrRecWkLbl`): "Weekly Reset" when `wrRecOff===0`, else date range. `+` button: `position:absolute;bottom:8px;right:8px`. `↩ N` skipped button: `position:absolute;bottom:8px;left:8px`.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously; `paddingTop` set before paint.
- `.mcell` must include `min-width:0`.

---

## WR Recurring Rules System

**Single table**: `wr_recurring_rules`. State: `st.wrRules` (WR, `is_weekly_reset=true`), `st.wrOverrides`, `st.recurring` (non-WR).

**`wr_recurring_rules`** fields: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other), `is_weekly_reset`, `starting_date`, `appears_on_date` (non-WR), `pup_related,notes,is_enabled,sort_order`, `date_overrides` (JSONB), `done_by_week` (JSONB).

**`wr_recurring_overrides`** fields: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff mod 2===0; monthly=day-of-month in Mon–Sun; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. Nulls unrelated fields. On `override_type:'skip'`: removes linked TB blocks (by `ruleId` or date+title fallback), restores on undo. Calls `renderRecOv`,`renderWkCal`,`renderWeeklyPage`,`renderToday`,`renderDayTB`.

**`_dateOverrides` on `st.wrRules`**: client-side only. `syncAll` preserves via `prevPins`. Used to pin a rule to a specific date within a week. Cleared by `unSkipWrRule` so restored rules appear in WR container only.

**Done state**: `complete` override `done:true`. Written by `togWrRule`. DELETEd on uncheck.

**Display name**: check `st.wrOverrides` for `override_type:'edit'` → `custom_name`. Required in `renderRecOv` + `renderRecMoCal`.

**WR Edit modal** (`#wrEditModal`): "This week only" vs "All future". `openWrEditModal(rid,wkKey,defaultScope)`.

**Unified Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?,type='wr')`. WR vs Scheduled toggle.

**Move prev/next week**: shifts `starting_date` ±7 — affects all future.

**WR card sort**: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup +1. `wrRecOff` tracks week independently.

---

## Non-WR Recurring Task Logic

Non-WR (`is_weekly_reset=false`) → `st.recurring`. All CRUD to `wr_recurring_rules`.

- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`→`{_recId,_virtual:true,_wkKey}`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key.
- **Drag move** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Undo restores `_dateOverrides` + blocks.
- **Edit this week only**: `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`.

---

## Pages

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` check uses `b.ruleId`/`b.shopId`/`b.recId`/`b.taskId`.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (looking back 4 weeks). `wrRulesToday`/`wrecToday` loops use `_wrRulesSeen`/`_wrecSeen` to dedup across weeks. Skip check: `_dateOverrides[wkKey]!=='__skip__'` (WRec) + `st.wrOverrides` skip check (WR rules).
- **Layout**: `.overview-cols` `minmax(0,1.5fr) minmax(0,2.55fr)`.
- **Time blocks**: auto blocks in `computeTBLayout`. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left, non-WR right. 4 cadence groups each. WR: `renderRtWrGroup`. Non-WR: `renderRtGroup`. Other group: `OTHER_CADS=['quarterly','biannual','annual']`.

### Monthly Calendar (`features.js`, `#mModal`)
Fixed range Jan 1 (curYr-3) → Dec 31 (curYr+2). `scrollMoToday()` BEFORE `.open`. GPU: `backdrop-filter:none`. Orbs paused. `#mCells` `grid-template-columns:repeat(7,1fr)`.

### Recurring Monthly View (`overview.js`, `#recMoModal`)
**Grid**: 8 cols — 7 day + 1 WR. WR col: blue-tinted, `columns:2`. Width: `min(98vw,1200px)`. 22-week range.

**X button**: WR→skip/delete; WRec→skip/`delRec`; non-WR→`skipRecVirtThisWk`/`delRec`.

**Right-click** (`showWrRuleCtx`): Skip/Move/Edit/Delete. Auto-detects type via `st.wrRules`.

### Shopping List (`features.js`)
`shop_order integer`. Drag MUST use mousedown/mousemove/mouseup — NOT HTML5. X→`unscheduleShop`: null `due_date`, remove `st.blocks`.

### Travel System
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. Drag-to-create: `calDrag{active,startDs,endDs,moved}`. Week boundary: `ei` clamped.

### Pup Skills (`pup-skills.js`)
Table: `pup_skills`. Sort: mastered last→category→focus→pup→level→skill_order. Inline edit: `pupCellEdit(td,id,field)`.

### Birthdays (`features.js`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas` JSON array. `_normBdayDate`. `saveBdayModal` does NOT include `present_ideas`.

### Recipes (`features.js`)
Table: `recipes`. Do NOT reference: protein,prep_time,cook_time,difficulty,last_made_date. `_recipeEditId`. `#recSidePanel` 400px. Ingredients: JSON `[{name,amount}]`.

### Quick Notes (`features.js`)
`deleteQN`: PATCH `{is_visible:false}` — soft delete only.
