# Tasks & UI Rules

## Overdue Logic
- **Tasks**: `due_date < today && !done && category !== 'Weekly Goals'`. Weekly Goals never overdue.
- **Shopping**: `due_date < today && !done`.
- **Non-WR recurring**: `getRecurringWeekTasks(w)` for w=0 to wkOff-4. Cascading `__skip__` check. Seen set prevents duplicates.
- **WR recurring** (`is_weekly_reset=true` in `st.recurring`): overdue if `_dateOverrides[wkKey] < today && !_doneByWk[wkKey]`. 4-week lookback. `wrRecHandled` set — only added when `_dateOverrides[wkKey] <= today` (future dates don't block older-week lookback).
- **WR rules** (`st.wrRules`): overdue if `_dateOverrides[wkKey] < today && !isDoneWRRule`. Same 4-week lookback + `wrRuleHandled` set with same future-date exception.
- Tasks/shopping/non-WR recurring only overdue if assigned to a date.
- `updateOvBanner()` called from `renderToday()`.

## Task Modals
- **`#tModal`**: add (`openTModal(cat='')`) + edit (`openEditTask(id)`). Fields: name,category,due date,important,notes. Save: `saveTModal()`.
- **`#qaPopup`** (`openQA(ctx,btn,ds,kcat)`): name,category,due date,important,notes. Cat defaults `kcat` when `ctx==='kanban'` OR `ctx==='wkc'` and `kcat` provided, else `'Home'`.
- **Category dropdown** (`.cat-sel-wrap`): `catSelHTML(id,def)`, `setCatSel(id,v)`, `pickCat(id,v)`, `toggleCatDrop(id)`.
- **Category options**: all views show Home/My work/Work/Social/Weekly Goals. **Long term excluded** from all dropdowns (`#tCatDrop`,`#bCat`,`#qaPopup`,`_CAT_OPT_LIST`) except kanban columns (`KCATS`). `#tCatDrop` and `#bCat` are hardcoded HTML in index.html.

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`.
- **Outside-click close**: stable handler ref, remove+re-register on every `renderPage()`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay `div` owns handlers. Enter saves everywhere except focused TEXTAREA (guard: `event.target.tagName!=='TEXTAREA'`). **Cmd+Enter** saves everywhere including textareas.
- **Modal outside-click drag fix**: `_modMousedownInside` flag on `mousedown` inside `.modal`; `closeMod` skips if set.
- **`#tNotes` textarea**: auto-expands (`oninput` sets `height=scrollHeight`), capped at `max-height:160px`. Reset on add open; pre-expanded to fit on edit open. Newlines in `.tb-notes` rendered via `.replace(/\n/g,'<br>')`.
- **Timeblock notes**: `opacity:.5`, left-aligned. Hover expands block to show full content (`tb-expanded`, `z-index:25`); collapses on mouseleave.
- **Timeblock title wrap**: titles ≥30 min get `.tb-bt.wrap`. Time range + ✕ in `.tb-right` — time visible, ✕ overlays on hover.
- **Timeblock text nudge**: `.tb-bt{margin-top:0.185px}`.
- **Cmd+Z in modals**: check `_isInput && !_ael.closest('.overlay:not(.open)')` → return early.
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=sync. Skip if INPUT/TEXTAREA/contentEditable or meta held.
- **Text selection disabled**: `user-select:none` on `html,body`. `Ctrl/Cmd+A` blocked globally (allowed in INPUT/TEXTAREA).
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; task ID→POST `tasks`.

## Indicator Placement (all views)
All indicators sit at far right overlapping X position; swap to X on hover:
- **cat-dot** (Today List): `position:absolute;right:3px;top:50%;transform:translateY(-50%);transition:opacity .1s`. Hidden on `.ti:hover` and `.ti.sel-row`.
- **chip-del** (weekly cal chips): `position:absolute;right:2px;top:50%;transform:translateY(-50%)` inside `position:relative` chip. Parent `.wkc-col .chip,.wkc-goals-col .chip` must have `position:relative`.
- **wr-cad-badge**: `position:absolute;right:3px;top:50%;transform:translateY(-50%)`. Hidden on row hover to reveal X.
- **cpill** (Shopping List): `position:absolute;right:3px;top:50%;transform:translateY(-50%);pointer-events:none`. Hidden on `.ti:hover` and `.ti.sel-row`.

## Chip & UI Notes
- **Hover-X delete on chips**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself→`delBlock` only.
- **Chip checkboxes**: 8×8px. Done: `opacity:.5` + `text-decoration:line-through`.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + `!=='__skip__'`. WR rules: when `st.wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot in weekly cal chips or WR panel.
- **WR tasks in timeblock**: render blue (`weekly_reset`/Home color). `drawTBBlock` looks up `linkedRule` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true,_isWrec:true,_type:'shop'`. Source: `_ruleId,_recId,_shopId`. WR rules use `_wkKey`.
- **Weekly Goals chips**: `background:rgba(255,255,255,.82);color:rgba(80,80,95,.75);border-color:rgba(255,255,255,.9)`. Liquid glass: `backdrop-filter:blur(8px);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)`. **Important flag overrides**: when `t.important && !t.done`, use `IMP` yellow styling (`{bg:'#fef9c3',t:'#854d0e',...}`) in ALL views/chips — no `!important` CSS overrides on color/border so inline JS wins.

## UI Notes
- Top-right controls (`top:14px;right:20px;z-index:90`): sync, refresh, settings — `20×20px` circles. `toggleDark()`→`body.dark`.
- **Sync button** (`#syncBar`): `setBadge(t,x)` sets `data-tip`. Tooltip via CSS `::after{content:attr(data-tip)}`.
- **Weekly Reset card header** (`#wrRecWkLbl`): "Weekly Reset" when `wrRecOff===0`, else date range. `+` button: `position:absolute;bottom:8px;right:8px`. `↩ N` button: `position:absolute;bottom:8px;left:8px`.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously; `paddingTop` set before paint.
- `.mcell` must include `min-width:0`.
