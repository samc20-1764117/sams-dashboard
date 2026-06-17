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
- **`#wrSkippedPicker`**: lists skipped WR rules + `st.recurring` genuinely skipped this week via `_recSkippedThisWk(wkKey,off)`. A `_dateOverrides[wkKey]==='__skip__'` counts ONLY if the task actually occurs that week — verified by temporarily removing the skip and checking `getRecurringWeekTasks(off)` returns it. This excludes off-cycle `__skip__` artifacts (e.g. a quarterly task between occurrences, or leftover from a "move all future" shift). Weekly-reset (`is_weekly_reset`) tasks are override-driven so their `__skip__` always counts. `off` must satisfy `getWkKey(off)===wkKey` (callers pass `wrRecOff`). Forward "move this occurrence" no longer writes `__skip__` (carry pattern), so it never appears here. Click → un-skip (`unSkipWRec` deletes the `__skip__` key → reverts to default day).
- **`unSkipWrRule(ruleId,wkKey)`**: removes skip override + DELETE DB. Clears `_dateOverrides[wkKey]`. Undo restores both.
- **`unSkipWRec(rid,wkKey)`**: deletes `_dateOverrides[wkKey]` (`__skip__`). PATCHes DB. Undoable.
- Close: outside click or Escape.

## Selection & Drag IDs
See `rules/tasks-ui.md` → "Task Types on Overview" for the full selection/drag ID table.

**WR-specific drag/drop:**
- Weekly cal drag: `wrec::{recId}::{wkKey}`, `rec::{recId}::{dueDate}::{wkKey}`, `wrrule::{ruleId}`, `shop::{shopId}`.
- **wkKey in drag IDs**: `wrec::` and `rec::` carry the source `_wkKey` so drop handlers modify the correct week's `_dateOverrides`. Critical when same task has instances from multiple weeks (e.g. HEB moved cross-week). All drop handlers (within-week, cross-week edge, today-list, TB grid, monthly cal) extract `srcWkKey` and fall back to `getWkKey(wkOff)` if empty.
- recMoModal non-WR drop→scope picker: "This week"→`_dateOverrides[wkKey]=ds`; "All future"→`appears_on_date`.
- recMoModal WR drop→scope picker: "↻ All future"→shift `starting_date`; "⊞ This week"→`writeWrOverride({override_type:'move'})`.

## WR Recurring Rules System

**Single table**: `wr_recurring_rules`. State: `st.wrRules` (WR, `is_weekly_reset=true`), `st.wrOverrides`, `st.recurring` (non-WR).

**Fields**: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other/daily), `is_weekly_reset,starting_date,appears_on_date,pup_related,notes,is_enabled,sort_order,date_overrides` (JSONB), `done_by_week` (JSONB), `default_start_time,default_end_time` (optional HH:MM, for auto-timeblock), `default_tb_duration` (integer minutes; used when dropping onto timeblock without start/end time; fallback is `autoDur` heuristic; editable in recEditModal for non-WR tasks).

**`wr_recurring_overrides`**: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff mod 2===0; monthly=day-of-month in Mon–Sun; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. On `skip`: removes linked TB blocks (`b.ruleId===ruleId` OR `b.recId===ruleId`), restores on undo.

**`unscheduleWrRule(rid,wkKey)`**: removes `_dateOverrides[wkKey]` + linked TB blocks. Undo restores.

**WR rule TB block identity**: `ruleId` is null after DB load because `rule_id` column migration is pending (see core.md). Blocks link via `recId` (set to rule ID on drop). All lookups check `b.recId` as fallback. `dropOnTB` sets both `ruleId` and `recId` to `String(r.id)`.

**WR rule drag-to-day**: must PATCH `wr_recurring_rules` with updated `date_overrides` after `_dateOverrides` change. Undo must also PATCH to restore.

**WR cross-week move**: when moving WR task to different week (calendar drop, edge drop), must delete `_dateOverrides[srcWkKey]` AND set `_dateOverrides[newWkKey]=ds`. Use `dsToWkKey(ds)` for target week, `srcWkKey` from dragId (fallback `getWkKey(wkOff)`) for source. Undo restores both keys.

**Pup-related checkbox**: `makePawEl` renders bone SVG icon (14×14px, `margin-left:-2px`) instead of regular checkbox. Done state: grey `rgba(200,195,210,.35)` fill/stroke (matches grey checkbox style). Undone: white fill, muted stroke.

**Unassigned indicator**: WR rules not yet assigned to a day (`!_dateOverrides[wkKey]`) show `›` via `.wr-unassigned` class, matching today list's `tb-arrow` style.

**`getVisibleBlocks(ds)`**: WR rule/rec block visible if `_dateOverrides[dsToWkKey(ds)]===ds` OR any other week's override points to `ds`. This supports cross-week instances (e.g. HEB from last week appearing on today).

**Undo for task-move-to-day**: snapshot `savedTBs` BEFORE `removeTBBlocksForDate`. Undo restores blocks in state + DB.

**Auto block drag undo**:
- **Existing override** (`atb._ovId` set): capture `ovId` before closure. Undo PATCHes back to `prevStart/prevEnd`.
- **No existing override**: POST creates with `tmpId`. After POST resolves, replace entry with real record. Undo: filter `st.autoTBOverrides` by BOTH `tmpId` AND real ID.
- **Multi-auto-block drag undo**: `otherAtbSnaps = [{atbId,prevSm,dur,hadOv}]` captured at drag start. `_undoOtherAtbs()` uses `base_id+date` lookup — if `!hadOv` DELETE override, else PATCH back. Called in both PATCH and POST undo closures.
- **Persist `otherSelAtbs`**: use `base_id+date` lookup (not `aa._ovId`) — PATCH existing override if found, else POST new one.

**Done state**: `complete` override written by `togWrRule`. DELETEd on uncheck. Toggling syncs all views via `_syncBlockDone(isDone)` + `renderDayTB()`.
- Done WR tasks remain visible with `done` class — NOT filtered out.
- `drawTBBlock` detects WR rule blocks via `b.ruleId || (b.recId in st.wrRules)`. Uses `isDoneWRRule()` — NOT `_doneByWk`.
- TB checkbox: `b.ruleId || st.wrRules.some(x=>x.id===b.recId)` → `togWrRule`. Do NOT call `togRec` for WR rule blocks.

**Display name**: check `wrOverrides` for `override_type:'edit'` → `custom_name`. Required in `renderRecOv` + `renderRecMoCal`.

**WR Edit modal** (`#wrEditModal`): `openWrEditModal(rid,wkKey,defaultScope)` — "This week only" vs "All future".

**Unified Add modal** (`#wrRuleAddModal`): `openWrRuleAddModal(cadence?,type='wr')`. WR vs Scheduled toggle. Starting date field (`#wrAddAnchorField`) always visible when type=`sch` regardless of cadence (including weekly). `_wrReadCadenceFields` returns `starting_date` for `sch` type on all cadences.

**Context menu** (`#wrRuleCtxMenu`): populated dynamically by `showWrRuleCtx` based on cadence. SVG outline icons (no emoji). Header shows task name + X close button (X = delete rule permanently, undoable). `wrCtxDeleteRule` DELETEs from DB; `pushUndo` re-POSTs to restore.
- **Weekly/Other** (fires every week): Skip this week · divider · Edit this week · Edit all future. No move prev/next (meaningless for weekly).
- **Interval cadences** (biweekly/monthly/quarterly/biannual/annual): Skip this cycle · two-column boxes: "This time only" (Next/Prev/Edit) | "All future" (Next/Prev/Edit). Columns use `.ctx-col-box` containers.

**Move prev/next week (this time)** (`_wrShiftAnchor`): one-time override only. Skips current week, pins to adjacent week via `_dateOverrides`. Does NOT shift `starting_date`. Conflict guard: if target week already has this task (naturally due, moved-in override, or non-skip `_dateOverrides`), shows toast "Already scheduled that week" and blocks.

**Shift schedule (all future)** (`wrCtxShiftSchedule`): "All future → Next/Prev". Shifts `starting_date` by `delta` days (±7) — that moves the next occurrence AND all future ones a week, correct for every interval cadence (biweekly = parity flip, monthly = day-of-month, quarterly = anchor week). ALSO clears anything pinning the rule to the CURRENT week so the shift is visible: deletes `_dateOverrides[wkKey]` and removes stale `move` overrides for the rule with `wk_key===wkKey` OR `moved_to_wk_key===wkKey` (these "move-in" pins were why the task kept showing this week despite the toast). Re-renders + confirmation toast + fully undoable (restores starting_date, the pin, and re-POSTs removed move overrides).

**Edge drag (`rec::` weekly cal + setupEdge) — move THIS occurrence to adjacent week:**
- **Forward** (`dir>0`): CARRY — `_dateOverrides[curWkKey]=newDs` (newDs = first day of next week = Monday). No `__skip__`. Renders in the target week via the back-lookback (`renderWkCal`/today loop scan up to 4 prior weeks) while that week's own occurrence still shows — so a weekly task appears in BOTH weeks (e.g. HEB carried to next Monday + next-week Sunday HEB). `_normOvs` preserves forward (out-of-week, value>week) carries. Stays OUT of the skipped-this-week list (tracks `__skip__` only).
- **Backward** (`dir<0`): `_dateOverrides[curWkKey]='__skip__'` + `_dateOverrides[getWkKey(targetWkOff)]=newDs` (in-week pin in the earlier target week) — the back-lookback can't reach a later source key from an earlier view, so carry won't render. (Backward moves therefore still appear in the skipped list.)
- Does NOT shift `starting_date` (that's the separate "move all future" gesture). Undo snapshots whole `_dateOverrides`. PATCHes `date_overrides` only.

**WR card sort**: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup +1.

**WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF after render, exactly 7 rows per column). Must use actual rendered height with fonts loaded.

## Non-WR Recurring Task Logic
Non-WR (`is_weekly_reset=false`) → `st.recurring`. All CRUD to `wr_recurring_rules`.
- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`. Excludes `cadence==='daily'`.
- **Weekly cal overdue**: `renderWkCal` loops `getRecurringWeekTasks` back 4 weeks (like WR/wrec) so overdue tasks moved forward via `_dateOverrides` appear on the correct day.
- **Default timeblock time** (optional): `default_start_time`/`default_end_time` on `wr_recurring_rules`. When set, `getRecAutoTBForDate(ds)` auto-generates virtual TB blocks (like autoTB). Per-week overrides stored in `_dateOverrides['tb::'+wkKey]` = `{start,end}` or `'__skip__'`. Skipped if already manually placed (`st.blocks` has matching `recId`). `drawRecAutoTBBlock` renders; move/resize saves via `_saveRecAutoTBOv`; delete via `delRecAutoTBForDay`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key.
- **Daily habits** (`cadence==='daily'`): excluded from all recurring views. Done keyed by date string `ds`. See pages.md Daily Habits.
- **Drag move**: snapshot `savedBlocks` before `removeTBBlocksForDate`. Undo restores `_dateOverrides` + blocks.
- **Edit this week only**: `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`. Double-click any recurring task defaults to "this week" scope (passes wkKey from all views: today list, weekly chips, week summary, timeblock, recOv).
- **Per-week notes display**: `_wkNote` field on virtual task items. `_recWkNote(r,wkKey)` helper reads `_dateOverrides['name::'+wkKey].notes`. Shown as `@note` suffix (muted, smaller text) in today list/weekly chips/week summary. In timeblock, shown as a separate line under task title via `tb-notes` div (no `@` prefix). Both `save()` and `sbReq` called on edit for instant persistence.
