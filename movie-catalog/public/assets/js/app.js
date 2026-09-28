// app.js
import { createMovieLoader } from './core/movie-loader.js';
import {
  state,
  TITLE_SEARCH_MODES
} from './core/state.js';
import { renderTable } from './table/table.js';
import { initColumnToggles } from './table/columns.js';
import { initSearch } from './table/search.js';
import { initSorting } from './table/sorting.js';
import {
  renderPagination,
  loadStoredPageSize
} from './table/pagination.js';
import {
  initStats,
  refreshStats
} from './stats/stats.js';
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

function hasActiveSearchFilters() {
  return Object.values(state.search).some(
    value =>
      String(value ?? '').trim() !== ''
  );
}

function syncClearFiltersButton(button) {
  if (!button) return;

  button.disabled =
    !hasActiveSearchFilters();
}

/* ==============================
   EXPORTED: loadMovies
============================== */
const loadMoviePage = createMovieLoader({
  onStart() {
    table.classList.remove('show');
    table.classList.add('table-fade');
    table.setAttribute('aria-busy', 'true');
    tableWrapper?.classList.add('is-loading');
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
      tableWrapper?.classList.remove('is-loading');
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
  const labels = {};

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
    remove.textContent = '✕';
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
      }

      // The input handler owns state.search; mirror its effect immediately
      // so the pills update without waiting for the debounced reload.
      delete state.search[column];
      renderFilterPills();
    };

    pill.append(label, valueSpan, remove);
    filterPills.appendChild(pill);
  });
}

/* ==============================
   Keyboard shortcuts
   /  focus first filter input
   Esc clear focused filter
   ↑/↓ move row highlight
   Enter open highlighted movie
============================== */
function isTypingTarget(target) {
  if (!target) return false;

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

  document.addEventListener('keydown', event => {
    // Row navigation must not fight with the open detail modal.
    if (document.querySelector('.movie-modal.open')) return;

    if (event.key === '/' && !isTypingTarget(event.target)) {
      const firstInput = getVisibleSearchInputs()[0];

      if (firstInput) {
        event.preventDefault();
        firstInput.focus();
        firstInput.select();
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
  });

  // Reset the highlight whenever the table re-renders.
  const observer = new MutationObserver(() => {
    highlightIndex = -1;
  });

  observer.observe(table.querySelector('tbody'), { childList: true });
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

  columns = [
    ...table.querySelectorAll(
      'thead th'
    )
  ].map(th => th.dataset.col);

  // 1️⃣ Column toggles
  const toggleContainer =
    document.querySelector(
      '.column-toggles'
    );

  if (toggleContainer) {
    initColumnToggles(
      table,
      toggleContainer
    );
  }

  // 2️⃣ Search
  const clearFiltersButton =
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
    searchModeBtn.textContent =
      state.searchMode;

    searchModeBtn.onclick = () => {
      state.searchMode =
        state.searchMode === 'AND'
          ? 'OR'
          : 'AND';

      searchModeBtn.textContent =
        state.searchMode;

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
        : 'FUZZY';

    titleSearchMode.addEventListener(
      'change',
      () => {
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
      }
    );
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

      themeToggle.textContent =
        dark ? '☀️' : '🌙';

      themeToggle.setAttribute(
        'aria-pressed',
        String(dark)
      );

      themeToggle.setAttribute(
        'aria-label',
        dark ? 'Switch to light theme' : 'Switch to dark theme'
      );

      themeToggle.title = dark
        ? 'Switch to light theme'
        : 'Switch to dark theme';
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
      statsPanel.classList.contains(
        'show'
      )
    ) {
      refreshStats();
    }
  }

  // 5️⃣ Initial load
  loadMovies();
})();
