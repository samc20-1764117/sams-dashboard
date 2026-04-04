# Pages Rules

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
