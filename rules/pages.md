# Pages Rules

### Overview (`overview.js`)
- **Today list** sort: done last→travel→overdue→important→type (regular=1,rec=2,shop=3,bday=4)→name. `_hasTBToday` checks `st.blocks` (by `ruleId/shopId/recId/taskId`) AND `getRecAutoTBForDate` (by `_recId`) for recurring tasks with `default_start_time`. Overdue pup sessions (`day_date < today && !done`) appear in today list when `dayOff===0` via `isOv(s.day_date)` filter.
- **WR tasks in today list**: appear if `_dateOverrides[wkKey]===today` OR overdue (4-week lookback, undone only). `wrRulesToday/wrecToday` use seen sets to dedup.
- **Shopping overview** (`#shopOv`): NO rAF-based max-height — caused items to be hidden when `offsetHeight=0` during background sync. Height naturally constrained by card's `overflow:hidden` + flex. Sort (`_shopOvSort`): `due_date` items first (by date), then no-date by `shop_order`. Drag-to-calendar assigns `_shopTopOrder` (min `shop_order` - 1). **Weekly cal chips**: store name NOT shown in parentheses.
- **WR overview list** (`#recList`): `columns:2;column-fill:auto`. `max-height = 4 + 7 * itemHeight` (set in rAF, exactly 7 rows per column).
- **Daily Habits** (`#dailyHabitsSection`): below `#todList`. Overview only. Items: `st.recurring` where `cadence==='daily'`. Done state: `_doneByWk[ds]`. `togDailyHabit` skips DB call if ID starts with `rec-tmp-` or `rec-local-`. Add via `#dailyHabitPopup`: `submitDailyHabit()` POSTs `{cadence:'daily',is_weekly_reset:false}`. Delete reuses `delRec()`.
- **Pup Skills Highlight** (`#pupSkillsHighlight`): below `#todList`. Two side-by-side inset tiles (Mochi / Sunny) showing this week's focus skills. Weekly focus tracked via `pup_weekly_focus` Supabase table (`skill_id uuid`, `week_start`). Auto-seeded from `pup_skills.focus` flag via `seedPupWeeklyFocus()` (guarded by `_pupWkFocusSeeding`). Each tile: flex column, `border-radius:12px`, inset white container. Undone skills sorted to top, done-this-week to bottom (opacity `.35`, no strikethrough). Progress bar: `rgba(16,185,129,.7)`, pinned to bottom via flex spacer `<div style="flex:1">`. Counts use `tabular-nums`. Hover tooltip shows total sessions. Tiles hidden when no focus skills for either pup. Checkbox syncs via `togPupSkillTrained`; time block pup checkbox uses `b.cat==='pup_session'&&b._pupSessId` branch.
- **Layout**: `.row1-right-top` uses `height:min(225px,28vh)` (not max-height) to prevent container resizing when navigating weeks.
- **Header "+" button**: `id="todPlusBtn"`. Opens `openQA('today',this)`. QA close handler: `.closest('.btn-plus,#todPlusBtn,.wkc-add-btn')`.
- **Videos on overview**: Vid button in objectives header. Click toggles `#vidOvPanel` — slides in from left over the today/timeblock card. Shows up_next B videos with children, stage dots (click=toggle done, right-click=toggle na), progress %, `+` buttons to add smalls. Panel stays open after drag. Assigned videos greyed out (opacity .4). "Videos" header links to videos page. Drag onto day → `_vidAssignToDay` stores in `localStorage._vidDayMap` (undoable). Video appears as soft indigo chip. Check off → `_vidCompleteFromOv`. ✕ → `_vidUnassignDay` (undoable). Dblclick/Enter → `openVidEdit` (stays on overview). Right-click → `showVidCtx`. Keyboard nav: ↑/↓ navigate rows, Delete removes from calendar, Enter edits. `W + ←/→` shifts week (works with panel open).
- **Shopping header**: `.ct` text uses `text-transform:none;letter-spacing:0` (not uppercase). Cart icon is SVG, not emoji.
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
- **Weekly cal layout**: `wkc-head` + `wkc-cols` both use `display:grid;grid-template-columns:repeat(8,1fr)`. All 8 columns (7 days + goals) equal width. Dividers aligned via shared grid.
- **Weekly cal Goals column**: 8th col (`.wkc-goals-col`). Click header → `openWOModal()`.
- Cross-column/cross-week drops call `renderWOModal()` immediately so important items snap to top.
- **`openQA` default**: `ctx==='wkc'` + `kcat` provided → uses `kcat`, not 'Home'.
- **Meal row** (`#mealRow`, `features.js`): grid row below weekly cal inside `#wkcWrap`. 8 columns: 7 days + unassigned (far right). Dynamic height based on meal count. White/glass chips matching weekly objectives style. Moves with `shiftWk`/`goThisWk` (tied to `wkOff`). No rubber-band selection on meal area.
  - **Date alignment**: `_mealWeekDates()` delegates to `_grocWeekDatesFor(_grocWeekMonday(wkOff))` — same functions as grocery system. Prevents local-vs-UTC mismatch.
  - **Week alignment**: HEB top strip = `menuMon = _grocWeekMonday(_grocWkOff)` = this week's meals. `grocery_list.week_of` is stored as `planMon` (week meals are FOR). Weekly cal meal row matches same week.
  - **Unassigned column**: shows recipes partially removed from calendar. Uses `expected = ceil(servings/people)` vs `actual` on cal. Only shows if `actual > 0` (recipe has at least 1 entry on cal). Dashed chips, draggable back onto days.
  - **Interactions**: click to select (`meal-{id}` prefix in `selectedTasks`), shift/cmd multi-select, Delete key removes. Dblclick empty cell opens HEB modal. Drag between days, drag to reorder vertically within day (sort_order). `removeMeal` only deletes from `meal_plan` (doesn't touch grocery items).
  - **Inline add**: dblclick empty cell opens HEB modal (`openGroceryModal()`).

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

### Packing List (Travel)
Tables: `packing_items(id,travel_id,name,category,source,checked,sort_order)`, `packing_templates(id,name,category,sort_order)`. Templates = standard list; items = trip-specific.
- **Modal**: `packingModal` overlay, 720px wide, `tabindex="0"` for keyboard. ←/→ arrows switch trip/standard views. `_packModalView` flag.
- **Categories**: `PACK_CATS=['Clothes','Toiletries','Must Haves','Pups','Other']`. 3 columns: `[['Must Haves'],['Clothes','Toiletries'],['Pups','Other']]`.
- **Trip view**: per-category sections with hover-reveal ✕ (delete all in cat) + checkbox (check-all). Checkbox slides in aligned with item checkboxes, `position:absolute`→`static` on hover. Items: drag-to-reorder, checkbox, ★ on manual items to save to standard. Checked items: `opacity:.15`, line-through. Progress bar in footer (`#10b981` matching donut).
- **Standard view**: same column layout, `contenteditable` names (Enter→blur saves), per-category add inputs. No checkboxes.
- **Input flow**: Enter adds item (default category: Other). Tab→category dropdown, Enter in dropdown saves with selected category.
- **Load Standard**: adds all template items not already in trip. Confetti via `launchDonutConfetti()` at 100%.
- **Close**: click overlay background or Escape. `_modMousedownInside` flag resets on mouseup.

### Pup Skills (`pup-skills.js`)
Table: `pup_skills`. Sort: mastered last→category→focus→pup→level→skill_order. Inline edit: `pupCellEdit(td,id,field)`. Add modal: `openPupAddModal()`. Edit modal: `openPupEditModal(id)`. Enter in modal: closes if skill empty, saves otherwise. `savePupModal` POSTs/PATCHes Supabase and calls both `renderPupsPage()` and `renderPupSkillsHighlight()`. **Session counts**: table has a "Sessions" column and card rows (non-mastered) show a count badge — both display lifetime `done/total` from `st.pupSessions`. Clicking either opens `openPupCountEdit(skillId, anchorEl)`: a popover showing total done (lifetime), total sessions (lifetime), last practiced date, this week done/total, and an editable "done this wk" field (Enter saves, Escape closes). `setPupWkDone(skillId, newDone)` creates/removes `pup_skill_sessions` rows to match the desired done count. Count color: `var(--muted)` always. Key helpers defined at top of file: `_pupWkDone`, `_pupWkSessTotal`, `_pupAllSess`, `_pupAllDone`, `_pupAllTotal`, `_pupLastPracticed`, `_pupCountBadge`.

### Videos (`videos.js`)
See `rules/videos.md` for full rules. Table: `videos`. 4 views: Dashboard, All Details, Videos by Progress, Monthly. B→L grouping via `big_video_id`. 8 stages (steps). Auto-publish when core stages done + has post_date. Inline cell editing. Searchable big video + playlist fields.

### Birthdays (`features.js`)
Table: `birthdays(id,name,birthday,present_ideas)`. `present_ideas` JSON array. `saveBdayModal` does NOT include `present_ideas`.
- **Weekly calendar banners**: grey out if timeblock done (`b._done`) OR date in past (`due_date < today`). `opacity:.35` via `addBanner` `isPast` param.
- **Weekly list**: birthdays get `done:true` from timeblock done state → `tRowExtra` applies greyed/strikethrough. Past birthdays (`due_date < today && !done`) also greyed out (opacity + strikethrough) via `_bdPast` in `tRowExtra`.
- **Monthly view** (`renderMoCal` in features.js): past birthdays greyed (`opacity:.35`), no checkbox, not draggable. Same in expanded "more" popup.
- **Today list**: birthdays never greyed out regardless of timeblock state. Emoji wrapped in `.bday-emoji` span (8px, `margin-left:3px`, today-list only via `#todList` scope).
- **`getBirthdaysInRange`** used for weekly calendar (supports past weeks); `getBirthdayTasks(null)` skips past dates — don't use for calendar.

### Recipes (`features.js`)
Table: `recipes` (columns include `sort_order int4`). Do NOT reference: protein,prep_time,cook_time,difficulty,last_made_date,notes. Ingredients: JSON `[{name,amount,is_pantry?}]`.
- **Book layout**: `.rec-book` two-panel grid (`320px 1fr`), `border-radius:12px`, glassy container (`backdrop-filter:blur(12px)`). Left: scrollable recipe list. Right: `#recDetailPanel` always-visible detail view. Active item uses **inverse rounded corners** (radial-gradient scoops via `::before`/`::after`) to create seamless tab-opening into detail panel. Active bg matches right panel bg exactly (`rgba(255,255,255,.45)` / dark `.06`). Wrap height: `calc(100vh - 102px)`.
- **Panel styling**: left panel has subtle bg tint, right panel matches active-item bg. `border-left` on right panel. Title flourish gradient under recipe name, stacked meta labels (Meal/Cuisine/Time/Serves as label-above-value). Source link field (`r.source`) at bottom-right.
- **Floating search**: `.rec-search-float` with cutout effect, straddling book top. Videos-style categorized suggestions (meal, cuisine, time, favorites, names, ingredients). `+` button next to search adds recipe inline.
- **Single click** → view detail (`selRecRow`). No double-click or edit modal — all editing is inline.
- **Arrow keys**: left/right navigate recipes, up/down reorder selected recipe (`_recMoveSelected`), `f` toggles favorite. Skips when input/textarea/select focused.
- **Sort order**: `sort_order` column, fetched `?order=sort_order.asc.nullslast,name.asc`. `_recEnsureSortOrder()` backfills missing values.
- **Delete**: ✕ button on list items (hover-visible).
- **Add inline** (`_recAddInline`): creates recipe with empty name, focuses title input. Blur with empty name deletes the recipe. No modal.
- **Detail panel**: always-visible title input, select dropdowns (meal/cuisine), number inputs (time/servings), ingredient list, instructions textarea. Nav arrows (← →) at bottom.
- **Tab flow**: title → meal type → cuisine → time → serves → first ingredient (or adds one). `_recMetaTab` saves without re-rendering to preserve focus. `_recMetaSave` patches Supabase directly.
- **Ingredients** (`_detailIngs` array, modal-style): in-memory array rendered as always-visible input rows (`_diRender`). No click-to-edit — inputs always shown. Tab: amt → name → staple → next amt. Staple toggle: `di-staple-btn` (home SVG icon), toggles `is_pantry`. Tab from last empty row removes it and focuses instructions. `_diAdd` adds new row focusing amt. `_diSave` persists on blur-away. Drag-reorder from anywhere on row (inputs stop propagation). Delete button (`di-del-btn`) has `tabindex="-1"`. Autocomplete: `_COMMON_INGS` + all used names, fixed-position dropdown, capitalized. Arrow up/down to navigate, Enter to pick → focuses next row's amt.
- **Ingredient grouping**: `_groupIngredients` (regular → pantry → spices). `_SPICE_RE` regex. Preserves manual order within groups.
- **Modal code archived**: `recipe-modal-archive.js` (not loaded, kept for reference).
- **Auto-capitalize**: global `input` listener capitalizes first char, after newlines, after ". ", after "• ". Typing `- ` at line start → `• `.

### HEB (`features.js` — grocery modal)
"HEB" = the meal planning + grocery modal opened via cart SVG icon on HEB tasks. Layout: header (nav arrows, date, This Week btn, people toggle, close ✕), horizontal weekly menu strip (top), 3-column bottom (Recipes | Planned Meals | Shopping List). Grid: `.8fr .7fr 1.5fr` (shopping list widest). Staples drawer slides from right inside modal. `_grocWkOff` shifts all panels. Opens to current week always. Enter/Escape/backdrop closes. Tables: `meal_plan`, `grocery_list`, `grocery_staples`.
- **Week alignment**: TOP strip = "This Week's Meals" = `menuMon = _grocWeekMonday(_grocWkOff)` — meals you're eating this week, driven by recipes picked LAST week. BOTTOM = recipe picker + shopping list for NEXT week = `planMon = _grocWeekMonday(_grocWkOff+1)`. `grocery_list.week_of` stored as `planMon` (the week meals are FOR, not the shopping week). Top strip unplaced column uses same `actual > 0` check as weekly cal meal row.
- **Cart icon**: SVG (not emoji). No hover color change, no focus outline. Delete button hidden on HEB task rows (`.ti:has(.heb-cnt) .delbtn{display:none}`).
- **People toggle**: per-week, stored in `localStorage` as `_grocPeople_<weekMon>`, default 2. Controls meal slot calculation: `Math.ceil(servings / people)`.
- **Keyboard**: `s` closes, `t` jumps to current week, left/right arrows navigate weeks. All refocus modal after nav.
- **Recipe list**: shows servings badge (`X srv`). Checking adds `ceil(servings/people)` meal entries to empty days.
- **Shopping list**: combines recipe ingredients, HEB overview items, and weekly staples. Sorted: undone first, then by aisle (`_inferAisle`). Items show quantity before name (e.g. "1/2 onion"). No checkmarks on recipe/staple items.
- **Shopping list checkboxes**: only on HEB-tagged overview items (`_shopId`). Uses `togShop()` — syncs with overview shopping list. Done items sort to bottom with strikethrough.
- **Add item**: creates `shopping_list` entry with `store='HEB'` (not `grocery_list`). Appears on overview shopping tab immediately.
- Staples: skip-this-week via `st._grocStapleSkips[weekMon]` or remove permanently.

### Quick Links (overview, `index.html`)
- Grid order: Videos → Finance → Pups → Birthdays → Recipes.
- Icons: outline SVGs with `opacity:.45` via `.ql-icon`. Pups uses actual dog headshots (Sunny left, Mochi right) at full opacity (`:has(img)` override). Text color: `var(--muted)`.
- Quick Notes button (`#qnBtn`): 34×34px circle, pencil outline SVG, layered glow shadow.

### Quick Notes (`features.js`)
- **Supabase table**: `quick_notes` — columns: `id` (int8), `note_text`, `is_visible` (bool), `created_at`, `hidden_at`, `sort_order` (int4).
- **Fetch**: `GET ?is_visible=is.true&order=sort_order.asc.nullslast,created_at.asc`. Only marks `_qnLoaded=true` on success (retries on failure).
- **Add**: POST with `note_text` + `sort_order` (max+1). Enter saves; Enter on empty input closes panel. Auto-capitalize first letter via `oninput`. On POST success, `renderQN()` re-renders to swap temp `qn-` ID with real server ID. Red toast on POST failure.
- **Delete**: PATCH `{is_visible:false, hidden_at:now}` — soft delete. Delete/Backspace key archives selected notes.
- **Edit**: double-click makes text contentEditable. `e.stopPropagation()` on keydown for cursor nav. Enter commits, Escape reverts. PATCH `note_text` to Supabase. `saved` guard prevents double-fire on blur. Red toast on PATCH failure; yellow toast if note still has temp `qn-` ID.
- **Close/blur**: all close paths (toggle, Enter-on-empty, Escape, click-outside) blur `qnInput` so global keyboard shortcuts (R=reload etc.) work.
- **Selection**: click=select, Cmd+click=toggle, Shift+click=range, Cmd+A=all. `_qnSel` Set + `_qnLastSel`. Clicking a note blurs input so Delete key works. `.qn-selected` class for highlight.
- **Copy**: Cmd+C copies selected note texts joined by newlines.
- **Drag reorder**: mousedown anywhere on note (except delete btn / contentEditable). White divider line (`.qn-drop-line`) shows drop position. Updates `sort_order` for all notes on drop. PATCH each to Supabase.
- **Undo**: all actions (add, edit, delete, reorder, restore) push to undo stack via `pushUndo`.
- **Archive/History**: archive button (SVG box icon) in header toggles `_qnHistOpen`. Fetches `?is_visible=is.false&order=hidden_at.desc.nullslast&limit=50`. Click item or "+ Add" button to restore (PATCH `is_visible:true, hidden_at:null`). Restore has undo.
- **Enter to close**: global keydown closes panel on Enter when input is empty AND input not focused. When input focused: Enter+text=save, Enter+empty=close.
- **Arrow keys**: `_qnOpen` flag suppresses day-shift arrow keys on overview.
- **UI**: no binding/coils, no grid lines, no add button. Header: 13px bold `var(--muted)` title. Notes: `var(--muted)` text color. Placeholder: "Future you will thank you for writing this down…"
