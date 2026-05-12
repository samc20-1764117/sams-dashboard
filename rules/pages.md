# Pages Rules

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` checks `st.blocks` (by `ruleId/shopId/recId/taskId`) AND `getRecAutoTBForDate` (by `_recId`) for recurring tasks with `default_start_time`. Overdue pup sessions (`day_date < today && !done`) appear in today list when `dayOff===0` via `isOv(s.day_date)` filter.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (4-week lookback, undone only). `wrRulesToday/wrecToday` use seen sets to dedup.
- **Shopping overview** (`#shopOv`): NO rAF-based max-height — caused items to be hidden when `offsetHeight=0` during background sync. Height naturally constrained by card's `overflow:hidden` + flex. Sort (`_shopOvSort`): `due_date` items first (by date), then no-date by `shop_order`. Drag-to-calendar assigns `_shopTopOrder` (min `shop_order` - 1). **Weekly cal chips**: store name NOT shown in parentheses.
- **WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF, exactly 7 rows per column).
- **Daily Habits** (`#dailyHabitsSection`): below `#todList`. Overview only. Items: `st.recurring` where `cadence==='daily'`. Done state: `_doneByWk[ds]`. `togDailyHabit` skips DB call if ID starts with `rec-tmp-` or `rec-local-`. Add via `#dailyHabitPopup`: `submitDailyHabit()` POSTs `{cadence:'daily',is_weekly_reset:false}`. Delete reuses `delRec()`.
- **Pup Skills Highlight** (`#pupSkillsHighlight`): above `#dailyHabitsSection`, below `#todList`. Overview only. Shows `st.pup_skills` where `focus===true` and `stage!=='Mastered'`. **Collapsed by default** (`_pupSkillsOpen=false`). Toggle button `#_pupSkillsBtn` (a `<div>`) sits between `#pupSkillsHighlight` and `#dailyHabitsSection`; contains a `<button>` (toggles open/close, updates `#_pupSkillsArrow` ▾/▴) and a `btn-plus` button (`openPupAddModal()`). `togglePupSkillsOpen()` animates `max-height`+`opacity`+`margin` directly on the element (no re-render). Container transition: `.35s cubic-bezier(.4,0,.2,1)` on max-height, `.35s ease` on opacity — completely invisible (opacity:0, max-height:0) when closed. No header inside container. **Count display**: each row shows `done_this_week / total_sessions_this_week` as a fixed-width (`width:26px`) right-aligned `9px` badge; clicking opens `openPupCountEdit()` detail popover. Sort: incomplete first, then Mochi→Sunny. Skill text: `font-size:10px;font-weight:400;color:var(--muted)`. Row padding: `2px 10px`. Count color: `var(--muted)` always (no conditional coloring). Dblclick → `openPupEditModal(id)`. Hover tooltip (`showPupSkillTip`/`hidePupSkillTip`). `renderPupSkillsHighlight()` snaps to current `_pupSkillsOpen` state on re-render; hides `#_pupSkillsBtn` when no focus skills. Key helpers: `_pupWkDone(skillId)`, `_pupWkSessTotal(skillId)` (both week-scoped via `getWkBounds(0)`).
- **Header "+" button**: `id="todPlusBtn"`. Opens `openQA('today',this)`. QA close handler: `.closest('.btn-plus,#todPlusBtn,.wkc-add-btn')`.
- **Today progress donut** (`#todProgressDonut`, `renderTodDonut`): fires `launchDonutConfetti()` once when `pct` first reaches 1.0 (`_donutWas100` flag prevents re-fire; resets when pct drops below 1). Confetti: 42 white+green pill-shaped sprinkles, staggered 0–150ms delay, gravity-arc easing. Dance: `launchDonutConfetti` injects arms/legs/eyes into the SVG — single `<g>` per limb with absolute SVG coords and `style.transformOrigin = "${tx}px ${ty}px"` for correct pivot; nested translate+rotate via CSS keyframes. Dance cleans up after 3s.
- **Auto blocks**: `computeTBLayout` — sorts by start time then duration desc (longer blocks placed left). Never in today/overdue/metrics/recurring/weekly-cal.

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
- **Selected day indicator**: `wkc-day-sel` — white filled circle with light grey inset ring. Day-of-week label stays default grey. Column gets `wkc-col-sel` subtle tint. `shiftDay()` already calls `renderWkCal()` so arrows update it.
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
Table: `travel(id,name,destination,start_date,end_date,travel_mode,notes)`. Drag-to-create: `calDrag{active,startDs,endDs,moved}`. Week boundary: `ei` clamped. **Drag-to-navigate**: mousemove during `calDrag` detects cursor within 30px of `wkcCols` left/right edge → calls `shiftWk(±1)` and clears drag (300ms lock prevents rapid fire).
- **mModal stays open when travelModal opens**: `travelModal` (z-index:500) can open on top of `mModal` (z-index:490). Global Escape handler (`core.js:856`) must not close `mModal` when a foreground overlay is still open — checks `.overlay.open:not(#mModal):not(#recMoModal)` first. `travelModal`'s `onkeydown` calls `event.stopPropagation()` on Enter/Escape so keys don't bubble to the document handler that would close `mModal`.

### Pup Skills (`pup-skills.js`)
Table: `pup_skills`. Sort: mastered last→category→focus→pup→level→skill_order. Inline edit: `pupCellEdit(td,id,field)`. Add modal: `openPupAddModal()`. Edit modal: `openPupEditModal(id)`. Enter in modal: closes if skill empty, saves otherwise. `savePupModal` POSTs/PATCHes Supabase and calls both `renderPupsPage()` and `renderPupSkillsHighlight()`. **Session counts**: table has a "Sessions" column and card rows (non-mastered) show a count badge — both display lifetime `done/total` from `st.pupSessions`. Clicking either opens `openPupCountEdit(skillId, anchorEl)`: a popover showing total done (lifetime), total sessions (lifetime), last practiced date, this week done/total, and an editable "done this wk" field (Enter saves, Escape closes). `setPupWkDone(skillId, newDone)` creates/removes `pup_skill_sessions` rows to match the desired done count. Count color: `var(--muted)` always. Key helpers defined at top of file: `_pupWkDone`, `_pupWkSessTotal`, `_pupAllSess`, `_pupAllDone`, `_pupAllTotal`, `_pupLastPracticed`, `_pupCountBadge`.

### Videos (`videos.js`)
See `rules/videos.md` for full rules. Table: `videos`. 4 views: Dashboard, All Details, Videos by Progress, Monthly. B→L grouping via `big_video_id`. 8 stages (steps). Auto-publish when core stages done + has post_date. Inline cell editing. Searchable big video + playlist fields.

### Birthdays (`features.js`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas` JSON array. `saveBdayModal` does NOT include `present_ideas`.

### Recipes (`features.js`)
Table: `recipes`. Do NOT reference: protein,prep_time,cook_time,difficulty,last_made_date. `#recSidePanel` 400px. Ingredients: JSON `[{name,amount}]`.

### Quick Notes (`features.js`)
`deleteQN`: PATCH `{is_visible:false}` — soft delete only.
