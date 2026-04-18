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
- **WR rule skip**: adds skip override to `st.wrOverrides`. Removes linked TB blocks (`b.ruleId===ruleId` OR `b.recId===ruleId`). Undo restores. Re-renders today/wkCal/recOv/weeklyPage/dayTB.
- **WR recurring skip** (`skipWRec`): sets `_dateOverrides[wkKey]='__skip__'`. Removes linked TB blocks (`b.recId===rid`). PATCHes `wr_recurring_rules`.
- **Skip filtering**: `wrRulesToday/wrRulesForDay/wrRulesForDayDone` filter skip overrides. `wrecToday/wrecForDay` filter `_dateOverrides[wkKey]!=='__skip__'`.

## Skipped-This-Week Popup
- **`#wrSkippedBtn`**: shows `↩ N`. Hidden when N=0. Updated by `renderRecOv()`.
- **`#wrSkippedPicker`**: lists skipped WR rules + WR recurring for `wrRecOff` week. Click → un-skip.
- **`unSkipWrRule(ruleId,wkKey)`**: removes skip override + DELETE DB. Clears `_dateOverrides[wkKey]`. Undo restores both.
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

**Fields**: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other/daily), `is_weekly_reset,starting_date,appears_on_date,pup_related,notes,is_enabled,sort_order,date_overrides` (JSONB), `done_by_week` (JSONB).

**`wr_recurring_overrides`**: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff mod 2===0; monthly=day-of-month in Mon–Sun; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. On `skip`: removes linked TB blocks (`b.ruleId===ruleId` OR `b.recId===ruleId`), restores on undo.

**`unscheduleWrRule(rid,wkKey)`**: removes `_dateOverrides[wkKey]` + linked TB blocks. Undo restores.

**WR rule TB block identity**: `ruleId` is null after DB load (not persisted). Blocks link via `recId` (set to rule ID on drop). All lookups check `b.recId` as fallback. `dropOnTB` sets both `ruleId` and `recId` to `String(r.id)`.

**WR rule drag-to-day**: must PATCH `wr_recurring_rules` with updated `date_overrides` after `_dateOverrides` change. Undo must also PATCH to restore.

**`getVisibleBlocks(ds)`**: WR rule block visible only if `r._dateOverrides[dsToWkKey(ds)]===ds`.

**Undo for task-move-to-day**: snapshot `savedTBs` BEFORE `removeTBBlocksForDate`. Undo restores blocks in state + DB.

**Auto block drag/resize undo**:
- **Existing override** (`atb._ovId` set): capture `ovId` before closure. Undo PATCHes back to `prevStart/prevEnd`.
- **No existing override**: POST creates with `tmpId`. After POST resolves, replace entry with real record. Undo: filter `st.autoTBOverrides` by BOTH `tmpId` AND real ID — after POST, tmpId entry is replaced so filtering only by tmpId leaves stale override in state.

**Done state**: `complete` override written by `togWrRule`. DELETEd on uncheck. Toggling syncs all views via `_syncBlockDone(isDone)` + `renderDayTB()`.
- Done WR tasks remain visible with `done` class — NOT filtered out.
- `drawTBBlock` detects WR rule blocks via `b.ruleId || (b.recId in st.wrRules)`. Uses `isDoneWRRule()` — NOT `_doneByWk`.
- TB checkbox: `b.ruleId || st.wrRules.some(x=>x.id===b.recId)` → `togWrRule`. Do NOT call `togRec` for WR rule blocks.

**Display name**: check `wrOverrides` for `override_type:'edit'` → `custom_name`. Required in `renderRecOv` + `renderRecMoCal`.

**WR Edit modal** (`#wrEditModal`): `openWrEditModal(rid,wkKey,defaultScope)` — "This week only" vs "All future".

**Unified Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?,type='wr')`. WR vs Scheduled toggle. Starting date field (`#wrAddAnchorField`) always visible when type=`sch` regardless of cadence (including weekly). `_wrReadCadenceFields` returns `starting_date` for `sch` type on all cadences.

**Move prev/next week** (`_wrShiftAnchor`): Non-WR: marks current week `__skip__`, moves to adjacent week via `_dateOverrides[targetWkKey]`. WR rules: shifts `_dateOverrides[wkKey]` by ±7 days.
**Edge drag (`rec::` weekly cal + setupEdge)**: sets `_dateOverrides[curWkKey]='__skip__'` + `_dateOverrides[tgtWkKey]=same-DOW date in target week`. For interval cadences (biweekly/quarterly/biannual/annual), also shifts `starting_date` ±7 days so all future occurrences align. PATCHes with `sbReqSilent` including both `date_overrides` and `starting_date`.

**WR card sort**: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup +1.

**WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF after render, exactly 7 rows per column). Must use actual rendered height with fonts loaded.

## Non-WR Recurring Task Logic
Non-WR (`is_weekly_reset=false`) → `st.recurring`. All CRUD to `wr_recurring_rules`.
- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`. Excludes `cadence==='daily'`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key.
- **Daily habits** (`cadence==='daily'`): excluded from all recurring views. Done keyed by date string `ds`. See pages.md Daily Habits.
- **Drag move**: snapshot `savedBlocks` before `removeTBBlocksForDate`. Undo restores `_dateOverrides` + blocks.
- **Edit this week only**: `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`.
