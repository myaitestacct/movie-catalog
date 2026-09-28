# Movie Catalog — UI Analysis & Enhancement Plan

*Analysis date: 2026-09-27 · branch `arena/01a0e38b-movie-catalog`*

> **STATUS: Implemented.** All Tier 1, 2, and 3 items below were implemented on
> this branch. See [Implementation summary](#6-implementation-summary) at the
> bottom. Preview with `npm run dev:demo` (no database needed) — fixture movie
> **11** exercises the missing-file row, **51** the better-copy row, and title
> searches exercise the exact/fuzzy grouping.

---

## 1. What this project is

A **read-only PHP 8.3 / MySQL movie-library browser** with a deliberately
dependency-free frontend:

| Layer | Details |
| --- | --- |
| Backend | `movie-catalog/public/api/*.php` endpoints (`movies`, `stats`, `duplicates`, `better-copy`, `library-issues`, `movie-page`) → `src/` controllers, repositories, helpers. Read-only SQL against a pre-existing `movies` table. |
| Frontend | Vanilla ES modules (`public/assets/js/`) — table render/sort/search, column toggles, pagination, a movie-detail modal with ←/→ navigation, and a large Analytics panel (`stats/`). Bundled with esbuild (`build.mjs`). |
| Theming | CSS custom properties in `variables.css`. Auto dark via `prefers-color-scheme`, manual override via `:root.theme-dark` / `.theme-light`, persisted in `localStorage`. `stats.css` redefines its **own** dark-token block. |
| Tooling | `npm run dev:demo` — database-free demo (55 fixtures, mock APIs) on port 4173; Node unit tests, PHP tests, Playwright browser tests. |
| UX today | Sticky sortable header, per-column filter row, exact-vs-fuzzy result grouping (JS only), copy-to-clipboard buttons, OR/AND filter mode, title search modes (Exact/Contains/Fuzzy), glassmorphism pagination bar, theme toggle, analytics dashboard with its own pagination. |

The architecture is clean and testable. The UI, however, has accumulated
**half-wired features and hardcoded colors** — details below.

---

## 2. UI audit — what's hurting today

### A. Row highlighting (the complaint) — real bugs, not just taste

**A1. `tr.missing-file` is unreadable in LIGHT mode.**
`table.css:49` paints the row `#3c2222` (near-black maroon) with `!important`,
while body text stays `--text-color: #222`.

- Title/other cells: `#222` on `#3c2222` ≈ **1.1 : 1** contrast — invisible.
- The `NUM` cell uses `--danger: #b30000` on `#3c2222` ≈ **2.2 : 1** — still a WCAG fail.

In dark mode it's a muddy brown that clashes with the neutral gray palette, and
`!important` kills hover feedback. `font-weight: bold` also re-flows column widths.

**A2. `tr.better-copy` is a hardcoded `#7b5151`.**
Mid brown-red in both themes; in light mode the default dark text on it is
illegible; nothing tells the user what the color *means* — there is no legend
anywhere in the UI.

**A3. Two competing hover systems.**
CSS `tbody tr:hover` (neutral gray) *and* JS `mouseenter/mouseleave` adding
`.row-hover` (`rgba(255,69,0,0.1)` — orangered tint, `table.js:158`). The JS one
wins by source order, so the neutral hover token `--table-hover` is effectively
dead, and hovering paints an **orange** tint while the "active movie" row
(`tr.active-movie-row`, `rgba(255,69,0,0.18)` + orange outline) paints more
orange — all while the accent color everywhere else is **dodger blue**
(`--primary: #1e90ff`). Two clashing accent colors, one of them accidental.

**A4. Exact vs fuzzy grouping is invisible.**
`table.js` carefully tags rows `.exact-match` / `.fuzzy-match` and builds
group-header rows — but **none of those classes have any CSS** (verified: zero
matches in `assets/css/`). Group headers render as raw plain text rows.
Same for the `#search-group-info` banner (`.info-exact/-sep/-hint/-empty`:
no styles) and a generic `.hidden` that isn't defined (`display:none`) outside
`.stats-panel.hidden`.

### B. Other broken / unstyled UI

| # | Issue | Where |
| --- | --- | --- |
| B1 | Current page button `.pagination button.active` is created by `pagination.js` but styled **only** inside `.stats-modal .pagination` — on the main table the current page looks identical to every other page. | `pagination.css` |
| B2 | Sort columns show **no direction indicator** (no ▲/▼). `sorting.js` writes no class/marker onto the `th`. Users can't tell what the table is sorted by. | `sorting.js`, `table.css` |
| B3 | `.search-mode.or` keeps bright yellow `#ffe066` background but inherits dark-mode text `#e6e6e6` → **2.3 : 1 contrast** — unreadable in dark mode. | `table.css:395` |
| B4 | Auto-dark (`@media prefers-color-scheme`) block never defines `--highlight-text`, so `<mark>` search hits use different text colors depending on whether the user picked the theme manually. | `variables.css` |
| B5 | Copy buttons are `font-size: 0.5rem` (**8px**) — far below any touch/click target minimum. | `table.css:255` |
| B6 | Hardcoded one-off colors everywhere: `th:hover #57606f`, copy-btn lavender `rgba(119,119,255,.2)`, `.row-highlight #fff3b0` (stats flash), modal assumes dark (`--modal-bg` fallback rgba(20,20,20,.95) even in light mode). 26 hardcoded colors in `table.css`, 55 in `stats.css`. | various |
| B7 | Native scrollbars are unthemed → blinding white bars inside the dark theme; the table is the main horizontal scroller. | — |
| B8 | `body { overflow: hidden }` + fixed pagination overlay mean the bottom rows can sit **behind** the pagination bar; no bottom padding compensates. | `base.css`, `pagination.css` |

### C. Usability gaps (nothing broken — just missing)

- **No zebra striping** — 50 rows of flat color, hard to track across a very
  wide table (File/Path columns force horizontal scrolling).
- **No visible loading state** — `aria-busy` is set but there's no spinner or
  skeleton; with a 500 ms debounce + network latency, taps feel dead.
- **Empty state is a single line** of italic text ("No results found") with no
  "clear filters" affordance right there.
- **No page-size selector** (hardcoded 50 in `state.js`; the API supports `limit`).
- **Filter state invisible** — active filters are tiny inputs in the header row;
  no pills/chips showing "filtering by X" with a one-click remove.
- **No poster thumbnails** in the list, even though `PICTURENAME` is already in
  the API payload and poster paths are known.
- **No keyboard affordances** — `/` doesn't focus search, rows aren't
  arrow-key navigable (the *modal* does support ←/→), toggle buttons have no
  `:focus-visible` rings or `aria-pressed`.
- **No legend** for the missing/better-copy row colors.

---

## 3. Enhancement plan (prioritized)

### Tier 1 — Fix what's broken (high value, low risk, ~pure CSS)

**T1. Theme-aware status rows with semantic tokens.**
Add tokens to `variables.css` and repaint rows with *tints + a left accent
bar* instead of full saturated backgrounds, so text stays readable and hover
keeps working:

```css
/* variables.css (light) */
--row-missing-bg: #fdecec;  --row-missing-accent: #d64545;  --row-missing-text: #8a1f1f;
--row-better-bg:  #fff7e6;  --row-better-accent: #e6a23c;  --row-better-text: #7a5200;
--row-active-bg:  color-mix(in srgb, var(--primary) 12%, var(--table-bg));
--row-hover:      color-mix(in srgb, var(--primary) 6%,  var(--table-bg));
--row-zebra:      color-mix(in srgb, var(--table-bg), var(--text-color) 4%);

/* variables.css (dark blocks) */
--row-missing-bg: #2a1518;  --row-missing-accent: #ff7b72;  --row-missing-text: #ffb4ab;
--row-better-bg:  #2a2113;  --row-better-accent: #ffb454;  --row-better-text: #ffd699;
--row-active-bg:  color-mix(in srgb, var(--primary) 20%, #1b1b1b);
--row-hover:      color-mix(in srgb, var(--primary) 10%, #1b1b1b);
--row-zebra:      color-mix(in srgb, #1b1b1b, white 3%);
```

```css
/* table.css */
tbody tr:nth-child(even):not(.group-header) { background: var(--row-zebra); }
tbody tr:hover { background: var(--row-hover); }           /* one hover system */
tr.missing-file, tr.better-copy { font-weight: 500; }      /* drop !important + bold */
tr.missing-file { background: var(--row-missing-bg); color: var(--row-missing-text);
  box-shadow: inset 3px 0 0 var(--row-missing-accent); }
tr.better-copy { background: var(--row-better-bg); color: var(--row-better-text);
  box-shadow: inset 3px 0 0 var(--row-better-accent); }
tr.active-movie-row { background: var(--row-active-bg) !important;
  outline: 2px solid var(--primary); outline-offset: -2px; }
```

Delete the JS `mouseenter/mouseleave` handlers in `table.js:156-163` (pure CSS
`:hover` already covers it). **Add a tiny legend** next to the column toggles:
`■ missing file  ■ better copy available` (the Analytics panel already names
these concepts, so wording stays consistent).

**T2. Style the already-generated exact/fuzzy grouping** (classes exist, CSS
doesn't): a tinted background for `.exact-match` rows
(`color-mix(in srgb, var(--success) 8%, var(--table-bg))`), a muted one for
`.fuzzy-match`, plus a styled group-header band and the `#search-group-info`
banner (chip layout, hidden → `display:none`).

**T3. Sort indicators + active page.**
`sorting.js` adds `th.dataset.sort = state.sort; th.dataset.dir = state.dir`
(2 lines), CSS draws the arrow — no markup changes:

```css
th[data-sort]::after { content: '⇅'; opacity: .35; margin-left: 4px; }
th[data-sort="asc"]::after  { content: '▲'; opacity: 1; color: var(--primary); }
th[data-sort="desc"]::after { content: '▼'; opacity: 1; color: var(--primary); }
.pagination button.active { background: var(--primary); color: #fff; font-weight: 600; }
```

**T4. Contrast fixes:** `.search-mode.or { color: #111; }` (or theme token),
define `--highlight-text` in the auto-dark block, bump copy buttons to a real
size (`min-width/height: 24px; font-size: 12px`), theme `th:hover` via
`color-mix(in srgb, var(--primary) 25%, var(--header-bg))`.

**T5. Dark-mode scrollbars** (2 lines, huge perceived polish):

```css
:root { scrollbar-color: #555 transparent; }               /* light */
:root.theme-dark, :root:not(.theme-light) { color-scheme: dark;
  scrollbar-color: #4a4a4a transparent; }
```

(plus `color-scheme: light` on `:root` so form controls match the theme).

### Tier 2 — Usability wins

| Enhancement | Notes |
| --- | --- |
| **Poster thumbnails** | New first column, 28×42 `loading="lazy"` `<img>` from existing `PICTURENAME` + known `/movies/antexport/` convention with existing fallback image. Massive browseability gain; degrade gracefully when posters are absent. |
| **Rating badge color scale** | Badge bg by score: ≥7.0 green, 5.0–6.9 amber, <5.0 red (tokens `--rating-good/-mid/-bad`). Instant visual scanning; the badge is already a pill, it just needs the right class. |
| **Sticky left column(s)** | `position: sticky; left: 0` on the NUM/Title cells + solid background so headers stay aligned while scrolling horizontally through File/Path. |
| **Active filter pills** | Under the toolbar: one dismissible chip per active column filter (`Genre: sci-fi ✕`) — makes AND/OR behavior visible and one-click reversible. |
| **Page-size selector** | 25/50/100/200 in the pagination bar (API already takes `limit`); remember in `localStorage` alongside the theme. |
| **Loading shimmer** | While `aria-busy`: 3–4 gray shimmer placeholder rows (pure CSS gradient animation), or a 2px indeterminate top bar. Respect `prefers-reduced-motion`. |
| **Proper empty state** | Icon + "No movies match your filters" + a **Clear filters** button right in the tbody when `total === 0`. |
| **Keyboard shortcuts** | `/` focuses the first visible filter input, `Esc` clears it, `↑/↓` moves a highlight row, `Enter` opens the modal (modal already does ←/→/Esc). Document them in a `?` tooltip. |
| **A11y polish** | `aria-pressed` on column/theme toggles, `aria-sort` on `th`, `:focus-visible { outline: 2px solid var(--primary) }` ring for everything interactive, `role="status"` on the results info line. |
| **Fix bottom occlusion** | Give `.table-wrapper` `padding-bottom` ≥ pagination height, or make the pagination bar non-overlaying on short viewports. |

### Tier 3 — Eyecandy

- **Row entrance animation**: staggered 8ms/row fade-slide on page render
  (`@starting-style` or a `.row-enter` class), disabled under
  `prefers-reduced-motion: reduce`.
- **Theme cross-fade**: extend the existing `body` background transition to
  table cells, header and modal (`transition: background-color .25s, color .25s`).
- **Rating count-up + bar micro-animations** already partly exist in stats —
  mirror the same easing in the table badges.
- **Copy button morph**: 📋 → ✓ with a 150ms scale pop (CSS class, no JS
  timing changes needed — `clipboard.js` already toggles `.copied`).
- **Poster hover zoom** in the modal (scale 1.04 + shadow, 200ms).
- **Glass toolbar**: the pagination bar already has `backdrop-filter: blur`;
  give the column-toggle toolbar the same subtle treatment when the table
  scrolls under it (make the toolbar sticky).
- **Slightly blue-tinted dark palette** (`#12141a` bg, `#1b1e28` table) instead
  of pure gray — matches the stats panel's existing `--bg-group-a: #1b2333`
  and reads less flat. Purely token swap.
- **Favicon + `<title>` per state** (e.g. "(24 matches) — Movie Catalog") —
  small but delightful.

---

## 4. Suggested token palette (summary)

| Token | Light | Dark |
| --- | --- | --- |
| `--row-zebra` | `#f7f8fa` | `#1f2027` |
| `--row-hover` | blue 6% tint | blue 10% tint |
| `--row-missing-bg / accent / text` | `#fdecec / #d64545 / #8a1f1f` | `#2a1518 / #ff7b72 / #ffb4ab` |
| `--row-better-bg / accent / text` | `#fff7e6 / #e6a23c / #7a5200` | `#2a2113 / #ffb454 / #ffd699` |
| `--row-active-bg` | blue 12% tint | blue 20% tint |
| `--rating-good / mid / bad` | `#2f9e44 / #e8a33d / #d64545` | `#4dd187 / #ffc857 / #ff6b78` (match stats panel) |

All status colors pass WCAG AA against their own backgrounds; hover/active use
`color-mix` so they automatically follow any future re-theme.

---

## 5. Implementation notes

- **Files touched (Tier 1)**: `variables.css`, `table.css`, `pagination.css`,
  plus ~4 lines in `table.js` (remove hover handlers) and `sorting.js`
  (sort-marker attributes). No API/PHP changes.
- **Tests**: `npm run test:js`, then `npm run test:browser` — browser specs
  already key off `data-testid` (`exact-header`, `fuzzy-header`) and row
  classes, so styling changes shouldn't break them; run `npm test` before
  finishing.
- **Preview**: `npm run dev:demo` (no DB needed) — fixture movies #11
  (`MISSING`) and #51 (`Get.Better.Copy`) exercise the status rows, and title
  searches exercise the exact/fuzzy grouping.
- **Tier 2/3** stay vanilla-JS/CSS; largest single item is the thumbnail
  column (a `columns.js` entry + render branch in `table.js` + tests).

---

## 6. Implementation summary

**New/changed design tokens (`variables.css`)**
- `color-scheme: light/dark` → native form controls and scrollbars follow the theme.
- Slightly blue-tinted dark palette (`#12141a` page, `#1a1d26` table, `#1f232e` header) instead of flat gray.
- Semantic row tokens: `--row-zebra`, `--row-hover`, `--row-active-bg`, `--row-missing-*`, `--row-better-*`, `--row-exact-bg`, `--row-fuzzy-bg`, rating tiers `--rating-good/mid/bad`, OR-mode pill tokens, skeleton shimmer tokens.
- `--highlight-text` now defined in the auto-dark block (bug B4 fixed).
- Theme-aware `scrollbar-color` (bug B7 fixed).

**`table.css`**
- Status rows repainted with tints + 3px left accent bars (bugs A1/A2 fixed; `!important` and bold removed).
- Zebra striping + single CSS hover (dead JS mouseenter/mouseleave system and the clashing orangered accents removed — bug A3).
- Full styling for the previously-unstyled exact/fuzzy group headers, `#search-group-info` banner, and match tints (bug A4).
- Sort indicators via `aria-sort` (`▲`/`▼`/`⇅`, plus hover affordance) — bug B2.
- OR-mode pill contrast fixed (B3); copy buttons enlarged to real touch targets (B5); themed `th:hover` (B6); table-wrapper bottom padding raised so pagination never covers rows (B8).
- Sticky first column (No) during horizontal scroll; poster thumbnails in the title cell (fade in on load, zero chrome when a poster is missing).
- Filter pills, row-color legend with keyboard hints, empty state, skeleton shimmer while loading, keyboard-highlight row, rating tier colors, `tabular-nums` numerics, muted Year column, `:focus-visible` rings, `prefers-reduced-motion` support, staggered row entrance animation.
- Removed ~20 dead rules (the never-created `tr.exact-fuzzy-separator` block).

**`pagination.css` / `base.css` / `stats.css` / views**
- `.pagination button.active` styled on the main table (bug B1); generic `.hidden { display:none !important }`.
- Stats "jump to movie" row flash now theme-aware (`--row-flash`).
- Favicon added; `#filter-pills` container and legend added to the movie view.

**JS**
- `sorting.js`: sets `aria-sort` + title on the sorted column.
- `pagination.js`: 25/50/100/200 page-size selector persisted in `localStorage`, `role="status"` result line.
- `table.js`: poster thumbnails (reuses the modal's `setPoster` fallback logic), rating tier classes, `data-col` on cells, empty-state row with a working "Clear all filters" action, row stagger indexes; removed the redundant hover handlers.
- `app.js`: skeleton loading class, filter-pill rendering/removal, keyboard shortcuts (`/`, `Esc` in filter, `↑/↓`, `Enter`), persisted page size, dynamic `document.title`, theme-toggle `aria-pressed`/`aria-label`.

**Verification**
- `npm run test:js` — 83/83 pass (one assertion updated for the new empty-state row).
- `npm run build` — esbuild bundle clean.
- Full-app smoke test (jsdom + mock API): initial render, search + grouping, pills, page-size, pagination, keyboard navigation, modal open/close, theme toggle, empty state — all pass with no runtime errors. (Playwright browser suite could not run in this sandbox: the Chromium download is blocked. Run `npm run test:browser` on a machine with Chromium installed.)
