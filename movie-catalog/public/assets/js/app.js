// app.js
import { createMovieLoader } from './core/movie-loader.js';
import {
  state,
  TITLE_SEARCH_MODES
} from './core/state.js';
import { renderTable } from './table/table.js';
import { initColumnToggles } from './table/columns.js';
import { initMiniPosterToggle } from './table/poster-toggle.js';
import { initSearch } from './table/search.js';
import { initSorting } from './table/sorting.js';
import {
  renderPagination,
  loadStoredPageSize
} from './table/pagination.js';
import {
  renderGridView,
  loadStoredView,
  storeView
} from './table/grid-view.js';
import {
  initStats,
  refreshStats,
  isStatsLoaded,
  setMovieLoader
} from './stats/stats.js';
import { initSidebar } from './table/sidebar.js';
import {
  FILTER_COLUMN_LABELS
} from './stats/stats-table-filters.js';
import {
  clearError,
  showError
} from './utils/feedback.js';

let table;
let searchRow;
let pagination;
let columns;
let statsPanel;
let filterPills;
let tableWrapper;
let gridWrapper;
let gridView;
let gridRenderedData = null;
let currentMovies = null;
// Module-scope so the render callback can keep the Clear Filters chip in
// sync even for filters applied programmatically (analytics drill-down).
let clearFiltersButton = null;

function hasActiveSearchFilters() {
  return Object.values(state.search).some(
    value =>
      String(value ?? '').trim() !== ''
  );
}

function syncClearFiltersButton(button) {
  if (!button) return;

  const active = hasActiveSearchFilters();

  button.disabled = !active;

  // The view ships this chip with `hidden`, so it stays out of the toolbar
  // until a filter is actually active. base.css pins
  // `[hidden] { display: none !important }` — without that, the toolbar's
  // `display: inline-flex` rule silently overrides the attribute.
  button.hidden = !active;
}

/* ==============================
   View switching (table / grid)
============================== */
function syncViewButtons() {
  const tableBtn = document.getElementById('view-table');
  const gridBtn = document.getElementById('view-grid');

  const isGrid = state.view === 'grid';

  tableBtn?.classList.toggle('active', !isGrid);
  gridBtn?.classList.toggle('active', isGrid);
  tableBtn?.setAttribute('aria-pressed', String(!isGrid));
  gridBtn?.setAttribute('aria-pressed', String(isGrid));
}

function switchView(view) {
  if (state.view === view) return;

  state.view = view;
  storeView(view);
  syncViewButtons();

  const showGrid = view === 'grid';

  gridWrapper?.classList.toggle('hidden', !showGrid);
  tableWrapper?.classList.toggle('hidden', showGrid);

  // Reuse the rendered grid unless the underlying page changed.
  if (showGrid && currentMovies !== gridRenderedData) {
    renderGridView(gridView, currentMovies);
    gridRenderedData = currentMovies;
  }
}

/* ==============================
   App header summary
============================== */
function updateSummaryMovies(total) {
  const el = document.getElementById('summary-movies');

  if (el) {
    el.textContent = Number(total).toLocaleString();
  }
}

/* ==============================
   EXPORTED: loadMovies
============================== */
const loadMoviePage = createMovieLoader({
  onStart() {
    table.classList.remove('show');
    table.classList.add('table-fade');
    table.setAttribute('aria-busy', 'true');

    if (tableWrapper && state.view === 'table') {
      tableWrapper.classList.add('is-loading');
    }

    if (gridWrapper && state.view === 'grid') {
      gridWrapper.classList.add('is-loading');
    }
  },
  render(data) {
    clearError('movies');
    renderTable(table, data.data, columns);
    renderPagination(
      pagination,
      data.pages,
      data.total,
      data.limit,
      loadMovies
    );
    renderFilterPills();
    syncClearFiltersButton(clearFiltersButton);
    updateSummaryMovies(data.total);

    currentMovies = data.data;

    if (state.view === 'grid') {
      renderGridView(gridView, data.data);
      gridRenderedData = data.data;
    }

    document.title = data.total > 0
      ? `Movie Catalog — ${data.total} titles`
      : 'Movie Catalog — no results';

    if (statsPanel?.classList.contains('show')) {
      refreshStats();
    }
  },
  onError(error) {
    console.error('Movie load failed:', error);
    showError(error.message || 'Unable to load movies', {
      scope: 'movies',
      retry: loadMovies
    });
  },
  onFinish(isCurrent) {
    requestAnimationFrame(() => {
      if (!isCurrent()) return;
      table.setAttribute('aria-busy', 'false');
      table.classList.add('show');

      if (tableWrapper && state.view === 'table') {
        tableWrapper.classList.remove('is-loading');
      }

      if (gridWrapper && state.view === 'grid') {
        gridWrapper.classList.remove('is-loading');
      }
    });
  }
});

export async function loadMovies() {
  return loadMoviePage();
}

/* ==============================
   Filter pills
============================== */
function getColumnLabels() {
  // Start with the filter-only analytics columns (Director, Cast,
  // Country) that have no table header, then let real headers win.
  const labels = { ...FILTER_COLUMN_LABELS };

  table.querySelectorAll('thead th').forEach(th => {
    labels[th.dataset.col] = th.textContent.trim();
  });

  return labels;
}

function renderFilterPills() {
  if (!filterPills) return;

  filterPills.replaceChildren();

  const labels = getColumnLabels();

  Object.entries(state.search).forEach(([column, rawValue]) => {
    const value = String(rawValue ?? '').trim();

    if (value === '') return;

    const pill = document.createElement('span');
    pill.className = 'filter-pill';

    const label = document.createElement('span');
    label.className = 'filter-pill-label';
    label.textContent = `${labels[column] ?? column}:`;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'filter-pill-value';
    valueSpan.textContent = value;
    valueSpan.title = value;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.innerHTML =
      '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    remove.setAttribute(
      'aria-label',
      `Remove filter ${labels[column] ?? column}: ${value}`
    );

    remove.onclick = () => {
      const input = searchRow.querySelector(
        `input[data-col="${column}"]`
      );

      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));

        // The input handler owns state.search; mirror its effect
        // immediately so the pills update without waiting for the
        // debounced reload.
        delete state.search[column];
        renderFilterPills();
        return;
      }

      // Filter-only analytics columns (Director, Cast, Country) have no
      // toolbar input, so removing the pill must reload the table itself.
      clearTimeout(state.debounce);
      state.debounce = null;
      delete state.search[column];
      state.page = 1;
      renderFilterPills();
      syncClearFiltersButton(clearFiltersButton);
      loadMovies();
    };

    pill.append(label, valueSpan, remove);
    filterPills.appendChild(pill);
  });
}

/* ==============================
   Keyboard shortcuts
   /  focus title filter input
   Esc clear focused filter
   ↑/↓ move row highlight (table view)
   Enter open highlighted movie
============================== */
function isTypingTarget(target) {
  if (!target) return;

  const tag = target.tagName?.toLowerCase();

  return tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    target.isContentEditable;
}

function getVisibleSearchInputs() {
  return [...searchRow.querySelectorAll('input')]
    .filter(input => input.closest('td').style.display !== 'none');
}

function getDataRows() {
  return [...table.querySelectorAll('tbody tr[data-num]')];
}

function setupKeyboardShortcuts() {
  let highlightIndex = -1;

  const clearRowHighlight = () => {
    table.querySelector('tbody tr.kbd-highlight')
      ?.classList.remove('kbd-highlight');
  };

  // Own the document `onkeydown` slot: a second boot then replaces this
  // handler instead of adding another one (two handlers would move the
  // row highlight two rows per keypress). The modal and the stats panel
  // register their own keydown listeners with addEventListener, which
  // coexists with this property handler.
  document.onkeydown = event => {
    // Row navigation must not fight with the open detail modal.
    if (document.querySelector('.movie-modal.open')) return;

    if (event.key === '/' && !isTypingTarget(event.target)) {
      const titleInput = searchRow.querySelector('input[data-col="FORMATTEDTITLE"]');
      const targetInput = (titleInput && titleInput.closest('td').style.display !== 'none')
        ? titleInput
        : getVisibleSearchInputs()[0];

      if (targetInput) {
        event.preventDefault();
        targetInput.focus();
        targetInput.select();
      }

      return;
    }

    if (
      event.key === 'Escape' &&
      event.target?.dataset?.col &&
      event.target.value
    ) {
      event.target.value = '';
      event.target.dispatchEvent(new Event('input'));

      return;
    }

    if (isTypingTarget(event.target)) return;

    // Grid view has its own focus model (Tab + Enter on cards).
    if (state.view === 'grid') return;

    const rows = getDataRows();

    if (rows.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      highlightIndex = event.key === 'ArrowDown'
        ? Math.min(highlightIndex + 1, rows.length - 1)
        : Math.max(highlightIndex - 1, 0);

      clearRowHighlight();

      const row = rows[highlightIndex];

      row.classList.add('kbd-highlight');
      row.scrollIntoView({ block: 'nearest' });

      return;
    }

    if (event.key === 'Enter' && highlightIndex >= 0) {
      rows[highlightIndex]
        ?.querySelector('.movie-title-link')
        ?.click();
    }
  };

  // Reset the highlight whenever the table re-renders.
  const observer = new MutationObserver(() => {
    highlightIndex = -1;
  });

  observer.observe(table.querySelector('tbody'), { childList: true });
}

/* ==============================
   Idle-time stats preload (header summary + instant panel)
============================== */
function scheduleIdleStatsPreload() {
  const schedule = typeof requestIdleCallback === 'function'
    ? callback => requestIdleCallback(callback, { timeout: 3000 })
    : callback => setTimeout(callback, 1000);

  schedule(() => {
    if (!isStatsLoaded()) {
      refreshStats();
    }
  });
}

/* ==============================
   INIT
============================== */
(async function init() {
  table =
    document.getElementById('movies');

  searchRow =
    document.getElementById(
      'search-row'
    );

  pagination =
    document.getElementById(
      'pagination'
    );

  statsPanel =
    document.getElementById(
      'stats-panel'
    );

  filterPills =
    document.getElementById(
      'filter-pills'
    );

  tableWrapper =
    table.closest('.table-wrapper');

  gridWrapper =
    document.getElementById(
      'grid-wrapper'
    );

  gridView =
    document.getElementById(
      'grid-view'
    );

  if (
    !table ||
    !searchRow ||
    !pagination
  ) {
    return;
  }

  const storedPageSize = loadStoredPageSize();

  if (storedPageSize) {
    state.limit = storedPageSize;
  }

  state.view = loadStoredView();
  syncViewButtons();

  gridWrapper?.classList.toggle('hidden', state.view !== 'grid');
  tableWrapper?.classList.toggle('hidden', state.view === 'grid');

  const viewTable = document.getElementById('view-table');
  const viewGrid = document.getElementById('view-grid');

  // `onclick` (not addEventListener) so re-running the boot replaces the
  // handler instead of stacking a second one.
  if (viewTable) viewTable.onclick = () => switchView('table');
  if (viewGrid) viewGrid.onclick = () => switchView('grid');

  columns = [
    ...table.querySelectorAll(
      'thead th'
    )
  ].map(th => th.dataset.col);

  // 1️⃣ Column toggles, and the Poster chip they bulk-toggle.
  //
  // The mini-poster toggle is initialised *first* because Hide All / Show All
  // covers the thumbnails as well as the optional columns: columns.js needs the
  // handle, and the `onChange` callback keeps the bulk button's label correct
  // when the Poster chip is clicked on its own. The thumbnails are a UI-only
  // preference, not a column -- see table/poster-toggle.js.
  let columnToggles = null;

  const posterToggle = initMiniPosterToggle(
    document,
    globalThis.localStorage,
    () => columnToggles?.refresh()
  );

  const toggleContainer =
    document.querySelector(
      '.column-toggles'
    );

  if (toggleContainer) {
    columnToggles = initColumnToggles(
      table,
      toggleContainer,
      posterToggle
    );
  }

  // 2️⃣ Search
  clearFiltersButton =
    document.getElementById(
      'clear-filters'
    );

  if (clearFiltersButton) {
    clearFiltersButton.onclick = () => {
      clearTimeout(state.debounce);
      state.debounce = null;

      state.search = {};

      searchRow
        .querySelectorAll('input')
        .forEach(input => {
          input.value = '';
        });

      state.page = 1;

      syncClearFiltersButton(
        clearFiltersButton
      );

      loadMovies();
    };

    syncClearFiltersButton(
      clearFiltersButton
    );
  }

  initSearch(
    columns,
    searchRow,
    loadMovies,
    () => syncClearFiltersButton(clearFiltersButton)
  );

  // 2.5️⃣ Search mode toggle
  const searchModeBtn =
    document.getElementById(
      'search-mode'
    );

  if (searchModeBtn) {
    const textSpan = searchModeBtn.querySelector('.search-mode-text');
    if (textSpan) {
      textSpan.textContent = state.searchMode;
    } else {
      searchModeBtn.textContent = state.searchMode;
    }

    searchModeBtn.onclick = () => {
      state.searchMode =
        state.searchMode === 'AND'
          ? 'OR'
          : 'AND';

      if (textSpan) {
        textSpan.textContent = state.searchMode;
      } else {
        searchModeBtn.textContent = state.searchMode;
      }

      searchModeBtn.classList.toggle(
        'or',
        state.searchMode === 'OR'
      );

      state.page = 1;
      loadMovies();
    };
  }

  // 2.6️⃣ Explicit title-search mode
  const titleSearchMode =
    document.getElementById(
      'title-search-mode'
    );

  if (titleSearchMode) {
    titleSearchMode.value =
      TITLE_SEARCH_MODES.includes(
        state.titleSearchMode
      )
        ? state.titleSearchMode
        : 'CONTAINS';

    titleSearchMode.onchange = () => {
      if (
        !TITLE_SEARCH_MODES.includes(
          titleSearchMode.value
        )
      ) {
        return;
      }

      state.titleSearchMode =
        titleSearchMode.value;

      state.page = 1;
      loadMovies();
    };
  }

  /* ==============================
     Theme System
  ============================== */

  const themeToggle =
    document.getElementById(
      'theme-toggle'
    );

  if (themeToggle) {
    const storedTheme =
      localStorage.getItem('theme');

    if (storedTheme) {
      document.documentElement.classList.add(
        `theme-${storedTheme}`
      );
    }

    const updateIcon = () => {
      const dark =
        document.documentElement.classList.contains(
          'theme-dark'
        );

      const labelSpan = '<span class="sidebar-label">Theme</span>';
      themeToggle.innerHTML = dark
        ? `<i class="fa-solid fa-sun" aria-hidden="true"></i>${labelSpan}`
        : `<i class="fa-solid fa-moon" aria-hidden="true"></i>${labelSpan}`;

      themeToggle.setAttribute(
        'aria-pressed',
        String(dark)
      );

      themeToggle.setAttribute(
        'aria-label',
        dark ? 'Switch to light theme' : 'Switch to dark theme'
      );

      themeToggle.title = dark
        ? 'Switch to light theme' : 'Switch to dark theme';
    };

    updateIcon();

    themeToggle.onclick = () => {
      const root =
        document.documentElement;

      if (
        root.classList.contains(
          'theme-dark'
        )
      ) {
        root.classList.remove(
          'theme-dark'
        );

        root.classList.add(
          'theme-light'
        );

        localStorage.setItem(
          'theme',
          'light'
        );
      } else {
        root.classList.remove(
          'theme-light'
        );

        root.classList.add(
          'theme-dark'
        );

        localStorage.setItem(
          'theme',
          'dark'
        );
      }

      updateIcon();
    };
  }

  // 2.7️⃣ Mini-poster toggle (thumbnails inside the Title cell): initialised
  // up in step 1️⃣, because the bulk Hide All / Show All button drives it too.

  // 2.8️⃣ Adaptable Left Sidebar & edge toggle
  initSidebar(document, globalThis.localStorage);

  /* ==============================
     Keyboard shortcuts
  ============================== */

  setupKeyboardShortcuts();

  // 3️⃣ Sorting
  initSorting(
    table,
    loadMovies
  );

  // 4️⃣ Stats
  // stats.js needs loadMovies() but must not import it from here: an import
  // of the entry point resolves to a *second* module instance once the script
  // tag carries a cache key (app.js?v=<mtime>), which boots the whole app
  // twice. Inject the loader instead. Done unconditionally so jump-to-movie
  // works even when the stats panel is not rendered on this page.
  setMovieLoader(loadMovies);

  const statsToggle =
    document.getElementById(
      'stats-toggle'
    );

  if (statsToggle && statsPanel) {
    initStats(
      statsToggle,
      statsPanel
    );

    if (
      statsPanel.classList.contains('show')
    ) {
      refreshStats();
    }
  }

  // 5️⃣ Initial load
  loadMovies().then(() => scheduleIdleStatsPreload());
})();
