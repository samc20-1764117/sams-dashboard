# Cinema Page Rules (`features.js`, `page-cinema`)

### Data Model
- Table: `cinema_items` (migrations 010–013). Columns: `title`, `type` (`movie`|`show`), `status` (`up_next`|`watched`), `rating` NUMERIC(3,1) — decimal, 1–10 (e.g. 9.5), `genre` TEXT, `where_to_watch` TEXT, `notes` TEXT, `new_season` BOOLEAN, `sort_order` INTEGER, `created_at`/`updated_at`. Synced via the standard `table_versions` version-gate — no polling.
- **`genre` holds up to 2 values joined as `"A, B"`** — the modal has two separate dropdowns (Genre, Genre 2nd) from a fixed option list (not free text), combined into the one column on save (`_cinemaReadGenreInput`) and split back out on edit-open (`item.genre.split(',')`).
- **`where_to_watch`** is also a fixed dropdown (Netflix, Hulu, Max, Disney+, Amazon Prime, Apple TV+, Peacock, Paramount+, YouTube, Theater, Other) — not free text.
- **`new_season`**: flag for "a watched show got a new season" — modal checkbox, shows an amber "NEW" badge on the row. Doesn't auto-move anything; user still drags/clicks it back to Watchlist manually.
- Type is **never** changed by a status move — dragging or clicking "watched" only flips `status`; a movie dropped on the Watched card's Shows side still renders under Movies (rendering filters purely by `item.type`, independent of which sub-column physically received the drop).

### Layout
2-col × 2-row outer grid (`grid-template-rows:1.4fr 1fr` — Top 10 gets more height, Watched less, so all 10 rank rows fit without scrolling):
- **Left column, full height**: "Watchlist" card, split into **Shows | Movies** sub-columns (own scroll each).
- **Right column, top**: "Top 10 Movies" | "Top 10 Shows" — nested 2-col grid, each a flat divider-list (`.cinema-top-row`, no per-row card/box — see Styling below), computed client-side (`status==='watched' && rating!=null`, sorted desc, sliced to 10). Header text colored (pink/blue), row title/rank stay neutral.
- **Right column, bottom**: "Watched" card, same Shows|Movies split as Watchlist.
- Sub-column headers ("Shows"/"Movies") are NOT uppercase, sized/weighted to roughly match the card's own `.ct` header, and left-padded to 16px to visually align with the card title above them.

### Filters & Sort
- Genre dropdown on both Watchlist and Watched headers (options built from whichever items are currently in that list, combined across both types — not per-column).
- No type filter — redundant since Shows/Movies are already separate columns.
- Watched has a **Rating sort** control in its main header (styled as a bordered pill button, not the per-column table-header that was tried and removed) — click cycles asc → desc → off (`_cinemaWatchedSort`), applies to both its Shows and Movies sub-columns from the one shared state.

### Row Interactions
- **Select**: click (replace), ⌘/Ctrl+click (toggle add), Shift+click (range within the same sub-column) — `_cinemaSelIds` Set, mirrors the birthday-page selection pattern. Click-outside-any-`.cinema-row` clears selection (listener re-bound each render, old one removed first).
- **Double-click** a row (not on a button/input) → edit modal.
- **Watch toggle**: play-triangle icon button (`_cinemaWatchBtn`) — outline/muted in Watchlist ("I watched this"), filled solid green in Watched ("move back to Watchlist"). Green matches the Overview progress-donut tone (`#059669`/`rgba(16,185,129,…)`), not the app's generic success green.
- **Delete** (✕, hover-only) and **Delete/Backspace key** both route through the same bulk-capable `deleteCinemaItems(ids)` — a multi-select delete is ONE undo entry, not N.
- Rows have no drag-handle glyph (removed on request — dragging the row itself still works, users just grab anywhere on it).

### Drag & Drop
- **Cross-container** (Watchlist ↔ Watched): drop toggles status only, never type. Dragging a selected row that's part of a multi-selection (`_cinemaSelIds.size>1`) carries the WHOLE selection (`_cinemaDragIds`) — bulk status-move, one undo entry.
- **Within Watchlist**: reorders `sort_order`, scoped per Shows/Movies sub-column (each sub-column's own filtered array via `_cinemaLastUpNextShows`/`Movies`).
- **Gotcha — bind drop zones to the OUTER content divs, not the inner list divs.** The inner `*List` divs are destroyed/rebuilt every render and only as tall as their rows; binding drop listeners there leaves all the empty space below the last row dead to drops (the exact bug reported: "can't drag into Watched"). Bind once to the persistent outer `*Content` divs instead, guarded with a `zone.dataset.dragBound` flag so listeners aren't stacked on every re-render.
- **Gotcha — undo after delete must re-POST, not just restore locally.** `deleteCinemaItems`' undo callback pushes the row back into `st.cinemaItems` AND re-`POST`s it to Supabase (grabbing the fresh server id back). The original DELETE already removed the row server-side; skipping the re-POST means the undo only lives in localStorage and silently vanishes on the next refresh/sync.

### Keyboard
- `N` — opens the Add modal, but **only when `page-cinema` is active** (checked in core.js's big handler). The pre-existing global quick-add-task `N` handler in features.js's "Keyboard shortcuts" section fires on every page unconditionally; it has an explicit `if(activePg==='cinema')return;` early-out so the two don't collide.
- `C` — toggles to/from the Cinema page (same bare-letter nav pattern as `O`/`P`/`F`/`H`/`B`/`L`).
- `Delete`/`Backspace` — bulk-deletes the current selection, gated on `_cinemaSelIds.size` + `page-cinema` active + no input focused.

### Modal (`#cinemaModal`) — deliberately diverges from the app's usual "Enter-anywhere-saves" convention
Explicit `tabindex` sequence: **Title(1) → Watched(2) → New season(3) → Genre(4) → Genre 2nd(5) → Where to watch(6) → Notes(7) → Save(8)**. Type toggle (Show/Movie segmented control) and Rating live in the header as mouse-only quick controls — both `tabindex="-1"`, intentionally outside the tab sequence since the user never mentioned them in the walkthrough.
- Enter is a **no-op** on Title/Genre/Genre2/Where (no default action fires on a bare `<input>`/`<select>` outside a `<form>`).
- Enter on the two checkboxes **toggles them and keeps focus** (custom `onkeydown`, since native Enter does nothing on a checkbox — only Space does) — does NOT save.
- Enter in Notes inserts a newline (native textarea behavior, untouched).
- Enter on the Save button **saves and closes** — free via native button-activates-on-Enter behavior, no JS needed. This is why the modal has a real, focusable Save button again (previously removed, re-added specifically so Tab has somewhere real to land at the end of the sequence).
- No Cancel button — Escape or click-outside-the-modal closes without saving (unchanged).
- The header's Genre/Genre2/Where-to-watch `<select>` elements are styled as filled pills (`#cinemaModal .mfield select` — purple tint, bold, colored arrow) to visually match the Task modal's colored Category trigger, not left as plain native selects.

### Selection highlight color
Blue (`rgba(14,165,233,…)`), not the app's default purple `--accent` — explicit request to distinguish cinema-row selection from the rest of the app.
