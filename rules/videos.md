# Videos Page Rules (`videos.js`)

### Data Model
- Table: `videos`. Key columns: `id`, `title`, `topic`, `video_type` (B=Big, L=Small), `big_video_id` (FK to parent B video's id), `playlist`, `status`, `post_date`, `duration_minutes` (min.sec format like 9.26), `is_deleted`.
- **Grouping**: L videos link to B videos via `big_video_id`. B videos don't have `big_video_id` set. Standalone L videos have `big_video_id=null`.
- **Stages** (step columns): `step_build`, `step_record`, `step_film`, `step_cut`, `step_thumbnail`, `step_description`, `step_tableau_public`, `step_upload_tableau`. Values: `done`, `not_started`, `na`.
- **Dropped columns** (do not reference): `number`, `build_hours`, `step_answer_comments`, `step_short`, `group_name` (migrated to `big_video_id`).
- `VID_STEPS` array and `VID_STEP_LABELS` map define the 8 stages.

### Status & Published Logic
- Statuses: `idea`, `in_progress`, `published`, `backup`.
- **Auto-publish**: core steps (all except `step_tableau_public` and `step_upload_tableau`) done/na + has `post_date` → auto-set `published`. Un-toggling a core step on published → `in_progress`.
- **Date colors**: no date=muted, published+future/today=green, published+past=black, all core done=green, has date=yellow.

### Views (4 tabs)
- **Dashboard** (`_vidView='dashboard'`): two-pane flex — In Progress (flex:2) + Ideas (flex:1). In Progress shows playlist, duration, posted, stage dots, +/x buttons. B→L grouping with indent. Drag between panes changes status.
- **All Details** (`_vidView='table'`): full table with sortable headers (click asc, click desc, click reset — same as pup skills). `table-layout:fixed`. Sticky thead. Default sort: post_date asc with B→L grouping.
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
- **Small videos** (L with big_video_id): muted/grey text, lighter weight. `└` indent mark when shown as child.
- **Hide by default** (`_vidShowCompleted=false`): published with past date hidden (unless B video has L children with future dates). Completed backup hidden. Toggle with +/- button or keyboard E/C.

### Inline Editing (All Details)
- **Single click** on td with `data-field` → `vidCellEdit()`: inline input for title/playlist/duration/post_date, dropdown for status. Save on blur/Enter, cancel on Escape.
- **Double click** → `openVidEdit(id)` full edit modal.
- **Step dots**: click cycles `not_started→done→not_started`. If `na`, click cycles `na→not_started`.
- All edits use `renderVideosPageKeepScroll()` to preserve scroll position.

### Edit Modal (`#vidModal`)
- Fields: title, topic, type (Big/Small), status, post_date, duration (min.sec), big video (searchable input+datalist), playlist (searchable input+datalist).
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
- `cycleVidStep(id,step)` — toggles step with auto-publish logic
- `vidCellEdit(td,id,field)` — inline cell editing
- `vidCellClick(e,id)` — routes to inline edit (table) or selection (other views)
