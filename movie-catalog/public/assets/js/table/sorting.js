import { state } from '../core/state.js';

export function initSorting(table, onSort) {
  table.querySelectorAll('thead th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      state.dir = state.sort === col && state.dir === 'ASC' ? 'DESC' : 'ASC';
      state.sort = col;
      state.page = 1;
      syncSortIndicators(table);
      onSort();
    });
  });

  syncSortIndicators(table);
}

function syncSortIndicators(table) {
  table.querySelectorAll('thead th').forEach(th => {
    if (th.dataset.col === state.sort) {
      th.setAttribute(
        'aria-sort',
        state.dir === 'ASC' ? 'ascending' : 'descending'
      );
      th.setAttribute(
        'title',
        `Sorted by ${th.textContent.trim()} ` +
        (state.dir === 'ASC' ? 'ascending' : 'descending') +
        ' — click to reverse'
      );
    } else {
      th.removeAttribute('aria-sort');
      th.removeAttribute('title');
    }
  });
}
