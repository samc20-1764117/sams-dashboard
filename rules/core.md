# Core Rules

## Architecture
Global scope — no modules/bundler.
- `core.js`: state (`cfg,st,dayOff,wkOff`), auth, supabase helpers (`sbReq,sbReqSilent,sbReqNullable`), `syncAll`, date utils (`getWkKey,getWkBounds,getDayDate,d2s,dsToWkKey`), `getRecurringWeekTasks,isWRRuleDueThisWeek`, undo/redo (`pushUndo,doUndo,doRedo,_stateSnap,_stateRestore,_syncRedoDiff,showToast`)
- `overview.js`: `renderAll,renderOv,renderToday,renderWkSummary,renderWkCal,renderRecOv,renderRecMoCal,renderShopOv,renderUnassigned,renderKanban,renderDayTB,tRow`, drag-drop, WR rule CRUD, scope picker, `writeWrOverride,unSkipWrRule,unSkipWRec,openWrSkipped`, daily habits: `renderDailyHabits,togDailyHabit,openAddDailyHabit,closeDailyHabitPopup,submitDailyHabit`, pup skills highlight: `renderPupSkillsHighlight,togPupSkillTrained`
- `features.js`: task CRUD, secondary pages, `showPage,closeMod,init(),selTask,clearSelection,showCtx,mkMCell,renderMoCal`, quick notes, `getOvRecurring,rolloverOverdue,updateOvBanner,skipWRec`
- `pup-skills.js`: all pup skills logic

**Where is X?** Overview/today/calendar/kanban/timeblocks/recurring-monthly → `overview.js`. Secondary pages + CRUD + ctx menus + regular monthly cal → `features.js`. Utils/Supabase/auth/undo → `core.js`.

## Auth
Supabase Auth (email+password), RLS on all tables. `init()`→`checkAuth()`→`doLogin()`→`syncAll()`. All `sbReq*` use JWT + anon `apikey`. Token auto-refreshes hourly (1 week). `syncAll` calls `getSession()` first to prevent 401 on long sessions.
- `#main` starts `opacity:0`; `renderAll()` sets to `1`.
- Initial `renderAll()` deferred via `document.fonts.ready.then(()=>requestAnimationFrame(renderAll))` — fonts loaded before first paint so WR column maxHeight stable on hard refresh.
- `_firstSyncDone=true` before initial `renderAll()` from localStorage so overdue banner shows instantly.
- `#main` left transition suppressed during `init()` (prevents shopping list squish animation).

## Data & Persistence
- POST must include ALL required fields. Missing NOT NULL → silent 400.
- `tasks` POST required: `name,category,due_date,done,important`. Optional: `notes`.
- `wr_recurring_rules` POST required: `name,cadence,is_weekly_reset,is_enabled`. Non-WR adds `is_weekly_reset:false`. Optional: `appears_on_date,starting_date,pup_related,notes`.
- `time_blocks` fields: `id,title,day_date,start_time,start_minutes,duration_minutes,category,task_id,rec_id,shop_id,done`. `rule_id` migration pending — `sbSaveBlock` omits it. **Workaround**: WR rule blocks set both `ruleId` and `recId` to `String(r.id)`; all TB lookups check `b.recId` as fallback when `b.ruleId` is null.
- Local temp IDs: tasks=`l-`, recurring=`rec-tmp-`, WR rules=`wrrule-tmp-`.
- **Categories** (`CATS`): `home,my work,work,social,long term,recurring,weekly_reset,buy,travel,birthday,shopping,weekly goals`.
- **Category pickers**: `KCATS` (kanban): includes Long term. `_CAT_OPT_LIST` (quick-add): excludes Long term. `#tCatDrop`+`#bCat` in index.html: hardcoded, Weekly Goals present, Long term removed.
- `toggleTask/togRec/togShop`: call `sbUpdateBlock(b.id,{done})` for linked TB blocks.
- `drawTBBlock` derives `b._done` from linked item at render time. `linkedRec` checks both `st.recurring` and `st.wrRules`. `recCat='weekly_reset'` unless `is_weekly_reset===false`.
- `syncAll` preserves local-only blocks during sync via `localOnly` filter.
- `renderDayTB` skips if `window._tbEditing===true`. `renderAll()` does NOT call `renderDayTB()`. Ops changing TB state must also call `if(document.getElementById('tbGrid'))renderDayTB()` — including undo closures.
- `delTask`: removes linked TB blocks by `taskId` AND title match.
- `rolloverOverdue()`: stores `prevDate` before rollover. Undo restores original date + patches DB.
- `localStorage` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides. `pup_skills._trainedWk` (weekly done state for focus skills) is local-only — never synced to Supabase.
- `syncAll` recurring: `is_weekly_reset===true`→`st.wrRules`; others→`st.recurring`.
- Timeblock inline edit (`startTBInlineEdit`): dblclick creates block with empty title. `window._tbEditing=true` set on start, cleared in `commit()` and Escape. After DB save returns real ID, calls `renderAll()`.

## Keyboard Shortcuts (global, `core.js` keydown handler)
- `Cmd/Ctrl+Z`: undo (page-aware: pups/recipes/birthdays use their own stacks).
- `o`: `showPage('overview')` — only when no input/textarea/select focused and no modal open.

## Undo / Redo
- `pushUndo(fn,msg)`: snapshots state BEFORE action. `doUndo()`: pops, captures snap for redo, calls fn. `doRedo()`: restores snap, diffs + patches DB.
- `_stateSnap` captures: `tasks,recurring,shopping,travel,birthdays,blocks,wrRules,wrOverrides,autoTBOverrides`.
- `_stateRestore` restores all above, calls `renderAll(),renderDayTB(),renderWkCal(),renderRecOv(),renderWeeklyPage()`.
- `_syncRedoDiff` diffs: tasks (PATCH/POST/DELETE), recurring `_dateOverrides`, wrRules `_dateOverrides`, wrOverrides, shopping `due_date`, travel dates, blocks, autoTBOverrides.
