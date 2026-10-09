# Movie Catalog — UI Modernization (Round 2)

*Date: 2026-09-28 · branch `arena/01a0e8b7-movie-catalog`*

> Follow-up to [UI-ENHANCEMENTS.md](UI-ENHANCEMENTS.md) (which fixed broken
> behavior). This round changes the **design language**: app identity,
> brand palette, typography/shape system, a poster grid view, and a proper
> analytics drawer. **Performance was the hard constraint** — every
> enhancement below was chosen or shaped to add no runtime cost on the
> common path (details in §5).

Preview: `npm run dev:demo` (no database needed). Try: the **Grid** toggle in
the sidebar, the **Analytics** ribbon (top right), the theme toggle (top of
the left sidebar), and search `Arrival` for the exact/fuzzy grouping.

---

## 1. What changed

### App shell & identity (was: anonymous button row)
- **App header bar** (`header.php`, `base.css`): clapperboard brand mark
  (indigo→violet gradient chip), wordmark + tagline, and a live **library
  summary** (titles / stored size / health chips). Titles count fills in from
  the table payload (zero extra requests); size + health fill in from the
  stats payload (fetched in the browser idle time, see §5).
- **Flex app shell**: `body` is now a `100dvh` column (header → toolbar →
  scrollable content → floating pagination). The table/grid panes fill the
  remaining viewport; the old `calc(115vh - 150px)` hack is gone.
- **Clustered toolbar** (`movie.php`): view toggle, search controls, and
  optional-column chips are now visual groups (`tool-group`) instead of one
  flat row of equal-weight buttons. The **theme toggle sits in the sidebar
  header** — the top of the left panel, on its own full-width row under the
  "Controls" title — rather than at the bottom of the column list, so the
  display-mode switcher and the light/dark switch are visible together at
  every sidebar width.

### Design tokens (single source of truth)
- `variables.css` rewritten: brand **indigo primary + amber "marquee" accent**,
  layered surfaces (`--table-bg`, `--surface-2/3`), app-bar/header tokens,
  radius + layered shadow scale, 10-color categorical chart palette
  (`--chart-1…10`), health tiers, blue-tinted charcoal dark theme.
- `stats.css` **no longer owns a token system**: its `:root` block is now
  pure aliases onto the shared tokens, and its two duplicated dark-mode
  blocks were deleted. One theme = one set of values.
- All emoji (🌙 ☀️ 📊 🎬 ✅ 🔍 📋 ◀ ▶ ×) replaced with **Font Awesome 6.5.0,
  self-hosted** in `public/assets/vendor/font-awesome/` (the cdnjs `<link>`
  is gone — no third-party request, no FOUT; only `fa-solid-900.woff2`
  ~153 KB is ever fetched, on demand).

### Movie grid view (new)
- `table/grid-view.js` + `#grid-view` pane: poster cards (3:4, lazy-loaded,
  sized) with title, year, tiered rating badge, and missing-file /
  better-copy status ribbons. Keyboard accessible (Tab + Enter), click opens
  the same detail modal.
- View preference persists in `localStorage`; the grid reuses its rendered
  DOM across table↔grid switches (only re-renders when the page data
  changes) — instant toggling.

### Table & toolbar polish
- Light, uppercase **sticky header** (Linear-style) replacing the dark band;
  search row re-styled to continue the surface.
- Larger rounded row posters (36×54), tokenized copy buttons, FA chevrons in
  the modal, unified modal copy buttons.
- Pagination: tokenized glass bar, **windowed page numbers with ellipses**
  (`… `), jump select + page-size selector retained.

### Analytics drawer
- The pull-down card is now a **full-height right-side drawer** with a dimmed
  backdrop (click to close) and a **sticky section nav** (12 anchor chips,
  smooth scroll, `scroll-margin-top` offsets).
- **Bento overview**: the two hero metrics (movies, total size) get
  gradient-tinted wide cards with icon chips; icon chips on every stat card.
- **Genre donut**: a `conic-gradient` donut (one inline style, no canvas/SVG
  churn) with a top-6 + "Other" legend, plus the existing ranked bars.
- Insight tiles, chart cards, and the drill-down modals restyled on the new
  radius/shadow/border scale; bar gradients derive from tokens
  (`color-mix`) instead of hardcoded hexes.

### Modal
- Fully token-themed (previously dark-hardcoded, incl. `Arial`): surface,
  borders, text, buttons, dividers all follow light/dark; overlay is a plain
  `rgba` (the full-screen `backdrop-filter: blur` was removed).
- Poster gets a border/shadow/base surface; description and label grids
  tightened; nav/close are icon buttons.

## 2. Files touched

| Area | Files |
| --- | --- |
| Views | `src/views/layout/header.php`, `src/views/movie/movie.php`, `src/views/movie/stats.php` |
| CSS | `assets/css/variables.css` (rewritten), `base.css` (rewritten), `stats.css` (rewritten), `modal.css` (rewritten), `pagination.css` (rewritten), `table.css` (edited), `responsive.css` (rewritten) |
| JS | `assets/js/app.js`, `assets/js/core/state.js` (`view` field), **new** `assets/js/table/grid-view.js`, `assets/js/table/table.js`, `assets/js/table/pagination.js`, `assets/js/stats/stats.js`, `assets/js/stats/stats-genres.js`, `assets/js/modal/modal.dom.js` |
| Vendor | **new** `assets/vendor/font-awesome/` (css + webfonts, 6.5.0, license included) |
| Tests | **new** `tests/js/grid-view.test.mjs`, `tests/js/table-separator.test.mjs` (banner text), `tests/browser/support/mock-server.mjs` (mirrors new app-header markup) |

No PHP API/SQL changes. No new npm/Composer dependencies.

## 3. Behavior notes

- **Idle stats preload**: after the first table render, the app schedules one
  stats fetch via `requestIdleCallback` (1 s `setTimeout` fallback) so the
  header chips and the analytics panel are ready before the user opens the
  panel. Opening the panel never triggers a second fetch (`loaded` flag).
- **Grid keyboard model**: Tab/Enter on cards; the `↑/↓` row highlight is
  table-view only (cards are naturally Tab-navigable).
- **Group-header / banner icons**: exact matches use a check icon, fuzzy a
  magnifier, "contains/other" a file-lines icon; the info banner stays plain
  text (color-coded) for screen-reader friendliness.

## 4. Verification

- `npm run test:js` — **88/88 pass** at the time of this round (incl. 4 new grid-view tests: card
  rendering + XSS escaping, status ribbons, rating tiers, empty state, view
  persistence).
- `npm run build` — clean; bundle 88.8 KB JS / 57.8 KB CSS minified at the time of this round (the current build is about 108 KB / 72 KB).
- Full-app smoke (jsdom against `dev:demo`): initial render + summary chips,
  status rows on both pages, grid render/toggle, modal from grid, exact/fuzzy
  grouping, filter pills + clear, pagination windowing/ellipses, stats drawer
  + donut + backdrop + section nav, theme toggle, empty states in both views,
  **zero runtime errors**.
- Playwright browser suite: requires Chromium, which cannot be downloaded in
  this sandbox. Run `npm run test:browser` on a machine with Chromium to
  confirm the click-through specs (they key off ids/classes that are
  unchanged).

## 5. Performance budget (what was deliberately NOT done)

| Choice | Why |
| --- | --- |
| System font stack, no webfont | Zero font payload; hierarchy comes from weight/tracking/size tokens |
| One static `body::before` gradient layer | Ambient background glow without animation or extra compositing |
| `backdrop-filter` kept on **two small bars only** (toolbar-free: pagination + card status ribbon) and removed from the full-screen modal overlay | Blur cost scales with area |
| Grid: one `innerHTML` write per page, `loading="lazy"` posters, rendered DOM reused across view switches, no per-card JS listeners (delegated) | 50 cards render in a single DOM mutation |
| Donut = one `conic-gradient` inline style + 7 legend rows | No canvas, no SVG, no per-frame JS |
| Idle-time stats fetch, never blocking first paint | First paint path unchanged (1 movies request) |
| All animation on `transform`/`opacity`; `prefers-reduced-motion` respected (existing blocks extended) | No layout-triggering animation |
| Self-hosted FA: only the solid woff2 is ever downloaded; existing icon markup unchanged | No CDN round-trip, no layout shift |
| No new dependencies, no framework | Bundle size flat vs. before (88.8 KB) |
