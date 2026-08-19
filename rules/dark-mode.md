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
- **Checked checkbox** (`.chk:checked::after`, `.tb-chk:checked::after`): neutral grey `rgba(152,152,160,.55)` fill, not `var(--accent)` — user explicitly rejected an orange-filled checkmark as too loud; grey reads as "done" without competing with category colors.
- **State-row classes** (`.ti.imp-row`, `.ti.ov-row`, any hardcoded-light `.xxx-row` background): always ship a `body.dark .ti.xxx-row` override. These use flat light rgba literals (not `var(--xxx-bg)`), so dark mode silently leaks the light color through unless explicitly overridden — bit us twice (overdue was covered, important wasn't).
- **`.day-flash`** (day-nav arrow indicator, `position:absolute;inset:0` overlay): dark mode uses `background:transparent`, not a dimmed white — even a low-opacity (`.06`) white wash still reads as a brightness "flash" against near-black. Only the arrow glyph (accent-colored) should fade in/out.
- **Native `<input>`/`<select>`/`<textarea>` blanket rule** (`body.dark input,select,textarea{background:rgba(255,255,255,.05)...}`) matches custom checkbox inputs too (`.chk`,`.tb-chk`,`.wchk` are real `<input type=checkbox>` elements). Without `body.dark .chk,.tb-chk,.wchk{background:none}` excluding them, you get a faint square background bleeding out from behind the round `::after` circle indicator.
- **Inline JS-set/HTML-set styles always beat `body.dark` CSS** (inline specificity beats any stylesheet selector, `!important` aside). A hardcoded `style="background:rgba(255,255,255,.8)"` — whether written in a JS template string or baked directly into index.html — will NOT respond to dark mode no matter what CSS you add. Fix by either wrapping in a `_dk()`/`_isDk()` ternary at render time, or (preferred for anything already covered by a class-based CSS rule) just deleting the inline background and letting the class rule + its `body.dark` override cascade normally.
- **A `body.dark #foo{background:...}` rule can be dead code** if `#foo` also carries a static inline `background` in index.html that's never cleared by JS (only `.style.display`/position get touched on open) — the inline value wins forever and the override silently never applies. Found this exact dead-rule pattern for `#ctxMenu`/`#pupCtxMenu`/`#bdayCtxMenu`/`#wrRuleCtxMenu`/`#wrScopePicker`/`#wrSkippedPicker`/`#recCtxMenu` (2026-08-17 audit) — the dark rules had existed for a while but never fired. When a "this should already be dark-themed" element still looks light, check for a leftover inline `background` before assuming the CSS is wrong. `#vidOvPanel`/`#wrSkippedBtn` show the working alternative: their dark overrides use `!important`, which does beat a non-important inline style.
- **Overview-page audit (2026-08-17)**: swept every inline `background:rgba(255,255,255,...)` reachable from Overview and fixed it — Edit Task modal (Notes, Time Block start/end), all WR/recurring modal Notes fields + duration select, Shopping-item-edit store fields, Daily Habit popup Notes, Birthday present popup, all context menus (task/pup/recurring/birthday/WR-rule), WR scope/skipped pickers, pup-skill hover tooltip. Pattern used: strip the inline `background` (and `color` where also hardcoded), extend `.mfield`/`.qa-field` CSS rules to include `textarea` (they only covered `input,select` before), add plain `body.dark #id{...}` for standalone popups. **Known gaps intentionally left out of that pass** (same bug, different page — fix the same way if asked): Monthly-grid search box (`#moSearchWrap`/`#moSearchSug`), Recipe modal Instructions field (`#rmInstructions`), Pup Skill modal header (`pmSkill` container, index.html ~line 772).
- **`_catStyle()` vs `gc()`** (features.js/core.js): `gc()` is dark-aware (`_isDk()?CATS_DARK:CATS`); `_catStyle()` (used by the quick-add category picker, `catSelHTML`/`_applyCatTrigger`) was NOT — always indexed the light `CATS` map. Any helper that maps a category/state name to `{bg,t,b}` colors must branch on `_isDk()` the same way `gc()` does, or it'll silently render light-only.
- **`color-scheme:dark`** is set on `body.dark` (styles.css) so native form-control chrome (date-picker calendar icon, native checkboxes) picks up dark UA styling automatically — add this before hand-rolling dark styles for native controls.
- **`::after`/`:checked` specificity trap**: `body.dark .foo::after` (unchecked-state override, has a `body` type selector) can out-rank `.foo:checked::after` (checked-state base rule, no type selector) for shared properties, because `body`'s extra type-selector point beats `:checked`'s class-level point. If the checked rule sets `background` via shorthand (which implicitly resets `background-image` to `none`), the checked/unchecked specificity mismatch can silently erase a checkmark SVG even though the checked rule "should" win. Any new `body.dark .foo:checked::after` override must be self-contained — redeclare every sub-property it needs (`background-color`, `background-image`, `background-size`, `background-position`) rather than relying on a lower-specificity base rule to fill in the rest.
- **`toggleDark()` must sync `<html class="init-dark">`**: that class only exists for pre-JS FOUC prevention (set from cached `localStorage` on initial page load, paired with an `!important` dark-background CSS rule). `toggleDark()` toggles `body.dark` but must ALSO `document.documentElement.classList.toggle('init-dark', isDark)` — otherwise switching dark→light leaves the `!important` rule in effect and the background stays stuck dark until a hard refresh.

## Pages Completed
- **Overview** (overview.js, styles.css): full dark mode — cards, timeblocks, week cal, kanban, shopping, WR, quick links, donut, month cal, meals divider, quick-add popup (`.qa-popup`, category select trigger/dropdown), weekly-header selected-day circle text, Edit Task modal (Notes/Time Block), WR/recurring modal Notes fields, Daily Habit popup, Birthday present popup, all context menus + tooltips (see audit note in Patterns above). Today-list checkboxes (`#todList .chk`) are deliberately brighter than every other `.chk` on the site in dark mode (matches `.wchk`, which was never dimmed) — a "draw the eye to unfinished today items" choice, not an oversight; don't flatten it into the generic `.chk` dark rule.
- **Guide** (features.js `renderGuidePage()`): dark-aware color tables, panels, category display.
- **Finance** (2026-08, partial): fixed text and donut-chart center value going invisible — root cause was two CSS custom properties (`--text-primary`, `--text-secondary`, plus `--card-bg` on two investment inputs) used everywhere on this page via `var(--x,#fallback)` but never actually *defined* anywhere in `:root`/`body.dark`, so they silently always rendered the light-mode fallback hex. Replaced every occurrence (styles.css + inline styles in features.js) with the real tokens `var(--text)`/`var(--muted)`; removed the `--card-bg` inline background so the generic `body.dark input{}` rule applies. Also fixed the donut's background track ring (`stroke="white"` hardcoded, now theme-checked at render time). **If any other page has dim/invisible text in dark mode, grep for `--text-primary`/`--text-secondary`/`--card-bg` first** — same bug, same fix, likely copy-pasted from this page originally. Not a full pass — other Finance elements not yet individually audited.
- **Sidebar / menu button** (2026-08): `.menu-open` (collapsed-sidebar hamburger button) had no `body.dark` override — stayed a bright white circle. Added one. Nav-item dot colors now pull from the same category accent used for that content elsewhere (`CATS[x].d` in core.js) where a category maps cleanly — Recurring Tasks → `#2a9db5` (teal, matches the `recurring` category), Videos → `#22c55e` (green, matches `videos` category), Packing → `#38bdf8` (matches `travel`). Others left as-is (no clean category match). Nav active-state highlighting used to match `.nav-item` elements to pages by parallel-array index (`PAGES.indexOf(id)` against `.nav-item` DOM position) — `PAGES` has phantom entries with no nav row (`travel`,`settings`,`guide`), so the index drifted and e.g. clicking Finance highlighted Notes. Fixed by giving every `.nav-item` a `data-page` attribute and matching on that directly (`showPage()` in features.js) — don't reintroduce index-based matching.
- **Site-wide background** (2026-08): `html.init-dark body{background:#1a100a!important}` (styles.css, the pre-paint FOUC-prevention rule keyed off the early inline script's `init-dark` class on `<html>`) had a stale, uncoordinated warm/orange color that doesn't match `body.dark{background:#111113}`. `init-dark` stays on `<html>` for the entire time dark mode is active (not just the initial flash it was meant to prevent), and being `!important` it permanently won over the correct color — every page had an orange-tinted background the whole time dark mode was on. Fixed by matching the color to `#111113`. If dark-mode background ever looks off-color again project-wide (not per-page), check this rule first before chasing individual page CSS.

## Pages Remaining
- Weekly (Recurring Tasks — heatmap/lists are new, not yet dark-mode-audited beyond what already worked), Shopping/HEB, Travel, Pup Skills, Birthdays, Recipes, Videos.
