# Videos Page Rules (`videos.js`)

### Data Model
- Table: `videos`. Key columns: `id`, `title`, `topic`, `video_type` (B=Big, L=Small), `big_video_id` (FK to parent B video's id), `playlist`, `status`, `post_date`, `duration_minutes` (min.sec format like 9.26), `is_deleted`.
- **Grouping**: L videos link to B videos via `big_video_id`. B videos don't have `big_video_id` set. Standalone L videos have `big_video_id=null`.
- **Stages** (step columns): `step_build`, `step_vo`, `step_cut`, `step_thumbnail`, `step_description`, `step_tableau_public`. `step_upload_tableau` kept in Supabase but merged into Tab visually (always synced). Values: `done`, `not_started`, `na`.
- **Core 5 stages**: `VID_STEPS_CORE` = first 5 (Build, Vo, Cut, Th, Des). Completing all 5 triggers posting date prompt.
- **Tab stage** (6th): `step_tableau_public` — controls both `step_tableau_public` and `step_upload_tableau` in Supabase.
- **Completeness levels**: (1) Core 5 done → prompt posting date. (2) Core 5 done + posting date → status=published. If tab required, creates "Post Tab - Topic" task (category=Videos, green) + auto timeblock 7:30-8am. (3) Tab done (or na) → true completeness, removed from overview.
- **`youtube_url`**: stored on video record. Prompted during posting date entry (when tab required). Shown in edit modal. Post Tab timeblock has 📋 copy-link button.
- **Dropped columns** (do not reference): `number`, `build_hours`, `step_answer_comments`, `step_short`.
- **`group_name`**: legacy field migrated to `big_video_id`. Client-side migration in `renderVideosPage()` re-assigns `big_video_id` from `group_name` if missing — but ONLY for non-`idea` status videos. When ungrouping L videos (Cmd+Right to idea), MUST clear both `big_video_id` AND `group_name` (local + Supabase PATCH) or the migration will restore the parent link.
- `VID_STEPS` array (6 stages) and `VID_STEP_LABELS` map define the displayed stages. `VID_STEPS_CORE` = first 5.

### Status & Published Logic
- Statuses: `idea`, `up_next`, `in_progress`, `published`, `backup`. Order: 1. Idea → 2. Up Next → 3. In Progress → 4. Complete → 4. Backup (two 4s intentional).
- `VID_STATUS_LABELS` maps internal names to display names (e.g. `published`→"Complete", `up_next`→"Up Next"). `VID_STATUS_ORDER` defines sort order.
- **Auto-publish**: Core 5 done + `post_date` + `topic` + `title` → `published`. If tab required, creates "post tab" task for the posting date. Tab completion = true completeness (removed from overview). `_vidAutoPublishFromYt` — YT match + all 6 steps done → `published`. Un-completing core steps on published → `in_progress`. Published videos cannot have status changed via drag.
- **Posting date prompt**: Triggered when 5th core step completes (on any view) and no `post_date` set. If tab required: creates task. If not: fully complete.
- **Helper functions**: `_vidIsComplete(v)` = core 5 done + post_date + topic + title. `_vidTrulyComplete(v)` = above + tab done/na. `_vidAllChildrenComplete(bigId)` checks children.
- **Date colors**: no date=muted, published+future/today=green, published+past=black, all core done=green, has date=yellow.

### Header
- Layout: tabs → search → flex spacer → KPI pills → plus button. `margin-right:80px` on plus to clear overview button.
- **KPI pills**: Subscribers, $ Revenue (real from Analytics API, falls back to `~$` estimate at $4 RPM), divider, Ideas count, Active count, Published count.
- **Plus button**: white circle (`rgba(255,255,255,.85)`) with grey `+` icon, `border-radius:50%`, subtle shadow.
- **Overview button** (`#backToOv`): `position:fixed;top:46px;right:20px` — same on all non-overview pages.

### Views (4 tabs: Current → All Details → Analytics → Monthly)
- **Tab navigation**: navigating to videos from another page always resets to Current tab. Refresh preserves current tab via `localStorage._vidView`. Flag `_vidPageInit` prevents reset on page-load navigation.
- **Current** (`_vidView='dashboard'`): CSS grid layout (`3fr 1fr`) — Current + Ideas sharing same column tracks for aligned divider. Up Next (blue tint, `rgba(14,165,233,.06)` header + `.03` bg) and In Progress (amber tint, `rgba(245,158,11,.06)` header + `.03` bg) sections with subtle white divider between them (`rgba(255,255,255,.15)`). Solid white (`#fff`) sub-headers with `display:flex;align-items:center`. No count next to "Current" header. Ideas side has Group/Single sub-sections with white bullets (`●`). No `+` button on idea rows. B→L grouping with white `└` connector. Drag between zones changes status. Standalone videos (no `big_video_id`) cannot be dragged into groups. Container uses liquid glass style (`rgba(255,255,255,.32)` with `backdrop-filter:blur(28px)`). B videos at `rgba(255,255,255,.50)`. Header columns: stages + Posted (centered, 52px, YT-sourced) + % (28px) + delete. No duration or views on Current tab.
- **All Details** (`_vidView='table'`): full table with sortable headers (click asc, click desc, click reset). `table-layout:fixed`. Sticky thead. Default sort: post_date asc with B→L grouping. Ideas excluded from this view. Column order: Title → Stages (22px each) → spacer → Status (120px, with inline %) → Posted → Length → Views → Likes → Cmts. Posted/Length/Views/Likes/Cmts are YT-only (no Supabase fallback). Status pills use `VID_STATUS_LABELS` with lighter color backgrounds. B videos at `rgba(255,255,255,.50)`. Stage columns are narrower than Current tab (22px vs 28px).
- **Analytics** (`_vidView='analytics'`): see Analytics Tab section below.
- **Monthly** (`_vidView='monthly'`): calendar grid by `post_date`. Nav with `_vidMonthOffset`.
- **Board** (`_vidView='board'`): kanban by status — function still exists but tab removed from UI.

### Numbering & Sorting
- **Numbering** (`_vidSeqMap` + `_vidOrderedIds`): only videos with `post_date` get a number. No date = no number. Ideas and in-progress without a posted date have no number.
- **Number order**: B (Big) video first, then its L (Small) children, all sorted by `post_date`. Standalone L videos (no `big_video_id`) numbered as top-level by their own `post_date`.
- **Global numbering**: numbers computed from ALL non-deleted videos with `post_date` (not just visible ones). Numbers are stable regardless of show/hide completed toggle.
- **Default sort** (`_vidSortVids`): groups by parent B video's `post_date`. Within group: B first, then children by `post_date`. Standalone L by own `post_date`. Sortable column headers override this (click asc, click desc, click reset).
- **B→L grouping**: maintained in all views. B videos always appear before their children.
- **Group completion coupling** (`_vidGroupFullyComplete(v)` in overview.js): a big/small group is "done" only when the B AND every non-deleted L are `published`. The overview **videos pop-up** (`_renderVidOvMenu`) keeps a finished member visible (shown done; status stays `published` so Analytics still matches) under its big until the whole group is done — a published L stays nested under its B, a published B stays in the up-next list until all its L's are published, then the group drops off together. Also gates `_vidStillPending`/`_vPend` (today list + weekly cal show a published-but-group-incomplete video on its post_date).
- **Videos pop-up focus week** (`_vidOvFocusWk`): highlights videos scheduled in `getWkKey(wkOff)`. Pop-up re-renders on every week change so the highlight tracks the currently-shown week.

### Display Rules
- **In progress videos**: show "Topic - Title" where topic is normal color, title is muted. For small (L) videos, both topic and title are muted/grey.
- **Completed videos**: show title only.
- **Big videos** (B): translucent white background (`rgba(255,255,255,.50)`) on both Current and All Details tabs. `+` button to add child (8px margin-right for breathing room). Child count shown in parentheses after title — 9px, `rgba(140,135,160,.7)`, nudged `top:0.5px` for vertical alignment.
- **Small videos** (L with big_video_id): muted/grey text in All Details, normal text in Current tab. White `└` indent mark when shown as child.
- **Standalone videos**: videos without `big_video_id` are standalone — cannot be dragged into B groups (`_vidGroupDrop` rejects). L videos without a valid B parent are forced to `idea` status by guard in `renderVideosPage()` (line ~352).
- **% complete**: shown for `up_next`/`in_progress` videos between 1-99% (hidden at 0% and 100%). Calculated from done/applicable stages (excludes `na`). Far right on Current tab, between Dur and Status on All Details.
- **Vertical centering**: Row content uses `display:flex;align-items:center` on title divs and step dot wrappers (both tabs). Step dot containers use flex centering. Prevents content from appearing lifted.
- **Header height**: Current (`.vid-dash-header`) and All Details (`.vid-tbl th`) must match — both `32px` in `styles.css`. Change both together.
- **Hide by default** (`_vidShowCompleted=false`): published with past date hidden. For B videos, only hidden if ALL children also have past post_dates. Completed backup hidden. Toggle with +/- button or keyboard E/C.

### Inline Editing
- **All Details**: Single click on td with `data-field` → `vidCellEdit()`: inline text input for title, dropdown for status. Inputs are borderless (`border:none; border-bottom:1px solid`) with transparent bg to prevent row height shift. Save on blur/Enter, cancel on Escape. Double click → `openVidEdit(id)` full edit modal. Posted/Length are YT-sourced, not inline-editable.
- **Current tab**: Double-click on any row → opens full edit modal (`openVidEdit(id)`). No inline editing for posted/duration (YT-sourced).
- **Step dots**: click cycles `not_started→done→not_started`. If `na`, click cycles `na→not_started`. Right-click toggles na/required via `_vidToggleStepNa()`.
- **Tab linking**: `step_tableau_public` and `step_upload_tableau` always stay in sync — toggling one toggles the other. Only Tab shown in UI; Up hidden but kept in Supabase.
- All edits use `renderVideosPageKeepScroll()` to preserve scroll position.

### Edit Modal (`#vidModal`)
- Layout: topic first, title second, B/L toggle top-right, status+big video row, then outset container with stages only (posted/duration hidden — YT-sourced).
- Fields: title, topic, type (Big/Small toggle), status, big video (searchable input+datalist), youtube_url. `vmPostDate` rendered inline between Des and Tab stages. `vmDuration` is hidden input.
- **Stages**: toggle buttons — click=done/not done, right-click=na (greyed). Na stages can't be clicked, only right-click to restore.
- **Tab+Link greying**: when Tab is na, both Tab wrapper (`vmTabWrap`) and Link wrapper (`vmLinkWrap`) grey at `opacity:.5`. Link input gets grey fill (`rgba(210,205,228,.15)`), no placeholder. Right-click on Link (`_vidLinkCtx`) toggles both Tab+Link together via `_vidNaModalStep`. Link wrapper has `cursor:default`.
- **Defaults for new**: Big → all stages required. Small → Tab default to `na`. Changing type dropdown updates stages.
- **Big Video field**: searchable via datalist of all B video titles. `_vidGetBigVideoId()` resolves title→id on save.
- **Rapid add from overview pop-up**: when `_vidMode==='add'` AND opened from the overview (`activePg==='overview'`), `saveVidModal` does NOT close on save (`_keepOpen`) — it clears topic/title/comment and refocuses topic so you can keep adding (Save and Enter behave identically). An empty submit closes it via the empty-topic guard. Edit mode and the videos-page add modal still close on save.
- **Playlist field**: searchable via datalist of all existing playlists.

### + Button (Add Child Video)
- Shown to the left of B video titles in both Dashboard and All Details.
- `openVidModalForBig(bigId)`: opens add modal with type=Small, big video pre-selected, Tab defaulted to na.

### Keyboard Shortcuts (when not in input)
- `n` / `b` — open add modal (Big video default)
- `l` — open add modal (Little video default)
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
- `Cmd+Right` — **B videos**: up_next→in_progress→idea (one step at a time). **L videos**: up_next OR in_progress→idea (direct jump, clears `big_video_id` AND `group_name` in local state + Supabase PATCH). Children of moving B videos use L map. Works with multi-select. Fully undoable.
- `Cmd+Left` — idea→in_progress→up_next (one step, same for B and L).
- `Cmd+Up/Down` — reorder/sort within column (block move for multi-select)
- `Escape` — clear selection
- `Click outside` rows — clear selection
- All status moves bring Big video's children along (children use L/small map — direct to idea on Cmd+Right). Works with multi-select. Undoable.
- Selection persists after status moves and reorders.

### Default Scroll Position (`_vidScrollToDefault`)
- **Config**: `publishedBigs[2]` — change the index to show more/fewer bigs at top (0-based: `[2]` = top 3 visible).
- Fires on: first render (refresh), tab switch, clear search/filter, Escape, ArrowDown (no selection).
- Finds most recent published B videos with past `post_date` (Supabase, not YT). Scrolls nth to `block:'start'`.
- Also re-fires after localStorage YT cache load and after YT API fetch (in case `_vidAutoPublishFromYt` changes statuses).
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
- `renderVideosPage()` auto-migrates `group_name` → `big_video_id` by matching B video's `group_name` field. **Skips videos with `status==='idea'`** to prevent re-grouping ungrouped L videos. Safety net until all data uses `big_video_id`.
- **CRITICAL**: When clearing `big_video_id` for ungrouping, ALWAYS also clear `group_name` (both locally and via Supabase PATCH). Otherwise: (1) the migration restores `big_video_id` on next render, (2) the 30s Supabase sync brings back `group_name` from DB, re-triggering the migration.

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
- `_vidDashInlineEdit(span,id,field)` — no-op (posted/duration not inline-editable, YT-sourced)
- Undo/redo: `_stateSnap`/`_stateRestore` include `videos`. `_syncRedoDiff` syncs video field changes to Supabase. `_vidGroupDrop` and `_vidDashDrop` both have proper undo callbacks.
- `cycleVidStep(id,step)` — toggles step with auto-publish logic
- `_vidAutoPublishFromYt()` — auto-sets status to `published` for any non-published/non-backup video that has a YT match + all steps done. Runs after YT API fetch AND localStorage cache load.
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
- **Matching**: Multi-pass via `_ytBuildMatch()`: Pass 1a (exact title+date), 1b (date+score≥2), Pass 2 (±1day+score), Pass 3 (exact title steal-back, all statuses), Pass 4 (re-match stolen, published only). Title normalization via `_ytNorm()` (strips curly quotes, punctuation, lowercases). Stored in `_ytMatch` map (Supabase ID -> `{views, likes, comments, ytId, publishedAt, duration}`).
- **YT-sourced fields**: Posted (`publishedAt`) and Length (`duration`) pulled from YT match, not Supabase. Helpers: `_ytPostDate(id)`, `_ytDurMin(id)`, `_fmtDur(m)`. Mismatch search filter available to find unmatched published videos.
- **Display**: Channel stats bar at top. Views/Likes/Cmts in All Details. `.vid-num` class (`system-ui` + `tabular-nums`) for equal-width digit alignment on all numeric columns.
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
