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
- `#backToOv` button lives OUTSIDE `#main` (sibling, between sidebar and `#main` in DOM). Must stay outside `#main` — `#main`'s `position:fixed` + `overflow:auto` traps z-index of children. `position:fixed;z-index:999` on backToOv.

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
- `localStorage` persists: tasks, recurring, shopping, travel, birthdays, pup_skills, pupSessions, recipes, autoTimeblocks, autoTBOverrides, wrRules, wrOverrides. `st.pupSessions` = `pup_skill_sessions` rows (skill_id uuid, day_date text, done bool, created_at). Synced from Supabase in `syncAll`. Checking a skill in overview creates/patches a session for today. `_pupWkSessions(skillId)` returns sessions for current week. Overview shows checkbox if no sessions this week, else shows `done/total` count.
- `syncAll` recurring: `is_weekly_reset===true`→`st.wrRules`; others→`st.recurring`.
- Timeblock inline edit (`startTBInlineEdit`): dblclick creates block with empty title. `window._tbEditing=true` set on start, cleared in `commit()` and Escape. After DB save returns real ID, calls `renderAll()`.

## New Item Type / Field Inheritance Rule

**Default**: any new item type or new field on an existing type must automatically match all existing behavior unless explicitly overridden. No partial implementations.

**Checklist — validate every location the item appears before marking done:**
- **State**: add to `st`, `load()`, `save()`, `syncAll` (fetch + merge), `_stateSnap`, `_stateRestore`, `_syncRedoDiff` (PATCH/POST/DELETE)
- **Undo/redo**: `pushUndo` on every mutating op (create, edit, delete, move, toggle); undo fn patches DB; `doRedo` undo entry also patches DB via `_syncRedoDiff(snap, beforeRedo)`
- **Today list**: render row, sort priority, overdue logic, drag ID prefix, drag-to-timeblock, `_hasTBToday` check
- **Weekly cal**: chip render (color, text, dragstart ID), chip click→`selTask`, dblclick→edit modal, X→remove, checkbox→toggle, dragover drop handler
- **Timeblock**: `dropOnTB` handler for dragId prefix, `drawTBBlock` color/done derivation, dblclick→edit, `delBlock` removes block only (never deletes underlying task), checkbox syncs linked item
- **Multi-select → timeblock**: cmd/shift select tasks+WR items, drag to timeblock — all create consecutive blocks. `dropOnTB` `else` branch handles wrec/wrrule/rec-virt/task sids. Single undo reverts all.
- **TB block selection**: `_getTBBlockSelId` returns `'blk-'+bl.id` for task-backed and shop blocks. Delete/Backspace on selected TB blocks only removes blocks. `applySelHighlight` cross-highlights via `selTaskIds` set.
- **WR move across weeks**: calendar/edge drop handlers delete `_dateOverrides[currentWkKey]` when moving to different week, preventing ghost appearances in VOP.
- **Selection**: `applySelHighlight` — `.ti` id match, `.chip`/`.mcell-t` dataset.tid, `.tb-block` bid→selId, `csForId` color, `applySelVars` CSS vars
- **Monthly cal**: chip render, drag drop, unassigned panel
- **Database**: POST all required fields, PATCH on edit/toggle, DELETE on remove; `sbSaveBlock` category field for TB link type detection
- **Cross-view sync**: name/state change in one view must reflect in all others — call `renderAll()` + `renderPupSkillsHighlight()` (or equivalent) after any mutation
- **Temp IDs**: use `prefix-tmp-`+Date.now(); replace with real DB id after POST; update any linked objects (e.g. TB block's `_pupSessId`) when real id arrives

## Page Layout
- **Standard page padding**: `padding: <top> clamp(12px,3vw,56px) 24px clamp(12px,3vw,56px)`.
  - **Left/Right**: `clamp(12px, 3vw, 56px)` — responsive, min 12px, max 56px.
  - **Bottom**: `24px` — fixed, matches overview page bottom gap.
  - **Top**: varies per page (typically 41–60px depending on topbar/toolbar height).
- **Videos page** sets padding via JS (`el.style.cssText`); all other pages set it inline on the `.page` div in `index.html`.
- **New pages**: always use these exact side/bottom values. Copy-paste: `style="padding:60px clamp(12px,3vw,56px) 24px clamp(12px,3vw,56px)"`.
- **Overview page** uses `#page-overview{padding:clamp(12px,3vw,56px);padding-top:60px}` in CSS — sides/bottom match the standard.
- **Quick links** (overview grid): Shopping removed (redirected to weekly reset), Notes removed. Current: Birthdays, Pups, Finance, Recipes, Videos. One slot open.

## Keyboard Shortcuts (global, `core.js` keydown handler)
- `Cmd/Ctrl+Z`: undo (page-aware: pups/recipes/birthdays use their own stacks).
- `o`: `showPage('overview')` — only when no input/textarea/select focused and no modal open.

## Undo / Redo
- `pushUndo(fn,msg)`: snapshots state AFTER action (called post-mutation). `doUndo()`: pops, captures current snap for redo, calls fn. `doRedo()` (async): restores snap, `await _syncRedoDiff(before,after)`, pushes undo entry whose fn calls both `_stateRestore(beforeRedo)` AND `_syncRedoDiff(snap,beforeRedo)` to keep DB in sync on undo-after-redo.
- `_stateSnap` captures: `tasks,recurring,shopping,travel,birthdays,blocks,wrRules,wrOverrides,autoTBOverrides,pupSessions,pup_skills`.
- `_stateRestore` restores all above + calls `renderAll(),renderPupSkillsHighlight(),renderDayTB(),renderWkCal(),renderRecOv(),renderWeeklyPage()`.
- `_syncRedoDiff` (returns `Promise.all`): diffs tasks, recurring `_dateOverrides`, wrRules `_dateOverrides`, wrOverrides, shopping `due_date`, travel dates, blocks, autoTBOverrides, pupSessions (done/POST/DELETE), pup_skills (field PATCH).

## Scheduled Jobs (cron)
- `backup.js` — daily 8:00am, backs up all Supabase tables to `backup_auto.json`
- `.claude/monitor.sh` — daily 8:17am, macOS notifications for: table row count > 5000, YT API quota exhausted (502 or RSS fallback)
- `.claude/watch-deploy.sh` — triggered by deploy hook, notifies when Cloudflare Pages deploy completes/fails
