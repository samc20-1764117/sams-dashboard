# Sam's Dashboard

## Git Workflow

### Auto-commit
After every turn, all changes are automatically committed and pushed to the `dev` branch via a Stop hook. No manual action is required.

After each successful push to `dev`, update the Dev indicator in the bottom left of the dashboard. The Dev button should display:

dev - X

Where X is a randomly generated number (e.g., dev - 12, dev - 47, dev - 3). This is used as a visual confirmation that the latest changes were successfully pushed to the dev branch.

### Push to Production
When the user says **"push to production"**, run these git commands in sequence using the Bash tool:

1. git checkout main
2. git pull origin main
3. git merge origin/dev --no-ff -m "Merge dev into main"
4. git push origin main
5. git checkout main (stay on main or switch back as needed)

After pushing, confirm success by reporting the pushed commit hash.

---

## Pup Skills Page — Logic Reference

### File
Single file: `index.html`. All HTML, CSS, and JS in one file.

### State
```js
st.pup_skills          // array of skill objects from Supabase table `pup_skills`
_pupEditId             // id of skill being edited in modal (null = add mode)
_selPupIds             // Set of selected row IDs (multi-select)
_lastSelPupId          // last clicked row ID (for shift-range select)
_copiedPups            // array of copied skill objects (Cmd+C)
_pupCtxId              // row ID that triggered the right-click context menu
_pupSortCol            // current sort column (null = default)
_pupSortDir            // 1 = asc, -1 = desc
_pupFilter             // {col, type:'text'|'set', text|vals} or null
_pupUndoStack          // snapshot array for undo (max 20)
_pupRedoStack          // snapshot array for redo
_pupHdrClickTimer      // setTimeout handle for header single vs double click
_pupUndoDirty          // true after undo/redo; blocks auto-sync from overwriting
```

### Rendering
- `renderPupsPage()` — full page re-render (3-col grid: Mochi card, Sunny card, table)
- `renderPupTable()` — re-renders only thead + tbody inside the existing table element
- Colors: Mochi = `#8b5cf6` (purple), Sunny = `#fbbf24` (bright yellow)
- Row backgrounds: Mochi rows `rgba(139,92,246,.07)`, Sunny rows `rgba(234,179,8,.08)`

### Table Headers — Sort vs Filter
Headers use a 250ms click debounce to distinguish single click (sort) from double click (filter):
```js
pupHdrClick(col)   // onclick — waits 250ms, then calls pupSortBy(col)
pupHdrDbl(e,col)   // ondblclick — cancels timer, calls pupFilterBy(e,col)
```
Sort is 3-state: none → asc → desc → none. Filter popup (`#pupFilterPop`) is positioned under the live `<th>` element (not `e.currentTarget`, which may be detached after re-render).

### Inline Cell Editing
`pupCellEdit(td, id, field)` — inline edit on dblclick. Uses `td._editing` guard to prevent double-open. Calls `setPupField()` on commit. `setPupField()` calls `pupSnapshot()` before saving so inline edits are undoable.

### Modal (Add / Edit)
- `openPupAddModal()` — clears fields, sets title to "Add Skill", opens `#pupModal`
- `openPupEditModal(id)` — populates fields from `st.pup_skills`, opens modal
- `savePupModal()` — calls `pupSnapshot()` before saving, handles both add (POST) and edit (PATCH)

### Selection
- Single click → `selPupRow(e, sid)` — clears selection, selects clicked row
- Shift+click → range select using DOM row order
- Cmd/Ctrl+click → toggle individual row
- `applyPupSelHighlight()` — adds/removes `pup-sel` class on `<tr>` elements

### Context Menu (`#pupCtxMenu`)
`showPupCtx(e, sid)` — right-click. Hides "Edit" option for multi-select.
- `pupCtxEdit()` → opens edit modal
- `pupCtxDuplicate()` → snapshots, duplicates selected rows (POST to server)
- `pupCtxDelete()` → snapshots, deletes selected rows (DELETE to server)

### Keyboard Shortcuts (Pup Skills page only)
Handled in the **first** `document.addEventListener('keydown')` listener (which checks active page):
```
Cmd+Z           → pupUndo()
Cmd+Shift+Z     → pupRedo()
Delete/Backspace → pupCtxDelete() (requires selection)
Cmd+C           → copy selected rows to _copiedPups
Cmd+V           → paste copies (snapshots first)
```
The second keydown listener (overview/tasks) is intentionally skipped for Cmd+Z when on the pups page to avoid conflict.

### Undo / Redo
```js
pupSnapshot()         // push current st.pup_skills to _pupUndoStack, clear _pupRedoStack
pupUndo()             // restore previous snapshot, sync diff to server, show toast
pupRedo()             // re-apply undone snapshot, sync diff to server, show toast
_pupSyncToServer(prev, next)  // diffs two arrays and fires DELETE/POST/PATCH to Supabase
```
`pupSnapshot()` is called before: delete, duplicate, paste, save modal, inline field edits.

**Undo is server-aware**: `_pupSyncToServer` diffs prev vs next state and fires minimal API calls so the server matches the undone state. This means syncing after undo does not revert the undo.

**`_pupUndoDirty` flag**: set to `true` by `pupUndo`/`pupRedo`. Auto-sync (every 30s, `silent=true`) skips overwriting `st.pup_skills` while this flag is set. Manual sync clears it and applies server data.

### Supabase Helpers
```js
sbReq(method, table, body, query)        // shows loading/error state
sbReqSilent(method, table, body, query)  // fire-and-forget, no UI feedback
```

### Tooltip (`#pupTooltip`)
`showPupTip(e, text)` / `hidePupTip()` — instant custom tooltip (no browser delay) shown on `mouseenter` of Next Step cell when comments exist.

### Sticky Header
`.pup-tbl th` uses `position:sticky; top:0` with explicit background colors:
- Light mode: `rgba(255,248,244,0.97)`
- Dark mode: `rgba(40,22,14,.97)` via `body.dark .pup-tbl th`
