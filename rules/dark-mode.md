# Dark Mode Rules

## Design Philosophy
- **No color tint** — pure neutral grays only. No warm, cool, or purple tints.
- Background: `#111113`. Cards: `rgba(24,24,28,.70)`. Sidebar: `rgba(14,14,16,0.92)`.
- All borders/glass: `rgba(255,255,255,...)` at low opacity (`.04`–`.10`). Never use colored borders for structural elements.
- Color ONLY in content: category chips, pills, time blocks, category indicators, accent buttons.
- Light mode must NEVER be changed by dark mode work.

## Reference
- Approved design: **no-tint / true neutral** (Option 4 mockup from initial dark mode session).
- Overview page + Guide page done first as reference implementation.
- Extend to other pages one at a time using the same patterns below.

## CSS Architecture
- `body.dark` class toggles dark mode. CSS variables in `body.dark{...}` block (styles.css lines 25–46).
- All dark overrides live in styles.css after the variable block (lines 47+), prefixed `body.dark`.
- Key variables: `--text:#e8e8ea`, `--muted:#9898a0`, `--subtle:#48485a`, `--accent:#c26b4f`.
- `--muted` is the default text for headers, labels, nav items, buttons — must be readable (not too dark).

## JS Architecture
- `core.js`: `CATS_DARK`, `IMP_DARK`, `OV_DARK` maps, `_isDk()` helper, `gc()` returns dark-aware colors.
- `overview.js`: `_dk()`, `_OV()`, `_IMP()` helpers at top of file. Use `_dk()` for inline style ternaries.
- `features.js`: `toggleDark()` — toggles class, saves `cfg.dark`, forces repaint, calls `renderAll()` + active page re-render.
- `D` key shortcut (core.js) toggles dark mode globally.

## When Adding Dark Mode to a New Page
1. Add `body.dark .page-specific-class` overrides in styles.css dark section.
2. For inline styles in JS, wrap with `_dk()` ternary: `background:${_dk()?'dark-val':'light-val'}`.
3. Check for hardcoded colors: search for `#[hex]`, `rgba(R,G,B` in the page's JS — any dark text color (browns, dark grays, purples) needs a dark-mode branch.
4. Check for white/light borders: `rgba(255,255,255,.6+)`, `rgba(210,205,228,...)`, `rgba(255,220,200,...)` — all need dark overrides.
5. Check for purple accent colors: `rgba(109,95,230,...)` — replace with `rgba(255,255,255,...)` at low opacity in dark mode.
6. Test toggle: press `D` to switch dark→light and back. Background and all inline styles must fully revert.

## Patterns
- **Cards**: `background:rgba(24,24,28,.70);border-color:rgba(255,255,255,.06);box-shadow:0 2px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.03)`.
- **Buttons** (plus, ghost, hdr): `background:rgba(255,255,255,.05–.06);border-color:rgba(255,255,255,.08–.10);color:var(--muted)`.
- **Inputs**: `background:rgba(255,255,255,.05);color:var(--text);border-color:rgba(255,255,255,.08)`.
- **Hover states**: bump white alpha by ~`.04` (e.g. `.02`→`.06`, `.05`→`.10`).
- **Modals/popups**: `background:rgba(18–20,18–20,22–24,.96–.98)`.
- **Dividers/borders**: `rgba(255,255,255,.04–.06)` — never higher than `.10` for structural lines.
- **Selection**: `outline:1px solid rgba(255,255,255,.15);box-shadow:0 3px 10px rgba(0,0,0,.3)`.

## Pages Completed
- **Overview** (overview.js, styles.css): full dark mode — cards, timeblocks, week cal, kanban, shopping, WR, quick links, donut, month cal, meals divider.
- **Guide** (features.js `renderGuidePage()`): dark-aware color tables, panels, category display.

## Pages Remaining
- Weekly, Shopping/HEB, Travel, Pup Skills, Birthdays, Recipes, Videos, Finance.
