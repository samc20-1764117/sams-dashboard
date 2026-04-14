# WR System Rules

## X Button Menu — WR Tasks
`showWrScopePicker(e, thisLabel, allLabel, onThis, onAll, removeLabel?, onRemove?)` — optional 3rd "remove" option shown first.

**Today list / weekly cal / week summary — WR rule X:**
- "⊠ Remove from views" → `unscheduleWrRule(ruleId, wkKey)`
- "⊘ Skip this week only" → `writeWrOverride({override_type:'skip'})` (removes linked TB blocks; undo restores)
- "✕ Delete rule (all future)" → `wrCtxDeleteRule(ruleId)`

**WR recurring (legacy `_isWrec`) X:**
- "⊠ Remove from views" → `unscheduleWRec(recId, wkKey)`
- "⊘ Skip this week only" → `skipWRec(recId, wkKey)`
- "✕ Delete recurring task" → `delRec(recId)`

`#wrScopePicker` HTML order: `#wrScopeRemove` (hidden by default), `#wrScopeThis`, `#wrScopeAll`.

## Skip Behavior
- **WR rule skip** (`writeWrOverride({override_type:'skip'})`): adds to `st.wrOverrides`. Captures linked TB blocks by `b.ruleId===ruleId` OR `b.recId===ruleId`. Fallback: no-ID block by date. Removes from `st.blocks` + `sbDeleteBlock`. Undo restores. Re-renders today/wkCal/recOv/weeklyPage/dayTB.
- **WR recurring skip** (`skipWRec(rid,wkKey)`): sets `_dateOverrides[wkKey]='__skip__'`. Removes linked TB blocks (`b.recId===rid && isInWk(b.ds,wkOff)`). Calls `renderAll(),renderDayTB()`. PATCHes `wr_recurring_rules`.
- **Skip filtering**: `wrRulesToday,wrRulesForDay,wrRulesForDayDone` filter rules where `st.wrOverrides` has `override_type:'skip'` for that wkKey. `wrecToday/wrecForDay` filter `_dateOverrides[wkKey]!=='__skip__'`.

## WR Overview Widget Layout (`#recList`)
- `columns:2;column-gap:2px;column-fill:auto` — fills col 1 (~7 items) before col 2.
- `renderRecOv()` sets `elReg.style.maxHeight=(4+7*fi.offsetHeight)+'px'` in rAF after render. Must use actual rendered height with DM Sans loaded — `document.fonts.ready` init deferral ensures this.
- Each row: `break-inside:avoid`.

## Skipped-This-Week Popup
- **`#wrSkippedBtn`**: `position:absolute;bottom:8px;left:8px`. Shows `↩ N`. Hidden when N=0. Updated by `renderRecOv()`.
- **`#wrSkippedPicker`**: fixed, z-index 10001. Lists skipped WR rules + WR recurring for `wrRecOff` week. Click → un-skip.
- **`unSkipWrRule(ruleId,wkKey)`**: removes skip override from `st.wrOverrides` + DELETE DB. Clears `_dateOverrides[wkKey]` so task returns to WR container only. Undo restores both.
- **`unSkipWRec(rid,wkKey)`**: deletes `_dateOverrides[wkKey]` (`__skip__`). PATCHes DB. Undoable.
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

## WR Recurring Rules System

**Single table**: `wr_recurring_rules`. State: `st.wrRules` (WR, `is_weekly_reset=true`), `st.wrOverrides`, `st.recurring` (non-WR).

**`wr_recurring_rules`** fields: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other/**daily**), `is_weekly_reset,starting_date,appears_on_date,pup_related,notes,is_enabled,sort_order,date_overrides` (JSONB), `done_by_week` (JSONB).

**`wr_recurring_overrides`** fields: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff mod 2===0; monthly=day-of-month in Mon–Sun; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. Nulls unrelated fields. On `skip`: removes linked TB blocks by `b.ruleId===ruleId` OR `b.recId===ruleId`, restores on undo.

**`unscheduleWrRule(rid,wkKey)`**: removes `_dateOverrides[wkKey]`. Finds linked TB blocks by `b.ruleId===rid` OR `b.recId===rid`, removes + `sbDeleteBlock`. Undo restores.

**WR rule TB block identity**: `dropOnTB` for `wrrule::` sets both `ruleId:String(r.id)` and `recId:String(r.id)`. `rec_id` persists to DB; after refresh `ruleId=null` but `recId` carries rule ID. All lookups check `b.recId` as fallback.

**WR rule drag-to-day persistence**: both weekly cal col drop handler and todList drop handler for `wrrule::` must PATCH `wr_recurring_rules` after updating `_dateOverrides`: `sbReq('PATCH','wr_recurring_rules',{date_overrides:r._dateOverrides},\`?id=eq.${ruleId}\`)`. Undo must also PATCH to restore previous `_dateOverrides`.

**`getVisibleBlocks(ds)`**: checks `_dateOverrides` for WR rule blocks — a block is visible only if `r._dateOverrides[dsToWkKey(ds)]===ds`. Prevents moved WR tasks showing on original day's timeblock.

**Undo for task-move-to-day**: snapshot `savedTBs` (blocks being removed) BEFORE `removeTBBlocksForDate`. In undo closure: `savedTBs.forEach(b=>{if(!st.blocks.find(x=>x.id===b.id))st.blocks.push(b);sbSaveBlock(b);})` — restores blocks in both state and DB.

**Auto block drag/resize undo**: `pushUndo` is called after drag/resize commits. Two cases:
- **Existing override** (`atb._ovId` set): capture `ovId=atb._ovId` before closure. Undo PATCHes override back to `prevStart/prevEnd`. Redo via `_stateSnap`/`_stateRestore` (autoTBOverrides included in snap).
- **No existing override**: POST creates new override with `tmpId`. After POST resolves, `st.autoTBOverrides[idx]` replaced with real record and `atb._ovId` set to real ID. Undo closure: capture `_realOvId=atb._ovId` at call time, filter `st.autoTBOverrides` by BOTH `tmpId` AND `_realOvId`, then DELETE from DB. **Critical**: must filter by real ID too — after POST resolves the tmpId entry is replaced and filtering only by tmpId leaves a stale override in state.

**`_dateOverrides` on `st.wrRules`**: client-side only. `syncAll` preserves via `prevPins`. Pins rule to specific date within week. Cleared by `unSkipWrRule`.

**Done state**: `complete` override `done:true`. Written by `togWrRule`. DELETEd on uncheck. Toggling in any view (Today, weekly cal, WR list, timeblock) syncs all others — `writeWrOverride` calls `_syncBlockDone(isDone)` and `renderDayTB()`. Uncheck path in `togWrRule` also updates `b._done` and calls `renderDayTB()`.
- **WR tasks in Today/weekly views**: done WR tasks remain visible with `done` class (strikethrough) — NOT filtered out on check. `wrecToday`/`wrRulesToday` include done items with `done:true`.
- **Timeblock done detection**: `drawTBBlock` detects WR rule blocks via `_wrRuleId = b.ruleId || (b.recId in st.wrRules ? b.recId : null)`. Uses `isDoneWRRule(_wrRuleId, wkKey)` — NOT `_doneByWk` (WR rules don't have that). Critical: `ruleId` is `null` after DB load (not persisted); blocks link via `recId` set to the rule's ID.
- **Timeblock checkbox**: detects WR rule blocks via `b.ruleId || st.wrRules.some(x=>x.id===b.recId)` → calls `togWrRule`. Do NOT call `togRec` for WR rule blocks.

**Display name**: check `st.wrOverrides` for `override_type:'edit'` → `custom_name`. Required in `renderRecOv` + `renderRecMoCal`.

**WR Edit modal** (`#wrEditModal`): "This week only" vs "All future". `openWrEditModal(rid,wkKey,defaultScope)`.

**Unified Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?,type='wr')`. WR vs Scheduled toggle.

**Move prev/next week** (`_wrShiftAnchor`): For non-WR recurring (`_wrCtxRecId`): marks current week `__skip__`, moves task to adjacent week (`wkOff±1`) by setting `_dateOverrides[targetWkKey]` to the computed date. Uses natural dow date as base if no current pin. Undo restores both `_dateOverrides` entries. For WR rules (`_wrCtxRuleId`): shifts `_dateOverrides[wkKey]` date by ±7 days — affects all future.

**WR card sort**: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup +1.

## Non-WR Recurring Task Logic
Non-WR (`is_weekly_reset=false`) → `st.recurring`. All CRUD to `wr_recurring_rules`.
- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`→`{_recId,_virtual:true,_wkKey}`. Excludes `cadence==='daily'`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key.
- **Daily habits** (`cadence==='daily'`): excluded from `getRecurringWeekTasks` and all other views. Done keyed by date string `ds` in `_doneByWk` (not week key). See pages.md Daily Habits.
- **Drag move** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Undo restores `_dateOverrides` + blocks.
- **Edit this week only**: `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`.
