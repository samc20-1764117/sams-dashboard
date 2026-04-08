# Core Rules

## Architecture
All files share global scope — no modules/bundler.
- `core.js`: state (`cfg`,`st`,`dayOff`,`wkOff`), auth, supabase helpers (`sbReq`,`sbReqSilent`,`sbReqNullable`), `syncAll`, date utils (`getWkKey`,`getWkBounds`,`getDayDate`,`d2s`,`dsToWkKey`), `getRecurringWeekTasks`, `isWRRuleDueThisWeek`, undo/redo (`pushUndo`,`doUndo`,`doRedo`,`_stateSnap`,`_stateRestore`,`_syncRedoDiff`,`showToast`)
- `overview.js`: `renderAll`,`renderOv`,`renderToday`,`renderWkSummary`,`renderWkCal`,`renderRecOv`,`renderRecMoCal`,`renderShopOv`,`renderUnassigned`,`renderKanban`,`renderDayTB`,`tRow`, drag-and-drop, WR rule CRUD, scope picker, `writeWrOverride`, `unSkipWrRule`,`unSkipWRec`,`openWrSkipped`
- `features.js`: task CRUD, secondary pages, `showPage`,`closeMod`,`init()`,`selTask`,`clearSelection`,`showCtx`,`mkMCell`,`renderMoCal`, quick notes, `getOvRecurring`,`rolloverOverdue`,`updateOvBanner`,`skipWRec`
- `pup-skills.js`: all pup skills logic

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + ctx menus + regular monthly cal → `features.js`. Utils/Supabase/auth/undo → `core.js`.

## Auth
Supabase Auth (email+password), RLS on all tables. `init()`→`checkAuth()`→no session→`#loginOverlay`. `doLogin()`→`signInWithPassword`→`_authToken`→`syncAll()`. All `sbReq*` use `_getAuthToken()` JWT + anon `apikey`. Token auto-refreshes hourly; refresh lasts 1 week. `syncAll` calls `_sbClient.auth.getSession()` at the top to refresh `_authToken` before every sync — prevents 401 JWT-expired errors on long sessions.
- **Init flash prevention**: `#main` starts `opacity:0` in HTML; `renderAll()` sets it to `1` on first call. `history.scrollRestoration='manual'` set in `init()`.
- **Init render timing**: initial `renderAll()` (from localStorage) is deferred via `document.fonts.ready.then(()=>requestAnimationFrame(renderAll))` — ensures DM Sans is loaded before first paint so font-metric-dependent layouts (WR column maxHeight, CSS columns) are stable on hard refresh. On normal refresh fonts resolve instantly; on hard refresh waits for download.
- **Init sidebar transition**: `#main` left transition is suppressed during `init()` (`style.transition='none'`, force reflow, restore in rAF) so the sidebar position snaps instantly — prevents shopping list squish caused by the 0→186px left animation being visible after opacity:1.
- **Overdue banner**: `_firstSyncDone` is set `true` before the initial `renderAll()` from localStorage, so banner shows instantly on load without waiting for sync.

## Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400.
- `tasks` POST required: `name,category,due_date,done,important`. Optional: `notes`.
- `wr_recurring_rules` POST required: `name,cadence,is_weekly_reset,is_enabled`. Non-WR adds `is_weekly_reset:false`. Optional: `appears_on_date,starting_date,pup_related,notes`.
- `time_blocks` fields used: `id,title,day_date,start_time,start_minutes,duration_minutes,category,task_id,rec_id,shop_id,done`. `rule_id` migration is pending — `sbSaveBlock` omits it, `syncAll` maps `ruleId:null`. **Workaround**: WR rule blocks set both `ruleId` and `recId` to `String(r.id)` so the rule ID persists via `rec_id`. All TB lookups (visibility, color, sort, arrow, skip/unschedule) check `b.recId` as fallback when `b.ruleId` is null.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-`.
- `sbReq` shows Supabase `message` field in toast 8s.
- `toggleTask`/`togRec`/`togShop`: call `sbUpdateBlock(b.id,{done})` for linked TB blocks.
- `drawTBBlock` derives `b._done` from linked item at render time. `linkedRec` lookup checks both `st.recurring` and `st.wrRules` (fallback for WR rule blocks stored via `recId`). `recCat` is `'weekly_reset'` unless `is_weekly_reset===false`.
- **Timeblock inline edit** (`startTBInlineEdit`): double-click creates block with empty title. `window._tbEditing=true` set on start, cleared immediately in `commit()` and on Escape — so `renderDayTB()` skips re-render only while actively typing (not after Enter/blur). After DB save returns real task ID, calls `renderAll()` so list DOM reflects real ID (enables immediate deletion from other views).
- **`syncAll` blocks**: preserves local-only blocks (not yet in DB) during sync via `localOnly` filter, so inline-edit blocks survive 30s sync interval.
- **`renderDayTB`**: skips if `window._tbEditing` is true.
- **`delTask`**: removes linked TB blocks by `taskId` match AND title match (for blocks not yet assigned a real `taskId`). Calls `sbDeleteBlock` for each.
- `rolloverOverdue()`: stores `prevDate` per WR rule/rec before rollover. Undo restores original overdue date (not delete). Undo also patches `wr_recurring_rules` DB. Stores `localOverrides[sid]={due_date:today}` + `pendingLocal.add(sid)` before async PATCH.
- `localStorage` `save()`/`load()` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides.
- `syncAll` recurring fetch: `wr_recurring_rules` single source. `is_weekly_reset!==false`→`st.wrRules`; `is_weekly_reset===false`→`st.recurring`.
- `recQs(id)`: returns `?id=eq.${id}`.
- `renderAll()` does NOT call `renderDayTB()`. Ops changing TB state must also call `if(document.getElementById('tbGrid'))renderDayTB()` — including undo closures.

## Undo / Redo
- `pushUndo(fn,msg)`: snapshots state BEFORE action via `_stateSnap()`, pushes `{fn,snapBeforeUndo}`. Toast shows 4s.
- `doUndo()`: pops entry, captures current snap for redo, calls `entry.fn()`.
- `doRedo()`: restores snap via `_stateRestore(snap)`, diffs + patches DB via `_syncRedoDiff(before,after)`.
- **`_stateSnap`** captures: `tasks,recurring,shopping,travel,birthdays,blocks,wrRules,wrOverrides`.
- **`_stateRestore`** restores all above fields, calls `renderAll()`,`renderDayTB()`,`renderWkCal()`,`renderRecOv()`,`renderWeeklyPage()`.
- **`_syncRedoDiff`** diffs: tasks (PATCH/POST/DELETE), recurring `_dateOverrides` (PATCH), wrRules `_dateOverrides` (PATCH), wrOverrides (POST/PATCH/DELETE), shopping `due_date`, travel dates, blocks (save/delete).
