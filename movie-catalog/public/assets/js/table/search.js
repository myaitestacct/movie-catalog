// search.js
import { state, ALWAYS_VISIBLE } from '../core/state.js';

export function initSearch(columns, searchRow, onSearch) {
    columns.forEach(col => {
        const td = document.createElement('td');
        const input = document.createElement('input');

        input.dataset.col = col;
        input.value = state.search[col] || '';

        // Match initial visibility
        const visible =
                state.columnVisibility[col] ?? ALWAYS_VISIBLE.includes(col);
        td.style.display = visible ? '' : 'none';

        input.addEventListener('input', () => {
            clearTimeout(state.debounce);
            state.debounce = setTimeout(() => {
                state.search[col] = input.value.trim();
                state.page = 1;
                onSearch();
            }, 500);
        });

        td.appendChild(input);
        searchRow.appendChild(td);
    });
}
