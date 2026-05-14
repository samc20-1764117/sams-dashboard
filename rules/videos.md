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

### Views (4 tabs: Current → All Details → Analytics → Monthly)
- **Current** (`_vidView='dashboard'`): CSS grid layout (`2fr 1fr`) — Current + Ideas sharing same column tracks for aligned divider. Up Next/In Progress/Group/Single have solid white (`#fff`) sub-headers with `display:flex;align-items:center`. No count next to "Current" header. Ideas side has Group/Single sub-sections with white bullets (`●`). No `+` button on idea rows. B→L grouping with white `└` connector. Drag between zones changes status. Standalone videos (no `big_video_id`) cannot be dragged into groups. Container uses liquid glass style (`rgba(255,255,255,.32)` with `backdrop-filter:blur(28px)`). B videos at `rgba(255,255,255,.50)`. Header includes 28px spacer for % column + 42px for YT views.
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
- **All Details**: Single click on td with `data-field` → `vidCellEdit()`: inline input for title/playlist/duration/post_date, dropdown for status. Save on blur/Enter, cancel on Escape. Double click → `openVidEdit(id)` full edit modal.
- **Current tab**: Double-click on posted/duration spans → `_vidDashInlineEdit()`: text input for post_date (m/d format, auto-fills year via `_vidParseDate()`), number input for duration. Save on blur/Enter, cancel on Escape.
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
- `ArrowLeft/Right` — cycle tabs (dashboard → table → analytics → monthly)
- `ArrowUp` — scroll to top
- `ArrowDown` — scroll to bottom
- `Delete/Backspace` — delete selected
- `Cmd+C` — copy selected
- `Cmd+V` — paste/duplicate copied

### Client-Side Migration
- `renderVideosPage()` auto-migrates `group_name` → `big_video_id` by matching B video's `group_name` field. Safety net until all data uses `big_video_id`.

### Key Functions
- `_vidScrollEl()` — finds scroll container for keep-scroll renders
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
- **Data**: merges Supabase `st.videos` (published + post_date) with `_ytMatch` YT stats. Filters out shorts/posts using `_ytDurSec()` (only videos >60s). All computation is client-side from already-fetched data — zero additional API calls.
- **State**: `_anTrendMetric` (revenue|views|likes|engagement|videos), `_anTrendPeriod` (monthly|yearly). Toggled via `_anSetTrend(metric,period)`.
- **Layout** (top → bottom by importance):
  1. **KPIs** (6 cols): Total Views, Avg Views/Video, Engagement, Videos, Est. Revenue, Subscribers. Each has inline sparkline (left of value, 44x16 SVG) colored green/red based on trend direction. Sub-text shows this-month value where applicable. All values use `var(--text)` — no competing colors.
  2. **Trend Chart (2/3) + Strategy Insights (1/3)**: Bar chart with metric/period toggle buttons (subtle grey highlight, not solid fill). Strategy panel ("What Makes Your Videos Win") shows: best duration, best publish day, big vs small multiplier, best title length, top topic, most engaging topic, momentum (90-day vs older), winner profile.
  3. **Money Makers + Do More Like This** (2 cols): Top earners by est. revenue. Do More Like This scored by views × engagement rate.
  4. **Fastest Growing + Stars & Sleepers + Most Engaged** (3 cols): Velocity (views/day), over/underperformers vs avg, highest engagement rate.
- **Color philosophy**: minimal. Sparklines use green/red as directional indicators only. Stars & Sleepers keeps green/red for over/under. All other values use default text color. Strategy panel uses emoji icons, no colored text.
- **Revenue**: estimated at `$4 RPM` (configurable via `rpm` const). Applied to total and per-video.
- **Key functions**: `_vidRenderAnalytics()`, `_anSetTrend()`, `_ytDurSec(iso)`, `sparkline(vals)`, `stat()`, `card()`, `bar()`.

### YouTube Analytics Integration
- **Endpoint**: `/api/yt` — Cloudflare Pages Function at `functions/api/yt.js`.
- **Secrets** (set in Cloudflare dashboard, both production + preview): `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`.
- **QUOTA CRITICAL**: YouTube Data API v3 gives 10,000 units/day, resets midnight Pacific. NEVER use `search.list` (100 units/call). Use `playlistItems.list` (1 unit/call). One full fetch ≈ 35 units (15 videos + 20 comment threads). NEVER write code that can re-fetch on re-render — a single re-render loop can burn the entire daily quota in minutes.
- **Client safeguards**: `_ytFetched` global flag — set `true` before fetch, only resets on full page reload. One fetch per page load, period. Also caches to `localStorage._ytCache` as offline fallback.
- **Server KV cache (3 keys)**:
  - `yt-fresh` (12hr TTL) — serves cached data, prevents API calls. This is the primary cache.
  - `yt-good` (no TTL) — permanent copy of last successful response. Fallback when API is down.
  - `yt-cooldown` (1hr for quota, 5min for other errors) — prevents retrying a failed API call.
- **RSS fallback**: If API fails and no `yt-good` data exists, fetches YouTube RSS feed (`/feeds/videos.xml`) which costs zero quota. Returns 15 most recent videos.
- **`?refresh=1`** param busts `yt-fresh` and `yt-cooldown` cache. POST with JSON body seeds KV directly.
- **Matching**: Two-pass: (1) exact date match `post_date === publishedAt.slice(0,10)`, (2) ±1 day with title similarity for UTC timezone offsets. Uses both `title` and `topic` for scoring. Stored in `_ytMatch` map (Supabase ID → `{views, likes, comments, ytId}`).
- **Display**: Channel stats bar (subscribers, total views, video count) at top of page. Views, Likes & Comments columns in All Details table. Purple view count in Current dashboard rows.
- **Data flow**: `fetch('/api/yt')` → `_ytData` + `localStorage` → `_ytBuildMatch()` → `_ytMatch` → `renderVideosPageKeepScroll()`.
- **Unreplied Comments**: API fetches `commentThreads.list` with `allThreadsRelatedToChannelId`, filtered to long-form videos only (>60s duration). Returns `unrepliedComments` array (comments with `totalReplyCount === 0`). Max 20 pages = 20 units. Each comment has `{id, videoId, videoTitle, text, publishedAt}`.
- **Unreplied KPI**: First KPI on Analytics tab, red styling to stand out. Double-click opens modal with full list. Selection uses shift/cmd like tasks. "Dismiss Selected" removes from count. Dismissed IDs stored in `st._ytDismissed` (persisted via `save()`/`load()` in core.js).
- **Key functions**: `_ytBuildMatch()`, `_ytForVid(id)`, `_ytNum(n)`, `_ytEsc(s)`, `_ytDur(iso)`, `_ytShowUnreplied()`, `_ytToggleSel()`, `_ytDismissSelected()`, `_ytGetDismissed()`, `_ytSaveDismissed()`.
- **Errors**: silently hidden in UI (no red text). Console shows `[YT]` debug logs for troubleshooting.
