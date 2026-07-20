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
- **`#wrSkippedBtn`**: shows `↩ N`. Hidden when N=0. Count set in `renderRecOv()`. Every skip path (`skipWRec`, `skipRecVirtThisWk`, `writeWrOverride` skip) MUST call `renderRecOv()` in its re-render so the count + popup update instantly (skipRecVirtThisWk previously rendered weekly/today/cal but not recOv, so the button only updated after a refresh).
- **`#wrSkippedPicker`**: lists skipped WR rules + `st.recurring` genuinely skipped this week via `_recSkippedThisWk(wkKey,off)`. A `_dateOverrides[wkKey]==='__skip__'` counts ONLY if the task actually occurs that week — verified by temporarily removing the skip and checking `getRecurringWeekTasks(off)` returns it. This excludes off-cycle `__skip__` artifacts (e.g. a quarterly task between occurrences, or leftover from a "move all future" shift). Weekly-reset (`is_weekly_reset`) tasks are override-driven so their `__skip__` always counts. `off` must satisfy `getWkKey(off)===wkKey` (callers pass `wrRecOff`). Forward "move this occurrence" no longer writes `__skip__` (carry pattern), so it never appears here. Click → un-skip (`unSkipWRec` deletes the `__skip__` key → reverts to default day).
- **`unSkipWrRule(ruleId,wkKey)`**: removes skip override + DELETE DB. Clears `_dateOverrides[wkKey]`. Undo restores both.
- **`unSkipWRec(rid,wkKey)`**: deletes `_dateOverrides[wkKey]` (`__skip__`). PATCHes DB. Undoable.
- Close: outside click or Escape.

## Selection & Drag IDs
See `rules/tasks-ui.md` → "Task Types on Overview" for the full selection/drag ID table.

**WR-specific drag/drop:**
- Weekly cal drag: `wrec::{recId}::{wkKey}`, `rec::{recId}::{dueDate}::{wkKey}`, `wrrule::{ruleId}`, `shop::{shopId}`.
- **wkKey in drag IDs**: `wrec::` and `rec::` carry the source `_wkKey` so drop handlers modify the correct week's `_dateOverrides`. Critical when same task has instances from multiple weeks (e.g. HEB moved cross-week). All drop handlers (within-week, cross-week edge, today-list, TB grid, monthly cal) extract `srcWkKey` and fall back to `getWkKey(wkOff)` if empty.
- recMoModal non-WR drop→scope picker (supports **cross-week**, no same-week guard). dragId `recmo::{recId}::{ds}::{srcWkKey}` (srcWkKey = chip's `t._wkKey`, carried via the dayMap item). "⊘ This time only"→`_dateOverrides[srcWkKey]=ds` (pins the source week's occurrence onto the dropped date, any week). "↻ All future"→`_recMoveAllFuture` (below). Moved-dot indicator keys off `t._wkKey` (schedule week), not `dsToWkKey(due)`, so it shows after a cross-week move.
- **Non-WR interval-cadence drops (monthly/quarterly/biannual/annual) show the same scope picker in the WEEK VIEW too**: within-week `rec::` drop + both cross-week edge drops. "⊘ This time only" = the pre-existing direct pin/carry behavior; "↻ All future" = `_recMoveAllFuture` (+`shiftWk(dir)` on edge drops). Weekly/biweekly and multi-select drags skip the picker (direct this-time move). `dragId` must be nulled BEFORE showing the picker (callbacks run async).
- **`_recMoveAllFuture(r,srcWkKey,ds,extraRender)`** (overview.js): single "all future" implementation for non-WR moves — shifts `starting_date` by the src→target week delta, sets `appears_on_date` to dropped day-of-month (monthly) or weekday (others), deletes source pin, runs `_wrClearPastOrphanPins` + `_recClearFuturePins`, save/render/PATCH/undo included.
- recMoModal WR drop→scope picker: "↻ All future"→shift `starting_date`; "⊞ This week"→`writeWrOverride({override_type:'move'})`.

## WR Recurring Rules System

**Single table**: `wr_recurring_rules`. State: `st.wrRules` (WR, `is_weekly_reset=true`), `st.wrOverrides`, `st.recurring` (non-WR).

**Fields**: `id,name,cadence` (weekly/biweekly/monthly/quarterly/biannual/annual/other/daily), `is_weekly_reset,starting_date,appears_on_date,pup_related,notes,is_enabled,sort_order,date_overrides` (JSONB), `done_by_week` (JSONB), `default_start_time,default_end_time` (optional HH:MM, for auto-timeblock), `default_tb_duration` (integer minutes; used when dropping onto timeblock without start/end time; fallback is `autoDur` heuristic; editable in recEditModal for non-WR tasks).

**`wr_recurring_overrides`**: `id,rule_id,wk_key` (Mon YYYY-MM-DD), `override_type` (skip/move/edit/complete), `done,moved_to_wk_key,custom_name,custom_notes`. UNIQUE `(rule_id,wk_key)`.

**Schedule logic** (`isWRRuleDueThisWeek`): weekly/other=always; biweekly=week diff mod 2===0; monthly=day-of-month in Mon–Sun; quarterly/biannual/annual=week diff mod 13/26/52===0.

**`writeWrOverride(ruleId,wkKey,payload,{onDone,undoLabel})`**: PATCH if override exists, POST if not. On `skip`: removes linked TB blocks (`b.ruleId===ruleId` OR `b.recId===ruleId`, OR — because the `rule_id` column migration is pending and DB-loaded WR-rule blocks have null ruleId/recId — an unlinked block on the rule's pinned day). That last "unlinked on pinned day" clause MUST exclude `_vidStepVid`/`_vidId`/`_pupSessId`/`_finCancelSubId` blocks, or skipping a WR rule wrongly deletes a video-stage/video/pup block that merely sits on the same day. Same guard applies in `unscheduleWrRule`. Restores on undo.

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
- **New weekly/other tasks start THIS week** (`saveWrRuleAdd`): weekly/other have no parity anchor, so their `starting_date` is snapped to the Monday of the chosen (or current) week. Without this, `isWRRuleDueThisWeek` returns `true` for weekly/other with no lower bound, so a brand-new task renders in every PAST week as a phantom unfinished item. `isWRRuleDueThisWeek` now bounds weekly/other by `starting_date`'s week (legacy rules with no `starting_date` stay unbounded = every week, preserving old behavior).

**Context menu** (`#wrRuleCtxMenu`): populated dynamically by `showWrRuleCtx` based on cadence. SVG outline icons (no emoji). Header shows task name + X close button (X = delete rule permanently, undoable). `wrCtxDeleteRule` DELETEs from DB; `pushUndo` re-POSTs to restore.
- **Weekly/Other** (fires every week): Skip this week · divider · Edit this week · Edit all future. No move prev/next (meaningless for weekly).
- **Interval cadences** (biweekly/monthly/quarterly/biannual/annual): Skip this cycle · two-column boxes: "This time only" (Next/Prev/Edit) | "All future" (Next/Prev/Edit). Columns use `.ctx-col-box` containers.

**Move prev/next week (this time)** (`_wrShiftAnchor`): one-time override only. Skips current week, pins to adjacent week via `_dateOverrides`. Does NOT shift `starting_date`. Conflict guard: if target week already has this task (naturally due, moved-in override, or non-skip `_dateOverrides`), shows toast "Already scheduled that week" and blocks.

**Shift schedule (all future)** (`wrCtxShiftSchedule`): "All future → Next/Prev". Shifts `starting_date` by `delta` days (±7) — moves the next occurrence AND all future ones a week, correct for every interval cadence (biweekly = parity flip, monthly = day-of-month, quarterly = anchor week). ALSO clears anything pinning the rule to the CURRENT week so the shift is visible: deletes `_dateOverrides[wkKey]` and removes stale `move` overrides for the rule with `wk_key===wkKey` OR `moved_to_wk_key===wkKey` (these "move-in" pins were why the task kept showing this week despite the toast). Re-renders + confirmation toast + fully undoable (restores starting_date, the pin, and re-POSTs removed move overrides).
- **Orphan-pin cleanup** (`_wrClearPastOrphanPins`): every "all future" handler (`wrCtxShiftSchedule`, `_recMoveAllFuture` — used by recMoModal cell drop + all week-view interval-cadence drops — and the WR wrCell drop) shifts `starting_date` but the moved occurrence's day-pin in the SOURCE/past weeks would otherwise linger and render as overdue ("moved to this week from last, but last week still shows overdue"). Each handler now deletes the source-week pin, clears UNDONE non-skip `_dateOverrides` pins in the prior 6 weeks (done pins stay as history), AND freezes natural/unpinned undone past occurrences by writing `__skip__` for those weeks — otherwise a biweekly parity flip makes a formerly off-cycle past week suddenly "due" and it renders as stale overdue (2026-07 Journal bug). Undo in all three handlers restores removed pins AND deletes any skips the cleanup wrote. Note: an off-cycle past pin on a biweekly/monthly rule = a clear orphan (only a manual move puts it there); a past pin on a WEEKLY rule is a legit missed occurrence (every week is real) and stays overdue.
- **KNOWN LIMITATION — shifting also moves PAST occurrences.** Because the whole series is computed from the single `starting_date` anchor, a ±7 shift flips parity for every week, including history (past occurrences move/appear/disappear). User wants only "this week + all later" to move, past frozen. A 2026-06 attempt to freeze the past (pin/`__skip__` the prior 13 weeks + make `getRecurringWeekTasks`/`isWRRuleDueThisWeek` honor those pins) was REVERTED: making the predicates honor per-week pins globally surfaced existing pins and rendered current tasks on past days. **Do NOT re-attempt by changing the global predicates.** A safe fix needs a per-rule schedule-era boundary (old anchor for weeks < shift week, new anchor after) — and MUST be reproduced + verified against the live dev app before shipping, not written blind.

**Stale future pins** (`_recClearFuturePins(r)`, core.js — core so mobile's features.js can call it): removes undone non-skip `_dateOverrides` pins for current+future weeks; done weeks + `__skip__` stay. Returns removed entries for undo. Called by `_recMoveAllFuture` AND by `saveRecEdit` (all-future scope) when cadence/`appears_on_date`/`starting_date` changed — without it an old move pin keeps overriding the new schedule (2026-07 pup meds bug: day-of-month edited 26→25 but a future-week pin still showed the 26th). `saveRecEdit` includes `date_overrides` in the PATCH when pins were cleared; undo restores them + PATCHes back.

**recEditModal "This week only" scope**: Name + Notes + **Date** (`#recEditDateThis`). Date populated from this week's instance (`getRecurringWeekTasks(off)` for the wkKey, so pin or natural), original kept in `dataset.orig`; if changed → `_dateOverrides[wkKey]=newDs` (same as dragging the chip) + `removeTBBlocksForDate`, undoable.

**Edge drag (`rec::` weekly cal + setupEdge) — move THIS occurrence to adjacent week** (interval cadences get the scope picker first; this is the "this time" branch):
- **Forward** (`dir>0`): CARRY — `_dateOverrides[curWkKey]=newDs` (newDs = first day of next week = Monday). No `__skip__`. Renders in the target week via the back-lookback (`renderWkCal`/today loop scan up to 4 prior weeks) while that week's own occurrence still shows — so a weekly task appears in BOTH weeks (e.g. HEB carried to next Monday + next-week Sunday HEB). `_normOvs` preserves forward (out-of-week, value>week) carries. Stays OUT of the skipped-this-week list (tracks `__skip__` only).
- **Backward** (`dir<0`): `_dateOverrides[curWkKey]='__skip__'` + `_dateOverrides[getWkKey(targetWkOff)]=newDs` (in-week pin in the earlier target week) — the back-lookback can't reach a later source key from an earlier view, so carry won't render. (Backward moves therefore still appear in the skipped list.)
- Does NOT shift `starting_date` (that's the separate "move all future" gesture). Undo snapshots whole `_dateOverrides`. PATCHes `date_overrides` only.

**WR card sort**: done last→cadence (weekly=0,biweekly=2,monthly=4,quarterly=6,biannual=8,annual=10,other=12)→pup +1.

**WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF after render, exactly 7 rows per column). Must use actual rendered height with fonts loaded.

**Overdue WR rows** (`renderRecOv`, current-week view only, `wrRecOff===0`): overdue = the PREVIOUS WEEK ONLY (due = `isWRRuleDueThisWeek(-1)` OR non-skip pin; older misses stay history — never scan further back) was not done/skipped/moved, and the rule isn't already in this week's items (due-again-this-week supersedes last week's miss). Example: monthly rule due last week, unchecked, not due this week → overdue; weekly rule missed last week → NOT overdue (it's due again this week). Rendered at TOP of the Weekly Reset container as red rows: `className='ti ov-row'`, padding `3px 50px 3px 10px` (right padding reserves button space so text aligns with normal WR rows), checkbox/paw → `togWrRule(rid,checked,pwk)` (marks done in the OVERDUE week). `.wr-ov-move` "Move" button absolutely positioned (`right:6px;top:50%;translateY(-50%)`); click → `showWrScopePicker`: ⊘ Skip (`writeWrOverride` skip on `pwk`) / ⊞ Move this occurrence / ↻ Move all future. Right-click → `showWrRuleCtx(e,rid,pwk)`. Overdue WR is handled ONLY here — a separate system from general overdue. Do NOT add WR items to the today list, `getOvRecurring`, the overdue banner, or rollover (today-list pin carryover is bounded to the current week: `pin>=getWkKey(0)`).

**`wrMoveToThisWeek(ruleId,srcWkKey,allFuture)`**: re-homes an overdue WR task into the current week as UNASSIGNED. Deletes source-week day pin + source-week overrides + any current-week skip override; `allFuture` also re-anchors `starting_date=tod()` (cadence recomputes from today). If not naturally due this week and no current-week override exists, POSTs a `move` override (`wk_key=srcWkKey, moved_to_wk_key=curWkKey`). Fully undoable (restores starting_date, pin, and re-POSTs every deleted override — undo must DELETE any restored/added overrides it created).

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
