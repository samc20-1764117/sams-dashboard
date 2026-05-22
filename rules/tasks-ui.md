# Tasks & UI Rules

## Overdue Logic
- **Tasks**: `due_date < today && !done && category !== 'Weekly Goals'`. Weekly Goals never overdue.
- **Shopping**: `due_date < today && !done`.
- **Non-WR recurring**: `getRecurringWeekTasks(w)` for w=0 to wkOff-4. Cascading `__skip__` check. Seen set prevents duplicates.
- **WR recurring** (`is_weekly_reset=true`): overdue if `_dateOverrides[wkKey] < today && !_doneByWk[wkKey]`. 4-week lookback. `wrRecHandled` set — only added when `_dateOverrides[wkKey] <= today` (future dates don't block older-week lookback).
- **WR rules** (`st.wrRules`): overdue if `_dateOverrides[wkKey] < today && !isDoneWRRule`. Same 4-week lookback + `wrRuleHandled` set with same future-date exception.
- **Pup sessions**: `day_date < today && !done`. Included in `updateOvBanner` count and `rolloverOverdue` (moves `day_date` to today, PATCHes `pup_skill_sessions`). Appear in today list when `dayOff===0`.
- Tasks/shopping/non-WR recurring only overdue if assigned to a date.
- `updateOvBanner()` called from `renderToday()`.

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
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=sync all, `o`=overview, `v`=videos, `i`=help overlay, `m`=month view (overview). `⌘←/→`=switch pages (overview→videos→pups→recipes→finance→birthdays). Skip if INPUT/TEXTAREA/contentEditable or meta held.
- **Overview shortcuts**: `←/→`=shift day, `w+←/→`=shift week (hold `w` then press arrow; works even with video panel open). `t`=jump to today. `_wKeyHeld` flag tracked via keydown/keyup/blur.
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
All indicators at far right, swap to X on hover. `cat-dot` stroke changes to accent color (stroke-width 1.5, opacity 0.7) for tasks not on timeblock. `chip-del` inside relative chip. `wr-cad-badge` hidden on row hover to reveal X. `cpill` pointer-events:none. `heb-cnt` icon only (no count) on today-list HEB tasks — opens grocery modal on click.
- **Overdue rows**: no `cat-dot`. Show single DOW letter (`S/M/T/W/T/F/S`) in `.dlbl.ov` instead of full date. `.dlbl.ov` has `margin-right:-4px`.

## Chip & UI Notes
- **Hover-X**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself → `delBlock` only.
- **Chip checkboxes**: Done: `opacity:.5` + `text-decoration:line-through`. All done checkboxes/bones use grey `rgba(200,195,210,.35)` (not green). Green preserved in comment for reference: `/* #a3c41a */`.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + not `'__skip__'`. WR rules: `wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true,_isWrec:true,_type:'shop'`. Source: `_ruleId,_recId,_shopId`. WR rules use `_wkKey`.
- **Weekly Goals chips + IMP override**: when `t.important && !t.done`, use IMP yellow — no `!important` CSS on color/border so inline JS wins.
- **WR tasks in timeblock**: render blue (`weekly_reset`). `drawTBBlock` looks up `linkedRule` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **`@time` in task name**: `submitQA` auto-detects `@1:30pm` style, creates timeblock immediately with local task ID, updates `taskId` after server confirm. Name kept as-is. If no due date, defaults to today. `autoDur`: Social=180min, Work/My work/Recurring=60min, Home=30min. Same durations apply when dragging tasks onto timeblock grid. **Priority**: manually-set timeblock position (via drag) takes precedence over `@time` in name — editing a task (e.g. adding notes) never reverts a manually-placed block. `@time` only creates a NEW block if none exists.
- **Task move to new day (weekly cal drop or Arrow Left/Right)**: if task had a timeblock on old day, auto-creates block on new day at same time/duration. If no old block but `@time` in name, creates block from parsed time. Undo removes new block and restores old. Arrow keys move all selected tasks ±1 day relative to each task's own date (works for regular, rec, wrec, wrrule, shop).
- **Multi-select mixed-type drag**: dragging any selected item (task, wrec, wrrule) moves ALL selected items together. Each drag handler (task, `wrec::`, `wrrule::`) iterates `selectedTasks` and moves items of all types. Full undo for all moved items via `_mixedUndos`/`_wrecUndos`/`_wrUndos` arrays.
- **Overdue weekly reset display**: overdue wrec/wrrule tasks in today list show day-of-week letter (`dlbl ov`) and use red `OV` style, same as regular overdue tasks.
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
