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

### Views (4 tabs)
- **Current** (`_vidView='dashboard'`): CSS grid layout (`2fr 1fr`) — Current + Ideas sharing same column tracks for aligned divider. Up Next/In Progress/Group/Single have solid white (`#fff`) sub-headers with `display:flex;align-items:center`. No count next to "Current" header. Ideas side has Group/Single sub-sections with white bullets (`●`). No `+` button on idea rows. B→L grouping with white `└` connector. Drag between zones changes status. Standalone videos (no `big_video_id`) cannot be dragged into groups. Container uses liquid glass style (`rgba(255,255,255,.32)` with `backdrop-filter:blur(28px)`). B videos at `rgba(255,255,255,.50)`. Header includes 28px spacer for % column + 42px for YT views.
- **All Details** (`_vidView='table'`): full table with sortable headers (click asc, click desc, click reset). `table-layout:fixed`. Sticky thead. Default sort: post_date asc with B→L grouping. Ideas excluded from this view. Column order: Title (450px) → Stages (22px each) → Posted → Dur → % → Status (80px). Status pills use `VID_STATUS_LABELS` with lighter color backgrounds. B videos at `rgba(255,255,255,.50)`. Stage columns are narrower than Current tab (22px vs 28px).
- **Videos by Progress** (`_vidView='board'`): kanban by status. Drag between columns.
- **Monthly** (`_vidView='monthly'`): calendar grid by `post_date`. Nav with `_vidMonthOffset`.

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

### YouTube Analytics Integration
- **Endpoint**: `/api/yt` — Cloudflare Pages Function at `functions/api/yt.js`.
- **Secrets** (set in Cloudflare dashboard, both production + preview): `YOUTUBE_API_KEY`, `YOUTUBE_CHANNEL_ID`.
- **KV cache**: namespace `YT_CACHE`, key `yt-stats`. Successful responses cached 4 hours (14400s). Errors cached 15 min (900s). Reload as much as you want — only hits YouTube API when cache expires.
- **Quota**: YouTube Data API v3 gives 10,000 units/day, resets midnight Pacific. One full fetch ≈ 200-400 units. With 4-hour cache = ~4 calls/day = ~1,600 units max.
- **Matching**: YouTube videos matched to Supabase videos by date (`post_date` === `publishedAt.slice(0,10)`). Stored in `_ytMatch` map (Supabase ID → `{views, likes, comments, ytId}`).
- **Display**: Channel stats bar (subscribers, total views, video count) at top of page. Views & Likes columns in All Details table. Purple view count in Current dashboard rows.
- **Data flow**: `fetch('/api/yt')` → `_ytData` → `_ytBuildMatch()` → `_ytMatch` → `renderVideosPageKeepScroll()`.
- **Only fetches on Videos page** — `ytSlot._loaded` flag prevents re-fetch on re-render.
- **Key functions**: `_ytBuildMatch()`, `_ytForVid(id)`, `_ytNum(n)`, `_ytEsc(s)`, `_ytDur(iso)`.
- **Errors**: silently hidden in UI (no red text). Console shows `[YT]` debug logs for troubleshooting.
