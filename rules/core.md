# Core Rules

## Architecture
Global scope — no modules/bundler.
- `core.js`: state (`cfg,st,dayOff,wkOff`), auth, supabase helpers (`sbReq,sbReqSilent,sbReqNullable`), `syncAll`, date utils (`getWkKey,getWkBounds,getDayDate,d2s,dsToWkKey`), `getRecurringWeekTasks,isWRRuleDueThisWeek`, undo/redo (`pushUndo,doUndo,doRedo,_stateSnap,_stateRestore,_syncRedoDiff,showToast`)
- `overview.js`: `renderAll,renderOv,renderToday,renderWkSummary,renderWkCal,renderRecOv,renderRecMoCal,renderShopOv,renderUnassigned,renderKanban,renderDayTB,tRow`, drag-drop, WR rule CRUD, scope picker, `writeWrOverride,unSkipWrRule,unSkipWRec,openWrSkipped`
- `features.js`: task CRUD, secondary pages, `showPage,closeMod,init(),selTask,clearSelection,showCtx,mkMCell,renderMoCal`, quick notes, `getOvRecurring,rolloverOverdue,updateOvBanner,skipWRec`
- `pup-skills.js`: all pup skills logic

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + ctx menus + regular monthly cal → `features.js`. Utils/Supabase/auth/undo → `core.js`.

## Auth
Supabase Auth (email+password), RLS on all tables. `init()`→`checkAuth()`→no session→`#loginOverlay`. `doLogin()`→`signInWithPassword`→`_authToken`→`syncAll()`. All `sbReq*` use `_getAuthToken()` JWT + anon `apikey`. Token auto-refreshes hourly; refresh lasts 1 week. `syncAll` calls `_sbClient.auth.getSession()` first to refresh token — prevents 401 on long sessions.
- `#main` starts `opacity:0`; `renderAll()` sets to `1` on first call.
- Initial `renderAll()` deferred via `document.fonts.ready.then(()=>requestAnimationFrame(renderAll))` — font-loaded before first paint so WR column maxHeight/CSS columns stable on hard refresh.
- `#main` left transition suppressed during `init()` (prevents shopping list squish from 0→186px animation).
- `_firstSyncDone=true` before initial `renderAll()` from localStorage so overdue banner shows instantly.

## Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400.
- `tasks` POST required: `name,category,due_date,done,important`. Optional: `notes`.
- `wr_recurring_rules` POST required: `name,cadence,is_weekly_reset,is_enabled`. Non-WR adds `is_weekly_reset:false`. Optional: `appears_on_date,starting_date,pup_related,notes`.
- `time_blocks` fields: `id,title,day_date,start_time,start_minutes,duration_minutes,category,task_id,rec_id,shop_id,done`. `rule_id` migration pending — `sbSaveBlock` omits it, `syncAll` maps `ruleId:null`. **Workaround**: WR rule blocks set both `ruleId` and `recId` to `String(r.id)` so rule ID persists via `rec_id`. All TB lookups check `b.recId` as fallback when `b.ruleId` is null.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-`.
- **Categories** (`CATS`): `home,my work,work,social,long term,recurring,weekly_reset,buy,travel,birthday,shopping,weekly goals`. `weekly goals` display: `{bg:'#ffffff',t:'rgba(80,80,95,.85)',d:'rgba(200,200,215,.8)',dot:'#e8e8f0',b:'rgba(200,200,215,.4)'}`.
- **Category pickers**: `KCATS` (kanban columns): `['Home','My work','Work','Social+Travel','Long term','Weekly Goals']` — Long term kept here only. `_CAT_OPT_LIST` (quick-add + dynamic dropdowns): all except Long term, includes Weekly Goals. `#tCatDrop` (task modal) + `#bCat` (timeblock modal) in index.html: hardcoded, Weekly Goals present, Long term removed.
- `sbReq` shows Supabase `message` in toast 8s.
- `toggleTask/togRec/togShop`: call `sbUpdateBlock(b.id,{done})` for linked TB blocks.
- `drawTBBlock` derives `b._done` from linked item at render time. `linkedRec` checks both `st.recurring` and `st.wrRules`. `recCat='weekly_reset'` unless `is_weekly_reset===false`.
- **Timeblock inline edit** (`startTBInlineEdit`): dblclick creates block with empty title. `window._tbEditing=true` set on start, cleared in `commit()` and Escape. After DB save returns real ID, calls `renderAll()`.
- `syncAll` preserves local-only blocks (not in DB) during sync via `localOnly` filter.
- `renderDayTB` skips if `window._tbEditing===true`.
- `delTask`: removes linked TB blocks by `taskId` AND title match. Calls `sbDeleteBlock` for each.
- `rolloverOverdue()`: stores `prevDate` per WR rule/rec before rollover. Undo restores original date + patches `wr_recurring_rules` DB.
- `localStorage` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides.
- `syncAll` recurring: `wr_recurring_rules` single source. `is_weekly_reset!==false`→`st.wrRules`; `is_weekly_reset===false`→`st.recurring`.
- `recQs(id)`: returns `?id=eq.${id}`.
- `renderAll()` does NOT call `renderDayTB()`. Ops changing TB state must also call `if(document.getElementById('tbGrid'))renderDayTB()` — including undo closures.

## Undo / Redo
- `pushUndo(fn,msg)`: snapshots state BEFORE action, pushes `{fn,snapBeforeUndo}`. Toast 4s.
- `doUndo()`: pops entry, captures snap for redo, calls `entry.fn()`.
- `doRedo()`: restores snap via `_stateRestore`, diffs + patches DB via `_syncRedoDiff`.
- `_stateSnap` captures: `tasks,recurring,shopping,travel,birthdays,blocks,wrRules,wrOverrides,autoTBOverrides`.
- `_stateRestore` restores all above, calls `renderAll(),renderDayTB(),renderWkCal(),renderRecOv(),renderWeeklyPage()`.
- `_syncRedoDiff` diffs: tasks (PATCH/POST/DELETE), recurring `_dateOverrides` (PATCH), wrRules `_dateOverrides` (PATCH), wrOverrides (POST/PATCH/DELETE), shopping `due_date`, travel dates, blocks (save/delete), autoTBOverrides (POST/PATCH/DELETE).
