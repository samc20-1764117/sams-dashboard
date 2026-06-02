# Tasks & UI Rules

## Task Types on Overview

All task types that appear on the overview calendar/today list. Every type must support: render, select (`selTask`), drag, drop onto calendar day, multi-select drag with mixed types, timeblock drop, checkbox toggle, delete (X), undo.

| Type | Selection ID | Drag ID | Source |
|------|-------------|---------|--------|
| Regular task | `String(t.id)` | `String(t.id)` | `st.tasks` |
| WR rule | `wrrule-{id}` / `wrrule-virt-{id}` | `wrrule::{id}` | `st.wrRules` |
| WR recurring (legacy) | `wrec-{id}` | `wrec::{id}` | `st.recurring` (is_weekly_reset=true) |
| Non-WR recurring | `rec-virt-{id}` | `rec::{id}::{date}` | `st.recurring` (is_weekly_reset=false) |
| Shopping | `shop-cal-{id}` | `shop::{id}` | `st.shopping` |
| Video | `vid-ov-{vidId}` | `vid::{vidId}` | `_vidDayMap` (localStorage) |
| Pup session | `pup-sess-{sessId}` | `pupsess::{sessId}::{ds}` | `st.pupSessions` |
| Pup skill (drag-only) | n/a | `pupskill::{skillId}` | `st.pup_skills` |
| Finance cancellation | `fin-cancel-{subId}` | `fin-cancel::{subId}` | computed |
| Travel banner | `tv-{id}` | `travel::{id}::{offset}` | `st.travel` |
| Birthday | n/a | n/a | `st.birthdays` (banner only, not draggable) |
| Weekly goal | `String(t.id)` | `wkgoal::{id}` | `st.tasks` (category=Weekly Goals) |
| TB block | `blk-{id}` | block drag | `st.blocks` |
| Auto TB | `atb::{atbId}` | auto-block drag | `st.autoTimeblocks` |

### Multi-select global behavior
- **Cmd/Ctrl+click**: toggle item in selection.
- **Shift+click**: range-select within same container.
- **Drag any selected item**: moves ALL selected items to target day, regardless of type.
- `_moveOtherSelected(ds, excludeSid, undos, excludePrefixes?)` helper handles cross-type multi-select for all drag handlers.
- Every drag handler must: (1) move its own type, (2) call `_moveOtherSelected` or inline-iterate `selectedTasks` for other types, (3) collect undo fns for all moved items.

## Overdue Logic
- **Tasks**: `due_date < today && !done && category !== 'Weekly Goals'`. Weekly Goals excluded from today overdue count/banner but shown as overdue (OV style) in WO modal and weekly cal goals column when viewing past weeks (`isPast` / `_goalsPast`). Carried-over overdue goals also appear on current week in weekly cal goals column, WO modal, and monthly view.
- **Weekly Goals overdue carry-over**: uncompleted goals from past weeks (`due_date < wkStart`) shown with OV style on current week. Each view has a stacked banner: "X Overdue" text + red "Move to this week" button. Clicking moves all overdue goals' `due_date` to current `wkStart`. Undoable. Banner appears in: weekly cal goals column, WO modal (with light red bg), monthly view goals cell (compact).
- **Shopping**: `due_date < today && !done`.
- **Non-WR recurring**: `getRecurringWeekTasks(w)` for w=0 to wkOff-4. Cascading `__skip__` check. Seen set prevents duplicates.
- **WR recurring** (`is_weekly_reset=true`): overdue if `_dateOverrides[wkKey] < today && !_doneByWk[wkKey]`. 4-week lookback. `wrRecHandled` set — only added when `_dateOverrides[wkKey] <= today` (future dates don't block older-week lookback).
- **WR rules** (`st.wrRules`): overdue if `_dateOverrides[wkKey] < today && !isDoneWRRule`. Same 4-week lookback + `wrRuleHandled` set with same future-date exception.
- **Pup sessions**: `day_date < today && !done`. Included in `updateOvBanner` count and `rolloverOverdue` (moves `day_date` to today, PATCHes `pup_skill_sessions`). Appear in today list when `dayOff===0`. Sorted by timeblock position (`_pupSessId` matched against `b._pupSessId` in `tbSm()`).
- **Videos**: overdue if `_vidDayMap[id] < today && status !== 'published'`. Included in banner count and rollover (moves localStorage date to today). Appear in today list with red `OV` style + day letter.
- Tasks/shopping/non-WR recurring only overdue if assigned to a date.
- **Non-WR recurring dedup**: `allRecVirt` deduplicates by `_recId`. If current week has a future (not yet due) occurrence, overdue occurrences from past weeks are suppressed — the upcoming occurrence takes priority. This prevents showing both an overdue and an upcoming instance of the same recurring task.
- `updateOvBanner()` called from `renderToday()`. Banner text: `X Overdue` + `Move to today` button. No task name or question.

## Task Modals
- **`#tModal`**: add (`openTModal(cat='')`) + edit (`openEditTask(id)`). Save: `saveTModal()`.
- **`#qaPopup`** (`openQA(ctx,btn,ds,kcat)`): cat defaults `kcat` when `ctx==='kanban'` OR `ctx==='wkc'` and `kcat` provided, else `'Home'`.
- **Category dropdown** (`.cat-sel-wrap`): `catSelHTML(id,def)`, `setCatSel(id,v)`, `pickCat(id,v)`, `toggleCatDrop(id)`.
- **Long term excluded** from all dropdowns (`#tCatDrop`,`#bCat`,`#qaPopup`,`_CAT_OPT_LIST`) except kanban columns (`KCATS`). `#tCatDrop` and `#bCat` are hardcoded HTML in index.html.

## Timeblock Inline Edit (`startTBInlineEdit`)
- **↑/↓ arrows** cycle category while typing. Cycles through `['Home','My work','Work','Social']` only (not full KCATS).
- Block background/text/border updates live via `gc(cat)` as user cycles.
- Small uppercase label below the input shows current category name.
- **Enter** saves with selected category. New tasks created with `category: chosenCat` (not hardcoded `'Home'`).
- **Escape** cancels and removes the block.

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same tick as `.focus()`.
- **Outside-click close**: stable handler ref, remove+re-register on every `renderPage()`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay owns handlers. Enter saves everywhere except focused TEXTAREA. **Cmd+Enter** saves everywhere including textareas. All modal `onkeydown` handlers call `event.stopPropagation()` on both Enter and Escape to prevent the document handler from closing background modals (e.g. mModal).
- **Modal outside-click drag fix**: `_modMousedownInside` flag prevents `closeMod` if mousedown was inside `.modal`.
- **`#tNotes` textarea**: auto-expands, capped at `max-height:160px`. Reset on add open; pre-expanded on edit open. Newlines rendered via `.replace(/\n/g,'<br>')`.
- **Cmd+Z in modals**: `_isInput && !_ael.closest('.overlay:not(.open)')` → return early.
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=grocery modal (overview only), `o`=overview, `v`=videos (single press), `vv`=videos popup on overview (double-tap within 350ms), `p`=pups, `f`=finance, `l`=guide, `d`=dark mode, `i`=help overlay, `m`=month view (overview), `q`=quick notes (`toggleQN()`). `⌘←/→`=switch pages (overview→videos→pups→recipes→finance→birthdays). Skip if INPUT/TEXTAREA/SELECT/contentEditable focused or meta held. **All single-key shortcuts MUST check `[contenteditable="true"]:focus` (CSS selector) or `document.activeElement?.isContentEditable` (JS) — never fire while user is typing.**
- **Overview shortcuts**: `←/→`=shift day, `w+←/→`=shift week (hold `w` then press arrow; `_wKeyHeld` also skips if typing). `t`=jump to today. `_wKeyHeld` flag tracked via keydown/keyup/blur.
- **Page navigation closes overlays**: `showPage()` closes video calendar, all panel, analytics panel, and video popup before switching pages.
- **Keyboard shortcut pattern** (MUST follow every time):
  1. Same key toggles open/close (check if modal is already `.open` before opening).
  2. `Enter` also closes (when not in input/textarea/button).
  3. Add `e.stopPropagation()` on ALL modal keydown handlers — prevents global handler from catching the same key and reopening.
  4. Add `outline:none` to modal CSS to prevent browser focus ring.
  5. Both global handler AND modal's own `keydown` listener must handle the key.
  6. On modal `close` event: call `modal.blur();document.activeElement?.blur()` — focus must return to `<body>` so global shortcuts keep working. Without this, the closed dialog retains focus and its `stopPropagation` blocks all future keypresses from reaching the global handler.
- **Help overlay** (`i` key): shows all shortcuts for current page + global. Toggle with `i` again or `Enter`. Uses `#helpOverlay` (standard `.overlay`+`.modal`). Page-specific content via `_pages[activePg]` map in `_showHelpOverlay()`.
- **RULE: When adding ANY new keyboard shortcut**, you MUST also update `_showHelpOverlay()` in `core.js` to include it in the correct page's `_pages[pageName]` array (or `_global` if global). Audit existing entries to ensure nothing is missing or stale.
- **Month view toggle** (`m` key): opens `mModal` on overview, closes if already open. Enter/Esc also close.
- **Text selection**: `user-select:none` on `html,body`. `Ctrl/Cmd+A` blocked globally (allowed in INPUT/TEXTAREA).
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; task ID→POST `tasks`.

## Indicator Placement
All indicators at far right, swap to X on hover. `cat-dot` stroke changes to accent color (stroke-width 1.5, opacity 0.7) for tasks not on timeblock. `chip-del` inside relative chip. `wr-cad-badge` hidden on row hover to reveal X. `cpill` pointer-events:none.

### Recurring task inline badges
- **HEB badge** (`.heb-cnt`): shopping cart icon (9px SVG) before task name on all views (today list, weekly chips, week summary, timeblock, recOv). Opens grocery modal on click. Uses `_hebBadge(name)` helper.
- **Prep pup training badge** (`.pup-link-badge`): link icon (8px SVG) before task name on all views. Opens `_openPupFocusModal(null)` on click. Uses `_pupBadge(name)` helper. Match is case-insensitive.
- Both badges: `display:inline-flex;align-items:center;margin-right:3px;opacity:.55`. CSS tweaks per view: `.chip` top:-0.5px, `.tb-block` top:-1px, `.ti` top:1px.
- **Overdue rows**: no `cat-dot`. Show single DOW letter (`S/M/T/W/T/F/S`) in `.dlbl.ov` instead of full date. `.dlbl.ov` has `margin-right:-4px`.

## Chip & UI Notes
- **Hover-X**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself → `delBlock` only.
- **Chip checkboxes**: Done: `opacity:.5` + `text-decoration:line-through`. All done checkboxes/bones use grey `rgba(200,195,210,.35)` (not green). Green preserved in comment for reference: `/* #a3c41a */`.
- **Checkbox rendering**: All checkboxes (`.chk`, `.tb-chk`, `.wchk`) use `::after` pseudo-element with `border:none` + `box-shadow:inset 0 0 0 1.25px rgba(180,170,210,.42)` (not CSS `border`). Checked: `box-shadow:inset 0 0 0 1px rgba(200,195,210,.35)`. `.chk` and `.chk-wrap` require `transform:translateZ(0)` for GPU compositing — prevents oval distortion from CSS `columns:2` layout in `#recList`. Never remove these transforms.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + not `'__skip__'`. WR rules: `wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true,_isWrec:true,_type:'shop'`. Source: `_ruleId,_recId,_shopId`. WR rules use `_wkKey`.
- **Weekly Goals chips + IMP override**: when `t.important && !t.done`, use IMP yellow — no `!important` CSS on color/border so inline JS wins.
- **WR tasks in timeblock**: render blue (`weekly_reset`). `drawTBBlock` looks up `linkedRule` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **`@time` in task name**: `submitQA` auto-detects `@1:30pm` style, creates timeblock immediately with local task ID, updates `taskId` after server confirm. Name kept as-is. If no due date, defaults to today. `autoDur`: Social=180min, Work/My work/Recurring=60min, Home=30min. Same durations apply when dragging tasks onto timeblock grid. **Priority**: manually-set timeblock position (via drag) takes precedence over `@time` in name — editing a task (e.g. adding notes) never reverts a manually-placed block. `@time` only creates a NEW block if none exists.
- **`@time` smart AM/PM**: when no am/pm suffix, hours 1–8 default to PM (e.g. `@7:30` → 7:30 PM). Hours 9–11 stay AM. End time am/pm infers start (e.g. `@3:30-6pm` → both PM).
- **`@time` range**: supports `@start-end` format (e.g. `@3:30-6pm`, `@3-5pm`, `@10am-12pm`). Duration computed from range, overrides `autoDur`. Regex: `/@(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i`. All 3 parsers updated (submitQA, saveTModal, task-move-to-day).
- **Task move to new day (weekly cal drop or Arrow Left/Right)**: if task had a timeblock on old day, auto-creates block on new day at same time/duration. If no old block but `@time` in name, creates block from parsed time. Undo removes new block and restores old. Arrow keys move all selected tasks ±1 day relative to each task's own date (works for regular, rec, wrec, wrrule, shop).
- **Multi-select mixed-type drag**: dragging any selected item (task, wrec, wrrule) moves ALL selected items together. Each drag handler (task, `wrec::`, `wrrule::`) iterates `selectedTasks` and moves items of all types. Full undo for all moved items via `_mixedUndos`/`_wrecUndos`/`_wrUndos` arrays.
- **Overdue display**: all overdue tasks show red `OV` style + `ov-row` class + day-of-week letter (`dlbl ov`) positioned at `right:9px` (aligned with dot indicators). `.tb-arrow` and `.wr-unassigned` hidden on `ov-row`. `.tb-arrow` in todList at `right:3px` (right of dot, between dot and list edge). `.wr-unassigned` at `right:2px` (same position).
- **Weekly Reset card header** (`#wrRecWkLbl`): "Weekly Reset" when `wrRecOff===0`, else date range.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously; `paddingTop` set before paint.

### Timeblock selection & keyboard
- **TB empty-space drag direction**: drag **down** = create new block; drag **up** = rubber-band select blocks in range (regular, auto, rec-auto). Stores `_lastTBRbRange={selTop,selBot}` for 'A' key use. Edge rubber-band (`_attachTBEdgeRubberBand`) still works both directions from outside the col.
- **TB rubber-band X+Y filtering**: selection box tracks actual cursor X range (not full column width). Hit-tests use `getBoundingClientRect()` on each block element — only blocks whose actual rendered bounds overlap the selection rect are selected. Dragging straight up selects only the column under cursor; dragging sideways expands to adjacent overlapping blocks. Applies to both internal and edge rubber bands, for regular blocks, auto-blocks, and rec-auto blocks.
- **TB inline edit cancel**: clicking empty space in tb-col while editing blurs the input → `commit()` removes block if name is empty. `window._tbEditing` flag prevents new block creation during edit. Escape also cancels.
- **Auto-block move relayout**: after moving an auto-block, `renderDayTB()` is called so overlapping column layout updates instantly (blocks expand to full width when no longer overlapping).
- **Auto-select auto-blocks**: if rubber-band selects zero regular blocks, auto-blocks in range are auto-selected immediately. If regular blocks are also selected, press **A** to add auto-blocks in range. If no `_lastTBRbRange` or 0 auto-blocks match range, **A** selects ALL auto-blocks for the day.
- **Auto-block selection IDs**: `'atb::'+_atbId` in `selectedTasks`. Visual: `.atb-block.sel-atb` (light grey + glow). `applySelHighlight()` toggles `sel-atb` class.
- **Arrow keys (Up/Down)**: moves all selected TB blocks (regular + auto) ±30 min. Each press is one undo entry. Handler on `window` with `{capture:true}` + `e.preventDefault()`.
- **Cmd/Ctrl+Arrow (Up/Down)**: resizes selected TB blocks ±30 min (min 15 min). Same selection scope as move. Full undo support.
- **Arrow key undo**: uses `base_id+date` lookup in `st.autoTBOverrides` (NOT `atb._ovId` references) — stable across re-renders. If auto-block had no override before move (`hadOv=false`), undo DELETEs; otherwise PATCHes back.
- **Multi-auto-block drag**: when dragging an auto-block with other auto-blocks selected, `otherSelAtbs` collects them (by `data-atb-id` + `selectedTasks`). All move together. Persist via `base_id+date` lookup (PATCH if override exists, else POST). Undo via `_undoOtherAtbs()` included in both `pushUndo` paths.
- **Cmd/Ctrl+I**: toggles important flag. In tModal toggles `#tImp`, in QA popup toggles `#qaImp`, otherwise toggles all selected tasks (regular, recurring, WR rules, shopping). Each flips independently. Full undo.
- **Rubber-band on weekly cal** (`_attachWkcRubberBand`): column-aware X filtering — selBox snaps to column boundaries. Only activates when `dy>5 && dy>dx*2` (vertical drag). Left/right drag reserved for travel task creation.

## Video Tasks on Overview (Calendar Integration)

Video tasks assigned to days via `_vidDayMap` (localStorage) follow the SAME rules as all other task types:

- **Timeblock integration**: `_vidId` checked in `tbSm()`/`tbSmAny()` for sort order. Videos with timeblocks sort by start time above unassigned tasks.
- **`_hasTBToday`**: checks `b._vidId` match — controls `tb-arrow` visibility (arrow shown when NOT in timeblock).
- **Move to new day** (`_vidAssignToDay`): removes existing timeblock from old day (deletes block + calls `sbDeleteBlock`). Does NOT move it — time slot wouldn't apply to new day.
- **Drop on timeblock grid**: removes any existing block on other days before creating new one. Duplicate check prevents 2 blocks same day.
- **One block per video**: at most one `st.blocks` entry per `_vidId` at any time. All code paths enforce this.
- **Drag ID**: `'vid::'+vidId`. Used in weekly cal drop, today list drop, TB drop, edge drops.
- **Sort priority**: `taskTypePri` returns 5.5 for `_type==='vid'` (between Social and Recurring).
- **Overdue**: `_vidDayMap[id] < today` when `dayOff===0`. Shows OV style + day letter.
- **Completion**: checkbox calls `_vidCompleteFromOv` (popup to mark steps done or whole video).
- **Delete (✕)**: calls `_vidUnassignDay` — removes from `_vidDayMap` + deletes linked timeblock.
- **Video stage tasks (vidstep)**: `_vidStepDayMap` entries. Overdue vidsteps auto-move to today via `_vidStepTasksForDayWithOverdue()`. Weekly cal X button calls `_vidStepUnassign` (not the recurring skip/delete picker). Selection synced across views via `selVidStepIds` set — today list ID `vidstep-{vid}-{step}` cross-references TB block's `_vidStepVid`+`_vidStepName`. Green highlight color (`vidstep-` prefix in `csForId`). Dblclick in timeblock opens `openVidEdit(b._vidStepVid)`.
- **Vidstep DB persistence**: `_vidStepVid` stored in `vid_id` column, `_vidStepName` in `rec_id` column. On load, blocks with `vid_id` + `rec_id` starting with `step_` are recognized as vidstep blocks. `_vidStepReconstructBlocks()` is a fallback for legacy blocks (title matching). Must run before sort and before `_hasTBToday`.
- **Vidstep timeblock moves**: use `sbUpdateBlock(id, {day_date: ds})` — NOT `{ds}`. The DB column is `day_date`.
- **Vidstep sorting**: `sortTasksForDay` → `tbSm()` has explicit `_type==='vidstep'` check before the `_vidId` check (vidstep blocks use `_vidStepVid`, not `_vidId`).
- **Vidstep focus**: `_renderVidOvMenu` focus mode checks `_vidStepDayMap` entries in addition to `_vidDayMap` and `post_date`.
