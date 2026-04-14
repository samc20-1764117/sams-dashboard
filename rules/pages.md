# Pages Rules

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` checks `b.ruleId/shopId/recId/taskId`.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (4-week lookback, undone only — done WR rules do NOT appear as overdue). `wrRulesToday/wrecToday` use `_wrRulesSeen/_wrecSeen` to dedup.
- **Layout**: `.overview-cols` `minmax(0,1.45fr) minmax(0,2.6fr)`. `row1-right-top` is 3-col grid (1.05fr WR / 0.9fr Shopping / 0.6fr Quick Links) with `height:min(225px,28vh)`. Inside `.tod-tb-body`: `.tod-section{flex:0.95}` `.tb-section{flex:1.05}` — today list narrower than timeblock. `#todList .ti`: `margin-left:0;padding-left:7px;padding-right:16px` (tighter than default `.ti` padding). **Weekly cal chips**: `.chip` font-size `9px`, padding `2px 4px`; `.wkc-dd` font-size `11px`, size `18×18px`.
- **WR overview list** (`#recList`): `columns:2;column-gap:2px;column-fill:auto;padding:4px 0 0`. Items: `margin:0 6px;padding:3px 22px 3px 10px;break-inside:avoid`. `max-height = 4 + 7 * itemHeight` (set in rAF, exactly 7 rows per column).
- **Shopping overview list** (`#shopOv`): block layout, `padding:4px 0 0`. Items: `margin:0 6px;padding:3px 22px 3px 10px`. No `max-height` — do NOT add rAF-based height calculation (it caused items to be hidden when rAF fired with `offsetHeight=0` during background sync). Height is naturally constrained by the card's `overflow:hidden` + `flex:1` + `overflow-y:auto`. `#shopOv` starts empty in HTML. `#shopOv .cpill{padding-top:1px;padding-bottom:1px;line-height:1}` — critical: prevents cpill stretching rows taller than WR rows. **Sort** (`_shopOvSort`): items with `due_date` first (sorted by date), then items without `due_date` by `shop_order`. **Drag-to-reorder**: HTML5 DnD (dragover/drop on container); placeholder div technique. When a shop item is dragged to any calendar (today list, week cal, month cal, time block), it is assigned `_shopTopOrder` (min existing `shop_order` - 1) so it sorts to the top. Both `due_date` and `shop_order` are PATCHed together. **Weekly cal chips**: name only — store name NOT shown in parentheses.
- **List text/checkbox**: `#shopOv .tn,#recList .tn{font-size:11px}`. `#shopOv .chk,#recList .chk{width:11px;height:11px}`.
- **Daily Habits** (`#dailyHabitsSection`): inside `tod-section` below `#todList`. Overview only — never in weekly cal, kanban, recurring page, or any other view. `renderDailyHabits()` called from `renderToday()`. Items: `st.recurring` where `cadence==='daily'`. Done state: `_doneByWk[ds]` (date string key, same JSONB col as non-WR recurring). `togDailyHabit(recId,done,ds)` PATCHes `done_by_week` — skips DB call if ID starts with `rec-tmp-` or `rec-local-` (POST not yet resolved; state saved locally until real ID assigned). Add via `#dailyHabitPopup` (`.qa-popup`): name+notes; `submitDailyHabit()` POSTs with `{cadence:'daily',is_weekly_reset:false}`. Delete reuses `delRec()`. Popup: Enter submits if name filled, closes if empty; Cmd+Enter submits from notes textarea; Esc closes.
- **Header "+" button**: `id="todPlusBtn"`, in header left cell (right of ← arrow). Opens `openQA('today',this)`. QA close handler uses `.closest('.btn-plus,#todPlusBtn,.wkc-add-btn')`.
- **Time blocks**: auto blocks in `computeTBLayout`. Auto blocks never in today/overdue/metrics/recurring/weekly-cal.

### Weekly Goals (`overview.js` + `features.js`)
- **Category**: `'Weekly Goals'`. In `KCATS` and `_CAT_OPT_LIST`. Not overdue. Not in Today list, timeblock, overdue banner, unassigned popup.
- **Scoping**: tasks belong to a week via `due_date` (any Mon–Sun date). Shown in Goals column, monthly cal Goals column, and Weekly Objectives modal.
- **Weekly cal Goals column**: 8th column (`.wkc-goals-col`) after Sunday. Header `.wkc-goals-h` — contains `.wo-hdr-btn` (`width:100%;margin:0`, centered via `justify-content:center` on parent). Clicking opens `#woModal` via `openWOModal()`. Divider: `2px solid rgba(255,255,255,.88)`. Background: `rgba(255,255,255,.18)`. **Alignment**: `wkc-head` is inside `.wkc-cols-wrap` (not a sibling) so header and body share the same flex context. `.wkc-day-h` and `.wkc-col` both use `padding:2px 2px` + `border-left:1px`; `.wkc-goals-h` uses `padding:0 2px` + `border-left:2px` matching `.wkc-goals-col` — ensures the white divider line is pixel-perfect aligned.
- **Sort order**: `important && !done` first (undone important at top), then `goal_order` (DB col, integer) as tiebreaker. Weekly cal, monthly cal, and Weekly Objectives modal all use this order. PATCH `goal_order` after reorder. Cross-column/cross-week drops call `renderWOModal()` immediately so important items snap to top without refresh.
- **Chip styling**: `background:rgba(255,255,255,.82);color:rgba(80,80,95,.75);border-color:rgba(255,255,255,.9)` + `backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)`. **IMP override**: when `t.important && !t.done`, use IMP yellow — CSS must NOT have `!important` on color/border.
- **Selection highlight**: `.wo-chip.sel-row,.wkc-goals-col .chip.sel-row` — soft grey outline + shadow (NOT the standard purple). Never use purple for Weekly Goals selection.
- **Cannot drag to day columns**: dragId `'wkgoal::'+id`; day col dragover returns early for this prefix.
- **Chip mousedown drag** (`_blockGoalDrag` flag, `draggable=false` on mousedown): mode locked at 15px movement. **Vert** = reorder (`goal_order`), placeholder div technique. **Horiz** = move week (±7 days to `due_date`, `shiftWk(dir)`). Edge indicators set directly (not via `showWkcEdges`): `eL.style.left=(goalsColLeft-wrapLeft)+'px'`, `eR.style.left/right/transform=''` (default `right:0`).
- **Move to different week**: (1) chip horiz drag; (2) right-click→`showGoalCtx`→"← Prev"/"→ Next"/"Custom…" via `moveGoalWeeks(taskId,delta)`; (3) monthly cal Goals cell drag (`wkgoal-mo::taskId::srcWkMonDs`); (4) drag in Weekly Objectives modal.
- **`openQA` default category**: `ctx==='wkc'` + `kcat` provided → uses `kcat`, not 'Home'.
- **Week-nav edge indicators** (`#wkcEdgeL`/`#wkcEdgeR`, `.wkc-edge.left/.right`): `showWkcEdges(true)` called from `dStart` (native drag start). Positions `eR` via `style.left=(sundayRight-wrapLeft-32)+'px'` + `style.right='auto'` (overrides CSS `right:0`) so it overlaps Sunday's right 32px. Trigger zone: 44px from Sunday's right edge (`e.clientX > sunRight-44`) in both `dragover` and `drop` on `#wkcWrap`. Col `dragover` guard also uses Sunday's right edge — returns early if `e.clientX > sunRight-44` so wrap handles it. **Critical**: col dragover must only remove `.active` (not call `showWkcEdges(false)`) — calling `showWkcEdges(false)` clears `style.left` causing indicator to revert to goals col position.

### Weekly Objectives Modal (`#woModal`, `overview.js`)
- **Open**: click `.wo-hdr-btn` in wkc Goals header → `openWOModal()` resets `_woViewOff=0`, calls `renderWOModal()`, adds `.open` to overlay. `z-index:490` so task edit modal (`#tModal`, 500) renders on top.
- **Layout**: 5 columns side by side (`.wo-col`), each showing one week's objectives. `wo-cols` height fixed at `440px`. Current week gets `.wo-col-current` (accent tint). Past weeks get `.wo-col-past` (dimmed).
- **Navigation**: `←`/`→` buttons call `woShift(-1)`/`woShift(1)` — shift `_woViewOff` by 1 and re-render. View starts at `wkOff + _woViewOff`, shows 5 consecutive weeks.
- **Chip full functionality** (via `_woMakeChip`): checkbox (toggle done), single-click select (`selectedTasks`, Cmd/Ctrl/Shift range), double-click edit (`tiDbl` → `openEditTask`), right-click full context menu (`showCtx` — edit/duplicate/delete), hover X (`chip-del` → `delTask`). All keyboard shortcuts work via `selectedTasks`.
- **Drag within modal** (`_woMakeChip` mousedown): mode locked at 15px. **Vert** = reorder within same column (`goal_order`), white dashed placeholder. **Horiz** = move between columns (floating clone at captured pixel width `chip.getBoundingClientRect().width`; `width:100%` on clone must be overridden). **Edge zones** (`#woEdgeL`/`#woEdgeR`, 44px): dragging past left/right edge moves chip to adjacent week outside current view AND shifts `_woViewOff±1` then re-renders.
- **`srcBody` must use `chip.parentElement`** at drag-start (not closure `body`) — after cross-column drops the chip's parent changes; stale closure causes `insertBefore` to throw and breaks subsequent drags.
- **Re-render on state changes**: `renderAll()` calls `renderWOModal()` when `#woModal.open` — delete, undo, edit all update the modal instantly.
- **Double-click empty column body**: opens `openQA('wkc', null, wkStart, 'Weekly Goals')` to add a new goal for that week.

### Recurring Tasks Page (`features.js`, `page-weekly`)
Two-col grid: WR left, non-WR right. 4 cadence groups each. WR: `renderRtWrGroup`. Non-WR: `renderRtGroup`. `OTHER_CADS=['quarterly','biannual','annual']`.

### Monthly Calendar (`features.js`, `#mModal`)
Fixed range Jan 1 (curYr-3) → Dec 31 (curYr+2). `scrollMoToday()` BEFORE `.open`. GPU: `backdrop-filter:none`. Orbs paused. **Grid**: 8 cols — `#mDow,#mCells{grid-template-columns:repeat(7,1fr) minmax(120px,1.4fr)}`. 8th col = Goals (light white bg, white left border). Weekly Goals filtered from day cells and unassigned panel. Goals cells support `wkgoal-mo::taskId::srcWkMonDs` drag.
- **Goals chips**: `background:rgba(255,255,255,.82);color:rgba(80,80,95,.75);border-color:rgba(255,255,255,.9)`. IMP override applies (`t.important && !t.done` → IMP yellow). **Sort**: important+undone first.
- **Unassigned panel** (`.mua-side`): `width:150px`. Items (`.uitem`): `font-size:9px`. Narrower to give more space to goals column.
- **Dynamic "+ x more"** (day cells and goals cell): chips computed from viewport height (`_cellH = max(70,(94vh-100)/4-4)`). Day cells subtract 28px overhead (header+padding); goals cell subtracts 8px (padding only, no date header). All chips rendered to DOM; extras hidden with `display:none;data-more-hidden=1`. Click "+ x more" reveals hidden chips inline — no popup. Only shown when hidden count > 0.

### Recurring Monthly View (`overview.js`, `#recMoModal`)
**Grid**: 8 cols — 7 day + 1 WR col (blue-tinted, `columns:2`). **No Goals column** — Goals only in weekly calendar.  `#recMoDow,#recMoCells{grid-template-columns:repeat(7,1fr) minmax(160px,1.8fr)}`. Width: `min(98vw,1200px)`. 22-week range.
**X button**: WR→skip/delete; WRec→skip/`delRec`; non-WR→`skipRecVirtThisWk`/`delRec`.
**Right-click** (`showWrRuleCtx`): Skip/Move/Edit/Delete. Auto-detects type via `st.wrRules`.
**Header rebuild**: `dowEl.innerHTML=''` before repopulating headers — required because `if(!dowEl.children.length)` guard prevents stale header removal otherwise.

### Shopping List (`features.js`)
`shop_order integer`. X→`unscheduleShop`: null `due_date`, remove `st.blocks`.
- **Sort modes**: `shopSortMode` cycles store→alpha→manual via `toggleShopSort()`. Button label: "By store" / "A → Z" / "Manual".
- **Manual mode**: DOM-rendered (not innerHTML). Items sorted by `shop_order`. mousedown/mousemove/mouseup drag-to-reorder. Single click suppressed after drag (`_shopDragged` flag). Double-click opens edit modal. PATCHes `shop_order` for all items after reorder.

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
