# Mobile Dashboard Rules

> **CRITICAL**: The mobile app is a separate PWA that shares the same Supabase backend as the desktop web app.
> - **NEVER touch**: `index.html`, `overview.js`, `features.js` (except stubs already in mobile-overview.js), `style.css`, `manifest.json`, or any desktop-only JS/CSS.
> - **core.js**: shared file, may be modified carefully when mobile needs differ (e.g. auth event handling). Changes affect desktop too — test both.
> - **Mobile-only files**: `mobile.html`, `mobile.css`, `mobile-overview.js`, `mobile-manifest.json`, `mobile-sw.js`, `_headers`
> - The desktop web app runs in a separate terminal — changes to shared files will break it.

---

## Architecture

### File roles
| File | Purpose |
|------|---------|
| `mobile.html` | Shell: login, app wrapper, all tab pages, all bottom sheets, hidden undo scaffold |
| `mobile.css` | All mobile styles. CSS vars match desktop (`--accent:#7c6af7`, `--bg`, `--glass`, etc.) |
| `mobile-overview.js` | All mobile logic. Loaded after `core.js` + `features.js`. Sets `window._mobileMode = true` |
| `mobile-manifest.json` | PWA manifest with `start_url: /mobile.html` (separate from desktop `manifest.json`) |
| `mobile-sw.js` | Network-first service worker — always fetches from network, no caching. Registered in mobile.html |
| `_headers` | Cloudflare Pages cache-control: `no-cache, no-store, must-revalidate` for all mobile files |

### Script load order (mobile.html)
```
service worker registration → supabase CDN → core.js → features.js → mobile-overview.js
```
Script tags use cache-busting `?v=YYYYMMDD` query params. Update the version string when deploying changes.
`core.js` and `features.js` are shared. All mobile-specific logic goes in `mobile-overview.js`.

### Desktop stubs (top of mobile-overview.js)
All desktop render functions are no-ops or redirect to mobile equivalents:
```js
function renderAll() {
  mRenderToday();
  if (_mCurTab === 'tb') mRenderTB();
  if (_mCurTab === 'week') mRenderWeek();
  if (_mCurTab === 'month') _mRenderMonthWeeks(false);   // reset=false: preserve scroll position
  if (_mCurTab === 'shop') mRenderShop();
  if (document.getElementById('mMealsSheet')?.classList.contains('open')) mRenderMeals();
  if (document.getElementById('mFullListSheet')?.classList.contains('open')) mRenderFullList();
}
function renderToday() { mRenderToday(); }
function renderShopOv(){ if (_mCurTab==='shop') mRenderShop(); }
function renderShopFull(){ if (_mCurTab==='shop') mRenderShop(); }
function renderWkCal() {}   // no-op
function renderDayTB() {}   // no-op
// ... all other desktop render fns are no-ops
function _showUndoToast() {} // no-op — required or core.js crashes
function setBadge()    {}    // no-op
```

### Required DOM stubs (mobile.html)
`core.js → pushUndo()` accesses `#undoToast`, `#undoMsg`, `#redoBtn` DOM elements. Must exist in mobile.html:
```html
<div id="undoToast" style="display:none!important"><span id="undoMsg"></span><button id="redoBtn"></button></div>
```

---

## State & Data

All state lives in `st` (from `core.js`). Mobile reads same `st` object — no duplication.

Key state used by mobile:
- `st.tasks[]` — regular tasks `{id, name, category, due_date, done, important}`
- `st.recurring[]` — recurring rules `{id, name, is_weekly_reset, _doneByWk, _dateOverrides, ...}`
- `st.wrRules[]` — weekly-reset rules `{id, name, _dateOverrides, ...}`
- `st.wrOverrides[]` — WR override records
- `st.shopping[]` — shopping items `{id, name, done, due_date}`
- `st.blocks[]` — time blocks `{id, title, ds, sm, dur, cat, taskId, recId, shopId, _done}`
- `st.pupSessions[]`, `st.pup_skills[]` — pup skill sessions

`save()` → localStorage. `syncAll(true)` → re-fetches from Supabase, then calls `renderAll()`.

### Supabase helpers (from core.js — do not reimplement)
```js
sbReq(method, table, body, query)          // throws on error, returns data[]
sbReqSilent(method, table, body, query)    // silent — returns null on error
sbSaveBlock(b)                             // upsert time_block (local format)
sbDeleteBlock(id)                          // delete time_block by id
sbUpdateBlock(id, fields)                  // PATCH time_block (uses DB field names)
```

**`sbUpdateBlock` DB field names** (different from local block object):
```js
{ title, start_minutes, start_time: 'HH:MM:00', duration_minutes, category }
```

### Toggle functions (from features.js / mobile-overview.js)
```js
toggleTask(id, done)                       // features.js — PATCH tasks table
togRec(recId, done, wkKey)                 // features.js — PATCH wr_recurring_rules
togShop(id, done)                          // features.js — PATCH shopping_list
togWrRule(ruleId, isDone, wkKey)           // mobile-overview.js — POST/DELETE wr_recurring_overrides
togRecVirt(recId, done, wkKey)             // mobile-overview.js — PATCH wr_recurring_rules
togPupSessionDone(sessId, done)            // mobile-overview.js — PATCH pup_skill_sessions
```

### Core.js helpers used by mobile
```js
getDayDate(off)     // Date object for today+off days
d2s(date)           // Date → 'YYYY-MM-DD'
isOv(due_date)      // true if overdue
getWkKey(off)       // week key string for offset
getWkDates(off)     // [Mon..Sun] Date array for week at offset
getRecurringWeekTasks(off)  // virtual recurring tasks for week
getExtrasForDate(ds)        // travel + birthday virtual tasks
gc(catName)         // {bg, t, d, b} color object for category
OV                  // overdue color object
escHtml(s)          // HTML escape — from features.js
```

---

## Category System

Mobile categories (picker options):
```js
const M_CATS = ['Home', 'My work', 'Work', 'Social', 'Long term'];
```
Colors come from `gc(catName)` (core.js `CATS` object). Never use native `<select>` for categories — iOS can't style options. Always use the custom `.m-cpick` picker.

### Picker state variables
```js
let _mAddCat      = 'Home';  // add task bar
let _mEditCat     = 'Home';  // edit task sheet
let _mBlockCat    = 'Home';  // block sheet
let _mWkAddCat    = 'Home';  // week day add sheet
let _mFullAddCat  = 'Home';  // full add sheet (today)
```

### Picker types and DOM IDs
| which | dot | lbl | opts |
|-------|-----|-----|------|
| `'add'`     | `mAddPickDot`     | `mAddPickLbl`     | `mAddPickOpts`     |
| `'edit'`    | `mEditPickDot`    | `mEditPickLbl`    | `mEditPickOpts`    |
| `'block'`   | `mBlockPickDot`   | `mBlockPickLbl`   | `mBlockPickOpts`   |
| `'wkadd'`   | `mWkAddPickDot`   | `mWkAddPickLbl`   | `mWkAddPickOpts`   |
| `'fulladd'` | `mFullAddPickDot` | `mFullAddPickLbl` | `mFullAddPickOpts` |

`mTogglePick(which)` — opens one, closes others.
`mSelectCat(which, cat)` — sets state var + updates dot/label.
`mInitPickers()` — builds option lists + sets up outside-tap close listener.

---

## Tab System

### State
```js
let _mCurTab = 'today'; // 'today' | 'week' | 'month' | 'shop' | 'extras' | 'tb' | 'recipes'
```
Persisted to `localStorage._mLastTab`; init restores it (refresh keeps current tab) — validated against `['today','tb','week','month','shop','extras','recipes']`.

`tb` and `recipes` are real pages but have **no bottom-nav slot** — `tb` opens only via the Timeblock header button (Today tab) or the Timeblock button on the More page; `recipes` opens only via the Recipes button on the More page. Nav active-highlight logic (index 0-4) doesn't light up any button for either.

### `mShowTab(tab)`
- Shows/hides one of `#mTodayPage`, `#mTBPage`, `#mWeekPage`, `#mMonthPage`, `#mShopPage`, `#mExtrasPage`, `#mRecipesPage`
- Shows `#mAddBar` on today only, `#mShopAddBar` on shop only — both `position:fixed` (see Today/Shop sections; NOT normal flex flow — that regressed to a page-load position jump once)
- `#mApp` padding-bottom is always just `calc(52px + env(safe-area-inset-bottom))` (nav clearance) — the fixed add bars reserve their own clearance via `bottom:calc(52px+safe)` and don't need it duplicated
- `mSyncBarClearance(barId, listId)`: measures the *actual* rendered height of the currently-visible add bar and sets that as the matching list's `padding-bottom`, rather than a guessed px value — called for today/shop after render
- Updates `#mHeaderTitle`. `#mProgress` only shown on today. `#mTodayTBBtn` only shown on today. `#mGoTodayBtn` shown on every tab EXCEPT today (see Header below)
- `#mDateLbl` (date subtitle) is **always visible**, same header height on every tab (`visibility`, not `display`, so hiding it never changes layout) — Today/Timeblock show the swiped-day date; every other tab always shows today's real date
- `main.style.padding`: `12px 16px` on today/shop/recipes, `0` on tb/week/month/extras (pages that manage their own internal layout/scroll)
- `main.style.overflow`: `hidden` on week/tb/month (they own their internal scroll region), default `auto` elsewhere
- Dispatch: `tb`→`mRenderTB()`+`_mScrollNow()`, `week`→`mRenderWeek(true)`+`mInitWeekScroll()`, `month`→`mOpenMonth()`, `shop`→`mRenderShop()`, `recipes`→`_mRenderRecipesBrowse()`, `today`→resets `_mTodayOffset`+`_mSetDate()`

### Header (shared across all tabs)
```html
#mHeader
  #mHeaderTitleWrap (hidden on month) ← h1#mHeaderTitle + #mDateLbl, left
  #mMonthHeaderControls (month only)  ← month/year dropdown triggers, see Month section
  #mMonthTodayNav (month only)        ← centered Today/‹/› group, see Month section
  #mTodayTBBtn (today only)           ← clock-face icon → opens Timeblock (mShowTab('tb'))
  #mProgress (today only)             ← done/total badge, yellow until 100% then green (.m-prog-complete)
  #mShopHeaderBtns (shop only)        ← 🍽 Meals icon + red "HEB" List badge
  #mMonthAddBtn (month only)          ← "+" opens full-add sheet for the selected day (mMonthAddTask)
  #mGoTodayBtn (week only)            ← jumps to Today tab; gone from Shop/More/Month (Month has its
                                         own dedicated Today button, see below). On Week, mGoToday()
                                         re-runs mRenderWeek(true) to scroll back to today WITHOUT
                                         navigating away (it used to call mShowTab('today'), which
                                         was a bug — you're already looking at Week)
  .m-reload-btn                       ← always last, far right
```
`mShowTab(tab)` toggles `#mHeaderTitleWrap` vs `#mMonthHeaderControls`/`#mMonthTodayNav`/`#mMonthAddBtn` based on `tab==='month'`, and `#mGoTodayBtn` based on `tab==='week'` — single source of truth for all of the above, see Month section for the controls themselves.

### Bottom nav
```html
<nav id="mNav">
  <button class="m-nav-btn" onclick="mShowTab('today')">Today</button>
  <button class="m-nav-btn" onclick="mShowTab('week')">Week</button>
  <button class="m-nav-btn" onclick="mShowTab('month')">Month</button>
  <button class="m-nav-btn" onclick="mShowTab('shop')">Shop</button>
  <button class="m-nav-btn" onclick="mShowTab('extras')">More</button>
</nav>
```
Fixed at bottom, `height: calc(52px + env(safe-area-inset-bottom))`, icons vertically centered (`justify-content:center` on `.m-nav-btn`).

---

## Today

### Key functions
- `mGetTodayTasks()` — mirrors desktop `renderToday()` logic exactly. Returns sorted array of all task types for today (regular, recurring virtual, WR recurring, WR rules, shopping, pup sessions, travel/birthday extras). Overdue tasks included.
- `mSortToday(tasks)` — done→bottom, overdue→top, type priority order
- `mRenderToday()` — renders `#mTodayList` + updates `#mProgress` (text + `.m-prog-complete` class: yellow while `done<total`, green when `done===total && total>0`, matching desktop's donut green)
- `mTaskRow(t)` — generates row HTML with: checkbox, name, color dot, edit pencil (regular tasks only), swipe wrapper with `data-tid`. Color priority: overdue (`OV`) > important (`IMP`, `t.important && !t.done`) > category (`gc(catKey)`) — no "not on timeblock" arrow indicator (removed, was `.m-row-arrow`/`▸`, considered visual noise)

### Task row types
- Regular task: checkbox → `toggleTask()`, pencil → `mOpenEdit(id)`
- WR rule: checkbox → `togWrRule(ruleId, checked, wkKey)`
- WR recurring: checkbox → `togRec(recId, checked, wkKey)`
- Non-WR recurring virtual: checkbox → `togRecVirt(recId, checked, wkKey)`
- Shopping: checkbox → `togShop(shopId, checked)`
- Pup session: checkbox → `togPupSessionDone(sessId, checked)`
- Travel/birthday: no checkbox (📅 icon), no swipe

### Move-to-Today (`.m-mv-today` button, overdue rows only) — styled red (`#ef4444`/`#fff0f0`, matches desktop's `OV` color)
`_mMoveToTodayArgs(t)` picks `[id, type, extra]` per task type. For `rec`/`wrec`/`wrrule`, `mTaskRow`'s button routes through `_mOvRowMoveClick(kind, id, wkKey)` instead of calling `mMoveToToday` directly (see below); every other type (`task`, `shop`, `pup`, `vid`, `vidstep`) still calls `mMoveToToday(id, type, extra)` directly, unchanged. Covers ALL overdue-capable types (parity with desktop's bulk `rolloverOverdue()`, just scoped to one row): `task`, `shop`, `pup` (`pup_skill_sessions.day_date`), `vid` (`_mVidDayMap`/`_mVidDayMapSet`), `vidstep` (`extra` = `step::day`; moves any block on that day + the daymap primary/extraDay entry via `_mVidStepMap`/`_mVidStepMapSet`), `rec`/`wrec` (`st.recurring`, `extra`=wkKey, PATCH `wr_recurring_rules`), `wrrule` (`st.wrRules`, `extra`=wkKey). Every branch is undoable via `pushUndo`. **`_mVidDayMapSet`/`_mVidStepMap`/`_mVidStepMapSet` are mobile's own localStorage-direct implementations** — the desktop equivalents (`_vidDayMapSet`, `_vidStepDayMap`, `_vidStepDayMapSet`) live in `overview.js`, which mobile never loads.

### Past-week recurring/WR miss prompt (`_mOvRowMoveClick`, mirrors desktop's `_ovRowMoveClick`/`rolloverOverdue` scope picker — see `rules/tasks-ui.md` Overdue Logic)
A recurring/WR miss from the CURRENT week is just a same-week nudge — `_mOvRowMoveClick` computes `pastWeek = wkKey && wkKey !== getWkKey(0)`; when false it delegates straight to the existing `mMoveToToday(id, kind, wkKey)` (silent direct pin, unchanged). When `pastWeek` is true it's a real schedule decision, so it opens a singleton bottom sheet (`#mWrScopeSheet`/`#mWrScopeBackdrop`, same slide-up/backdrop idiom as `#mEditSheet` — NOT desktop's cursor-positioned `#wrScopePicker` popup) via `mOpenWrScopeSheet(name, wkKey, onSkip, onThisTime, onSameDay, onChangeDay)`, four full-width rows in desktop's order: Skip past week / This time only / Same day / Change day to today. Mobile has no bulk overdue banner, so this is always a queue of exactly one — never port desktop's sequential `_rolloverPromptQueue`.
- `wrrule` kind → `writeWrOverride`-style skip / `_mWrMoveToThisWeek(id,wkKey,false/true,false/true)` for the other 3 (ported from desktop's `wrMoveToThisWeek`, overview.js — not loaded on mobile).
- `rec`/`wrec` kind → `_recSkipPastWeek`/`_recMoveThisOccToToday` (features.js, shared — called directly, confirmed mobile-safe: only touch `save/renderAll/sbReqSilent/pushUndo`) for skip/this-time, `_mRecMoveAllFuture(rec,wkKey,tod(),true/false)` for same-day/change-day (ported from desktop's `_recMoveAllFuture`, overview.js).
- Ports (`_mWriteWrOverride`, `_mWrMoveToThisWeek`, `_mRecMoveAllFuture`, `_mWrSnapshotSchedule`, `_mNthWeekdayOfMonth`, `_mWeeksAgoLabel`) are near-verbatim copies of their overview.js originals with desktop-only render calls (`renderRecOv`/`renderWkCal`/`renderWeeklyPage`/`renderDayTB`) swapped for `renderAll()`, and `_wrClearPastOrphanPins` (a permanent no-op on desktop too) omitted entirely.

### Swipe-to-delete
- Event delegation on `#mTodayList` (persists through innerHTML replacement)
- Only `.m-row-outer[data-tid]` rows (regular tasks only)
- Threshold: 90px left. Red bg + ✕ hint revealed
- `mDeleteById(id)` → removes from `st.tasks`, saves, `sbReq DELETE tasks`

### Pull-to-refresh
- Touch events on `#mMain`. Only active when `_mCurTab === 'today'`
- Threshold: 65px. On release: `syncAll(true)` + `mRenderToday()`

### Add task bar (`#mAddBar`)
- Fixed above nav: `bottom: calc(52px + env(safe-area-inset-bottom))`
- Two rows: text input + [category picker | flag btn | Add button]
- `_mAddImportant` state; `mToggleAddFlag()` toggles + styles `#mAddFlagBtn`
- `mAddTask()` → optimistic local add (includes `important`) → `sbReq POST tasks` → replace temp id with real
- Flag resets to off after each add

### Full add sheet (`#mFullAddSheet`)
- Opened by "+" button in Today section header (also reused by Month's header "+" via `mMonthAddTask()`, and by the Month drag-to-create-travel gesture — see Month section)
- Fields: name, then `#mFullAddDestField`/`#mFullAddEndField`/`#mFullAddModeField` (Travel-only, hidden by default), due_date (`#mFullAddDue`, relabeled "Start date" in Travel mode), then ONE row with category picker (`'fulladd'`) + important flag button (`.m-flag-btn`/`#mFullAddImpBtn`, same ⚑ icon treatment as the bottom add bar's `#mAddFlagBtn` — NOT the old separate on/off text toggle)
- `mOpenFullAdd()` / `mCloseFullAdd()` / `mSaveFullAdd()` / `mToggleFullAddImp()`
- Pre-fills due_date to today
- `#mFullAddDue` (and `#mEditDue`, `#mShopEditDue`) need `-webkit-appearance:none;appearance:none;max-width:100%` — iOS Safari's native date-input chrome otherwise ignores the author width and can render past the sheet's edge

### Travel task creation (Today's `#mAddBar` + `#mFullAddSheet`)
`M_CATS_TRAVEL = [...M_CATS, 'Travel']` — Travel is added ONLY to the `'add'` (bottom bar) and `'fulladd'` (full-add sheet) category pickers via `_mBuildOpts(elId, which, cats)`'s optional `cats` param; edit/block/wkadd pickers stay plain `M_CATS` (no travel behavior there). Picking Travel in `#mFullAddSheet` calls `_mFullAddSyncTravelFields(cat)` (mobile port of desktop's `_tModalSyncTravelFields`, features.js) from `mSelectCat('fulladd', cat)` — shows the destination/end-date/mode fields, relabels due date, renames the save button "Add Trip". Both entry points funnel into `_mAddTravel(name, dest, start, end, mode)`: pushes to `st.travel`, `save()`, `renderAll()`, `sbReq POST travel`, `pushUndo` — mirrors desktop's `saveTModal` Travel branch (features.js) minus `renderTravelPage()` (desktop-only; `renderAll()` is mobile's substitute). The bottom bar (`mAddTask()`) always creates a single-day trip due "today" (no room for a date range in that compact bar) — use the full-add sheet for a date range.

### Edit task sheet (`#mEditSheet`)
- `mOpenEdit(id)` / `mCloseEdit()` / `mSaveEditTask()` / `mDeleteEditTask()`
- Fields: name, due_date (`#mEditDue`), category picker, important toggle (`_mEditImportant`, `#mEditImpBtn`)
- Bottom slide-up sheet with backdrop
- `mSaveEditTask()` → `sbReq PATCH tasks` (name, category, due_date, important)
- `mDeleteEditTask()` → `sbReq DELETE tasks`

---

## Timeblock (not in bottom nav — opened from Today's header button or the More page)

### Constants
```js
const M_TB_START = 6 * 60;   // 6am (360 min)
const M_TB_END   = 22 * 60;  // 10pm (1320 min)
const M_PX       = 0.75;     // px per minute → 45px/hour, ~720px total
let _mTBOffset   = 0;        // day offset (0=today, ±N days)
```

### Layout
```
#mTBPage
  #mUnassignedBar   ← horizontal scroll chips
  #mTLScroll        ← vertical scrollable
    #mTLInner       ← flex row
      #mTLLabels    ← hour labels (absolute children)
      #mTLCol       ← blocks + now line + tap handler
```

### Unassigned chips (`#mUnassignedBar`)
- `mRenderUnassigned()` — shows tasks for displayed day not yet assigned to a block
- Sources: `st.tasks` (+ overdue via `isOv()` when today), recurring virtual tasks (no `default_start_time`), shopping items with due dates
- Task has no block when no `st.blocks` entry with matching `taskId`/`recId`/`shopId` and `ds`
- Tap chip: `mSelectChip(taskId)` toggles `_mSelectedChipId`
- Selected chip: blue/accent, shown with `::before` dot using CSS custom props `--cdot`, `--cborder`

### Timeline rendering (`mRenderTimeline()`)
- Hour lines: absolutely positioned in `#mTLLabels` (and extend across `#mTLCol`)
- Regular blocks: absolutely positioned in `#mTLCol` by `top = (sm - M_TB_START) * M_PX`
- Done blocks: `.m-done-block` — `opacity:.45`, name gets `text-decoration:line-through`
- Checkbox: `.m-tb-chk` on each regular block — circular, green when checked (matches desktop `tb-chk`). Derives done state from linked task/rec/shop. Toggle logic mirrors desktop (`toggleTask`, `togWrRule`, `togRec`, `togRecVirt`, `togShop`)
- Auto blocks: rendered when `cfg.showAutoTB`; respects each block's `days` CSV (0=Sun..6=Sat, null = legacy Mon–Fri) like desktop `getAutoTBForDate`; grey background (`rgba(245,244,250,.28)`), grey text (`#b0aec0`) — matches desktop `atb-block`. From `st.autoTimeblocks` with `st.autoTBOverrides`
- Recurring auto blocks: recurring tasks with `default_start_time` not manually placed; teal background (`rgba(221,244,240,.45)`), teal text (`#0f6b7a`) — matches desktop `rec-atb-block`
- Block height: `Math.max(dur * M_PX, 28)`
- Time format: `_mTStr()` outputs `h:mmam/pm` (matches desktop `tStr()`)
- Now line: `.m-tl-now` with `::before` dot, only rendered when `_mTBOffset === 0`
- Tap on empty area → `mOpenNewBlock(sm)` (snaps to 15 min)
- Tap on block → `mOpenBlockEdit(blockId)` (via `col.onclick` — checks `_mDragJustEnded`)

### Block drag (reschedule by time)
- Long-press (480ms) on `.m-tl-block` element → activates drag
- Locks `#mTLScroll` overflow during drag (`overflowY: 'hidden'`)
- `touchmove` on `#mTLCol` — passive, moves block top, snaps to 15 min
- `touchend` → restore styles, unlock scroll, set `_mDragJustEnded = true` (300ms), save, `sbUpdateBlock`
- `_mDragJustEnded` suppresses click-to-edit that fires after touchend

### Day navigation (swipe)
- `mInitTBSwipe()` — touchstart/touchend on `#mTLScroll`
- Left swipe (dx < -60): `_mTBOffset++`; right swipe: `_mTBOffset--`
- Blocked when `_mDragBlock` is active
- After offset change: `mRenderTB()` + `_mScrollNow()`
- `_mScrollNow()`: scrolls to current time minus 100px (only when `_mTBOffset === 0`)

### Block sheet (`#mBlockSheet`)
- `mOpenNewBlock(sm)` — new block, pre-fills from `_mSelectedChipId` if set
- `mOpenBlockEdit(blockId)` — edit existing, shows Delete button
- Duration buttons: 30m/45m/1h/1.5h/2h → `mSetDur(mins)` → `_mBlockDur`
- `mSaveBlock()`:
  - New: build local block obj → push to `st.blocks` → `sbSaveBlock(b)`; clears `_mSelectedChipId`
  - Edit: update local obj → `sbUpdateBlock(id, {title, start_minutes, start_time, duration_minutes, category})`
- `mDeleteBlock()` → filter from `st.blocks` → `sbDeleteBlock(id)`
- Block `ds` uses `d2s(getDayDate(_mTBOffset))` — saves to displayed day, not always today

---

## Week

### Constants
```js
const _WK_DAYS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
let _mWeekOffset = 0;  // week offset (0=this week, -1=last, +1=next)
```

### Layout
```
#mWeekPage
  #mWeekNav          ← sticky: ‹ "This Week" ›
  #mWeekList         ← 7 .m-wk-day divs
```

Each `.m-wk-day` has `data-ds="YYYY-MM-DD"` and contains:
- `.m-wk-hd` — sticky day header (name, date, today dot, count badge, + button)
- `.m-wk-row` — one per task

### Task data per day (`mGetDayTasks(ds, weekOff)`)
- Regular `st.tasks` where `due_date === ds`
- Overdue regular tasks shown on today's row only
- `getRecurringWeekTasks(weekOff)` filtered by `due_date === ds`
- Shopping items due on `ds` (overdue only on today)
- Also includes (desktop week parity): WR pinned instances (current + past 4 wk keys), pup sessions, fin-cancel reminders, videos via `_vidDayMap`, video steps via `_vidStepDayMap`
- Sorted via `mSortDayTasks(tasks, ds)` — exact port of desktop `sortTasksForDay` (birthday → done-bottom → travel → overdue → important → TB start time → type priority → alpha). Same fn used by Today & Month.
- **Video day-maps sync**: `_vidStepDayMap`/`_vidDayMap` (localStorage) mirror through the `client_kv` table (core.js `_kvSyncMaps`, migration 007). Mobile reads them like desktop; mobile toggles write doneDays back and push on next sync.

### Per-day done/total count
- `doneC = tasks.filter(t => t.done || (isPast && (t._type==='travel'||t._type==='birthday')))`. Birthdays/trips have no checkbox, so past ones must count as done or the ratio reads low. `isPast = ds < today`. Fixed in BOTH `_mWkRenderWeekHtml` and the single-day re-render in `mSaveWkTask`.

### Week task rows (`mWkTaskRow(t)`)
- Regular (non-virtual): `data-tid` + `data-tname` for drag; checkbox → `toggleTask()`
- Recurring virtual: checkbox → `togRecVirt(recId, done, wkKey)`
- Shopping: checkbox → `togShop(shopId, done)`
- No edit button in week view (use Today tab for edit)

### Week navigation (infinite scroll)
- Renders weeks `_mWkRenderedLo..Hi` (default −1..+1) via `_mWkRenderWeekHtml`. `mRenderWeek(reset)`: `reset=true` ONLY on tab-open (resets range + scroll-to-today); background/sync re-renders pass no arg → preserve range + scroll position (no yank).
- **Scroll container is not always `#mWeekPage`** — the flex layout often leaves it unbounded so the **document** scrolls. `_mWkScroller()` returns `#mWeekPage` if scrollable, else `document.scrollingElement`. ALL scroll logic (scroll-to-today, preserve, load-more, the scroll listener) must use `_mWkScroller()`, not `#mWeekPage` directly.
- `_mWkScrollToToday()`: aligns today's `.m-wk-day` to the top (offset by sticky `#mHeader` when the doc scrolls); retries up to 25× until the scroller is actually scrollable (early calls get clamped to 0 = last week).
- `mInitWeekScroll()`: one listener on both `#mWeekPage` and `window`; near top/bottom → `_mWkLoadMore('up'/'down')`.

### Drag-to-reschedule (between days)
- `.m-wk-row` has `-webkit-user-select:none; user-select:none` in CSS to prevent text selection on long-press
- `mInitWkDrag()` — event delegation on `#mWeekList` (persists through re-renders)
- Long-press (480ms) on `.m-wk-row[data-tid]` → activates drag
- Ghost: fixed-position pill element appended to `<body>`, follows finger at `-44px` vertical offset
- `_mWkDragMove(e)` (added to `document` with `passive:false`): moves ghost, detects target day via `elementFromPoint`, highlights `.m-wk-drop-target`
- Release on different day: `t.due_date = newDs` → `save()` → `mRenderWeek()` → `sbReq PATCH tasks`
- Only regular tasks draggable — virtual/recurring/shopping are computed, not individually stored

### Add task for specific day
- `mWkAddTask(ds)` → opens `#mWkAddSheet` with title "Add — Day, Mon D"
- `mSaveWkTask()` → `sbReq POST tasks` with `due_date: _mWkAddDs`
- Uses `_mWkAddCat` / `'wkadd'` picker type

---

## Shop (HEB Grocery merged in — no separate tab any more)

### Layout
```
#mShopPage
  #mShopList        ← store groups with items (no header/count line — removed)
```
Header (shared `#mHeader`, shop tab only): `#mShopHeaderBtns` = 🍽 Meals icon + red "HEB" List badge (`.m-shop-hdr-heb`, NOT a circle icon — literal red badge, white bold text, since it's the one store name that should stay all-caps). Store group headers (`.m-shop-store-hd`) are NOT force-uppercased (removed `text-transform:uppercase` — "Ikea"/"Online"/"Other" show in their natural stored casing; "HEB" stays caps because that's its literal stored name).

### Key functions
- `mRenderShop()` — groups undone `st.shopping` items by store (alpha sorted), items within store sorted by `shop_order`
- `mAddShopItem()` — adds item with name + store from `#mShopAddBar` → `sbReq POST shopping_list`
- `mOpenShopEdit(id)` / `mSaveShopEdit()` / `mDeleteShopItem()` / `mCloseShopEdit()` — edit sheet with name, store, due_date, time
- `mDeleteShopDirect(id)` — X button inline delete

### Shop add bar (`#mShopAddBar`)
- `position:fixed`, same treatment as `#mAddBar` (elevated white/`--bg-elevated` card, shadow, no accent-colored border — visible without leaning on an accent color). **Must stay `position:fixed`** — a normal-flex-flow version was tried and regressed to rendering halfway up the page on cold load before jumping to the bottom once `#mMain`'s height resolved. List clearance is measured via `mSyncBarClearance`, not guessed.
- Name input + store `<select>` (HEB/Ikea/Online/Other) + Add button

### Shop edit sheet (`#mShopEditSheet`)
- Bottom slide-up sheet (same pattern as `#mEditSheet`)
- Fields: name, store (select), due_date (date), time (time input)
- Tap any item row to open edit
- `mSaveShopEdit()` → `sbReq PATCH shopping_list` (name, store, due_date, default_start_time)

### Touch drag reorder
- `_mShopTouchDrag(row, store)` — drag reorder within a store group
- Updates `shop_order` for all items in group → `sbReqSilent PATCH shopping_list`
- 12px threshold; cancelled if scroll detected

### Desktop stubs wired up
- `renderShopOv()` / `renderShopFull()` → call `mRenderShop()` when on shop tab
- `tiDblShop(e, id)` → `mOpenShopEdit(id)` (works from Today/Week tabs too)

### Meals sheet (`#mMealsSheet`) — 🍽 header button
- `mOpenMeals()` / `mCloseMeals()` / `mRenderMeals()` — this week's planned meals (`_mealsForWeek()`), remove via `mRemoveMealAndGroceries(recipeId)`
- "+ Add a meal" opens the Recipe picker sheet (`mOpenRecipes()`/`#mRecipeSheet`) stacked on top (z-index 102/103, above the Meals sheet's 100/101) — tap a recipe → `mAddRecipeToMealPlan(id)` → `addRecipeToMealPlan`/`_grocAddRecipe` (features.js) → `mRenderMeals()` refresh

### Full List sheet (`#mFullListSheet`) — red HEB header button
- `mOpenFullList()` / `mCloseFullList()` / `mRenderFullList()` — the "I'm in the store, what do I need" checklist: merges `st.groceryList` items for next week (Weekly Staples → recipe groups → Other → Done, same grouping as before) **plus** undone `st.shopping` items where `store==='HEB'` (a "Shopping List" group) — previously these were two disconnected views; this is the fix for that split
- `mToggleFullListHeb(id, checked)` wraps `togShop()` + re-render (checking off an HEB item here must also update the plain Shop list)
- Inline add row at the bottom → `mAddGrocItem()` (targets `#mFullListNewName`)

---

## Month

Continuous scroll of weeks across multiple months (like iOS Calendar's list view), NOT a traditional single-month grid. Full bottom-nav tab (`#mMonthPage`), not a modal.

### Layout
```
#mMonthPage
  #mMonthDayHdr    ← M T W T F S S (Monday-start, matching the rest of the app — NOT Sunday-start like iOS)
  #mMonthScroll    ← the scrolling region (see height sync below)
    #mMonthWeeks   ← one .m-mo-week grid row per week — TWO partial rows when a week
                      crosses a month boundary (see below), month-name divider before each
  #mMonthDetail    ← tap-a-day detail list, elevated card, pinned below the scroll region
```
The month/year nav controls do NOT live inside `#mMonthPage` any more — they live in the shared `#mHeader` (see Header section) so "it's all in the header": `#mMonthHeaderControls` (month name + year, top-left) and `#mMonthTodayNav` (centered Today/‹/› group), both toggled visible by `mShowTab` only when `_mCurTab==='month'`. The old `#mMonthNav`/`#mYearView` (single "August 2026 ▾" title + 12-month grid picker) are retired.

### Header controls (`#mMonthHeaderControls` / `#mMonthTodayNav`, in `#mHeader`)
- `#mMonthTitle` (month name, e.g. "August") and `#mMonthYearBtn` (year, e.g. "2026") are two INDEPENDENT dropdown triggers — `mToggleMonthDrop()`/`mToggleYearDrop()` open `#mMonthMonthDrop` (Jan–Dec list, current month marked `.is-current`) / `#mMonthYearDrop` (current year ±5), absolute-positioned popovers under their trigger (same idiom as the `.m-cpick-opts` category picker), closed on outside-tap via the same document click listener `mInitPickers()` already registers (extended to also check `#mMonthHeaderControls`).
- `mPickMonth(mi)` / `mPickYear(yr)` resolve the OTHER value from `_mMonthDisplayedMo`/`_mMonthDisplayedYr` (tracked by `_mUpdateMonthTitle` from whichever row is docked at the top) so picking just a month keeps the current year and vice versa, then call `mMonthJumpToOffset(offset)` (unchanged, reused verbatim).
- `#mMonthTodayBtn` (in `#mMonthTodayNav`, alongside the pre-existing `mMonthJump(-1)`/`mMonthJump(1)` ‹/› buttons) calls `mOpenMonth()` directly — this replaces the old shared `#mGoTodayBtn`'s job on this tab (that button is Week-only now, see Header section).
- `#mMonthAddBtn` (in the header's right-side icon-button cluster, month-only) → `mMonthAddTask()`: opens `#mFullAddSheet` pre-filled to `_mMonthSelectedDs` (or today if unset) — same day-scoping idea as Week's `mWkAddTask(ds)`.

### Explicit height sync (`_mSyncMonthScrollHeight`) — CRITICAL
`#mMonthScroll` does NOT rely on the `flex:1`/`min-height:0` chain alone to stay bounded — that was tried first and failed on-device (content taller than the screen, whole page trying to grow instead of the calendar scrolling internally, which also fed wrong reference points into the ‹/› month-jump logic). Instead: `window.innerHeight - header.getBoundingClientRect().bottom - navHeight - dayHdrHeight - detailHeight - 12`, computed from real viewport measurements, applied as `scroller.style.height` (with `flex:'none'` to stop it fighting with the CSS `flex:1` fallback). Called: on `mOpenMonth()` (next rAF), on `window resize` (guarded to `_mCurTab==='month'`), and after every `mMonthSelectDay()` (detail panel's height varies with its task count up to its own `max-height:26vh` cap).

### Scroll-to-position — use scrollTop math, NOT `scrollIntoView()`
`_mMoScrollToMonthStart()` and `mMonthJumpToOffset()` compute `row.getBoundingClientRect().top - scroller.getBoundingClientRect().top` and add it to `scroller.scrollTop` directly. `scrollIntoView()` was tried first and can walk up and scroll ANY scrollable ancestor it finds along the way (e.g. the document), which visibly shifted the sticky header relative to content. Direct `scrollTop` math only ever touches `#mMonthScroll` itself. Same reasoning applies to `_mWkScrollToToday` (Week tab) — already used manual math there.

**Default scroll target is day 1 of the current month, NOT today's own row** (`_mMoScrollToMonthStart`, formerly `_mMoScrollToToday`) — today can be mid-month, which read as "starting halfway through the month". Today's cell still gets the `.is-today` circle regardless; only the scroll target changed. Also required `#mApp{height:100dvh}` (was `min-height`) — `min-height` let `#mApp` grow taller than the viewport when content demanded it, which forced the outer document to scroll, which made the sticky `#mHeader` engage relative to THAT scroll and visually overlap the month grid's top row. `height:100dvh` clamps it so the document can never scroll and the header can't drift out of place, on any tab.

### Infinite scroll (mirrors Week tab's pattern)
- `_mMoRenderedLo`/`_mMoRenderedHi` — week offsets currently rendered (default −6..6 on open)
- `mInitMonthScroll()` — scroll listener, rAF-throttled (batches title update + load-more threshold checks into one tick — was previously running on every raw scroll event, which is real layout-thrashing jank on a real device)
- `_mUpdateMonthTitle()` — tracks which month is docked at the top via **one `elementFromPoint()` hit-test**, NOT iterating every rendered row with `getBoundingClientRect()` (that was the layout-thrashing bug: 13+ rows × `getBoundingClientRect()` on every scroll frame)
- `_mRenderMonthWeeks(reset)` — `reset=true` only on explicit tab-open/`mGoToday()`; background sync re-renders (`reset=false`, from `renderAll()`) preserve `scroller.scrollTop` so a 30s sync can't yank the view while browsing other months
- `mMonthJump(dir)` / `mMonthJumpToOffset(monthOffset)` — ‹/› buttons (now in `#mMonthTodayNav`, see Header controls above)

### Long-press-drag across days → create a travel task
`mInitMonthDrag()` (called once from `mInit()`), delegated on `#mMonthWeeks` so it survives re-renders — same long-press idiom as `mInitBlockDrag`/`mInitWkDrag`: `touchstart` on `.m-mo-day[data-ds]` arms a 480ms timer (a plain tap before it fires still reaches `mMonthSelectDay`'s own `onclick` normally); on fire, locks `#mMonthScroll` `overflowY:hidden` and starts tracking; `touchmove` (dynamic `passive:false`) re-hit-tests via `elementFromPoint` (naturally skips `.m-mo-day-empty` placeholders — `pointer-events:none`) and highlights the inclusive date range with `.m-mo-day.drag-selected`; `touchend` restores scroll, clears highlights, and — only if the drag actually moved to a different day (`startDs !== endDs`; a same-cell long-press is not a drag) — opens `#mFullAddSheet` forced into Travel mode (`mSelectCat('fulladd','Travel')`) with `#mFullAddDue`/`#mFullAddEnd` pre-filled from the dragged range's min/max regardless of drag direction.

### Per-day color breakdown (`_mMonthDayBadge`, `_mMonthDotStyle`, `_mMonthCatKey`)
- Built from `mGetDayTasks(ds, weekOff)` — **the exact same call the tap-to-detail panel uses** (`_mRenderMonthDetail`). This is load-bearing: an earlier version used a separate, narrower data source for the badge and it silently missed WR recurring/WR rules/pup sessions/travel/birthday/video-step items, and disagreed with the detail panel. If badge/detail ever look like they disagree again, check whether the badge is on `mGetDayTasks` or something else first.
- `_mMonthCatKey(t)` — category key, explicit branches for shop/vid/vidstep/birthday/holiday/travel/weekly_reset(WR)/recurring, falls back to `t.category`. Shared by badge AND detail panel — never duplicate this logic inline, always call it.
- `_mMonthDotStyle(t)` — color priority: overdue (`OV`, requires `!t.done`) > important (`IMP`, requires `!t.done`) > category (`gc(_mMonthCatKey(t))`). **The badge's grouping key and its color must be derived from the exact same `isOverdue`/`isImportant` booleans per item** — an earlier version computed the grouping key with a check that didn't require `!t.done` while the color came from a separately-computed value that did, so a done task could land in the wrong bucket and the bucket's color became whichever task was processed last (looked like "random" mismatches). Fixed by computing both from one shared per-item calculation.
- Travel is excluded from the badge (`t._type!=='travel'`) — it gets its own spanning bar (below) instead; counting it in both would be redundant.
- Done tasks ARE included (plain category color, no overdue/important override — same convention as everywhere else) so a fully-completed day doesn't go blank.
- Single category present → `.m-mo-dot`; 2+ → segmented `.m-mo-bar`, ordered by `Object.keys(CATS)` order with `_overdue`/`_important` pulled to the front (rank -2/-1).
- `.m-mo-num` has a FIXED box size (21×21) applied to EVERY day, not just `.is-today` — the circle background/color is conditional but the box dimensions never change. An earlier version only fixed the size on `.is-today`, so today's cell had a taller number box than its neighbors, throwing off row alignment (the badge slot below it sat lower than the same row's other days).

### Month-boundary row split (like iOS Calendar's continuous list)
`_mMoWeekRowHtml(weekOff, forceLabel)` — when a Mon-Sun week crosses into a new month (detected by scanning `dates[1..6]` for a `getMonth()` change), the row SPLITS into two partial `.m-mo-week` rows at exactly that boundary: outgoing month's tail days on one line, a `.m-mo-month-divider` label, then the incoming month's days starting fresh on the next line. Both partial rows stay real 7-column grids — the days that belong to the OTHER partial row render as blank `.m-mo-day-empty` placeholders (no `data-ds`, `pointer-events:none`) so both rows still line up under the `#mMonthDayHdr` M/T/W/T/F/S/S header. This is what makes it "obvious what belongs to each month" (the ask that drove this — a single row silently containing days from two different months wasn't clear enough). Both partial rows carry the same `data-wk="${weekOff}"` (harmless — nothing looks up "the one row for weekOff X" any more, see below) but each gets its OWN accurate `data-mon` (used by `_mUpdateMonthTitle`).
- **Lookups now target the date, not the row**: `mMonthJumpToOffset`/`_mMoScrollToMonthStart` find the target day via `.m-mo-day[data-ds="..."]` then `.closest('.m-mo-week')` — looking up by `data-wk` alone would risk landing on the WRONG partial row (the tail of the prior month) when the target week is split.

### Travel bar (multi-day, like iOS Calendar's all-day event bars)
`_mMoTravelBarsHtml(dates, colStart, colEnd)` — per rendered row, one `.m-mo-travel-bar` per overlapping trip. `colStart`/`colEnd` (0-6 inclusive) clip a trip's bar to one partial row's column range when its week is split at a month boundary — same 7-column percentage math applies to both partial rows since each is still a full 7-column grid. Full-height (`top:2px;bottom:2px`), `opacity:.18`, `z-index:0` (`.m-mo-day` is `z-index:1` so day numbers/dots always render on top, never behind the bar). Left/width computed as column-index percentages, inset `±2px`/`∓4px` so two different trips landing on adjacent days show a visible gap instead of touching edge-to-edge (safe — only affects a trip's own outer edges, never day boundaries within one trip's own bar). Rounded corners (`5px`) only at the trip's TRUE start/end AND only when that end falls within the current segment — square everywhere else, so a trip spanning multiple weeks (or a month-boundary split) still reads as one continuous pill.

---

## More (`extras` tab) + Recipes

`#mExtrasPage` — mostly a placeholder for future task-type shortcuts (Travel, Birthdays, etc. — not built yet), but has two real buttons today (`.m-extras-btn`): **Timeblock** (`mShowTab('tb')`) and **Recipes** (`mShowTab('recipes')`).

### Recipes page (`#mRecipesPage`)
Real sub-page (not a sheet/popup — a popup was tried first and its backdrop covered the bottom nav, making it unclickable while open). `.m-back-btn` ("‹ More") returns via `mShowTab('extras')`. Read-only browse: `_mRenderRecipesBrowse()` lists `st.recipes` (name + ingredient count via `_parseIngredients()` from features.js), tap a row (`mToggleRecipeExpand(id)`) to expand/collapse its ingredient list + meta (`meal_type`/`time`/`servings`) inline. No meal-plan side effect — that's what the Meals sheet's recipe picker (`mOpenRecipes()`) is for.

---

- All `<input>` and `<textarea>` must have `font-size: 16px` minimum — otherwise iOS auto-zooms on focus
- Use `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` for notch/home indicator padding
- No HTML5 drag-and-drop (`ondragstart` etc.) — not supported on iOS Safari
- All drag interactions use touch events (`touchstart`, `touchmove`, `touchend`)
- `passive: true` on all touch listeners unless `preventDefault()` is required (scroll-lock during drag)
- When scroll-lock is needed during drag: set `element.style.overflowY = 'hidden'` rather than `passive: false` where possible
- Add `passive: false` touchmove to `document` dynamically only during active drag, remove on touchend

## PWA & Caching
- `mobile-manifest.json` (not `manifest.json`) — `start_url: /mobile.html`, `display: standalone`
- `mobile.html` links: `<link rel="manifest" href="mobile-manifest.json">`
- `mobile-sw.js` — network-first service worker. Always fetches from network; deletes all caches on activate. Solves iOS standalone PWA aggressive caching. Registration (bottom of mobile.html) now calls `reg.update()` on load AND on `visibilitychange` (re-checks for a new worker on every foreground).
- **Self-update mechanism** (inline `<head>` version-checker): fetches `mobile-version.json` (no-store) and, on mismatch, does `location.replace(pathname+'?b='+ver)` — a NEW url iOS has never cached. Do NOT use `location.reload()`: iOS serves a reload straight from the standalone PWA app-shell cache, so it never actually updates (can loop). Guard: if `?b` already equals the server version, stop (no loop).
- `_headers` sets `no-cache` on all mobile files so Cloudflare Pages doesn't cache stale versions
- Script tags use `?v=YYYYMMDD` cache-busting params. **Every deploy bump ALL of:** `_BUILD` const in mobile.html + `mobile-version.json` + asset `?v=` queries + `mobile-sw.js` VERSION. This lets a stuck installed PWA self-heal on next foreground — **no reinstall needed** (fully close + reopen on wifi, may take 2 opens).
- **Vendored assets** (see core.md): `supabase.min.js` and `fonts/dmsans.css` load same-origin — never from a CDN (blocked on this user's devices; caused `supabase is not defined` login failures + broken fonts).

## Deployment
- Dev: `https://dev.sams-dashboard.pages.dev/mobile.html`
- Production: follow `rules/deploy.md`
- iOS PWA caching: the service worker handles cache busting. If user still sees stale content, the service worker may not have installed yet — needs a FULL close (swipe away in the app switcher, not just backgrounding) + reopen on wifi, occasionally twice.
- **Before assuming a "still not working" report means the code is wrong**: verify what's actually deployed first — `git show origin/dev:mobile-overview.js \| grep <the new code>` (and `mobile.html` for the `_BUILD` string) — rather than re-diffing/re-editing code that may already be correct and just stuck behind device-side caching or a build-target mismatch (dev vs production, see below).

---

## Init Flow

```js
async function mInit() {
  load();              // load localStorage → st
  _mSetDate();         // set header date label
  mInitPickers();      // build all 4 category pickers
  mInitSwipe();        // swipe-to-delete on #mTodayList
  mInitPTR();          // pull-to-refresh on #mMain
  mInitTBSwipe();      // day-swipe on #mTLScroll
  mInitBlockDrag();    // longpress-drag on #mTLCol
  mInitWeekSwipe();    // week-swipe on #mWeekPage
  mInitWkDrag();       // task drag on #mWeekList
  mInitMonthDrag();    // longpress-drag on #mMonthWeeks → create travel task
  const authed = await checkAuth();
  if (!authed) return; // showLoginOverlay() called by core.js
  hideLoginOverlay();
  await syncAll();     // fetch from Supabase → renderAll()
  mShowTab(localStorage._mLastTab || 'today'); // restore last tab (validated against tab list)
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}
document.addEventListener('DOMContentLoaded', mInit);
```

### Foreground re-sync
After the 30s `setInterval`, `mInit` adds `visibilitychange`/`pageshow`/`focus` listeners → `syncAll(true)` (3s dedup guard). iOS freezes `setInterval` while the PWA is backgrounded, so without this, reopening shows stale data (completed-elsewhere tasks reappear, deleted items linger). This is the mobile-side defense against stale-cache complaints — the DB is the source of truth; force a re-pull on every foreground.

### Live re-render after toggle
`togRecVirt` (and other mobile togglers) MUST call `renderAll()`, not just `mRenderToday()` — otherwise checking a recurring task while on the Week tab doesn't update that tab. `renderAll()` re-renders whichever tab is current. `togWrRule` drifted to `mRenderToday()`-only and was fixed 2026-08-26 — when adding/touching any toggler (`toggleTask`, `togRec`, `togShop`, `togWrRule`, `togRecVirt`, ...), grep all of them for `mRenderToday()` without a following `renderAll()` in the same statement.

### Today-tab lookback must extend forward, not just back 4 weeks
`mGetTodayTasks`'s three "check the last 4 weeks for a pinned/carried instance" loops (plain recurring, legacy `wrec`, `wrRules`) all start from week 0 by default — correct only while viewing today. Swiping the Today tab forward (`_mTodayOffset` can go positive, mobile-overview.js:1274) views a FUTURE day, and a loop hardcoded to start at week 0 never reaches that future week's own pinned items. Mirrors desktop's `_wkHi=Math.max(0,_dayWkOff)` pattern (overview.js): compute the viewed day's week offset (`_mDayWkOff`) once, start each loop at `_mWkHi=Math.max(0,_mDayWkOff)` and end at `_mWkLo=Math.min(0,_mDayWkOff)-4`. Fixed 2026-08-26 (was hardcoded `for(let w=0;w>=-4;w--)` in all three).

### Auth flow
`checkAuth()` (core.js) calls `showLoginOverlay()` if no session found.
`mDoLogin()` → `doLogin_m(email, pass)` → `_sbClient.auth.signInWithPassword()` → sets `_authToken` → `hideLoginOverlay()` → `syncAll()`
- **`doLogin_m` is try/catch wrapped** and shows any failure in `#mLoginErr` (missing supabase lib, bad network, no session). Never let it fail silently — a silent failure reads to the user as "the button does nothing". If a user reports the login button not working, first ask what the RED error says.
- **Login markup**: inputs + button are inside `<form onsubmit="event.preventDefault();mDoLogin();return false">` with `<button type="submit">`, so the iOS keyboard's Return key submits (button tap not required). `#mLogin` is `justify-content:flex-start` + `padding-top:14vh` (NOT `center` — centering parked the button under the iOS keyboard, making it untappable). Button has transparent tap-highlight, so "no flash on tap" is normal and ≠ tap not landing.

### Login overlay (mobile override)
Mobile overrides `showLoginOverlay(event)` and `hideLoginOverlay()` from core.js:
- `_mLoggedIn` flag prevents transient auth events (token refresh) from showing login
- **Desktop `core.js`**: `onAuthStateChange` never shows login overlay — network blips (DNS `ERR_NAME_NOT_RESOLVED`) cause false `SIGNED_OUT`. Login gated by `checkAuth()` on page load only.
- Mobile has its own `showLoginOverlay` override with `_mLoggedIn` guard
