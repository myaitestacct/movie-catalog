// app.js
import { fetchMovies } from './core/api.js';
import { state } from './core/state.js';
import { renderTable } from './table/table.js';
import { initColumnToggles } from './table/columns.js';
import { initSearch } from './table/search.js';
import { initSorting } from './table/sorting.js';
import { renderPagination } from './table/pagination.js';
import { initStats, refreshStats } from './stats/stats.js';

let table, searchRow, pagination, columns, statsPanel;

/* ==============================
   EXPORTED: loadMovies
============================== */
export async function loadMovies() {
  table.classList.remove('show');
  table.classList.add('table-fade');

  await new Promise(r => setTimeout(r, 150));

  const params = new URLSearchParams({
    page: state.page,
    sort: state.sort,
    dir: state.dir
  });

  Object.entries(state.search).forEach(([k, v]) => {
    if (v) params.append(k, v);
  });

  if (state.fuzzy) params.append('fuzzy', 'true');

  const data = await fetchMovies(params);

  renderTable(table, data.data, columns);
  renderPagination(pagination, data.pages, data.total, data.data.length, loadMovies);

  requestAnimationFrame(() => table.classList.add('show'));

  if (statsPanel?.classList.contains('show')) {
    refreshStats();
  }
}

/* ==============================
   INIT
============================== */
(async function init() {
  table = document.getElementById('movies');
  searchRow = document.getElementById('search-row');
  pagination = document.getElementById('pagination');
  statsPanel = document.getElementById('stats-panel');

  if (!table || !searchRow || !pagination) return;

  columns = [...table.querySelectorAll('thead th')].map(th => th.dataset.col);

  // 1️⃣ Column toggles
  const toggleContainer = document.querySelector('.column-toggles');
  if (toggleContainer) initColumnToggles(table, toggleContainer);

  // 2️⃣ Search
  initSearch(columns, searchRow, loadMovies);

  // 2.5️⃣ Search mode toggle
  const searchModeBtn = document.getElementById('search-mode');
  if (searchModeBtn) {
    searchModeBtn.textContent = state.searchMode;

    searchModeBtn.onclick = () => {
      state.searchMode = state.searchMode === 'AND' ? 'OR' : 'AND';
      searchModeBtn.textContent = state.searchMode;
      searchModeBtn.classList.toggle('or', state.searchMode === 'OR');
      loadMovies();
    };
  }

  // 2.6️⃣ Fuzzy search toggle
  const fuzzyBtn = document.getElementById('fuzzy-toggle');
  if (fuzzyBtn) {
    state.fuzzy = false;
    fuzzyBtn.textContent = `Fuzzy: OFF`;

    fuzzyBtn.onclick = () => {
      state.fuzzy = !state.fuzzy;
      fuzzyBtn.textContent = `Fuzzy: ${state.fuzzy ? 'ON' : 'OFF'}`;
      loadMovies();
    };
  }

/* ==============================
   Theme System
============================== */

const themeToggle = document.getElementById('theme-toggle');

if (themeToggle) {

  const storedTheme = localStorage.getItem('theme');

  if (storedTheme) {
    document.documentElement.classList.add(`theme-${storedTheme}`);
  }

  const updateIcon = () => {
    const dark = document.documentElement.classList.contains('theme-dark');
    themeToggle.textContent = dark ? '☀️' : '🌙';
  };

  updateIcon();

  themeToggle.onclick = () => {

    const root = document.documentElement;

    if (root.classList.contains('theme-dark')) {
      root.classList.remove('theme-dark');
      root.classList.add('theme-light');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('theme-light');
      root.classList.add('theme-dark');
      localStorage.setItem('theme', 'dark');
    }

    updateIcon();
  };
}

  // 3️⃣ Sorting
  initSorting(table, loadMovies);

  // 4️⃣ Stats
  const statsToggle = document.getElementById('stats-toggle');
  if (statsToggle && statsPanel) {
    initStats(statsToggle, statsPanel);
    if (statsPanel.classList.contains('show')) refreshStats();
  }

  // 5️⃣ Initial load
  loadMovies();
})();
