# Tasks & UI Rules

## Overdue Logic
- **Tasks**: `due_date < today && !done`.
- **Shopping**: `due_date < today && !done`.
- **Non-WR recurring**: `getRecurringWeekTasks(w)` for w=0 to wkOff-4. Cascading `__skip__` check across weeks. Seen set prevents duplicates.
- **WR recurring** (`is_weekly_reset=true` in `st.recurring`): overdue if `_dateOverrides[wkKey] < today && !_doneByWk[wkKey]`. Looks back 4 weeks. Uses `wrRecHandled` set — only added when `_dateOverrides[wkKey] <= today` (future dates do NOT block older-week lookback).
- **WR rules** (`st.wrRules`): overdue if `_dateOverrides[wkKey] < today && !isDoneWRRule`. Same 4-week lookback + `wrRuleHandled` set with same future-date exception.
- Tasks/shopping/non-WR recurring only count as overdue if assigned to a date (has `due_date` / `_dateOverrides`).
- `updateOvBanner()` called from `renderToday()`.

## Task Modals
- **`#tModal`**: add (`openTModal(cat='')`) + edit (`openEditTask(id)`). Fields: name,category,due date,important,notes. Save: `saveTModal()`.
- **`#qaPopup`** (`openQA(ctx,btn,ds,kcat)`): name,category,due date,important,notes. Cat defaults `kcat` in kanban, else `'Home'`.
- **Category dropdown** (`.cat-sel-wrap`): `catSelHTML(id,def)`, `setCatSel(id,v)`, `pickCat(id,v)`, `toggleCatDrop(id)`.

## Interaction Patterns
- **Focus**: cursor at end on every input open. `setSelectionRange(len,len)` in same `setTimeout`/`rAF` as `.focus()`.
- **Outside-click close**: stable handler ref, remove+re-register on every `renderPage()`. Add via `setTimeout(0)`.
- **Modal Enter/Escape**: overlay `div` owns handlers. Inputs must NOT have save handlers.
- **Cmd+Z in modals**: check `_isInput && !_ael.closest('.overlay:not(.open)')` → return early.
- **Global shortcuts**: `n`=new task, `r`=reload, `s`=sync. Skip if INPUT/TEXTAREA/contentEditable or meta held.
- **Text selection disabled**: `user-select:none` on `html,body`. `Ctrl/Cmd+A` blocked globally (allowed inside INPUT/TEXTAREA).
- **Global Cmd+C/V**: copies `selectedTasks`. Paste: `wrrule-{id}`→POST `wr_recurring_rules`; task ID→POST `tasks`.
- **Hover-X delete on chips**: `.chip-del` last flex child. X removes from ALL views + linked blocks. Exception: X on TB block itself→`delBlock` only.
- **Chip checkboxes**: 8×8px. Done: `opacity:.5` + `text-decoration:line-through`.
- **Chip indicator dot**: Regular recurring: when `_dateOverrides[wkKey]` exists + `!=='__skip__'`. WR rules: when `st.wrOverrides` has `override_type:'edit'` with `custom_name` or `custom_notes`. WR tasks: NO dot in weekly cal chips or WR panel.
- **WR tasks in timeblock**: render blue (same as `weekly_reset`/Home color). `drawTBBlock` looks up `linkedRule` from `st.wrRules` via `b.ruleId`; `effectiveCat='weekly_reset'` if matched.
- **Cadence badge**: `{biweekly:'B',monthly:'M',quarterly:'Q',biannual:'BA',annual:'A'}`.
- **Virtual task objects**: `_isWrRule:true`, `_isWrec:true`, `_type:'shop'`. Source: `_ruleId`, `_recId`, `_shopId`. WR rules use `_wkKey`.

## UI Notes
- Top-right controls (`top:14px;right:20px;z-index:90`): sync, refresh, settings — `20×20px` circles. `toggleDark()`→`body.dark`.
- **Sync button** (`#syncBar`): `setBadge(t,x)` sets `data-tip`. Tooltip via CSS `::after{content:attr(data-tip)}`.
- **Weekly Reset card header** (`#wrRecWkLbl`): "Weekly Reset" when `wrRecOff===0`, else date range. `+` button: `position:absolute;bottom:8px;right:8px`. `↩ N` skipped button: `position:absolute;bottom:8px;left:8px`.
- **Weekly cal bounce fix**: banner lane counts pre-computed synchronously; `paddingTop` set before paint.
- `.mcell` must include `min-width:0`.
