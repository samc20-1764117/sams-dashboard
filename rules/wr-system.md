# WR System Rules

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

## Non-WR Recurring Task Logic

Non-WR (`is_weekly_reset=false`) → `st.recurring`. All CRUD to `wr_recurring_rules`.

- **Scheduled**: auto by cadence+`appears_on_date`. `getRecurringWeekTasks(off)`→`{_recId,_virtual:true,_wkKey}`.
- `skipRecVirtThisWk`: sets `__skip__`, removes TBs, PATCHes `date_overrides`, undo.
- **Done**: `_doneByWk[getWkKey(wkOff)]`. `togRec` writes/deletes key.
- **Drag move** (`rec::` in weekly cal): snapshot `savedBlocks` before `removeTBBlocksForDate`. Undo restores `_dateOverrides` + blocks.
- **Edit this week only**: `openRecEditModal(rid,wkKey,'this')`. Saves `_dateOverrides['name::'+wkKey]={name,notes}`.
