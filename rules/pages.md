# Pages Rules

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` checks `b.ruleId/shopId/recId/taskId`.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (4-week lookback, undone only). `wrRulesToday/wrecToday` use seen sets to dedup.
- **Shopping overview** (`#shopOv`): NO rAF-based max-height — caused items to be hidden when `offsetHeight=0` during background sync. Height naturally constrained by card's `overflow:hidden` + flex. Sort (`_shopOvSort`): `due_date` items first (by date), then no-date by `shop_order`. Drag-to-calendar assigns `_shopTopOrder` (min `shop_order` - 1). **Weekly cal chips**: store name NOT shown in parentheses.
- **WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF, exactly 7 rows per column).
- **Daily Habits** (`#dailyHabitsSection`): below `#todList`. Overview only. Items: `st.recurring` where `cadence==='daily'`. Done state: `_doneByWk[ds]`. `togDailyHabit` skips DB call if ID starts with `rec-tmp-` or `rec-local-`. Add via `#dailyHabitPopup`: `submitDailyHabit()` POSTs `{cadence:'daily',is_weekly_reset:false}`. Delete reuses `delRec()`.
- **Pup Skills Highlight** (`#pupSkillsHighlight`): above `#dailyHabitsSection`, below `#todList`. Overview only. Shows `st.pup_skills` where `focus===true` and `stage!=='Mastered'`. Done-this-week state: `_trainedWk[wkKey]` (local only, not synced to server). `togPupSkillTrained` saves via `save()`. Sort: undone first, done sink to bottom. Checkbox = trained this week (NOT mastered). Dblclick → `openPupEditModal(id)`. Title button → `showPage('pups')`. `+` button → `openPupAddModal()`. `savePupModal` calls `renderPupSkillsHighlight()` after add/edit. Timeblock labels at 8am/4pm are darker+bold (`rgba(45,40,85,.95)`, weight 800) on Mon–Fri only.
- **Header "+" button**: `id="todPlusBtn"`. Opens `openQA('today',this)`. QA close handler: `.closest('.btn-plus,#todPlusBtn,.wkc-add-btn')`.
- **Auto blocks**: `computeTBLayout`. Never in today/overdue/metrics/recurring/weekly-cal.

### Weekly Goals (`overview.js` + `features.js`)
- **Category**: `'Weekly Goals'`. Not overdue. Not in Today list, timeblock, overdue banner, unassigned popup.
- **Scoping**: tasks belong to week via `due_date` (any Mon–Sun date).
- **Sort**: `important && !done` first, then `goal_order`. All views use this order. PATCH `goal_order` after reorder.
- **Cannot drag to day columns**: dragId `'wkgoal::'+id`; day col dragover returns early.
- **Chip drag**: mode locked at 15px. Vert=reorder (`goal_order`). Horiz=move week (±7 days `due_date`, `shiftWk(dir)`).
- **Move to different week**: chip horiz drag; right-click→`showGoalCtx`→`moveGoalWeeks(taskId,delta)`; monthly cal drag; WO modal drag.
- **Week-nav edge indicators**: `showWkcEdges(true)` from `dStart`. Col dragover must only remove `.active` — calling `showWkcEdges(false)` clears `style.left` causing indicator to revert to goals col position.
- **IMP override**: `t.important && !t.done` → IMP yellow. No `!important` CSS on color/border so inline JS wins.
- **Selection highlight**: soft grey outline+shadow (NOT purple).
- **Weekly cal Goals column**: 8th col (`.wkc-goals-col`). Click header → `openWOModal()`.
- Cross-column/cross-week drops call `renderWOModal()` immediately so important items snap to top.
- **`openQA` default**: `ctx==='wkc'` + `kcat` provided → uses `kcat`, not 'Home'.

### Weekly Objectives Modal (`#woModal`, `overview.js`)
- 5 columns side by side (`.wo-col`), each one week. Current week: `.wo-col-current`. Past: `.wo-col-past`. `z-index:490` (task edit modal at 500 renders on top).
- Navigation: `woShift(-1/1)` shifts `_woViewOff`. Shows `wkOff + _woViewOff` to +4.
- Chips: full functionality (checkbox, select, dblclick edit, right-click ctx, hover-X delete).
- **Drag**: vert=reorder within column, horiz=move between columns. Edge zones (44px): past edge moves chip + shifts `_woViewOff±1`.
- **`srcBody` must use `chip.parentElement`** at drag-start — stale closure after cross-column drops causes `insertBefore` to throw and breaks subsequent drags.
- Re-renders on state changes when `#woModal.open`.
- Double-click empty column: `openQA('wkc', null, wkStart, 'Weekly Goals')`.

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left, non-WR right. 4 cadence groups each. `OTHER_CADS=['quarterly','biannual','annual']`.

### Monthly Calendar (`features.js`, `#mModal`)
Fixed range Jan 1 (curYr-3) → Dec 31 (curYr+2). `scrollMoToday()` BEFORE `.open`. GPU: `backdrop-filter:none`. Orbs paused.
- **Grid**: 8 cols — 7 day + Goals col. Weekly Goals filtered from day cells and unassigned panel. Goals cells support `wkgoal-mo::taskId::srcWkMonDs` drag.
- **Unassigned panel**: `width:150px`. Narrower to give more space to goals column.
- **Dynamic "+ x more"**: computed from viewport height. Click reveals hidden chips inline — no popup.
- Goals chips: IMP override applies. Sort: important+undone first.

### Recurring Monthly View (`overview.js`, `#recMoModal`)
**Grid**: 8 cols — 7 day + WR col (blue-tinted, `columns:2`). No Goals column. Width: `min(98vw,1200px)`. 22-week range.
**X button**: WR→skip/delete; WRec→skip/`delRec`; non-WR→`skipRecVirtThisWk`/`delRec`.
**Right-click** (`showWrRuleCtx`): Skip/Move/Edit/Delete.
**Header rebuild**: `dowEl.innerHTML=''` before repopulating — `if(!dowEl.children.length)` guard prevents stale removal otherwise.

### Shopping List (`features.js`)
`shop_order integer`. X→`unscheduleShop`: null `due_date`, remove `st.blocks`.
- **Sort modes**: `shopSortMode` cycles store→alpha→manual. Button label: "By store"/"A → Z"/"Manual".
- **Manual mode**: mousedown/mousemove/mouseup drag-to-reorder. Single click suppressed after drag (`_shopDragged`). PATCHes `shop_order` for all items after reorder.

### Travel System
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. Drag-to-create: `calDrag{active,startDs,endDs,moved}`. Week boundary: `ei` clamped.

### Pup Skills (`pup-skills.js`)
Table: `pup_skills`. Sort: mastered last→category→focus→pup→level→skill_order. Inline edit: `pupCellEdit(td,id,field)`. Add modal: `openPupAddModal()`. Edit modal: `openPupEditModal(id)`. Enter in modal: closes if skill empty, saves otherwise. `savePupModal` POSTs/PATCHes Supabase and calls both `renderPupsPage()` and `renderPupSkillsHighlight()`.

### Birthdays (`features.js`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas` JSON array. `saveBdayModal` does NOT include `present_ideas`.

### Recipes (`features.js`)
Table: `recipes`. Do NOT reference: protein,prep_time,cook_time,difficulty,last_made_date. `#recSidePanel` 400px. Ingredients: JSON `[{name,amount}]`.

### Quick Notes (`features.js`)
`deleteQN`: PATCH `{is_visible:false}` — soft delete only.
