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
| `mobile-today.html` / `mobile-month.html` / `mobile-shop.html` | Dedicated home-screen entry points — see "Home Screen Icons" below. Plain file copies of mobile.html; only the `<head>` tags + one inline var differ. Keep body/script-include changes mirrored across all four when editing mobile.html's shell. |
| `mobile-today-manifest.json` / `mobile-month-manifest.json` / `mobile-shop-manifest.json` | One manifest per dedicated entry point, same shape as `mobile-manifest.json` |
| `mobile-sw.js` | Network-first service worker — always fetches from network, no caching. Registered in mobile.html |
| `_headers` | Cloudflare Pages cache-control: `no-cache, no-store, must-revalidate` for all mobile files |
| `icons/icon-{today,month,shop}-{180,192,512}.png` | Per-icon home-screen assets — see "Home Screen Icons" below |
| `icons/source/*.png` | User-provided source art for Today/Month's icons, kept in-repo (not Downloads) so it survives a Downloads cleanup |

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

## Dark Mode
Toggle lives on the **More tab** (`#mExtrasPage`, a `.m-extras-btn` row — NOT in a settings popup like desktop), calls `mToggleDark()` which wraps the shared `toggleDark()` (features.js). Reuses `cfg.dark` (same persisted flag as desktop) and desktop's `body.dark` class — mobile does NOT have its own separate dark-mode flag.
- **`mToggleDark()` is the final word on mobile's `--bg`, not `toggleDark()` alone** — `toggleDark()`'s background handling (`applyTheme()`) is built for desktop's decorative gradient themes and always re-sets `--bg` to a `THEMES[...]` value regardless of what mobile wants, so `mToggleDark()` force-sets the correct flat mobile value (`#16141f` dark / `#f5f4f8` light) right after calling it, every time.
- Forces a reflow on `#mHeader` and `#mNav` after the toggle — a sticky-positioned element on iOS Safari can keep its previous composited background on-screen when only a CSS custom property changes with no accompanying layout trigger; `void el.offsetHeight` fixes it immediately rather than waiting for the next repaint.
- `mInit()` applies `cfg.dark` the same way (flat `--bg`, not `toggleDark()`'s desktop-oriented path) right after `load()`, mirroring desktop's own `init()` ordering.
- All mobile CSS uses the same `:root` / `html.init-dark` two-block variable pattern as desktop (`rules/dark-mode.md`) — new mobile-only elements (e.g. the Liquid Glass nav's `--nav-*` vars) follow that same pattern, just scoped to mobile.css.
- **Build stamp** (`.m-build-stamp`, **More tab only** — removed from the login screen 2026-10-16, it read as "random text" right under the login prompt): self-populates from `window._BUILD` (set inline in each entry file's `<head>`) on every `mInit()` — a permanent diagnostic, not removed after use. Lets a "did my change actually load" question be answered by looking at the screen instead of guessing at PWA cache state — this is how the Today/Month icon staleness bugs below got diagnosed.

---

## Home Screen Icons (four separate PWA entry points, one codebase)

Dashboard (`mobile.html`), Today, Month, and Shop are each their own installable
home-screen icon, added independently via Safari's Share → Add to Home Screen —
but all four load the exact same `mobile-overview.js`/`core.js`/`features.js`/
`mobile.css`. Only three things differ per entry point, all static in the
dedicated file's `<head>` (no JS swap — see "Why static, not dynamic" below):
`<link rel="manifest">`, `<link rel="apple-touch-icon">`, and one inline
`window._mForceTab = 'today'|'month'|'shop'` line (Dashboard sets none — it
keeps the normal last-tab-restore behavior).

### Why static files, not a dynamic swap (don't try this again)
Two earlier approaches were tried and ruled out by real testing, in order:
1. **Client-side JS swap** — one shared `mobile.html`, with a `<head>` script
   reading `?tab=today` and rewriting the manifest/icon/title tags before the
   user taps Add to Home Screen. Worked perfectly as a normal page load, but
   the *installed icon* never picked up the swap — confirmed by visiting the
   URL directly (shows Today correctly) vs. adding it to the home screen
   (installs with the default icon/manifest regardless). iOS appears to
   resolve the manifest for "Add to Home Screen" independent of this JS.
2. **Server-side rewrite via a Cloudflare Pages Function** (`functions/mobile.js`,
   using `HTMLRewriter` to rewrite the same three tags before the HTML left
   the server) — this caused a real production outage: it created an infinite
   redirect loop on `/mobile` (confirmed via `curl -v` trace: `/mobile` → 308 →
   `/mobile` forever), because it conflicted with Cloudflare Pages' own
   automatic `.html`-stripping redirect for that same path. Reverted
   immediately. **Do not add a Function at a path Cloudflare's automatic
   clean-URL redirect already owns** (any bare `.html` file's clean path).

What actually works: a plain static file per icon, each with the three tags
already correct in the raw HTML from byte one — nothing to race, nothing to
rewrite server-side, no competing redirect rule (each is a brand-new path, not
one Cloudflare was already handling). `mobile-today.html` etc. are just file
copies of `mobile.html` with those tags + `window._mForceTab` changed.

### Making the right tab stick
`mInit()`'s tab-restore line checks `window._mForceTab` before `_mLastTab`:
```js
const _mTabParam = window._mForceTab || new URLSearchParams(location.search).get('tab');
mShowTab(_mValidTabs.includes(_mTabParam) ? _mTabParam : (_mValidTabs.includes(localStorage._mLastTab) ? localStorage._mLastTab : 'today'));
```
This alone only fires on a genuine page load. **Standalone iOS apps usually
resume a suspended webview instead of reloading when you tap the icon again**
— so `_mForegroundSync` (already existed for the data-resync-on-foreground
behavior, see PWA & Caching) also re-checks `_mTabParam` on `visibilitychange`/
`pageshow`/`focus` and snaps back with `mShowTab(_mTabParam)` if it's drifted.

**Tried and reverted: do not add a periodic/every-touch re-snap.** An earlier
version also force-checked on every `touchstart` and every 30s interval tick,
meant as a backstop in case the foreground events didn't fire reliably. It
couldn't tell "just resumed from background" apart from "user is normally
tapping to another tab" — so inside the Today app, tapping Week or Month
immediately snapped back to Today, making navigation away from the forced tab
impossible. Removed; only the `visibilitychange`/`pageshow`/`focus` listener
remains, which doesn't fire on ordinary in-app taps.

### Icon image requirements (No Color / Tinted appearance)
Confirmed against the user's real device screenshots, under iOS's "No Color"
(Tinted) icon appearance — these are hard requirements, not style preferences:
- **Transparent background, not a solid fill.** A flat painted background
  (even white) renders as an opaque flat sticker instead of blending into the
  system's glass material — every other icon on the home screen (including
  third-party apps) renders as translucent glass; a solid-background icon
  visibly doesn't. `icons/icon-{today,month,shop}-*.png` all have real alpha
  (`sips -g hasAlpha` → yes). **`icons/icon-180/192/512.png` (Dashboard) was
  never migrated to this** — still a flat solid-background "S" from earlier
  in the session. Known inconsistency; fix if Dashboard's icon is revisited.
- **Fold luminance into alpha, don't just threshold alpha**, when processing
  source art that encodes detail as shading rather than transparency (true of
  the ChatGPT-generated Today/Month art in `icons/source/`): a plain "zero out
  low-alpha pixels" cleanup flattens darker-but-still-opaque grooves (grid
  lines, ring openings) into one solid blob, since that detail was never in
  the alpha channel to begin with. Converting luminance to alpha (`newAlpha =
  origAlpha * pow(luminance/255, ~1.8)`) turns those darker areas into real
  transparent gaps instead, which survives small icon size.
- Background color choice doesn't matter for No Color rendering (it's
  discarded either way) — darkening or shrinking a painted background was
  tried first and made no visible difference, confirming color/brightness was
  never the actual variable; transparency was.
- Shop's bag glyph was hand-built as a simple flat SVG (not sourced from a
  ChatGPT image) — same bold, single-weight style as Today's sun.

### Clean URLs
Manifests' `start_url` point at the clean path directly (`/mobile-today`, not
`/mobile-today.html?tab=today`) — Cloudflare Pages' automatic `.html`-stripping
redirect handles each of `/mobile`, `/mobile-today`, `/mobile-month`,
`/mobile-shop` identically and safely; skipping the `.html` hop in the
manifest avoids depending on that redirect being followed by whatever resolves
`start_url` at install time.

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
- **`#mApp` reserves NO bottom padding** (2026-09-18+, was `calc(52px+safe)`) — content now scrolls BEHIND the floating glass nav (see Bottom nav below) instead of stopping short of it, so each tab owns its own bottom clearance instead: Today/Shop via `mSyncBarClearance` (below), Week via `#mWeekList`'s static padding, Month via `_mSyncMonthScrollHeight`'s direct viewport math, Timeblock via `#mTLInner`'s static padding. If the nav's own footprint (`bottom`/`height` on `#mNav`) ever changes, every one of those has a hardcoded number that must move with it.
- `mSyncBarClearance(barId, pageId)`: measures the *actual* rendered height of the currently-visible add bar and applies it as the PAGE wrapper's (`#mTodayPage`/`#mShopPage`, not the list/card inside it) `padding-bottom` — applying it to the card itself used to stretch a mostly-empty card down the whole screen. Called for today/shop after render.
- Updates `#mHeaderTitle`. `#mProgress` only shown on today. `#mTodayTBBtn` only shown on today. `#mGoTodayBtn` shown on every tab EXCEPT today (see Header below)
- `#mDateLbl` (date subtitle) is **always visible**, same header height on every tab (`visibility`, not `display`, so hiding it never changes layout) — Today/Timeblock show the swiped-day date; every other tab always shows today's real date
- `main.style.padding`: `12px 16px` on today/shop/recipes, `0` on tb/week/month/extras (pages that manage their own internal layout/scroll)
- `main.style.overflow`: `hidden` on week/tb/month (they own their internal scroll region), default `auto` elsewhere
- Dispatch: `tb`→`mRenderTB()`+`_mScrollNow()`, `week`→`mRenderWeek(true)`+`mInitWeekScroll()`, `month`→`mOpenMonth()`, `shop`→`mRenderShop()`, `recipes`→`_mRenderRecipesBrowse()`, `today`→resets `_mTodayOffset`+`_mSetDate()`

### Header (shared across all tabs)
```html
#mHeader
  #mHeaderTitleWrap (hidden on month) ← h1#mHeaderTitle + #mDateLbl, left
  #mMonthHeaderControls (month only)  ← #mMonthYearPill only (see Month section's Year View
                                         subsection — the old two-dropdown month+year picker
                                         and the centered Today/‹/› nav group are both gone)
  #mProgress (today only)             ← circular SVG ring (.m-prog-ring, 30px — same size as
                                         every other header circle), done/total count INSIDE
                                         it, not beside it. Yellow fill until done===total,
                                         green once complete — 0/0 also counts as complete
                                         (green, fully filled), not yellow. r=13.5 in a 30x30
                                         1:1 viewBox (not a scaled-down larger viewBox) so the
                                         ring's outer edge actually reaches the same 30px
                                         footprint the bordered icon circles do. mShowTab's
                                         'today' branch must call mRenderToday() itself (not
                                         just _mSetDate(), which only touches the date text) —
                                         otherwise switching TO Today left the ring showing
                                         stale data until some unrelated render happened to run.
  #mTodayAddBtn (today only)          ← "+" opens the quick-add popup (mToggleQuickAdd()), NOT
                                         the full-add sheet any more (removed 2026-09-21 — see
                                         Add task popup below). Timeblock's header button
                                         (#mTodayTBBtn) was removed the same day — Timeblock is
                                         reachable only from the More page now.
  #mShopHeaderBtns (shop only)        ← 🍽 Meals icon, red "HEB" List badge, then #mShopHdrAddBtn
                                         "+" (mToggleShopAdd) — "+" last so it sits next to reload,
                                         same spot Today's own "+" occupies
  #mMonthSearchBtn (month only)       ← magnifying-glass icon, mOpenMonthSearch() — see Month
                                         section's Search subsection. Sits LEFT of the two below.
  #mMonthTodayBtn (month only)        ← circle sun icon (same SVG/meaning as #mWeekTodayBtn
                                         below — was a bordered text "Today" button inside the
                                         old centered nav group; redesigned to match the other
                                         tabs' icon convention), mOpenMonth(). Sits LEFT of "+".
  #mMonthAddBtn (month only)          ← "+" opens the SAME quick-add popup every tab's "+" does
                                         now (mMonthQuickAdd(), see Add task popup below) — no
                                         longer the heavier full-add sheet.
  #mWeekTodayBtn (week only)          ← sun icon (same SVG as the bottom nav's Today icon, for
                                         recognizable "today" meaning), mWeekGoToday() → mRenderWeek(true)
                                         to jump/scroll back to today WITHOUT navigating away — sits to
                                         the LEFT of #mWeekAddBtn (source order = visual left-to-right)
  #mWeekAddBtn (week only)            ← "+" opens the SAME quick-add popup Today's "+" does
                                         (mWeekQuickAdd() just calls mOpenQuickAdd() — targeting
                                         is handled centrally now, see Add task popup below) —
                                         replaced the old single "go to today" calendar-icon
                                         button entirely (2026-09-22)
  .m-reload-btn                       ← always last, far right
```
`mShowTab(tab)` toggles `#mHeaderTitleWrap` vs `#mMonthHeaderControls`/`#mMonthSearchBtn`/`#mMonthTodayBtn`/`#mMonthAddBtn` based on `tab==='month'`, and `#mWeekTodayBtn`/`#mWeekAddBtn` based on `tab==='week'` — single source of truth for all of the above, see Month section for the controls themselves.

**All header icon buttons are unified 30px circles** (`.m-shop-hdr-icon`, `.m-reload-btn`) — same `width`/`height`/`border`/`color`. Icons are SVGs (stroke-width 2, matching each other), not text glyphs (`+`/`↻` unicode characters were tried first — different glyphs render at inconsistent visual weight/centering even at the same font-size, which is exactly the kind of mismatch a shared SVG spec avoids). The progress ring is the one exception in SHAPE (a ring, not a bordered circle) but matches the other buttons' 30px footprint exactly, per above.

**`#mHeader{min-height:60px}`** (added 2026-09) — a hard floor, deliberately generous enough to exceed every tab's own natural content height (Today/Week's two-line title+date stack, Month's single pill, Shop's icon row). `#mHeader` has no other fixed height and previously just wrapped to whichever tab's content was active, so its bottom-border divider landed at a visibly different Y position depending on the tab (Month's single-line pill made its header noticeably shorter than Today/Week's two-line stack). Pinning the OUTER container is the only way to guarantee the divider is at the same spot on every tab — matching content heights indirectly (e.g. giving just `#mMonthHeaderControls` its own min-height) still left a few px of drift.

### Bottom nav — Liquid Glass (redesigned 2026-09)
Floating inset pill, NOT the old edge-to-edge bar: `#mNav{left:14px;right:14px;bottom:20px;height:56px;border-radius:28px}`, real `backdrop-filter:blur(34px) saturate(220%)`, light/dark tint via `--nav-glass-bg`/`--nav-glass-shadow`/`--nav-icon-inactive`/`--nav-pill-bg`/`--nav-pill-shadow` CSS vars (`:root` vs `html.init-dark`, same pattern as every other themed var). `overflow:hidden` on `#mNav` clips the highlight pill's spring-overshoot to the bar's own rounded edge (else it visibly pokes past on the leftmost/rightmost tabs).
- **`#mNavBackdrop`**: a SEPARATE full-bleed blur layer (`left:0;right:0;bottom:0;height:76px`, behind `#mNav`, `pointer-events:none`) spanning from the pill's top edge down to the true screen bottom — makes the whole bottom strip read as one continuous glass surface (content blurred-through beside/below the pill too), not just the pill itself floating in empty space. `76px` = `#mNav`'s `bottom:20px` + `height:56px`; keep in sync if either changes.
- **`#mNav` itself sits flush at `bottom:20px` with plain fixed numbers — no `env(safe-area-inset-bottom)` term.** Went through several iterations (safe-area-relative, then safe-area-inflated-height) before landing here: inflating the box height by the safe-area amount to keep tap targets clear of the gesture zone stretched it into a tall rectangle with icons stranded near the top — not pill-shaped. A real Instagram screenshot (2026-09-14) confirmed its floating pill does the same — bleeds close to the true edge rather than reserving the full safe-area as dead space.
- **`.m-nav-highlight` (the sliding pill)**: `#mNavMoveHighlight` (mobile-overview.js) computes its `translateX` from the active button's real `getBoundingClientRect()`, with `transitionDuration` SCALED to the actual distance traveled (`260ms` to `550ms`, `260 + dist*0.55`) — a fixed duration made a full end-to-end jump (Today↔More) play at 4x the speed of a one-tab hop, which made its spring-overshoot look proportionally much bigger only on the long jumps. Small icon "pop" (`.m-nav-btn.pop`, keyframe `mNavPop`) fires on the newly-active tab after the slide.
- **Gotcha: measuring while `#mApp` is hidden gives zero rects.** `#mApp{display:none}` until `hideLoginOverlay()` adds `.ready` (see Boot loading below) — `getBoundingClientRect()` on anything inside it collapses to all-zero until then, so a `_mNavMoveHighlight()` call before that point silently lands the pill near Today's slot (x≈-6) no matter which tab is actually active, even though the active button's own `.active`-class color is unaffected (that doesn't depend on layout) — looks like "two tabs selected at once." `mInit()` re-snaps with `_mNavMoveHighlight(false)` right after `hideLoginOverlay()` to fix this up once the nav is actually measurable — needed because `mShowTab(lastTab)` (which calls `_mNavMoveHighlight` itself) now runs earlier, before that point, see Init Flow below.
- Active-icon distinction is a bolder stroke (`stroke-width:2.5` vs `2`), not a filled variant — the icon set (Feather-style) is outline-only by design, no matching filled icons to swap to.
- Icons: Today=sun (not a clock — that belongs to Timeblock), Week/Month=calendar pair (must share the exact same rect `y`/height — Month previously sat 1px off from Week's true center, a copy-paste bug), Shop=bag, More=2×2 grid. All five spans `y:2`→`22` on the `viewBox="0 0 24 24"` — verified via a temporary 3-line debug overlay (icon-top/icon-bottom/label-center, removed once confirmed) after "they look inconsistent" reports; keep any future icon edit within that same box.

---

## Undo

Mobile shares desktop's `undoStack`/`pushUndo`/`doUndo` (core.js) — the toast +
Undo button work identically; mobile's own `mUndo()` (wraps `doUndo()` +
`_mSnack`) and `#mTaskMenuSheet`'s types are the only mobile-specific pieces.

**`_mUn(name)`** (mobile-overview.js): wraps an item's name in quotes,
truncated to 22 chars — `"Milk" added`, `"Dentist appt" edited`. Use this for
any new undo label that names a specific item; generic labels ("Added item")
predate this convention and were upgraded where found, but don't add new ones.

**Coverage as of 2026-10-17** — add, edit, AND delete all push undo for tasks,
shopping items, and timeblocks (previously only some toggles/moves had it;
delete in particular had none at all, confirmed and fixed after a real "no
undo option appeared" report on Week's delete). Also covered: trips, WR/
recurring add+edit+skip+shift, move-to-today (all types), duplicate task,
resize block, schedule task. **Deliberately NOT wrapped**: grocery-list items
(HEB meal planner) — desktop's own `togGroceryItem`/`delGroceryItem`
(features.js) don't have undo either, so mobile matches that existing choice
rather than diverging. Before adding undo to anything new, check whether
desktop's equivalent function already has (or deliberately lacks) it and match
that, rather than deciding fresh each time.

**Task-delete's undo re-POSTs and gets a new id** (mirrors desktop's `delTask`,
features.js — the real DELETE already happened, so undo recreates the row
rather than just restoring local state). This silently orphaned the task's
position in that day's manual drag-order (`_dayOrder`, keyed by id, shared by
Today/Week/Month) until fixed: `mDeleteById` now captures the task's index in
`_dayOrder()[due_date]` before deleting and rewrites that slot to the new id
once the repost resolves. **Any other undo that re-creates a row with a new id
needs the same check** — anywhere a localStorage map is keyed by an item's id,
re-POSTing on undo orphans that entry unless it's explicitly carried over.

**Shop-delete's undo does NOT re-POST** (`mDeleteShopDirect`) — mirrors
desktop's `delShop` (features.js) exactly, including that gap: it restores the
local copy with its old id but never recreates the server row. This is an
existing desktop quirk, kept for parity rather than "fixed" to behave
differently on mobile only.

**Shake-to-undo was built, confirmed working, then removed** (2026-10-19) —
full reasoning in the code comment at the top of where it used to live
(mobile-overview.js, just above `mSaveEditTask`). Short version: iOS doesn't
persist the DeviceMotion permission grant across standalone-app sessions (a
deliberate WebKit choice, not a bug — see the W3C spec discussion), so it
meant a recurring system "Allow Motion & Orientation" prompt with no code-side
fix. Explicitly declined back once that tradeoff was confirmed. Don't rebuild
this without a real answer to the permission-persistence problem first.

---

## Today

### Key functions
- `mGetTodayTasks()` — mirrors desktop `renderToday()` logic exactly. Returns sorted array of all task types for today (regular, recurring virtual, WR recurring, WR rules, shopping, pup sessions, travel/birthday extras). Overdue tasks included.
- `mSortDayTasks(tasks, ds)` — exact port of desktop's CURRENT `sortTasksForDay` tier stack (hard tiers: travel > birthday/holiday > overdue > done, THEN manual `_dayOrder` override, else timeblock-position > important > type-priority > name). `mSortToday(tasks)` just calls this with today's `ds`. Was previously running desktop's OLD pre-2026-08-21 stack (birthday>done>travel>overdue>important>...) with no manual-order tie-break at all — fixed 2026-08-26.
  - **Pup-session task name must be JUST the skill name** (`skill.skill`), not `"{pup}: {skill}"` — desktop's own `renderToday()` uses the bare skill name, and the sort's final tiebreak is alphabetical-by-name, so a mobile-only prefix silently made mobile's order diverge from desktop's even with byte-identical sort code (found 2026-09-19, was the actual root cause of a "mobile sort doesn't match desktop" report — the algorithm was never the bug).
- `mRenderToday()` — renders `#mTodayList` + updates `#mProgress` (the ring — see Header above) + `#mOvBanner` (see "Move All to Today banner" below).
  - **Empty-list states** (2026-09-22): the same checkmark icon (`.m-empty-icon`) covers TWO distinct cases, told apart only by the label under it — a day with tasks that are ALL checked off gets `.m-empty-txt` = "All done for today"; a day with NO tasks at all gets the same icon with a blank label (nothing to declare "done"). Previously only the true-empty case showed this screen, and it wrongly carried the "All done" text; a fully-completed day just rendered its (all-checked) rows instead of this screen.
- **`_dayOrder` now syncs across devices** (2026-09-21) — previously per-device localStorage only (desktop and mobile could each have a different manual order for the same day and neither ever saw the other's). Fixed by adding `day_order:'_dayOrder'` to `_KV_MAPS` (core.js, shared) — reuses the existing `client_kv` generic key→JSON sync table (same mechanism `vid_day_map`/`vid_step_day_map` already used), not a new table. Migration `015_day_order.sql` just seeds the key; `_dayOrder()`/`_dayOrderSet()` on both platforms already read/write the exact localStorage key `_kvSyncMaps` mirrors, so no other code changed. First sync after the seed can have one device's pre-existing local order silently overwrite the other's (last-pushed-wins) — expected one-time settling, not an ongoing bug.
- `mTaskRow(t)` — generates row HTML: checkbox, name, "move to today" button (overdue only). Color priority: overdue (`OV`) > important (`IMP`, `t.important && !t.done`) > category (`gc(catKey)`) — no "not on timeblock" arrow indicator (removed, was `.m-row-arrow`/`▸`, considered visual noise).
  - **Left color band**: a 3px inset rounded bar (`position:absolute;left:6px;top:8px;bottom:8px`, thinned from 4px/7px-inset 2026-09-21 — read as slightly heavy once the row card background went away, see "Flat list, no card" below), two-tone — light fill (`s.bg`) + darker 1px outline (`s.d`), same color PAIR the old dot used, not a single flat vivid line.
  - **Checkbox**: neutral circle (`.m-chk-wrap input[type=checkbox]`, 19px, drawn via `::after` same technique as desktop's `.chk`) that fills neutral grey + white checkmark when checked — explicitly NOT colored by category (the left band already carries that). Unchecked-state stroke firmed up 2026-09-21 (`rgba(180,170,210,.45)` → `rgba(107,104,128,.55)`, matching `--sub`) — the original read as too washed-out/disabled-looking.
  - **Row press feedback**: `.m-row:active` darkens slightly (`rgba(0,0,0,.035)` light / `rgba(255,255,255,.045)` dark) — real, immediate tap feedback that works regardless of render architecture (a fade-on-complete transition can't animate here: every toggle does a full `innerHTML` rebuild of `#mTodayList`, so a freshly-created row has no prior state to transition from; `:active` fires on the press itself, before any re-render).
  - **Flat list, no card** (2026-09-21) — `.m-section` no longer has its own border/shadow/bg; rows sit directly on the page with hairline separators (`--bg` and `--bg-elevated` are both plain white now, so the old "floating card" had nothing to float on top of — see Background below). The floating glass add-bar/nav pill remain the one elevated-controls layer; content is flat, matching Apple's own plain-list convention (Reminders' "Today" list) instead of mixing a solid card with the nav's blurred-glass material.
- **Background**: `--bg`/`mToggleDark()`'s light value is `#ffffff` (Apple `systemBackground`), not a tinted grey — went through `#f5f4f8` → `#f2f2f7` (iOS `systemGroupedBackground`) → `#ffffff` per explicit feedback at each step ("too grey" on the grouped-grey value). Must stay in sync in THREE places: `mobile.css`'s `:root{--bg:...}`, `mToggleDark()`'s hardcoded light branch, and `mInit()`'s light-mode branch (which must ALSO reset `--bg` after `initTheme()` (features.js, shared/desktop) unconditionally sets the decorative `peach`-theme gradient inline on `<html>` on every load — a light-mode gap here previously let that gradient show through even after mobile.css's own `--bg` was changed). `theme-color` meta tag + `mobile-manifest.json`'s `background_color`/`theme_color` kept matching the same value.

### Task row types & attributes
Every row carries `data-rid` (its own id, ANY type — used by drag-reorder and the tap-menu router) and `data-rtype` (`'task'`/`'shop'`/`'vid'`/`'vidstep'`/`'wrec'`/`'wrrule'`/`'rec'`/`'other'`). Type-specific extra attributes: `data-shopid` (shop), `data-ruleid`+`data-wkkey` (wrec/wrrule/rec — `ruleId` is `t._ruleId` for wrrule, `t._recId` for wrec/rec), `data-vidid` (vid), `data-vidid`+`data-vidstep`+`data-day` (vidstep). `data-tid` is ONLY set on real tasks (`canEdit`) — used for edit routing and `mDeleteById` (via the tap menu's Delete button; there's no swipe-to-delete any more, see Row gestures below).
- Regular task: checkbox → `toggleTask()`
- WR rule: checkbox → `togWrRule(ruleId, checked, wkKey)`
- WR recurring: checkbox → `togRec(recId, checked, wkKey)`
- Non-WR recurring virtual: checkbox → `togRecVirt(recId, checked, wkKey)`
- Shopping: checkbox → `togShop(shopId, checked)`
- Pup session: checkbox → `togPupSessionDone(sessId, checked)`
- Travel/birthday: no checkbox — 📅 icon for travel, 🎂 for birthday (changed from 📅 2026-09-22, same split on Week's rows) — no swipe

### Row gestures (redesigned 2026-09-18/19, task menu redesigned 2026-09-21, interaction model rebuilt 2026-09-23/25 to match Apple's own list convention)
Current model, shared by Today/Week/Shop/Month's detail panel (see each tab's own section for which init function owns it): **tap = edit** (instant, no delay), **hold = context menu** (opens the MOMENT the hold is recognized — while still pressing, confirmed by a haptic-substitute "bump" — not on release), **hold + keep moving = drag-reorder** (Today/Week only; Shop/Month-detail have no drag). This replaced an earlier tap-then-wait-350ms/double-tap-to-edit scheme that only existed because double-tap needs that delay to rule out "second tap coming" — double-tap isn't a real list gesture on iOS at all, long-press-for-menu is.
- `mInitTodayGestures()` (`#mTodayList`) and `mInitWeekGestures()` (`#mWeekList`) are the two full versions (tap/hold/drag all three); `_mInitTapHoldMenu(containerId, excludeSelectors)` is a shared factory for the tap/hold-only case, used by both `mInitShopGestures()` and `mInitMonthGestures()` (Month's detail panel — see Month section). All four replaced the old paired `mInitXDblTap`/`mInitXDrag` functions and the `_isDblTap`/`_dtap` double-tap-timing helper (deleted, now fully unused).
- **Arm vs. drag are two steps of one gesture, not two competing listener systems** (the OLD architecture's real bug): touchstart starts a 480ms press timer; if the finger moves >8px BEFORE it fires, that's a scroll — bail, don't touch anything. If it fires with the finger still, that's a hold: mark armed, haptic-bump, open `_mShowTaskMenu(row)` immediately. If the finger THEN moves (Today/Week only) — close the menu (`mCloseTaskMenu()`) and hand off into drag-reorder from that same movement, processing the triggering event immediately (not waiting for the next touchmove) so the row starts tracking the finger without a visible jump.
- **The list's own touchmove listener is registered non-passive** (`{passive:false}`), not a separate document-level listener added only once dragging starts (the old approach). That separate-listener approach missed the FIRST touchmove event that actually started the drag (added a tick too late), which let the page visibly scroll for one frame before the drag "caught up" — registering non-passive from the start lets `_mTodDragMove`/`_mWkDragMove`'s own `preventDefault()` fire on that same triggering event.
- **`_mFlipReflow(containers, dragEl, mutate)`** (shared by `_mTodDragMove`/`_mWkDragMove`) — classic FLIP animation: measures the OTHER rows' positions before the DOM mutation (`insertBefore`), runs it, then animates each displaced row from its old spot into its new one via a transform+transition instead of the list just snapping. This is what actually reads as "making room" for the drop. `dragEl` itself is excluded (its own position already tracks the drop target directly). `containers` scopes the (cheap) `getBoundingClientRect()` measurement — the whole list for Today, just the origin+target `.m-wk-day` for Week (which can have many more rows rendered across multiple weeks; measuring the whole list on every touchmove would be real jank).
- **"Lift" visual on the dragged row** (`.m-row-outer.m-row-dragging` / `.m-wk-row.m-wk-row-dragging`): `opacity:.94` + `transform:scale(1.025)` + a stronger shadow, NOT the original `opacity:.6` flat/washed-out treatment — matches how iOS's own reorderable lists visually pick an item up rather than just tinting it.
- **Haptic feedback substitute**: `navigator.vibrate` is a **no-op on iOS Safari/WKWebView** (never implemented — an Apple/WebKit platform limitation, not fixable from a web page; the call is harmless and kept for any other platform, but don't expect it to do anything on an iPhone). `.m-row-bump` (a brief `scale(1.035)` keyframe pulse, `mobile.css`) is applied to the row for ~220ms at arm-time as the actual felt substitute.
- **Suppressing iOS's native "Copy/Translate/Share"/text-selection/"Copy Link" UI during a hold** turned out to need FIVE independent fixes stacked together — each one blocks a different native mechanism, and missing any single one still let something through:
  1. `user-select:none`/`-webkit-user-select:none` on the list containers AND every descendant (`.m-row-outer,.m-row-outer *`, etc.) — blocks the text-selection highlight itself.
  2. `-webkit-touch-callout:none` — blocks the iOS callout menu's CSS-level trigger (not fully reliable alone in WKWebView for a long-enough hold, in practice).
  3. `-webkit-user-drag:none` — a SEPARATE mechanism from selection: Safari's native content-drag preview (a translucent highlighted copy that follows your finger). `user-select`/`touch-callout` do NOT cover this.
  4. **`touch-action:pan-y`** on the list containers AND the row elements (`.m-row-outer`, `.m-wk-row`) — the actual fix for the callout/data-detector menus specifically: declares the touch may ONLY pan vertically, which suppresses the browser's own long-press gesture RECOGNIZER (the thing that arms selection/callout/link-detection in the first place) while leaving normal scroll untouched. This was the missing piece after 1-3 alone still wasn't enough.
  5. `<meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">` (mobile.html `<head>`) — stops iOS's Data Detectors from auto-recognizing phone numbers/dates/addresses/URLs inside plain task-name text and silently linkifying them (each has its OWN native menu, e.g. "Call"/"Copy Link", independent of 1-4).
  - Plus two app-wide reactive safety nets (near the top of mobile-overview.js, registered once): a `selectionchange` listener that force-clears ANY document selection the instant one forms (`window.getSelection().removeAllRanges()` — safe, never touches an `<input>`/`<textarea>`'s own cursor, a separate API), and `document.addEventListener('contextmenu', e => e.preventDefault())` (the actual event that presents iOS's callout menu, same event a desktop right-click fires).
  - If a new hold-triggered element/gesture is ever added and still shows a native menu, check it has ALL FIVE — not just `user-select`/`touch-callout` (the two that are easy to remember and NOT sufficient alone).
- **`_dayOrder` syncs across devices** (2026-09-21) — previously per-device localStorage only. Added `day_order:'_dayOrder'` to `_KV_MAPS` (core.js, shared) — reuses the existing `client_kv` generic key→JSON sync table, not a new one. Migration `015_day_order.sql` just seeds the key.
- **No swipe-to-delete** (removed 2026-09-21) — it shared the same horizontal-drag gesture space as Today's own day-swipe (`_mInitTodaySwipe`, below) and the two fought each other. Delete still reaches via the menu's Delete button (`mDeleteById`).

### Task quick-actions menu (`#mTaskMenuSheet`, redesigned 2026-09-21, recurring/WR folded in 2026-09-25)
A small icon-only row **positioned next to the tapped row itself** (`_mPositionTaskMenu`: anchored to the row's right edge, vertically centered on it, clamped so it never runs off-screen), not a bottom sheet. Backdrop (`#mTaskMenuBackdrop`) is transparent (tap-to-dismiss catcher only, not a dimmer) — a lightweight contextual popup, not a modal. `_mShowTaskMenu(el)` toggles which buttons are visible per `data-rtype`, all sharing ONE sheet:
- `task`/`shop` → Edit (`mTaskMenuEditBtn`) + Duplicate (task only) + Flag (task only) + Delete.
- `vid`/`vidstep` → Delete only, functionally "remove from today" (`title`/`aria-label` say so; the icon itself is a plain trash icon like every other type, not a visually-distinct one).
- `wrec`/`wrrule`/`rec` → **Skip this week, Move all future → next week, Move this one → next week, Edit** (`mTaskMenuSkipBtn`/`mTaskMenuAllNextBtn`/`mTaskMenuThisNextBtn`/`mTaskMenuWrEditBtn`) — folded into this SAME popup 2026-09-25, replacing the old separate full-width text-labeled `#mWrActionsSheet` (deleted). Simplified from an original 6-button set that also had "move backward a week" variants for both scopes — pushing forward is the overwhelmingly common case, and dropping the backward pair keeps this popup the same size as the regular 4-button set.
  - **`mTaskMenuWrEditBtn` is a SEPARATE button from `mTaskMenuEditBtn`**, same `onclick="mTaskMenuEdit()"`, same icon — needed because Edit must be FIRST for the regular 4-button set but LAST for the WR set (skip, all-future, this-time, edit), and one shared DOM position can't be both; `M_WR_BTN_IDS` includes it, `M_WR_BTN_IDS` elements get hidden for non-WR rtypes.
  - **`:last-child{border-right:none}` doesn't work any more** now that 9 total buttons share one sheet with only some visible per rtype (hidden siblings still count for `:last-child`) — `_mShowTaskMenu` JS-tags whichever button is actually last-VISIBLE with `.m-tmenu-btn-last` (CSS keys off that class instead).
  - Underlying actions are a faithful port of desktop's real WR context-menu logic (`_wrShiftAnchorOne`/`_wrCtxShiftScheduleOne`, overview.js via `_mWrShiftThisWeek`/`_mWrShiftAllFuture`) — writes the same `wr_recurring_rules`/`wr_recurring_overrides` rows desktop does, shows up on desktop's next sync. `mWrActionsSkip()` — wrrule reuses `_mWriteWrOverride(ruleId, wkKey, {override_type:'skip'})`; wrec/rec gets its own inline block-cleanup (`dsToWkKey(b.ds)===wkKey`, not desktop's `wkOff`-based check — no such global on mobile).
  - **Undo-toast labels are specific about scope AND direction** (fixed 2026-09-26, were generic — "Moved task"/"Shifted schedule"): "Skipped this week", "Moved this task to next week" (this-one scope), "Moved all future to next week" (all-future scope) — also dropped a redundant duplicate `showToast()` that used to fire right alongside `_mWrShiftAllFuture`'s own pushUndo toast for the same action.
- Flag button fills SOLID amber when active (`.m-tmenu-flag.flagged svg{fill:currentColor}`), not just an outline-color change.
- **The task menu's backdrop ALSO handles Today's day-swipe** (`_mBindDaySwipe`, shared with `#mMain`'s own binding — see `_mInitTodaySwipe` below) — swiping through the backdrop while the menu is open changes the day AND dismisses the menu (on drag-start, not waiting for release).
- **`#mRecEditSheet`** (wrec/wrrule/rec, via `mOpenRecEdit`) — Name/Notes/Important-flag only, PATCHes `wr_recurring_rules`. Deliberately does NOT include cadence/schedule editing for EXISTING rules — that's desktop's much larger `openRecEditModal`. (Mobile CAN create a new recurring/WR rule with a cadence from scratch — see Add task popup below — this is about editing an existing one.)

### Move-to-Today (`.m-mv-today` button, overdue rows only) — styled red (`#ef4444`/`#fff0f0`, matches desktop's `OV` color)
`_mMoveToTodayArgs(t)` picks `[id, type, extra]` per task type. For `rec`/`wrec`/`wrrule`, `mTaskRow`'s button routes through `_mOvRowMoveClick(kind, id, wkKey)` instead of calling `mMoveToToday` directly (see below); every other type (`task`, `shop`, `pup`, `vid`, `vidstep`) still calls `mMoveToToday(id, type, extra)` directly, unchanged. Covers ALL overdue-capable types (parity with desktop's bulk `rolloverOverdue()`, just scoped to one row): `task`, `shop`, `pup` (`pup_skill_sessions.day_date`), `vid` (`_mVidDayMap`/`_mVidDayMapSet`), `vidstep` (`extra` = `step::day`; moves any block on that day + the daymap primary/extraDay entry via `_mVidStepMap`/`_mVidStepMapSet`), `rec`/`wrec` (`st.recurring`, `extra`=wkKey, PATCH `wr_recurring_rules`), `wrrule` (`st.wrRules`, `extra`=wkKey). Every branch is undoable via `pushUndo`. **`_mVidDayMapSet`/`_mVidStepMap`/`_mVidStepMapSet` are mobile's own localStorage-direct implementations** — the desktop equivalents (`_vidDayMapSet`, `_vidStepDayMap`, `_vidStepDayMapSet`) live in `overview.js`, which mobile never loads. Button's own corner radius uses `var(--rs)` (was a mismatched hardcoded `12px`, looked disproportionate on such a small button — fixed 2026-09-21).

### Move All to Today banner (`#mOvBanner`, added 2026-09-21)
A row at the very top of `#mTodayPage`, shown only when `_mTodayOffset===0` and there are overdue+movable items (same eligibility as the per-row button's `canMv`) — text `"N Overdue – Move All to Today"` (en dash, not em — matches the shorter-dash convention used elsewhere). Translucent red "glass" chip (`rgba(239,68,68,.08)` bg, red text/border), not a solid alarm-red block — reads as urgent without shouting, consistent with the rest of the app's restrained tint-for-meaning color use.
`mMoveAllOverdueToToday()` moves every directly-movable overdue item (task/shop/pup/vid/vidstep) plus SAME-WEEK recurring/WR misses instantly and silently — mirrors desktop's `rolloverOverdue()` bulk-sweep half. Genuine PAST-WEEK recurring/WR misses are deliberately left for their own row's button (they need a real schedule decision, see below) rather than a sequential prompt queue; the banner's toast tells you how many were moved vs. deferred.

### Past-week recurring/WR miss prompt (`_mOvRowMoveClick`, mirrors desktop's `_ovRowMoveClick`/`rolloverOverdue` scope picker — see `rules/tasks-ui.md` Overdue Logic)
A recurring/WR miss from the CURRENT week is just a same-week nudge — `_mOvRowMoveClick` computes `pastWeek = wkKey && wkKey !== getWkKey(0)`; when false it delegates straight to the existing `mMoveToToday(id, kind, wkKey)` (silent direct pin, unchanged). When `pastWeek` is true it's a real schedule decision, so it opens a singleton bottom sheet (`#mWrScopeSheet`/`#mWrScopeBackdrop`, same slide-up/backdrop idiom as `#mEditSheet` — NOT desktop's cursor-positioned `#wrScopePicker` popup) via `mOpenWrScopeSheet(name, wkKey, onSkip, onThisTime, onSameDay, onChangeDay)`, four full-width rows in desktop's order: Skip past week / This time only / Same day / Change day to today. This per-row path is always a queue of exactly one — never port desktop's sequential `_rolloverPromptQueue` here (the bulk banner above has its own, simpler, non-prompting handling of this same case).
- `wrrule` kind → `writeWrOverride`-style skip / `_mWrMoveToThisWeek(id,wkKey,false/true,false/true)` for the other 3 (ported from desktop's `wrMoveToThisWeek`, overview.js — not loaded on mobile).
- `rec`/`wrec` kind → `_recSkipPastWeek`/`_recMoveThisOccToToday` (features.js, shared — called directly, confirmed mobile-safe: only touch `save/renderAll/sbReqSilent/pushUndo`) for skip/this-time, `_mRecMoveAllFuture(rec,wkKey,tod(),true/false)` for same-day/change-day (ported from desktop's `_recMoveAllFuture`, overview.js).
- Ports (`_mWriteWrOverride`, `_mWrMoveToThisWeek`, `_mRecMoveAllFuture`, `_mWrSnapshotSchedule`, `_mNthWeekdayOfMonth`, `_mWeeksAgoLabel`) are near-verbatim copies of their overview.js originals with desktop-only render calls (`renderRecOv`/`renderWkCal`/`renderWeeklyPage`/`renderDayTB`) swapped for `renderAll()`, and `_wrClearPastOrphanPins` (a permanent no-op on desktop too) omitted entirely.

### Pull-to-refresh
- Touch events on `#mMain`. Only active when `_mCurTab === 'today'`
- Threshold: 65px. On release: `syncAll(true)` + `mRenderToday()`
- **`overscroll-behavior` + non-passive touchmove, or the whole screen visibly rubber-bands** (fixed 2026-09-27) — `#mMain` had no `overscroll-behavior`, and `mInitPTR`'s touchmove listener was `{passive:true}` (never called `preventDefault`), so iOS's native rubber-band bounce fired SIMULTANEOUSLY with the custom `#mPTR` indicator growing — that dual movement is what read as "pulling the entire screen down" instead of just revealing the indicator. Fix is three pieces together: `body{overscroll-behavior:none}` (stops bounce from chaining to the whole page — `#mApp{height:100dvh}` means the document never legitimately needs to scroll/bounce anyway), `#mMain{overscroll-behavior-y:contain}` (stops `#mMain` bouncing itself), and the touchmove listener registered `{passive:false}` with `e.preventDefault()` called once `active && dy>0` (a genuine pull-past-the-top, not general scrolling — `dy<=0` still early-returns before preventDefault so normal scroll-down-through-content is untouched).

### Day-swipe navigation (`_mInitTodaySwipe`/`_mBindDaySwipe`, fixed 2026-09-21)
Horizontal swipe changes `_mTodayOffset` (viewed day). Bound to **`#mMain`**, gated to `_mCurTab==='today'` — NOT `#mTodayPage`, which was the original binding and the likely cause of swipes intermittently "not working": `#mTodayPage` is a normal flex child that only sizes to its own content (banner + list), so on a day with few tasks it can end well short of the full screen, and a swipe starting in the empty space below it never reached the listener at all. `#mMain` always spans the full viewport (same reasoning `mInitPTR`, right above, already used for the same element).
`_mBindDaySwipe(el, {gate, onDragStart})` is the shared gesture logic, reused for two elements: `#mMain` itself, and the task menu's backdrop (`#mTaskMenuBackdrop` — see "Task quick-actions menu" above, so a swipe works even with the menu open). Tracks the live finger position via `touchmove` (not just the `touchstart`/`touchend` endpoints) and handles `touchcancel` the same as `touchend` — previously `touchcancel` wasn't handled at all, which could silently drop a day-change if iOS decided a not-perfectly-horizontal swipe was actually a vertical scroll gesture and cancelled the touch sequence.

### Add task popup (`#mAddBar` — rebuilt 2026-09-21, no longer always-visible; now shared by all three list tabs' "+")
Was a permanently-docked bottom bar; now an on-demand popup, reclaiming the screen space it used to always occupy. Same underlying `<form>`/fields/IDs as before at the core, heavily extended. All three tabs' "+" now open this SAME popup (`mToggleQuickAdd()`/`mWeekQuickAdd()`/`mMonthQuickAdd()` all funnel into `mOpenQuickAdd()`) instead of Month's own heavier `#mFullAddSheet` (Month's "+" used to open that — see Full add sheet below for what it's still used for).
- **Due Date field** (`#mAddDueDateField`/`mAddDueDateLbl`, added 2026-09-25) — shown for the plain-task/Shopping category only (Travel has its own Start/End dates, Weekly Reset/Recurring have "Starting date" — a different concept, when the pattern begins vs. a specific due date). Uses the same custom calendar-popover widget as Travel's dates (`mToggleDatePick('dueDate')`, `M_ADD_DATE_FIELDS`/`_mAddDates.dueDate`). **Targeted and reset centrally in `mOpenQuickAdd()` itself**, via `_mQuickAddTargetDs()`: Today uses `_mTodayOffset`'s swiped-to day, Week hit-tests whichever day is currently docked at the top of `#mWeekPage`'s scroll view (`_mWkCurrentViewDs()` — same `elementFromPoint` idiom Month's own title-tracking uses), Month uses `_mMonthSelectedDs`. Computed fresh every time the popup opens, so each tab's "+" targets wherever you actually are instead of silently defaulting to today. `mCloseQuickAdd()` always resets `_mAddDates.dueDate` to null on ANY close (success or cancel) — unlike Travel/Recurring's own date fields, which only reset on a successful add — specifically so a cancelled Month-targeted add can't leave a stray future date behind for the next time Today/Week's own "+" opens this same shared popup.
- **"Today"/"Tomorrow" date labels** (`_mFmtAddDate`, extended 2026-09-25) — shows literal "Today"/"Tomorrow" for those two days, the short date (e.g. "Sep 30") otherwise, instead of always showing a bare date. Shared by the Due Date field above and Travel/Recurring's own date pickers.
- **Positioning**: bottom-anchored (`bottom:82px` default), tracked LIVE against `window.visualViewport` (`_mQuickAddReposition`, bound once via `_mInitQuickAddKeyboardTracking`) so it sits right above the on-screen keyboard as it animates open — only reacts to `visualViewport`'s `resize` event, deliberately NOT `scroll` (scroll fires when iOS auto-scrolls the page to keep a newly-focused field visible, which isn't a keyboard-height change and caused the popup to jump every time focus moved between fields). Growing the form (more fields appearing) naturally pushes it further up since it's anchored by its bottom edge, not its top — no extra reflow logic needed.
- **Keyboard must stay up through every interaction except Save/Cancel** — the recurring theme of this whole rebuild. Three techniques, used together:
  1. `onmousedown="event.preventDefault()"` on every picker trigger/option (and the Pup-related checkbox + its label) — suppresses the implicit focus-shift a tap normally causes, without blocking the `click` that still needs to fire normally.
  2. Every `<select>`/`<input type=date>` in this form was replaced with a fully custom widget (see pickers below) — a native select/date input ALWAYS hands control to its own native wheel/calendar picker, which forcibly dismisses the keyboard; no amount of `preventDefault` can stop that for a real native control.
  3. `mCloseQuickAdd()` explicitly `.blur()`s `#mNewTask` — hiding the popup via opacity does NOT blur its input, so the keyboard stayed up after Save/Cancel otherwise (the ONE place the keyboard should actually go away).
- **Caret bleed-through**: while any of this form's own dropdowns is open, `#mAddBar` gets a `.picker-open` class (`_mSyncPickerOpenClass`, checked against `M_ADD_PICKER_IDS` — the single list every picker's open/close state is tracked against) which sets `caret-color:transparent` on its inputs. iOS's native text caret can render above other content regardless of z-index; this doesn't blur anything (keyboard stays up per above), it just hides the blinking line while a dropdown covers that area.
- **Dropdown sizing** (`_mFitPickerOpts(optsId)`, called right before opening any picker): computes `max-height` from the space ACTUALLY available above that picker's own trigger (`trigger.getBoundingClientRect().top - 12`, clamped `[120, 320]`), not a fixed guess. A fixed cap tall enough for triggers near the bottom of the form (e.g. the type picker, last field before Add — wants to show all 8 options with no scroll) pushed dropdowns from triggers HIGHER up the form (e.g. Cadence) off the top of the screen — the list was technically scrollable but unreachable above the screen edge, which read as "scrolling the background, not the options" (the touch was landing on whatever's behind the off-screen part). Scrollable dropdowns (`#mAddBar .m-cpick-opts`, `.m-add-cal`) also need `overscroll-behavior:contain` + `touch-action:pan-y` — without `overscroll-behavior:contain` specifically, a swipe that runs past the list's own scrollable content chains through to `#mMain` (the page) behind it, same "scrolling the background" symptom from a different cause. Visible scrollbar (`scrollbar-width`/`-color` + `::-webkit-scrollbar-*`) so a long list looks obviously scrollable — iOS itself still only shows its own brief native overlay on touch-scroll regardless (a platform limit, not something CSS can force always-on).
- **Type picker** (`mSelectCat('add', cat)`, `M_CATS_ADD = ['Home','My work','Work','Social','Travel','Shopping','Weekly Reset Task','Recurring Task']` — this exact order, no "Long term" here even though it's still a normal category elsewhere) drives which fields below it are visible, via `_mAddSyncTypeFields(cat)`:
  - **Travel** — Destination (text), Start/End date (custom calendar popovers, side-by-side row, equal-height/-width via `flex:1 1 0` + explicit `height` — a plain `flex:1` let an empty End date render shorter than a filled Start date on iOS). Both feed `_mAddTravel(name, dest, start, end, mode)` same as `#mFullAddSheet` always has — this bar previously only ever passed `start=today, end=null` (no UI for a range at all); now genuinely supports one.
  - **Shopping** — Store (custom picker: HEB/Costco/Ikea/Online/Other; picking Other reveals a free-text store-name field, mirrors desktop's `qaStore`/`__custom` pattern), Link (optional URL, always shown — desktop's `qaShopLink`). Posts to `shopping_list` with `due_date` set to the viewed day (unlike the Shop tab's own always-visible add bar, which leaves items undated) so it actually shows up on Today. No "important" flag (hidden — not a real column on this table).
  - **Weekly Reset Task** / **Recurring Task** — mobile's first-ever recurring/WR CREATION path (previously creation was desktop-only; mobile could only edit existing rules via `#mRecEditSheet`'s Name/Notes/Important). Both write to `wr_recurring_rules`, matching desktop's `wrRuleAddModal`/`saveWrRuleAdd` (overview.js) field-for-field, **scoped to the weekly/biweekly/quarterly/biannual/annual cadences only** — desktop's monthly cadence ALSO has an nth-weekday-of-month sub-mode (`recModal`'s richer version) that isn't ported; mobile's monthly mode is day-of-month only, matching `wrRuleAddModal`'s (simpler) monthly mode, not `recModal`'s.
    - Both get **Cadence** (`mToggleCadencePick`/`M_CADENCES`, defaults `'weekly'`).
    - **Weekly Reset** gets a 🐾 Pup-related checkbox; NEVER gets a due-day field of any kind (WR items have no due-day of their own, regardless of cadence — matches desktop's `wrAddAppearDay/DateField` being gated on type, not cadence); Starting date only appears once cadence isn't `weekly` (a weekly WR item has no anchor at all — `updateWrRuleCadenceUI`, overview.js).
    - **Recurring** gets "Due on" — day-of-week picker (`mToggleDayPick`, `M_DAYS`, defaults to today's weekday) normally, swapping to a day-of-month picker (`mToggleDomPick`, 1st–28th, capped there like desktop — every month has a 28th, a rule set to "the 30th" would silently skip February) when cadence is Monthly; Starting date always shows.
    - `_mAddRecurring(name, isWeeklyReset, opts)` builds the exact payload shape per type (WR: `is_weekly_reset:true` + `sort_order` into `st.wrRules`, no `appears_on_date`; Recurring: `is_weekly_reset:false` + `appears_on_date` into `st.recurring` with the usual `_doneByWk`/`_dateOverrides` local shape) and POSTs — same temp-id/undo/id-swap pattern as every other add path here.
- `_mAddImportant` state; `mToggleAddFlag()` toggles + styles `#mAddFlagBtn` — hidden entirely for Shopping/Weekly-Reset/Recurring (none of those have an `important` concept in this data model).
- `mAddTask()` → optimistic local add → `sbReq POST tasks` → replace temp id with real, THEN **re-render** (`mRenderToday()`) — a gap here (fixed 2026-09-21) left the row's `data-tid` pointing at the now-gone temp id until the next unrelated render; tapping the row in that window (normally sub-second, but real) silently found nothing and the menu never opened.
- Category dropdown arrow (`.m-cpick-arr`, all pickers) is a thin SVG chevron, not the unicode `▾` glyph — matches the app's other stroke-based icons.

### Full add sheet (`#mFullAddSheet`)
- Opened ONLY by the Month drag-to-create-travel gesture now (see Month section) — Month's header "+" also moved to the shared quick-add popup above as of 2026-09-25 (`mMonthAddTask()`/`mMonthQuickAdd()`, see Add task popup above); this sheet is no longer reachable from any tab's own "+" button, just that one gesture.
- Fields: name, then `#mFullAddDestField`/`#mFullAddEndField`/`#mFullAddModeField` (Travel-only, hidden by default), due_date (`#mFullAddDue`, relabeled "Start date" in Travel mode), then ONE row with category picker (`'fulladd'`) + important flag button (`.m-flag-btn`/`#mFullAddImpBtn`, same ⚑ icon treatment as the quick-add popup's `#mAddFlagBtn` — NOT the old separate on/off text toggle)
- `mOpenFullAdd()` / `mCloseFullAdd()` / `mSaveFullAdd()` / `mToggleFullAddImp()`
- Pre-fills due_date to today
- `#mFullAddDue` (and `#mEditDue`, `#mShopEditDue`) need `-webkit-appearance:none;appearance:none;max-width:100%` — iOS Safari's native date-input chrome otherwise ignores the author width and can render past the sheet's edge. (The quick-add popup above sidesteps this whole class of bug by not using native date inputs at all.)

### Travel task creation (`#mAddBar`'s quick-add popup + `#mFullAddSheet`)
`M_CATS_TRAVEL = [...M_CATS, 'Travel']` for `'fulladd'` (Month); the quick-add popup uses its own `M_CATS_ADD` (see above), which also includes Travel. Picking Travel in `#mFullAddSheet` calls `_mFullAddSyncTravelFields(cat)` (mobile port of desktop's `_tModalSyncTravelFields`, features.js) from `mSelectCat('fulladd', cat)` — shows the destination/end-date/mode fields, relabels due date, renames the save button "Add Trip". Both entry points funnel into `_mAddTravel(name, dest, start, end, mode)`: pushes to `st.travel`, `save()`, `renderAll()`, `sbReq POST travel`, `pushUndo` — mirrors desktop's `saveTModal` Travel branch (features.js) minus `renderTravelPage()` (desktop-only; `renderAll()` is mobile's substitute). Both the quick-add popup AND the full-add sheet now support a real date range (the quick-add popup didn't, before 2026-09-21 — see above).

### Edit task sheet (`#mEditSheet`)
- `mOpenEdit(id)` / `mCloseEdit()` / `mSaveEditTask()` / `mDeleteEditTask()`
- **Field order** (set 2026-09-19 per explicit request): Name → [category picker | flag icon button] on one row → Due date → Delete/Save. `#mEditImpBtn` is a `.m-flag-btn` ⚑ icon (same treatment as the add bar's `#mAddFlagBtn`), NOT the old separate on/off text toggle (`.m-imp-toggle`/`.m-imp-row`, removed — dead CSS deleted).
- Bottom slide-up sheet with backdrop
- `mSaveEditTask()` → `sbReq PATCH tasks` (name, category, due_date, important)
- `mDeleteEditTask()` → `sbReq DELETE tasks`

### Recurring/WR edit sheet (`#mRecEditSheet`)
See "Task quick-actions menu" above — Name/Notes/Important only, opened via `mOpenRecEdit(outer)` (reads `data-ruleid`/`data-rtype` off the row element). `mSaveRecEdit()` PATCHes `wr_recurring_rules` on `st.recurring` (wrec/rec) or `st.wrRules` (wrrule) depending on type.

---

## Timeblock (not in bottom nav — opened from the More page only; Today's own header button to it was removed 2026-09-21, see Header above)

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
  #mWeekList         ← .m-wk-divider (week label) + .m-wk-day divs
```
Redesigned 2026-09-22 to match Today's own list conventions (see Today section) instead of
its own separate style — bars/circle-checkboxes/tap-menu, not dots/native-checkboxes/no
interaction. No more per-day header `+`/count badge (removed) or `#mWkAddSheet` (retired,
see Header above — Week's header `+` now opens Today's own quick-add popup instead).

Each `.m-wk-day` has `data-ds="YYYY-MM-DD"` and contains:
- `.m-wk-hd` — day header, name LEFT + date RIGHT (`justify-content:space-between`, e.g.
  "Mon" / "Sep 24"), plain — no sticky positioning, no count/+ any more
- `.m-wk-row` — one per task (or `.m-wk-travel` for a trip banner, see below)

**Day-card styling**: each day is its own bordered/tinted card (`border-radius`, subtle
`rgba(0,0,0,.02)`/dark-mode-equivalent background), not just hairline-separated rows —
clearer section division via color/borders instead of overlaid labels. `.is-today` stands
out via a real drop shadow doing most of the work (`box-shadow`), a light neutral border
(NOT a purple/accent tint or background wash — tried and explicitly rejected), no today-dot
(removed). `.is-past` is dimmed (`opacity`). **`overflow:hidden` is deliberately NOT set**
on `.m-wk-day` — it would clip `.is-today`'s box-shadow; corner-rounding is applied directly
to `.m-wk-hd` (top) and `.m-wk-day > *:last-child` (bottom) instead.

**Week divider** (`.m-wk-divider`, "This Week"/"Last Week"/"Next Week"/date-range label) is
a real section break between weeks — bold top rule + generous spacing, normal case (not
all-caps, explicit request).

### Task data per day (`mGetDayTasks(ds, weekOff)`)
- Regular `st.tasks` where `due_date === ds`
- Overdue regular tasks shown on today's row only
- `getRecurringWeekTasks(weekOff)` filtered by `due_date === ds`
- Shopping items due on `ds` (overdue only on today) — id is `'shop-cal-'+id` (fixed
  2026-09-22, was a bare `'shop-'+id` — see id-prefix gotcha below)
- Also includes (desktop week parity): WR pinned instances (current + past 4 wk keys), pup sessions, fin-cancel reminders, videos via `_vidDayMap` (id `'vid-ov-'+id`, same fix as shopping above), video steps via `_vidStepDayMap`
- Sorted via `mSortDayTasks(tasks, ds)` — exact port of desktop `sortTasksForDay` (birthday → done-bottom → travel → overdue → important → TB start time → type priority → alpha). Same fn used by Today & Month.
- **Video day-maps sync**: `_vidStepDayMap`/`_vidDayMap` (localStorage) mirror through the `client_kv` table (core.js `_kvSyncMaps`, migration 007). Mobile reads them like desktop; mobile toggles write doneDays back and push on next sync.
- **id-prefix gotcha**: `mGetDayTasks`'s synthetic ids for virtual items MUST exactly match `mGetTodayTasks`'s (Today) ids for the SAME underlying record — desktop uses `'shop-cal-'+id`/`'vid-ov-'+id` universally and both mobile lists must too. `_mManualTieBreak`'s day-order lookup (below) indexes by exact id string; a mismatched prefix (Week previously used bare `'shop-'`/`'vid-'`) silently breaks manual order matching between tabs for any day containing that item type, with no error — it just silently falls through to natural sort. If Week/Today ever look like they disagree on order again, check this first.

### Week task rows (`mWkTaskRow(t)`)
Same building blocks as Today's `mTaskRow` (see Today section) — left color band (`.m-wk-band`, not a dot), circle checkbox (`.m-chk-wrap`, shared CSS, just sized down via `.m-wk-row` scoped overrides), 🎂/📅 icon for birthday/travel, `.m-mv-today` "→ Today" button for overdue+movable rows (exact port of `canMv`/`mvArgs`/`mvBtn`, added 2026-09-22 — previously Week only showed the red tint with no way to act on it). Trips are the one exception: a full-width `.m-wk-travel` banner, no checkbox/band/menu.
- `data-rid`/`data-rtype`(+per-type extras: `data-shopid`, `data-ruleid`+`data-wkkey`, `data-vidid`[+`data-vidstep`+`data-day`]) mirror `mTaskRow`'s convention exactly (added 2026-09-22) so the shared tap-menu/edit system below works unmodified. `data-tid`+`data-tname` (real tasks only) are what the day-to-day drag (below) keys off — unchanged from before.
- Checkbox `onchange` routes by type same as Today: `toggleTask`/`togRecVirt`/`togShop`/`togWrRule`/`togPupSessionDone`/`togFinCancelDone`.

### Row gestures (`mInitWeekGestures`, added 2026-09-22, rebuilt 2026-09-23/25 — see Today section's "Row gestures" for the full tap=edit/hold=menu/hold+drag=reorder model, the native-iOS-menu-suppression writeup, and why double-tap is gone)
`mInitWeekGestures()` is Week's own full version (tap/hold/drag all three, matching `mInitTodayGestures`), scoped to `#mWeekList`, selector `.m-wk-row[data-rid]` — fully generic against `row.dataset.*`, works unmodified since `mWkTaskRow` emits the same attributes `mTaskRow` does. Replaced the old separate `mInitWeekDblTap`/`mInitWkDrag` pair (and the double-tap timing they both depended on).
- **Render-scope gotcha**: several actions reachable through this menu (`mDeleteById`, `mSaveEditTask`, `mDeleteEditTask`, `mSaveShopEdit`, `mDeleteShopItem`, `mDeleteShopDirect`) used to call bare `mRenderToday()`/`mRenderShop()` only — harmless while only Today/Shop could reach them, but since Week's menu can now trigger the exact same code paths, they were switched to `renderAll()` (2026-09-22) so editing/deleting from Week's menu actually refreshes what you're looking at instead of updating Today/Shop invisibly in the background. Same reasoning as the existing "Live re-render after toggle" rule below — check any NEW mobile action reachable from more than one tab for this.

### Week navigation (infinite scroll)
- Renders weeks `_mWkRenderedLo..Hi` (default −1..+1) via `_mWkRenderWeekHtml`. `mRenderWeek(reset)`: `reset=true` ONLY on tab-open (resets range + scroll-to-today); background/sync re-renders pass no arg → preserve range + scroll position (no yank).
- **Scroll container is not always `#mWeekPage`** — the flex layout often leaves it unbounded so the **document** scrolls. `_mWkScroller()` returns `#mWeekPage` if scrollable, else `document.scrollingElement`. ALL scroll logic (scroll-to-today, preserve, load-more, the scroll listener) must use `_mWkScroller()`, not `#mWeekPage` directly.
- `_mWkScrollToToday()`: aligns today's `.m-wk-day` to the top (offset by sticky `#mHeader` when the doc scrolls, minus a `GAP` constant — 10px as of 2026-09-22 — so the card sits a little below the header instead of flush against it); retries up to 25× until the scroller is actually scrollable (early calls get clamped to 0 = last week). **A top margin on `.m-wk-day.is-today` can't create this breathing room on its own** — tried first, but this scroll math always re-aligns the card's (post-margin) top edge flush against the header, so any margin just gets scrolled past; `GAP` in this function is the one place that actually controls it. Tuned down from an initial 16px after "I can see the previous day's card peeking out below the header" feedback.
- `mInitWeekScroll()`: one listener on both `#mWeekPage` and `window`; near top/bottom → `_mWkLoadMore('up'/'down')`.
- **`mWeekGoToday()`** (header sun icon, left of "+", see Header above) — `mRenderWeek(true)` to jump back to today's default range/scroll position after browsing elsewhere. Replaced the old "go to today" calendar-icon button (2026-09-22, see Header above).

### Drag: reorder within a day, or move to another day (`_mWkDragMove`/`endDrag`, inside `mInitWeekGestures` — see Today section's "Row gestures" for the shared arm→menu→drag handoff model and FLIP reflow)
Same live-reparent technique Today's own drag-reorder uses — drags the actual row, not a floating pill — and covers a case Today never needed (only ever has one day's list): dropping among a DIFFERENT day's rows moves it there (`due_date` change), dropping among the row's OWN day's rows just reorders it. Arms only for `.m-wk-row[data-tid]` (real tasks — virtual/recurring/shopping are computed, not individually stored, so not draggable; tap/hold-menu still works for those rows, only the drag branch is tid-gated).
- `_mWkDragMove(e)`: hit-tests via `elementFromPoint` (row hidden from its own hit-test via a temporary `pointerEvents:none`), live-inserts the dragged row before/after whichever row it's hovering (via `_mFlipReflow`, animating the displaced rows — see Today section), or at the end of a day with nothing under the finger yet (before the "—" `.m-wk-empty` placeholder if present); auto-scrolls via `_mWkScroller()` near top/bottom edges. `_mFlipReflow`'s measurement is scoped to just the origin+target `.m-wk-day` (not the whole rendered range) to stay cheap on every touchmove.
- On drop: same day as it started → writes `_dayOrder()[ds]` from the final DOM order (same mechanism/localStorage key Today's own drag-reorder writes — round-trips through desktop's sort correctly). Different day → `due_date` changes AND `_dayOrder()[targetDs]` is ALSO written from where it landed (dropping at a specific spot should stick, not just get appended by natural sort on the next render). No-op (no undo toast) if dropped back exactly where it started. `touchcancel` discards any live DOM reparenting via a plain `mRenderWeek()` (no writes). Undo-toast label is the actual target day, not a bare "Moved task" (`'Moved to ' + _mFmtAddDate(targetDs)` — "Moved to Tomorrow"/"Moved to Sep 30", fixed 2026-09-26).

---

## Shop (HEB Grocery merged in — no separate tab any more)

**Completed items are hidden entirely** (2026-10-16, explicit request) —
`mRenderShop()` filters `st.shopping` to `!s.done` before grouping, unlike
desktop's `renderShopFull` (features.js) which sinks done items to the bottom
of their store group, struck-through, still visible. This is a deliberate
mobile-only divergence, not a bug to "fix" back toward desktop parity.
Checking a box re-renders immediately (`togShop` → `renderShopFull()` →
mobile's override → `mRenderShop()`), so the item disappears the moment it's
checked, no separate removal step.

### Layout
```
#mShopPage
  #mShopList        ← store groups with items (no header/count line — removed)
```
Header (shared `#mHeader`, shop tab only): `#mShopHeaderBtns` = 🍽 Meals icon, red "HEB" List badge (`.m-shop-hdr-heb`, NOT a circle icon — literal red badge, white bold text, since it's the one store name that should stay all-caps), then `#mShopHdrAddBtn` "+" — in that order, so "+" sits immediately left of the header's reload icon (mirrors Today's `#mTodayAddBtn`, which has nothing else between it and reload). Store group headers (`.m-shop-store-hd`) are NOT force-uppercased (removed `text-transform:uppercase` — "Ikea"/"Online"/custom names show in their natural stored casing; "HEB" stays caps because that's its literal stored name).
`#mShopList` has **no horizontal padding of its own** (was `0 16px`, doubling up with `#mMain`'s own `12px 16px` — same margin bug fixed on `#mTodayList`/`.m-section`, which never had one). `padding-bottom:96px` clears the floating nav (76px footprint + buffer) so the last row can actually scroll past it — `#mShopPage`'s own inline `paddingBottom` is always cleared to `''` in `mShowTab()`, this static CSS value is the only reservation now (same idea as `#mWeekList`'s own static padding-bottom, not `#mTodayList`'s zero-reservation "scrolls behind the nav" approach — Today's content is short enough per-day that this hasn't been an issue there yet).

### Store list — `M_SHOP_STORES` (mobile-overview.js)
`const M_SHOP_STORES = ['HEB', 'Costco', 'Ikea', 'Online'];` — fixed order, HEB first (an explicit request, not alphabetical). Drives three independent things that must all agree:
- The picker option order in `#mShopAddStoreOpts`/`#mShopEditStoreOpts`/Today's own `#mAddStoreOpts` (all hardcoded HTML in that same order, `Other` appended last after the array's four).
- `mOpenShopEdit`'s "is this a known store" check (`M_SHOP_STORES.includes(s.store)`) — unknown falls back to `Other` with the real value pre-filled in the custom field.
- **`mRenderShop()`'s store-group sort order** — known stores sort by `M_SHOP_STORES.indexOf(...)` (HEB first), anything else (a custom name, or the literal string `"Other"`) sorts alphabetically after them. Do NOT revert this to plain `.sort(localeCompare)` — that was the original bug (alphabetical put Costco before HEB in the actual rendered list even after the picker itself was already reordered correctly).

### Row markup (`mShopRow(s)`) — reuses Today's list convention, not its own style
Same `.m-row-outer`/`.m-row` wrapper, `.m-chk-wrap` circle checkbox, and `.m-ov` overdue background tint that `mTaskRow` (Today) uses — NOT the old glass-pill `.m-shop-item` cards. Two intentional differences from Today's rows:
- **No left color band.** Today's band carries category color; every Shop row would've been the same shopping-orange, so it was removed as pure noise.
- **`#mShopList .m-row{padding-left:8px}`** (vs the shared `.m-row`'s `14px`) — scoped override, not a change to the shared rule. Today's `14px` reserves gutter room for its band; Shop has no band, so the full gutter read as excess empty space.
- `.m-shop-due-lbl` (small accent-colored date badge) is the one Shop-only addition — Today's rows have no per-row due-date badge.

**Done items must stay visible (struck through, sunk to the bottom), never filtered out** — fixed 2026-09-22 across THREE separate call sites that had each independently done `.filter(s => !s.done)` before ever building rows/sorting, silently discarding a checked-off item entirely instead of letting the normal done-sinks-to-bottom sort handle it (the sort logic itself was always correct — these filters ran BEFORE it ever got the items):
- `mRenderShop()` — now groups/sorts ALL items per store (`!!a.done !== !!b.done` as the primary sort key, done last), not just `!s.done` ones.
- `mGetTodayTasks()`'s shopping pull-in (`shopToday`) — mirrors the SAME inclusion rule regular tasks already use (`due_date===ds`, regardless of done; `isOv()&&!done` only carries an item forward as "overdue" from a past day) — also fixed a second bug where this function hardcoded `done:false` in the mapped object instead of `!!s.done`, so even when an item WAS included its checkbox state was always wrong.
- `mRenderFullList()`'s HEB sub-list (`hebItems`) — same fix, plus gets `.m-groc-done` styling.
- If a shopping item ever appears to "disappear" again when checked off, check for a reintroduced `.filter(s => !s.done)` first — this exact bug has recurred 3x independently in different render paths.

### Row interaction — reuses Today's tap-menu/edit machinery, not its own
`mInitShopGestures()` calls the shared `_mInitTapHoldMenu('mShopList', ['.m-chk-wrap'])` factory (see Today section's "Row gestures" — same tap=edit/hold=menu model, no drag since Shop has none): tap → `_mRowEdit(el)` → `mOpenShopEdit`; hold → `_mShowTaskMenu(el)` (the shared `#mTaskMenuSheet`, Edit/Delete only — it already special-cases `rtype==='shop'` for when shop items show up on the Today list, so nothing new was added there). Delete routes through `mTaskMenuDelete` → `mDeleteShopDirect(id)` — there is no inline per-row delete button.
**No touch-drag reorder** (`_mShopTouchDrag` removed entirely, along with `.m-shop-dragging`/`.m-shop-drag-ph` CSS) — explicit request: desktop's manual drag-to-set-`shop_order` doesn't carry its weight on mobile. Items still sort by whatever `shop_order` desktop last wrote.

### Shop add popup (`#mShopAddBar`)
On-demand popup now, same exact pattern as Today's `#mAddBar` (opened via `#mShopHdrAddBtn`'s "+", `mToggleShopAdd()`/`mOpenShopAdd()`/`mCloseShopAdd()`, own backdrop `#mShopAddBackdrop`, own keyboard-tracking reposition pair `_mShopAddReposition()`/`_mInitShopAddKeyboardTracking()`) — **not** a permanently-docked bar any more, and no longer reserves list clearance (`mShowTab()` just clears `#mShopPage`'s inline padding, same as Today).
Fields mirror Today's own Shopping-type add fields exactly (`_mAddSyncTypeFields`'s `isShop` branch) — a custom `.m-cpick` store picker (`_mShopAddStore` state, `mToggleShopAddStorePick()`/`mSelectShopAddStore()`), NOT a native `<select>` (forces the keyboard down on iOS, see the comment on `#mAddStoreField`), `Other` reveals `#mShopAddStoreCustomField`'s free-text input, plus an optional `#mShopAddLink` Link field. `mAddShopItem()` reads `_mShopAddStore` (or the custom field when `Other`) + link, POSTs `{name, store, link, done}`.

### Shop edit sheet (`#mShopEditSheet`)
Same store-picker + custom-field + Link-field pattern as the add popup, own state (`_mShopEditStoreVal`, `mToggleShopEditStorePick()`/`mSelectShopEditStore()`), dropdown opens **upward** (`.m-cpick-opts--up`, matches `#mEditPickOpts` in `#mEditSheet` — the sheet already sits near the bottom, a downward dropdown would run off-screen) and needs `#mShopEditSheet .m-cpick-opts{z-index:102}` to sit above the sheet itself. `mOpenShopEdit(id)` sets the picker state directly (not via `mSelectShopEditStore`, which would steal focus to the custom field) so it doesn't fight the name field's own focus. `mSaveShopEdit()` → `sbReq PATCH shopping_list` (name, store, link, due_date, default_start_time).

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
#mYearSheet        ← Year View overlay, see own subsection (sibling of #mMonthPage, not inside it)
#mSearchSheet      ← Search overlay, see own subsection (sibling of #mMonthPage, not inside it)
```
The month/year nav control does NOT live inside `#mMonthPage` — it lives in the shared `#mHeader` (see Header section): `#mMonthHeaderControls`, now just a single `#mMonthYearPill` (a "‹ 2026" capsule button — Apple Calendar's own back-to-year-view convention), toggled visible by `mShowTab` only when `_mCurTab==='month'`. The OLDER two-dropdown month+year picker (`#mMonthMonthDrop`/`#mMonthYearDrop`) and the centered `#mMonthTodayNav` (Today/‹/› text group) it replaced are both fully retired — `mToggleMonthDrop`/`mToggleYearDrop`/`mPickMonth`/`mPickYear`/`mMonthJump` are all deleted, along with the `.m-mo-nav-group`/`.m-mo-today-btn`/`.m-mo-nav-btn`/`.m-mo-hdr-drop*` CSS.

### Year pill + Year View (`#mYearSheet`, replaced the old month/year dropdowns 2026-09-22)
- `#mMonthYearPill` shows just the year (updated live by `_mUpdateMonthTitle`, same scroll-tracking as before) with a chevron-left icon (the SAME thin two-stroke chevron SVG every other picker in the app uses, `.m-cpick-arr`'s pattern — not the unicode `▾` glyph the month/year dropdowns used to use). `mOpenYearView()` opens a full-screen bottom sheet showing a scrollable grid of all 12 mini-month calendars for that year (`_mYearMiniMonthHtml`, Monday-start to match the rest of the app, today's date circled), with `‹`/`›` buttons to change which year is shown (`mYearShift`). Tapping a date or a month name (`mYearPickDate(ds)`) closes the sheet and calls `mMonthJumpToOffset` (unchanged, reused verbatim) to jump the month-list view there.
- Deliberately colorless/no task data in this grid — it's a navigation picker, not another data view (explicit scope decision when it replaced the old dropdowns: "simpler, more intuitive navigation" was the ask, not visual parity with Apple's own colored dots).
- `#mYearSheet`/`#mMonthPage` both need `user-select:none`/`-webkit-touch-callout:none` (plain — no inputs live in either) since a long-press anywhere in them (e.g. arming the travel drag-select gesture, below) could otherwise trigger iOS's native text-selection; see the Today section's "Row gestures" for the FULL five-fix stack this alone isn't sufficient for on an actual task row.

### Search (`#mSearchSheet`, added 2026-09-22)
`#mMonthSearchBtn` (header, left of the Today/+ icons) → `mOpenMonthSearch()`. A full-screen sheet with a text input (`#mSearchInp`) and a results list, matching by substring against task/shopping/trip NAMES only (`st.tasks`/`st.shopping`/`st.travel`), sorted by date, tap a result to jump the month tab there (`mSearchPickDate` → `mMonthJumpToOffset` + `mMonthSelectDay`) and close.
- **`#mSearchInp` must be `font-size:16px`, not smaller** — iOS Safari auto-zooms the whole page in on focus for any input under 16px; at 15px (the original value) this visibly broke the sheet's fixed-position layout into what looked like "only the keyboard is visible, can't see what I'm typing." Every other input in this app is already 16px for the same reason (`#mNewTask`, `#mFullAddName`, etc.) — this was the one outlier.
- **Focus must happen SYNCHRONOUSLY in `mOpenMonthSearch()`**, not via `setTimeout` — same reasoning as `mOpenQuickAdd()`'s own focus call (see Add task popup above): iOS only reliably raises the keyboard for a programmatic `.focus()` inside the original tap's call stack.
- **Keyboard-aware repositioning**: `_mSearchReposition()`/`_mInitSearchKeyboardTracking()` track `window.visualViewport` and pin the sheet's `bottom` to the keyboard height, the exact same pattern `_mQuickAddReposition` already uses for the add popup — without it, the keyboard covered the input/results since the sheet's `bottom:0` was computed against the full (pre-keyboard) screen height.

### Quick-add "+" (`#mMonthAddBtn`, moved to the shared popup 2026-09-25)
`mMonthQuickAdd()` just calls `mOpenQuickAdd()` — the SAME quick-add popup Today/Week's "+" open (see Today section's "Add task popup"), not the heavier `#mFullAddSheet` any more. Targets whichever day is selected on the calendar (`_mMonthSelectedDs`) via the popup's own Due Date field, centrally resolved in `_mQuickAddTargetDs()`.

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
- `mMonthJumpToOffset(monthOffset)` — used by Year View's `mYearPickDate` and Search's `mSearchPickDate` (both above) to jump here; extends the rendered range first if the target isn't loaded yet. `mMonthJump(dir)`/the old `‹`/`›` header buttons that used to call it directly are gone (see Year pill above) — the function itself is unchanged, reused verbatim.
- **`.m-mo-week{border-top:1px solid var(--border)}`** (added 2026-09-26) — a light divider between every week row (and under `#mMonthDayHdr`), matching Apple Calendar's own continuous list. Previously no divider existed between adjacent weeks at all.

### Long-press-drag across days → create a travel task
`mInitMonthDrag()` (called once from `mInit()`), delegated on `#mMonthWeeks` so it survives re-renders — same long-press idiom as `mInitBlockDrag`: `touchstart` on `.m-mo-day[data-ds]` arms a 480ms timer (a plain tap before it fires still reaches `mMonthSelectDay`'s own `onclick` normally); on fire, locks `#mMonthScroll` `overflowY:hidden` and starts tracking; `touchmove` (dynamic `passive:false`) re-hit-tests via `elementFromPoint` (naturally skips `.m-mo-day-empty` placeholders — `pointer-events:none`) and highlights the inclusive date range with `.m-mo-day.drag-selected`; `touchend` restores scroll, clears highlights, and — only if the drag actually moved to a different day (`startDs !== endDs`; a same-cell long-press is not a drag) — opens `#mFullAddSheet` forced into Travel mode (`mSelectCat('fulladd','Travel')`) with `#mFullAddDue`/`#mFullAddEnd` pre-filled from the dragged range's min/max regardless of drag direction. This is the ONE place `#mFullAddSheet` is still reachable from Month (the header "+" moved to the shared quick-add popup, see Quick-add "+" above).
- **Arm vs. lock are separate steps** (fixed 2026-09-23, was the SAME bug as Today/Week's old drag architecture — see Today section's "Row gestures") — arming alone (480ms hold, no movement) used to immediately set `overflowY:hidden`, which froze scrolling for anyone who simply paused before scrolling (a stationary hold is a completely ordinary part of a scroll gesture). Now the touch is only locked (`overflowY:hidden`, `drag-selected` class, document touchmove listener) once it ACTUALLY crosses into a different day cell after arming — a hold-then-release-in-place, or a hold-then-scroll, never touches scroll at all.
- `.m-mo-day` needs `user-select:none`/`-webkit-user-select:none`/`-webkit-touch-callout:none` (see Year pill above) — plain CSS is enough here since there's no actual task-name TEXT inside a day cell to select; a hold-then-drag gesture over real task-name text (detail panel, below) needs the full five-fix stack documented in the Today section instead.

### Per-day color breakdown (`_mMonthDayBadge`, `_mMonthDotStyle`, `_mMonthCatKey`)
- Built from `mGetDayTasks(ds, weekOff)` — **the exact same call the tap-to-detail panel uses** (`_mRenderMonthDetail`). This is load-bearing: an earlier version used a separate, narrower data source for the badge and it silently missed WR recurring/WR rules/pup sessions/travel/birthday/video-step items, and disagreed with the detail panel. If badge/detail ever look like they disagree again, check whether the badge is on `mGetDayTasks` or something else first.
- `_mMonthCatKey(t)` — category key, explicit branches for shop/vid/vidstep/birthday/holiday/travel/weekly_reset(WR)/recurring, falls back to `t.category`. Shared by badge AND detail panel — never duplicate this logic inline, always call it.
- `_mMonthDotStyle(t)` — color priority: overdue (`OV`, requires `!t.done`) > important (`IMP`, requires `!t.done`) > category (`gc(_mMonthCatKey(t))`). **The badge's grouping key and its color must be derived from the exact same `isOverdue`/`isImportant` booleans per item** — an earlier version computed the grouping key with a check that didn't require `!t.done` while the color came from a separately-computed value that did, so a done task could land in the wrong bucket and the bucket's color became whichever task was processed last (looked like "random" mismatches). Fixed by computing both from one shared per-item calculation.
- Travel is excluded from the badge (`t._type!=='travel'`) — it gets its own spanning bar (below) instead; counting it in both would be redundant.
- Done tasks ARE included (plain category color, no overdue/important override — same convention as everywhere else) so a fully-completed day doesn't go blank.
- Single category present → `.m-mo-dot`; 2+ → segmented `.m-mo-bar`, ordered by `Object.keys(CATS)` order with `_overdue`/`_important` pulled to the front (rank -2/-1).
- `.m-mo-num` has a FIXED box size (**24×24**, bumped from 21×21 2026-09-26 — the number read as cramped/squished inside the smaller circle) applied to EVERY day, not just `.is-today` — the circle background/color is conditional but the box dimensions never change. An earlier version only fixed the size on `.is-today`, so today's cell had a taller number box than its neighbors, throwing off row alignment (the badge slot below it sat lower than the same row's other days).

### Month-boundary row split (like iOS Calendar's continuous list)
`_mMoWeekRowHtml(weekOff, forceLabel)` — when a Mon-Sun week crosses into a new month (detected by scanning `dates[1..6]` for a `getMonth()` change), the row SPLITS into two partial `.m-mo-week` rows at exactly that boundary: outgoing month's tail days on one line, a `.m-mo-month-divider` label, then the incoming month's days starting fresh on the next line. Both partial rows stay real 7-column grids — the days that belong to the OTHER partial row render as blank `.m-mo-day-empty` placeholders (no `data-ds`, `pointer-events:none`) so both rows still line up under the `#mMonthDayHdr` M/T/W/T/F/S/S header. This is what makes it "obvious what belongs to each month" (the ask that drove this — a single row silently containing days from two different months wasn't clear enough). Both partial rows carry the same `data-wk="${weekOff}"` (harmless — nothing looks up "the one row for weekOff X" any more, see below) but each gets its OWN accurate `data-mon` (used by `_mUpdateMonthTitle`).
- **Lookups now target the date, not the row**: `mMonthJumpToOffset`/`_mMoScrollToMonthStart` find the target day via `.m-mo-day[data-ds="..."]` then `.closest('.m-mo-week')` — looking up by `data-wk` alone would risk landing on the WRONG partial row (the tail of the prior month) when the target week is split.

### Travel bar (multi-day, like iOS Calendar's all-day event bars)
`_mMoTravelBarsHtml(dates, colStart, colEnd)` — per rendered row, one `.m-mo-travel-bar` per overlapping trip. `colStart`/`colEnd` (0-6 inclusive) clip a trip's bar to one partial row's column range when its week is split at a month boundary — same 7-column percentage math applies to both partial rows since each is still a full 7-column grid. Full-height (`top:2px;bottom:2px`), `opacity:.18`, `z-index:0` (`.m-mo-day` is `z-index:1` so day numbers/dots always render on top, never behind the bar). Left/width computed as column-index percentages, inset `±2px`/`∓4px` so two different trips landing on adjacent days show a visible gap instead of touching edge-to-edge (safe — only affects a trip's own outer edges, never day boundaries within one trip's own bar). Rounded corners (`5px`) only at the trip's TRUE start/end AND only when that end falls within the current segment — square everywhere else, so a trip spanning multiple weeks (or a month-boundary split) still reads as one continuous pill. **This bar itself carries NO visible text, only a `title` tooltip** — see the label lane below for the trip's actual name.

### Trip-name label lane (`_mMoTravelLabelsHtml`, added 2026-09-26)
A separate small text lane (`.m-mo-trip-lane`/`.m-mo-trip-label`) rendered directly ABOVE each week row that overlaps a trip — same `colStart`/`colEnd`-clipped percentage math as the travel bar above (a SEPARATE function, not text added inside the bar itself: keeping it as its own row means the label never has to fight the day numbers below it for legibility/z-index, which overlaying it on the full-height translucent bar would have). Solid `ts.bg`/`ts.t` colors (not the bar's translucent wash) so the name is actually legible. `margin-bottom:0` on `.m-mo-trip-lane` — the week row's own `border-top` (above) sits directly under it, reading as the lane's natural bottom edge.

### Day-detail panel (`#mMonthDetail`, rows redesigned 2026-09-22, gestures 2026-09-23, tightened 2026-09-23)
Tapping a day (`mMonthSelectDay`) renders its full task list below the grid (`_mRenderMonthDetail`, via `mGetDayTasks` — see Per-day color breakdown above for why that source matters). Rows are **`mTaskRow(t)` reused verbatim** (same band+circle-checkbox markup Today's own list uses — not a separate dot+name style any more) so `_mShowTaskMenu`/`_mRowEdit` work here unmodified; `mInitMonthGestures()` (`_mInitTapHoldMenu('mMonthDetail', [...])`, see Today section's "Row gestures") wires up the shared tap=edit/hold=menu model — no drag (day-cell drag, above, is a different gesture on a different element).
- **Two-column layout, fills column 1 first**: `tasks.length <= 2` → single column (`col2` empty — a light day stays a short block, no padded blank space); `3+` → `half = Math.ceil(n/2)`, first half in column 1, rest in column 2 (`.m-mo-detail-cols`/`.m-mo-detail-col`, plain flex row with `align-items:flex-start` — NOT `stretch`, so an uneven split never pads the shorter column out to match the taller one).
- **Rows are a SHRUNK variant of Today's size** (`#mMonthDetail .m-row{...}` scoped override — min-height 46px→22px, checkbox 19px→13px, left-padding bumped to 14px specifically so the checkbox clears the color band instead of hugging it) — this panel needs to fit more, shorter rows than a full-screen list does; Today/Week's own rows (separate containers) are untouched by the override.
- `#mMonthDetail` itself (`max-height:26vh`, `overflow-y:auto`, no fixed height) already auto-shrinks for a short list and scrolls past its cap for a long one — the 2-column split above is what actually fills that space efficiently, not a change to this container.

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
- Script tags use `?v=YYYYMMDDx` cache-busting params (`x` = a/b/c... letter suffix for multiple deploys on the same day — common during an iterative session). **Every deploy bump ALL of, to the exact same string, across all 9 mobile files now that there are four entry points:** `_BUILD` const + every asset `?v=` query (css/core.js/features.js/mobile-overview.js) in **each of** `mobile.html`/`mobile-today.html`/`mobile-month.html`/`mobile-shop.html`, plus `mobile-version.json`, plus the `start_url` version param in **each of** the 4 manifests (`mobile-manifest.json`/`mobile-today-manifest.json`/`mobile-month-manifest.json`/`mobile-shop-manifest.json`), plus `mobile-sw.js` VERSION. A one-line `sed -i` across all of them at once is the reliable way — missing even one manifest's `start_url` version was a real recurring bug source while building the 4-icon setup. This lets a stuck installed PWA self-heal on next foreground — **no reinstall needed** (fully close + reopen on wifi, may take 2 opens). The build stamp (Dark Mode section above, More tab) is the fast way to confirm which build a device is actually running before debugging further — repeatedly caught "fix isn't live yet" vs. "fix doesn't work" confusion during the icon/undo work.
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
  mShowTab(lastTab);   // restore last tab NOW, synchronously off cached data — see gotcha below
  mInitPickers();      // build all category/store/day/day-of-month/cadence pickers
  mInitTodayGestures(); mInitShopGestures();  // tap=edit/hold=menu(+drag for Today) — see Today section
  mInitPTR();          // pull-to-refresh on #mMain
  mInitTBSwipe();      // day-swipe on #mTLScroll
  mInitBlockDrag();    // longpress-drag on #mTLCol
  mInitWeekScroll(); mInitWeekGestures();   // Week's own scroll + tap/hold/drag
  mInitMonthDrag(); mInitMonthGestures();   // day-cell drag→create-travel-task; detail-panel tap/hold
  const authed = await checkAuth();
  if (!authed) return; // showLoginOverlay() called by core.js
  hideLoginOverlay();
  _mNavMoveHighlight(false); // re-snap the nav pill — see gotcha below
  await syncAll();     // fetch from Supabase → renderAll(), re-renders whichever tab mShowTab already picked
  setInterval(() => { if (cfg.url && cfg.key) syncAll(true); }, 30000);
}
document.addEventListener('DOMContentLoaded', mInit);
```

**Gotcha (2026-09-22): `mShowTab` must run BEFORE `checkAuth()`/`syncAll()`, not after.** It used to run only after both awaits resolved. `#mTodayPage` has no inline `display:none` in mobile.html (it's the default-visible page) while every other tab page does, so leaving the tab restore until after that network round-trip let Today paint on screen for however long it took, every single refresh, before snapping to the real last tab. Same principle as the login-flash fix below (Boot loading) — never let the wrong screen paint while waiting on the network; restore synchronously from what's already on disk (`load()` populates `st` from localStorage synchronously, so `mShowTab`'s render dispatch has real cached data to show immediately) instead. Moving it earlier surfaced a second, subtler bug: `mShowTab`'s own `_mNavMoveHighlight(true)` call now runs while `#mApp` is still `display:none` (see "Bottom nav" above) — `getBoundingClientRect()` on anything inside a hidden ancestor collapses to zero, so the sliding pill silently landed near Today's slot regardless of which tab was actually restored, even though the tab's own content and its nav button's `.active` color (which don't depend on layout) were both already correct. Fixed by re-snapping with `_mNavMoveHighlight(false)` right after `hideLoginOverlay()`, once `#mApp` is actually measurable — don't remove this snap if `mShowTab`'s early call ever moves again.

### Foreground re-sync
After the 30s `setInterval`, `mInit` adds `visibilitychange`/`pageshow`/`focus` listeners → `syncAll(true)` (3s dedup guard). iOS freezes `setInterval` while the PWA is backgrounded, so without this, reopening shows stale data (completed-elsewhere tasks reappear, deleted items linger). This is the mobile-side defense against stale-cache complaints — the DB is the source of truth; force a re-pull on every foreground.

### Live re-render after toggle
`togRecVirt` (and other mobile togglers) MUST call `renderAll()`, not just `mRenderToday()` — otherwise checking a recurring task while on the Week tab doesn't update that tab. `renderAll()` re-renders whichever tab is current. `togWrRule` drifted to `mRenderToday()`-only and was fixed 2026-08-26 — when adding/touching any toggler (`toggleTask`, `togRec`, `togShop`, `togWrRule`, `togRecVirt`, ...), grep all of them for `mRenderToday()` without a following `renderAll()` in the same statement.

### Today-tab lookback must extend forward, not just back 4 weeks
`mGetTodayTasks`'s three "check the last 4 weeks for a pinned/carried instance" loops (plain recurring, legacy `wrec`, `wrRules`) all start from week 0 by default — correct only while viewing today. Swiping the Today tab forward (`_mTodayOffset` can go positive — see Day-swipe navigation above) views a FUTURE day, and a loop hardcoded to start at week 0 never reaches that future week's own pinned items. Mirrors desktop's `_wkHi=Math.max(0,_dayWkOff)` pattern (overview.js): compute the viewed day's week offset (`_mDayWkOff`) once, start each loop at `_mWkHi=Math.max(0,_mDayWkOff)` and end at `_mWkLo=Math.min(0,_mDayWkOff)-4`. Fixed 2026-08-26 (was hardcoded `for(let w=0;w>=-4;w--)` in all three).

### Auth flow
`checkAuth()` (core.js, shared) calls `showLoginOverlay()` if no session found — tries `getSession()` first, then falls back to an explicit `refreshSession()` before giving up (added 2026-09-21, same race `_sbRefreshAuth()` already guarded against elsewhere: a cold PWA launch can find `getSession()` empty even with a valid refresh_token on disk, if the client's internal storage read hasn't finished). Was a suspected cause of "always shows the login screen" reports; see Boot loading below for a separate, confirmed cause of a related-looking symptom (a brief flash, not a real re-login).
`mDoLogin()` → `doLogin_m(email, pass)` → `_sbClient.auth.signInWithPassword()` → sets `_authToken` → `hideLoginOverlay()` → `syncAll()`
- **`doLogin_m` is try/catch wrapped** and shows any failure in `#mLoginErr` (missing supabase lib, bad network, no session). Never let it fail silently — a silent failure reads to the user as "the button does nothing". If a user reports the login button not working, first ask what the RED error says.
- **Login markup**: inputs + button are inside `<form onsubmit="event.preventDefault();mDoLogin();return false">` with `<button type="submit">`, so the iOS keyboard's Return key submits (button tap not required). `#mLogin` is `justify-content:flex-start` + `padding-top:14vh` (NOT `center` — centering parked the button under the iOS keyboard, making it untappable). Button has transparent tap-highlight, so "no flash on tap" is normal and ≠ tap not landing.
- `#mLogin input` background is `var(--glass)` (theme-aware, matches every other input in the app) — was hardcoded `rgba(255,255,255,.6)` (fixed 2026-09-21), which made the input unreadable in dark mode (light-colored text over a near-white box).

### Login overlay (mobile override)
Mobile overrides `showLoginOverlay(event)` and `hideLoginOverlay()` from core.js:
- `_mLoggedIn` flag prevents transient auth events (token refresh) from showing login
- **Desktop `core.js`**: `onAuthStateChange` never shows login overlay — network blips (DNS `ERR_NAME_NOT_RESOLVED`) cause false `SIGNED_OUT`. Login gated by `checkAuth()` on page load only.
- Mobile has its own `showLoginOverlay` override with `_mLoggedIn` guard

### Boot loading (`#mBootLoading`) — no more login-flash on an already-signed-in session
`#mLogin` used to be `display:flex` by default in mobile.css, so on EVERY load it painted before `checkAuth()`'s async session check could resolve — an already-signed-in user saw the login form flash, then get yanked into the app once `hideLoginOverlay()` fired. Most visible on a cold relaunch (swiped out of Recents, reopened) since that async check takes longest then — read by the user as "getting logged out" even though the session was valid the whole time (it does correctly auto-continue, hence "logged out" reports that don't correlate with any actual failed sign-in).
Fix: `#mLogin` (and `#mApp`) now both default to `display:none`. `#mBootLoading` (fixed, full-screen, small spinner reusing `.m-ptr-spinner`'s look) is the one element visible by default, covering that gap with a neutral loading state instead of the wrong screen. Both `showLoginOverlay()` and `hideLoginOverlay()` `.remove()` it the first time either actually runs — whichever branch `checkAuth()` lands on always removes it, so there's no added dead-end state.
**If a real login prompt still shows** (not just a brief spinner) and the user has to actually type credentials, that's a genuine session expiry, not this bug — a different investigation (iOS PWA storage eviction after inactivity vs. a multi-device refresh-token race are the two live theories, unconfirmed).
