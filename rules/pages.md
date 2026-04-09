# Pages Rules

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` check uses `b.ruleId`/`b.shopId`/`b.recId`/`b.taskId`.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (looking back 4 weeks). `wrRulesToday`/`wrecToday` loops use `_wrRulesSeen`/`_wrecSeen` to dedup across weeks. Skip check: `_dateOverrides[wkKey]!=='__skip__'` (WRec) + `st.wrOverrides` skip check (WR rules).
- **Layout**: `.overview-cols` `minmax(0,1.5fr) minmax(0,2.55fr)`. `row1-right-top` is a 3-col grid (1.05fr WR / 0.9fr Shopping / 0.6fr Quick Links) with `height:min(225px,28vh)`.
- **WR overview list** (`#recList`): `columns:2;column-gap:2px;column-fill:auto;padding:4px 0 0`. Items use inline `margin:0 6px;padding:3px 22px 3px 10px;break-inside:avoid`. `max-height` set dynamically in JS to `4 + 7 * itemHeight` to show exactly 7 rows per column.
- **Shopping overview list** (`#shopOv`): block layout, `padding:4px 0 0`. Items use inline `margin:0 6px;padding:3px 22px 3px 10px`. `max-height` set dynamically to show exactly 7 items then scroll — calculated inside `requestAnimationFrame` + `document.fonts.ready` (both needed) to ensure font-loaded row height is used; measuring before fonts load causes the 7th item to be half-clipped. `#shopOv` starts empty in HTML (no pre-rendered items). CSS: `#shopOv .cpill{padding-top:1px;padding-bottom:1px;line-height:1}` — critical: without this the cpill stretches rows taller than WR rows, breaking alignment.
- **List text/checkbox**: `#shopOv .tn,#recList .tn{font-size:11px}`. `#shopOv .chk,#recList .chk{width:11px;height:11px}`.
- **Time blocks**: auto blocks in `computeTBLayout`. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.

### Weekly Goals (`overview.js` + `features.js`)
- **Category**: `'Weekly Goals'` — indigo color in CATS. In `KCATS` and `_CAT_OPT_LIST`.
- **Scoping**: tasks belong to a week via `due_date` (any date in that Mon–Sun range). Shown only in the Goals column; never in day columns, Today list, timeblock, overdue banner/count, or unassigned popup.
- **Weekly calendar Goals column**: 8th column (`.wkc-goals-col`) after Sunday. Header: `.wkc-goals-h` (bottom-aligned). Divider: `2px solid rgba(255,255,255,.88)`. Background: `rgba(255,255,255,.18)`. Chips match day-column chip behavior (checkbox, click/select, dblclick edit, right-click, delete). Dblclick empty → `openQA('wkc', null, today, 'Weekly Goals')`.
- **Cannot drag to day columns**: dragId uses `'wkgoal::'+id` prefix; day column dragover returns early for this prefix.
- **Move to different week — 3 methods**:
  1. Drag left/right edge of weekly cal → shifts `due_date` ±7 days, navigates week view.
  2. Right-click → `showGoalCtx` → scope picker: "← Previous week" / "→ Next week" / "Custom…" (prompts for N weeks, negative = past). Uses `moveGoalWeeks(taskId, delta)`.
  3. Monthly calendar Goals cell drag up/down between week rows (`wkgoal-mo::taskId::srcWkMonDs`), preserves day-of-week offset.
- **`openQA` default category**: when `ctx==='wkc'` and `kcat` provided, uses `kcat` as default (not always 'Home').

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left, non-WR right. 4 cadence groups each. WR: `renderRtWrGroup`. Non-WR: `renderRtGroup`. Other group: `OTHER_CADS=['quarterly','biannual','annual']`.

### Monthly Calendar (`features.js`, `#mModal`)
Fixed range Jan 1 (curYr-3) → Dec 31 (curYr+2). `scrollMoToday()` BEFORE `.open`. GPU: `backdrop-filter:none`. Orbs paused. **Grid**: 8 cols — `#mDow,#mCells{grid-template-columns:repeat(7,1fr) minmax(80px,1fr)}`. 8th col = Goals (light white bg, white left border). Weekly Goals tasks filtered from day cells and unassigned panel. Goals cells support drag between weeks via `wkgoal-mo::taskId::srcWkMonDs`.

### Recurring Monthly View (`overview.js`, `#recMoModal`)
**Grid**: 9 cols — 7 day + 1 WR + 1 Goals. WR col: blue-tinted, `columns:2`. Goals col: light white. Width: `min(98vw,1200px)`. 22-week range.
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
