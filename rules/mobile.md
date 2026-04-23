# Mobile Dashboard Rules

> **CRITICAL**: The mobile app is a separate PWA that shares the same Supabase backend as the desktop web app.
> - **NEVER touch**: `index.html`, `overview.js`, `features.js` (except stubs already in mobile-overview.js), `core.js`, `style.css`, `manifest.json`, or any desktop-only JS/CSS.
> - **Mobile-only files**: `mobile.html`, `mobile.css`, `mobile-overview.js`, `mobile-manifest.json`, `_headers`
> - The desktop web app runs in a separate terminal — changes to shared files will break it.

---

## Architecture

### File roles
| File | Purpose |
|------|---------|
| `mobile.html` | Shell: login, app wrapper, all three tab pages, all bottom sheets, hidden undo scaffold |
| `mobile.css` | All mobile styles. CSS vars match desktop (`--accent:#7c6af7`, `--bg`, `--glass`, etc.) |
| `mobile-overview.js` | All mobile logic. Loaded after `core.js` + `features.js`. Sets `window._mobileMode = true` |
| `mobile-manifest.json` | PWA manifest with `start_url: /mobile.html` (separate from desktop `manifest.json`) |
| `_headers` | Cloudflare Pages cache-control: `no-cache, no-store, must-revalidate` for all mobile files |

### Script load order (mobile.html)
```
supabase CDN → core.js → features.js → mobile-overview.js
```
`core.js` and `features.js` are shared — **never modified for mobile**. All mobile-specific logic goes in `mobile-overview.js`.

### Desktop stubs (top of mobile-overview.js)
All desktop render functions are no-ops or redirect to mobile equivalents:
```js
function renderAll()   { mRenderToday(); if (_mCurTab==='tb') mRenderTB(); if (_mCurTab==='week') mRenderWeek(); }
function renderToday() { mRenderToday(); }
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
let _mAddCat   = 'Home';  // add task bar
let _mEditCat  = 'Home';  // edit task sheet
let _mBlockCat = 'Home';  // block sheet
let _mWkAddCat = 'Home';  // week day add sheet
```

### Picker types and DOM IDs
| which | dot | lbl | opts |
|-------|-----|-----|------|
| `'add'`   | `mAddPickDot`   | `mAddPickLbl`   | `mAddPickOpts`   |
| `'edit'`  | `mEditPickDot`  | `mEditPickLbl`  | `mEditPickOpts`  |
| `'block'` | `mBlockPickDot` | `mBlockPickLbl` | `mBlockPickOpts` |
| `'wkadd'` | `mWkAddPickDot` | `mWkAddPickLbl` | `mWkAddPickOpts` |

`mTogglePick(which)` — opens one, closes others.
`mSelectCat(which, cat)` — sets state var + updates dot/label.
`mInitPickers()` — builds option lists + sets up outside-tap close listener.

---

## Tab System

### State
```js
let _mCurTab = 'today'; // 'today' | 'tb' | 'week'
```

### `mShowTab(tab)`
- Shows/hides `#mTodayPage`, `#mTBPage`, `#mWeekPage`
- Hides `#mAddBar` on non-today tabs
- Sets `#mApp` padding-bottom:
  - today: `calc(162px + env(safe-area-inset-bottom))` (nav 52 + add bar ~110)
  - tb/week: `calc(52px + env(safe-area-inset-bottom))` (nav only)
- Updates `#mHeaderTitle`, hides `#mProgress` on non-today tabs
- Sets `#mMain` padding: `12px 16px` on today, `0` on others
- On tb: resets `_mTBOffset=0`, calls `mRenderTB()`, `_mScrollNow()`
- On week: resets `_mWeekOffset=0`, calls `mRenderWeek()`

### Bottom nav
```html
<nav id="mNav">
  <button class="m-nav-btn active" onclick="mShowTab('today')">Today</button>
  <button class="m-nav-btn" onclick="mShowTab('tb')">Timeblock</button>
  <button class="m-nav-btn" onclick="mShowTab('week')">Week</button>
</nav>
```
Fixed at bottom, `height: calc(52px + env(safe-area-inset-bottom))`.

---

## Tab 1: Today

### Key functions
- `mGetTodayTasks()` — mirrors desktop `renderToday()` logic exactly. Returns sorted array of all task types for today (regular, recurring virtual, WR recurring, WR rules, shopping, pup sessions, travel/birthday extras). Overdue tasks included.
- `mSortToday(tasks)` — done→bottom, overdue→top, type priority order
- `mRenderToday()` — renders `#mTodayList` + updates `#mProgress`
- `mTaskRow(t)` — generates row HTML with: checkbox, name, color dot, edit pencil (regular tasks only), swipe wrapper with `data-tid`

### Task row types
- Regular task: checkbox → `toggleTask()`, pencil → `mOpenEdit(id)`
- WR rule: checkbox → `togWrRule(ruleId, checked, wkKey)`
- WR recurring: checkbox → `togRec(recId, checked, wkKey)`
- Non-WR recurring virtual: checkbox → `togRecVirt(recId, checked, wkKey)`
- Shopping: checkbox → `togShop(shopId, checked)`
- Pup session: checkbox → `togPupSessionDone(sessId, checked)`
- Travel/birthday: no checkbox (📅 icon), no swipe

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
- Two rows: text input + [category picker | Add button]
- `mAddTask()` → optimistic local add → `sbReq POST tasks` → replace temp id with real

### Edit task sheet (`#mEditSheet`)
- `mOpenEdit(id)` / `mCloseEdit()` / `mSaveEditTask()` / `mDeleteEditTask()`
- Bottom slide-up sheet with backdrop
- `mSaveEditTask()` → `sbReq PATCH tasks`
- `mDeleteEditTask()` → `sbReq DELETE tasks`

---

## Tab 2: Timeblock

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
- `mRenderUnassigned()` — shows today's regular tasks not yet assigned to a block on the displayed day
- Task has no block when no `st.blocks` entry with matching `taskId` and `ds`
- Tap chip: `mSelectChip(taskId)` toggles `_mSelectedChipId`
- Selected chip: blue/accent, shown with `::before` dot using CSS custom props `--cdot`, `--cborder`

### Timeline rendering (`mRenderTimeline()`)
- Hour lines: absolutely positioned in `#mTLLabels` (and extend across `#mTLCol`)
- Blocks: absolutely positioned in `#mTLCol` by `top = (sm - M_TB_START) * M_PX`
- Block height: `Math.max(dur * M_PX, 28)`
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

## Tab 3: Weekly View

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
- Sorted: undone first, then alphabetical

### Week task rows (`mWkTaskRow(t)`)
- Regular (non-virtual): `data-tid` + `data-tname` for drag; checkbox → `toggleTask()`
- Recurring virtual: checkbox → `togRecVirt(recId, done, wkKey)`
- Shopping: checkbox → `togShop(shopId, done)`
- No edit button in week view (use Today tab for edit)

### Week navigation
- `‹` / `›` buttons call `mWeekPrev()` / `mWeekNext()` → adjust `_mWeekOffset`, re-render
- Swipe left/right on `#mWeekPage`: `mInitWeekSwipe()` — same 60px + angle threshold as TB swipe
- Blocked when `_mWkDrag` is active

### Drag-to-reschedule (between days)
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

## iOS-Specific Rules

- All `<input>` and `<textarea>` must have `font-size: 16px` minimum — otherwise iOS auto-zooms on focus
- Use `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)` for notch/home indicator padding
- No HTML5 drag-and-drop (`ondragstart` etc.) — not supported on iOS Safari
- All drag interactions use touch events (`touchstart`, `touchmove`, `touchend`)
- `passive: true` on all touch listeners unless `preventDefault()` is required (scroll-lock during drag)
- When scroll-lock is needed during drag: set `element.style.overflowY = 'hidden'` rather than `passive: false` where possible
- Add `passive: false` touchmove to `document` dynamically only during active drag, remove on touchend

## PWA
- `mobile-manifest.json` (not `manifest.json`) — `start_url: /mobile.html`, `display: standalone`
- `mobile.html` links: `<link rel="manifest" href="mobile-manifest.json">`
- `_headers` sets `no-cache` on all mobile files so Cloudflare Pages doesn't cache stale versions

## Deployment
- Dev: `https://dev.sams-dashboard.pages.dev/mobile.html`
- Production: follow `rules/deploy.md`
- Hard refresh on iOS: Settings → Safari → Advanced → Website Data → delete, or use the ↻ reload button in the app header

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
  const authed = await checkAuth();
  if (!authed) return; // showLoginOverlay() called by core.js
  hideLoginOverlay();
  await syncAll();     // fetch from Supabase → renderAll()
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}
document.addEventListener('DOMContentLoaded', mInit);
```

### Auth flow
`checkAuth()` (core.js) calls `showLoginOverlay()` if not authed.
`mDoLogin()` → `doLogin_m(email, pass)` → `_sbClient.auth.signInWithPassword()` → sets `_authToken` → `hideLoginOverlay()` → `syncAll()`
