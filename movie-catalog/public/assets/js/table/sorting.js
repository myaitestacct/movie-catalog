import { state } from '../core/state.js';

export function initSorting(table, onSort) {
  table.querySelectorAll('thead th').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      state.dir = state.sort === col && state.dir === 'ASC' ? 'DESC' : 'ASC';
      state.sort = col;
      state.page = 1;
      onSort();
    });
  });
}
