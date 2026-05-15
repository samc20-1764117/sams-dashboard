# Videos Page Rules (`videos.js`)

### Data Model
- Table: `videos`. Key columns: `id`, `title`, `topic`, `video_type` (B=Big, L=Small), `big_video_id` (FK to parent B video's id), `playlist`, `status`, `post_date`, `duration_minutes` (min.sec format like 9.26), `is_deleted`.
- **Grouping**: L videos link to B videos via `big_video_id`. B videos don't have `big_video_id` set. Standalone L videos have `big_video_id=null`.
- **Stages** (step columns): `step_build`, `step_record`, `step_film`, `step_cut`, `step_thumbnail`, `step_description`, `step_tableau_public`, `step_upload_tableau`. Values: `done`, `not_started`, `na`.
- **Dropped columns** (do not reference): `number`, `build_hours`, `step_answer_comments`, `step_short`, `group_name` (migrated to `big_video_id`).
- `VID_STEPS` array and `VID_STEP_LABELS` map define the 8 stages.

### Status & Published Logic
- Statuses: `idea`, `up_next`, `in_progress`, `published`, `backup`. Order: 1. Idea → 2. Up Next → 3. In Progress → 4. Complete → 4. Backup (two 4s intentional).
- `VID_STATUS_LABELS` maps internal names to display names (e.g. `published`→"Complete", `up_next`→"Up Next"). `VID_STATUS_ORDER` defines sort order.
- **Auto-publish**: ALL steps done/na + `post_date` + `duration_minutes` + `topic` + `title` → auto-set `published`. For B videos, all children must also meet these criteria. Un-completing any requirement on published → `in_progress`. Published videos cannot have status changed via drag (protected in `_vidDashDrop`/`_vidGroupDrop`).
- **Helper functions**: `_vidIsComplete(v)` checks single video completeness. `_vidAllChildrenComplete(bigId)` checks all children of a B video.
- **Date colors**: no date=muted, published+future/today=green, published+past=black, all core done=green, has date=yellow.

### Header
- Layout: tabs → search → flex spacer → KPI pills → plus button. `margin-right:80px` on plus to clear overview button.
- **KPI pills**: Subscribers, $ Revenue (real from Analytics API, falls back to `~$` estimate at $4 RPM), divider, Ideas count, Active count, Published count.
- **Plus button**: white circle (`rgba(255,255,255,.85)`) with grey `+` icon, `border-radius:50%`, subtle shadow.
- **Overview button** (`#backToOv`): `position:fixed;top:46px;right:20px` — same on all non-overview pages.

### Views (4 tabs: Current → All Details → Analytics → Monthly)
- **Tab navigation**: navigating to videos from another page always resets to Current tab. Refresh preserves current tab via `localStorage._vidView`. Flag `_vidPageInit` prevents reset on page-load navigation.
- **Current** (`_vidView='dashboard'`): CSS grid layout (`3fr 1fr`) — Current + Ideas sharing same column tracks for aligned divider. Up Next and In Progress sections with no gap between them. Solid white (`#fff`) sub-headers with `display:flex;align-items:center`. No count next to "Current" header. Ideas side has Group/Single sub-sections with white bullets (`●`). No `+` button on idea rows. B→L grouping with white `└` connector. Drag between zones changes status. Standalone videos (no `big_video_id`) cannot be dragged into groups. Container uses liquid glass style (`rgba(255,255,255,.32)` with `backdrop-filter:blur(28px)`). B videos at `rgba(255,255,255,.50)`. Header columns: stages + Posted (centered, 52px) + Dur (centered, 36px) + views (42px, if YT data) + % (28px) + delete. Views column always rendered (empty if no data) to keep alignment.
- **All Details** (`_vidView='table'`): full table with sortable headers (click asc, click desc, click reset). `table-layout:fixed`. Sticky thead. Default sort: post_date asc with B→L grouping. Ideas excluded from this view. Column order: Title (450px) → Stages (22px each) → Posted → Dur → % → Status (80px). Status pills use `VID_STATUS_LABELS` with lighter color backgrounds. B videos at `rgba(255,255,255,.50)`. Stage columns are narrower than Current tab (22px vs 28px).
- **Analytics** (`_vidView='analytics'`): see Analytics Tab section below.
- **Monthly** (`_vidView='monthly'`): calendar grid by `post_date`. Nav with `_vidMonthOffset`.
- **Board** (`_vidView='board'`): kanban by status — function still exists but tab removed from UI.

### Numbering & Sorting
- **Numbering** (`_vidSeqMap` + `_vidOrderedIds`): only videos with `post_date` get a number. No date = no number. Ideas and in-progress without a posted date have no number.
- **Number order**: B (Big) video first, then its L (Small) children, all sorted by `post_date`. Standalone L videos (no `big_video_id`) numbered as top-level by their own `post_date`.
- **Global numbering**: numbers computed from ALL non-deleted videos with `post_date` (not just visible ones). Numbers are stable regardless of show/hide completed toggle.
- **Default sort** (`_vidSortVids`): groups by parent B video's `post_date`. Within group: B first, then children by `post_date`. Standalone L by own `post_date`. Sortable column headers override this (click asc, click desc, click reset).
- **B→L grouping**: maintained in all views. B videos always appear before their children.

### Display Rules
- **In progress videos**: show "Topic - Title" where topic is normal color, title is muted. For small (L) videos, both topic and title are muted/grey.
- **Completed videos**: show title only.
- **Big videos** (B): translucent white background (`rgba(255,255,255,.50)`) on both Current and All Details tabs.
- **Small videos** (L with big_video_id): muted/grey text in All Details, normal text in Current tab. White `└` indent mark when shown as child.
- **Standalone videos**: videos without `big_video_id` are standalone — cannot be dragged into B groups (`_vidGroupDrop` rejects).
- **% complete**: shown for `up_next`/`in_progress` videos between 1-99% (hidden at 0% and 100%). Calculated from done/applicable stages (excludes `na`). Far right on Current tab, between Dur and Status on All Details.
- **Hide by default** (`_vidShowCompleted=false`): published with past date hidden. For B videos, only hidden if ALL children also have past post_dates. Completed backup hidden. Toggle with +/- button or keyboard E/C.

### Inline Editing
- **All Details**: Single click on td with `data-field` → `vidCellEdit()`: inline text input for title/post_date/duration, dropdown for status. Post_date uses `m/d` or `m/d/yy` format via `_vidParseDate()`. Duration uses `type=text inputMode=decimal` (no spinner arrows). Inputs are borderless (`border:none; border-bottom:1px solid`) with transparent bg to prevent row height shift. Save on blur/Enter, cancel on Escape. Double click → `openVidEdit(id)` full edit modal.
- **Current tab**: Double-click on posted/duration spans → `_vidDashInlineEdit()`: text input for post_date (m/d format, auto-fills year via `_vidParseDate()`), text input with `inputMode=decimal` for duration (no arrows/placeholder). Save on blur/Enter, cancel on Escape.
- **Step dots**: click cycles `not_started→done→not_started`. If `na`, click cycles `na→not_started`. Right-click toggles na/required via `_vidToggleStepNa()`.
- **TA+Up linking**: `step_tableau_public` and `step_upload_tableau` always stay in sync — toggling na/required on one toggles the other. Applies in inline right-click (`_vidToggleStepNa`), modal right-click (`_vidNaModalStep`), and type change (`_vidTypeChanged`).
- All edits use `renderVideosPageKeepScroll()` to preserve scroll position.

### Edit Modal (`#vidModal`)
- Layout: topic first, title second, B/L toggle top-right, status+big video row, then outset container with stages + posted/duration side by side.
- Fields: title, topic, type (Big/Small toggle), status, post_date, duration (min.sec), big video (searchable input+datalist).
- **Stages**: toggle buttons — click=done/not done, right-click=na (invisible). Na stages can't be clicked, only right-click to restore.
- **Defaults for new**: Big → all stages required. Small → Tab Pub & Upload default to `na`. Changing type dropdown updates stages.
- **Big Video field**: searchable via datalist of all B video titles. `_vidGetBigVideoId()` resolves title→id on save.
- **Playlist field**: searchable via datalist of all existing playlists.

### + Button (Add Child Video)
- Shown to the left of B video titles in both Dashboard and All Details.
- `openVidModalForBig(bigId)`: opens add modal with type=Small, big video pre-selected, Tab Pub & Upload defaulted to na.

### Keyboard Shortcuts (when not in input)
- `n` — open add modal
- `e` — expand (show completed, table view only)
- `c` — collapse (hide completed, table view only)
- `Delete/Backspace` — delete selected
- `Cmd+C` — copy selected
- `Cmd+V` — paste/duplicate copied

#### No selection:
- `ArrowLeft/Right` — cycle tabs (dashboard → table → analytics → monthly)
- `ArrowUp` — scroll to top
- `ArrowDown` — scroll to default position

#### Current tab with selection:
- `Up/Down` — navigate selection (single select, moves to next/prev row, scrolls into view)
- `Shift+Up/Down` — extend selection (multi-select adjacent rows)
- `Cmd+Right` — promote status: idea → up_next → in_progress
- `Cmd+Left` — demote status: in_progress → up_next → idea
- `Cmd+Up/Down` — reorder/sort within column (block move for multi-select)
- `Escape` — clear selection
- `Click outside` rows — clear selection
- All status moves bring Big video's children along. Works with multi-select. Undoable.
- Selection persists after status moves and reorders.

### Default Scroll Position (`_vidScrollToDefault`)
- Fires on: first render (refresh), tab switch, clear search/filter, Escape, ArrowDown (no selection).
- Finds 3 most recent completed (`published`) videos with past `post_date` (before today). Deduplicates by parent Big so L children under same B don't count separately.
- Scrolls 3rd most recent to `block:'start'` — all 3 visible at top of viewport.
- If fewer than 3 qualify, scrolls to the oldest qualifying one.
- `renderVideosPageKeepScroll()` skips scroll restore when `wasScrolled=false` (scroll at 0) so it doesn't overwrite the default scroll on initial render.
- `renderAll()` (30s sync) uses `renderVideosPageKeepScroll` to preserve scroll, not `renderVideosPage`.

### Selection
- Click: single select (click again to deselect). Cmd+click: toggle add/remove. Shift+click: range select.
- Click outside rows/headers: clears selection (document-level listener).
- Big video selection auto-selects children via `_vidUpdateChildSel()` → `_vidChildSelected` set.
- Selection persists across renders, status moves, and reorders.
- `_applyVidSel()` applies `.vid-sel`/`.vid-child-sel` CSS classes.

### Scroll Behavior
- `_vidScrollEl()` returns correct scroll container per view: dashboard → first div inside card, table/other → card itself (which has `overflow:auto`).
- `renderVideosPageKeepScroll()` captures scroll before render, restores after with triple restore (immediate + rAF + double rAF). Skips restore when scroll was 0 to allow default scroll.
- Editing on All Details never resets scroll — `core.js save()` and all edit paths use `renderVideosPageKeepScroll`.

### Client-Side Migration
- `renderVideosPage()` auto-migrates `group_name` → `big_video_id` by matching B video's `group_name` field. Safety net until all data uses `big_video_id`.

### Key Functions
- `_vidScrollEl()` — returns scroll container: card div for dashboard, card itself for table/other views
- `_vidSeqMap(orderedIds)` — maps ordered ID array to sequential numbers (1, 2, 3...)
- `_vidOrderedIds(vids)` — builds display-order ID list from videos with `post_date`, B→children grouped
- `_vidDateColor(d,v)` — returns CSS color for post_date display
- `_vidSortVids(vids)` — applies current sort or default B→L grouped post_date sort
- `_vidFiltered()` — filters by group, search, status
- `_vidEnsureSynced(v)` — pushes local-only `l-` prefix videos to Supabase before PATCH ops. Syncs parent B first if needed.
- `_vidParseDate(str)` — parses "m/d" or "m/d/yy" to ISO date with auto current year
- `_vidLinkedStep(step)` — returns linked step (TA↔Up) or null
- `_vidToggleStepNa(id,step)` — right-click toggle na/required with linked TA+Up sync
- `_vidDashInlineEdit(span,id,field)` — inline editing for posted/duration on current tab
- Undo/redo: `_stateSnap`/`_stateRestore` include `videos`. `_syncRedoDiff` syncs video field changes to Supabase. `_vidGroupDrop` and `_vidDashDrop` both have proper undo callbacks.
- `cycleVidStep(id,step)` — toggles step with auto-publish logic
- `vidCellEdit(td,id,field)` — inline cell editing
- `vidCellClick(e,id)` — routes to inline edit (table) or selection (other views)

### Analytics Tab (`_vidView='analytics'`)
- **Data**: merges Supabase `st.videos` (published + post_date) with `_ytMatch` YT stats + `_ytAnalytics` real revenue. Filters out shorts/posts using `_ytDurSec()` (only videos >60s). All computation is client-side from already-fetched data — zero additional API calls.
- **State**: `_anTrendMetric` (revenue|views|likes|engagement|videos), `_anTrendPeriod` (monthly|yearly), `_anRevMode` (earned|posted). Tab persisted in `localStorage._vidView`.
- **Layout** (top → bottom by importance):
  1. **KPIs** (6 cols): Unreplied Comments (red, click opens unreplied modal w/ Enter-to-close when nothing selected), Total Views, Avg Views/Video, Videos, Revenue, Subscribers. Each (except Unreplied) has inline sparkline + single-click opens `_anKpiModal(metric)` with monthly breakdown table (best/worst highlighted, % change, trend narrative, top contributors). Enter/Escape closes modal.
  2. **Trend Chart (2/3) + Strategy Insights (1/3)**: Single neutral color for all metrics (`rgba(120,113,145)`), current month/year highlighted (darker + bold label). No chart header — toggles with divider between metrics and timeframe. **Actual/By Video toggle** (3rd toggle group, divider-separated) for all metrics except Videos — switches between real calendar-month data (YouTube Analytics API) and per-video attribution by post_date. Summary line (total + avg) right-aligned inline with toggles. Bars thin (55% width), height capped at 70%, values above each bar. Month labels use abbreviations (Jan, Feb...). Strategy panel organized into 4 sections with uppercase headers: **What to make** (top earner topic, best $/video topic, big vs small with $, best combo), **How to make it** (best duration, best duration for $, engagement-views correlation), **When to post** (best day, publishing pace), **Channel health** (momentum, consistency score via CV%, engagement trend).
  3. **Do More Like This + Try Next** (2 cols): Do More Like This scored by views x engagement. Try Next suggests specific topics based on stale high-performers (>60d since last post), underexplored topics (few videos but good avg), and top-performing patterns.
- **Color philosophy**: minimal. Sparklines use green/red for direction. Trend bars use single neutral color, current period highlighted darker. Strategy panel uses emoji icons, no colored text.
- **Revenue data**: Real revenue from YouTube Analytics API (OAuth). `_hasRealRev` flag. `_vRev(v)` helper returns real per-video revenue (`v.realRev` from `_ytAnalytics.topVideos`) or falls back to $4 RPM estimate. `_revPfx` is empty when real data, `~` when estimated. Header, KPIs, trend, strategy, and KPI modals all use `_vRev()` for consistent real/estimated revenue. Banner prompting to connect only shows when `!_ytAnalytics`.
- **Actual vs By Video toggle** (`_anRevMode`): "Actual" = real activity per calendar month from YouTube Analytics API. "By Video" = stats attributed to video's post_date month. Available for revenue, views, likes, engagement. Not for video count (inherently by post date). Toggle via `_anToggleRevMode()`.
- **Strategy tooltips**: hover any insight row to see underlying bar chart data (e.g. avg views by day of week). Data stored in `_anTipStore`, rendered via `_anShowTip(e,key)`/`_anHideTip()`. Tooltip positioned left of strategy panel.
- **Key functions**: `_vidRenderAnalytics()`, `_anSetTrend()`, `_anToggleRevMode()`, `_anKpiModal(metric)`, `_anShowTip()`, `_anHideTip()`, `_vRev(v)`, `_ytDurSec(iso)`, `sparkline(vals)`, `stat()`, `card()`.

### YouTube Data API Integration
- **Endpoint**: `/api/yt` — Cloudflare Pages Function at `functions/api/yt.js`. All YouTube routes (data, OAuth, analytics) are in this single file.
- **Secrets** (Cloudflare dashboard, Production env vars): `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`.
- **QUOTA CRITICAL**: YouTube Data API v3 gives 10,000 units/day, resets midnight Pacific. NEVER use `search.list` (100 units/call). Use `playlistItems.list` (1 unit/call). One full fetch ~ 35 units (15 videos + 20 comment threads). NEVER write code that can re-fetch on re-render — a single re-render loop can burn the entire daily quota in minutes.
- **Client safeguards**: `_ytFetched` global flag — set `true` before fetch, only resets on full page reload. One fetch per page load, period. Also caches to `localStorage._ytCache` as offline fallback.
- **Server KV cache (3 keys)**:
  - `yt-fresh` (12hr TTL) — serves cached data, prevents API calls. This is the primary cache.
  - `yt-good` (no TTL) — permanent copy of last successful response. Fallback when API is down.
  - `yt-cooldown` (1hr for quota, 5min for other errors) — prevents retrying a failed API call.
- **RSS fallback**: If API fails and no `yt-good` data exists, fetches YouTube RSS feed (`/feeds/videos.xml`) which costs zero quota. Returns 15 most recent videos.
- **`?refresh=1`** param busts `yt-fresh` and `yt-cooldown` cache. POST with JSON body seeds KV directly.
- **Matching**: Two-pass: (1) exact date match `post_date === publishedAt.slice(0,10)`, (2) +/-1 day with title similarity for UTC timezone offsets. Uses both `title` and `topic` for scoring. Stored in `_ytMatch` map (Supabase ID -> `{views, likes, comments, ytId}`).
- **Display**: Channel stats bar (subscribers, real total revenue or estimated, video count) at top of page. Views, Likes & Comments columns in All Details table. Purple view count in Current dashboard rows.
- **Data flow**: `fetch('/api/yt')` -> `_ytData` + `localStorage` -> `_ytBuildMatch()` -> `_ytMatch` -> `renderVideosPageKeepScroll()`.
- **Unreplied Comments**: API fetches `commentThreads.list` with `allThreadsRelatedToChannelId`, filtered to long-form videos only (>60s duration). Returns `unrepliedComments` array (comments with `totalReplyCount === 0`). Max 20 pages = 20 units. Each comment has `{id, videoId, videoTitle, text, publishedAt}`.
- **Unreplied KPI**: First KPI on Analytics tab, red styling to stand out. Single-click opens modal with full list. Enter closes when nothing selected. Selection uses shift/cmd like tasks. "Dismiss Selected" removes from count. Dismissed IDs stored in `st._ytDismissed` (persisted via `save()`/`load()` in core.js).
- **Key functions**: `_ytBuildMatch()`, `_ytForVid(id)`, `_ytNum(n)`, `_ytEsc(s)`, `_ytDur(iso)`, `_ytShowUnreplied()`, `_ytToggleSel()`, `_ytDismissSelected()`, `_ytGetDismissed()`, `_ytSaveDismissed()`.
- **Errors**: silently hidden in UI (no red text). Console shows `[YT]` debug logs for troubleshooting.

### YouTube Analytics API (Revenue + Real Monthly Data)
- **SECURITY & AVAILABILITY — TOP PRIORITIES**: All API integrations use multi-layer caching to guarantee the dashboard always shows data, even when APIs are down or quota is exhausted. Never bypass these safeguards.
- **Routes**: All in `functions/api/yt.js` via `?mode=` param: `auth-status`, `auth-start`, `auth-callback`, `analytics`.
- **Auth**: OAuth 2.0 with `yt-analytics.readonly` + `yt-analytics-monetary.readonly` scopes.
  - **Credentials**: `GCP_CLIENT_ID` + `GCP_CLIENT_SECRET` env vars (Production only). Also stored in KV (`oauth-client-id`, `oauth-client-secret`) during callback so dev/preview can read them.
  - **Tokens**: refresh token in KV (`yt-oauth-refresh`), access token cached with TTL (`yt-oauth-access`).
  - **OAuth flow always routes through production** (`sams-dashboard.pages.dev`). Dev/preview redirect to production for `auth-start` if credentials not found locally. Callback redirect URI is hardcoded to production.
  - **Credential fallback chain**: `context.env.GCP_CLIENT_ID` (env var) -> `KV.get('oauth-client-id')` (stored during callback). This lets dev read credentials from shared KV without needing its own env vars.
  - **Google Cloud Console**: OAuth consent screen has user added as test user (app is unverified, personal use only). Redirect URI: `https://sams-dashboard.pages.dev/api/yt?mode=auth-callback`.
- **Data**: `_ytAnalytics` global. `monthly[]`: month, views, revenue, likes, comments, subscribersGained, avgViewDuration. `topVideos[]` (top 50 by revenue): videoId, views, revenue, likes, comments, avgViewDuration.
- **Date alignment**: YouTube Analytics API with `dimensions: 'month'` requires BOTH startDate and endDate to be 1st of a month. Start = 1st of month 2 years ago, end = 1st of current month.
- **Server KV cache (3 keys, mirrors Data API pattern)**:
  - `yta-fresh` (24hr TTL) — serves cached data, prevents API calls. Only 1 fetch per day.
  - `yta-good` (no TTL) — permanent fallback. Dashboard ALWAYS shows data even if API is completely down.
  - `yta-cooldown` (2hr for quota, 10min for other errors, 1hr for token errors) — prevents retrying failed calls.
- **Client safeguards**: `_ytAnalyticsFetched` flag set BEFORE fetch — one fetch per page load, period. Also caches in `localStorage._ytAnalyticsCache` as offline fallback. Errors silently caught, never retried.
- **Quota**: YouTube Analytics API has SEPARATE quota from Data API. ~200 queries/day default. We use 2 queries per fetch, cached 24hr in KV. Max 1 actual API call per day. If quota hit, cooldown + permanent fallback ensures dashboard always shows data.
- **KV namespace**: `YT_CACHE` (ID: `6787fe5f65e142638da5625d3b333b18`). Bound to BOTH Production and Preview deployments (Preview binding was added via Cloudflare API — dashboard UI only shows Production by default).
- **NEVER**: add retry loops, remove cooldown checks, reduce cache TTLs, add `search.list` calls, or make any change that could increase API call frequency. The dashboard must always be accessible.
