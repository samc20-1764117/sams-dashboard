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

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same tick as `.focus()`.
- **Outside-click close**: stable handler ref, remove+re-register on every `renderPage()`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay owns handlers. Enter saves everywhere except focused TEXTAREA. **Cmd+Enter** saves everywhere including textareas.
- **Modal outside-click drag fix**: `_modMousedownInside` flag prevents `closeMod` if mousedown was inside `.modal`.
- **`#tNotes` textarea**: auto-expands, capped at `max-height:160px`. Reset on add open; pre-expanded on edit open. Newlines rendered via `.replace(/\n/g,'<br>')`.
- **Cmd+Z in modals**: `_isInput && !_ael.closest('.overlay:not(.open)')` → return early.
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=sync. Skip if INPUT/TEXTAREA/contentEditable or meta held.
- **Text selection**: `user-select:none` on `html,body`. `Ctrl/Cmd+A` blocked globally (allowed in INPUT/TEXTAREA).
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; task ID→POST `tasks`.

## Indicator Placement
All indicators at far right, swap to X on hover. From right: `tb-arrow` (rightmost) → `cat-dot`. `chip-del` inside relative chip. `wr-cad-badge` hidden on row hover to reveal X. `cpill` pointer-events:none.
- **Overdue rows**: no `cat-dot`. Show single DOW letter (`S/M/T/W/T/F/S`) in `.dlbl.ov` instead of full date. `.dlbl.ov` has `margin-right:-4px`.

## Chip & UI Notes
- **Hover-X**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself → `delBlock` only.
- **Chip checkboxes**: Done: `opacity:.5` + `text-decoration:line-through`.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + not `'__skip__'`. WR rules: `wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true,_isWrec:true,_type:'shop'`. Source: `_ruleId,_recId,_shopId`. WR rules use `_wkKey`.
- **Weekly Goals chips + IMP override**: when `t.important && !t.done`, use IMP yellow — no `!important` CSS on color/border so inline JS wins.
- **WR tasks in timeblock**: render blue (`weekly_reset`). `drawTBBlock` looks up `linkedRule` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **`@time` in task name**: `submitQA` auto-detects `@1:30pm` style, creates timeblock immediately with local task ID, updates `taskId` after server confirm. Name kept as-is. If no due date, defaults to today. `autoDur`: Social=180min, Work/My work/Recurring=60min, Home=30min. Same durations apply when dragging tasks onto timeblock grid.
- **Weekly Reset card header** (`#wrRecWkLbl`): "Weekly Reset" when `wrRecOff===0`, else date range.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously; `paddingTop` set before paint.
