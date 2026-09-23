// search.js
import { state, ALWAYS_VISIBLE } from '../core/state.js';

export function initSearch(columns, searchRow, onSearch, onFilterChange) {
    columns.forEach(col => {
        const td = document.createElement('td');
        const input = document.createElement('input');

        input.type = 'search';
        if (col === 'FILEPATH' || col === 'PATH') {
            input.title = col === 'FILEPATH'
                ? 'Contains text in the filename only (not fuzzy)'
                : 'Contains text in the folder path only (not fuzzy)';
        }
        input.dataset.col = col;
        input.value = state.search[col] || '';
        input.setAttribute(
            'aria-label',
            `Filter by ${col}`
        );

        const visible =
            state.columnVisibility[col] ??
            ALWAYS_VISIBLE.includes(col);

        td.style.display =
            visible ? '' : 'none';

        input.addEventListener('input', () => {
            clearTimeout(state.debounce);

            // Commit every field immediately; only the network reload is
            // debounced. Editing another column must not discard this value.
            state.search[col] = input.value.trim();
            state.page = 1;
            onFilterChange?.();

            state.debounce = setTimeout(() => {
                state.debounce = null;
                onSearch?.();
            }, 500);
        });

        td.appendChild(input);
        searchRow.appendChild(td);
    });
}
