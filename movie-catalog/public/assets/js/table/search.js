// search.js
import { state, ALWAYS_VISIBLE } from '../core/state.js';

export function initSearch(columns, searchRow, onSearch) {
    columns.forEach(col => {
        const td = document.createElement('td');
        const control = document.createElement('div');
        const input = document.createElement('input');
        const clearButton = document.createElement('button');

        control.className = 'search-control';

        input.type = 'search';
        input.dataset.col = col;
        input.value = state.search[col] || '';
        input.setAttribute(
            'aria-label',
            `Filter by ${col}`
        );

        clearButton.type = 'button';
        clearButton.className = 'clear-search';
        clearButton.dataset.col = col;
        clearButton.setAttribute(
            'aria-label',
            `Clear ${col} filter`
        );
        clearButton.textContent = '×';
        clearButton.hidden = !input.value;

        const visible =
            state.columnVisibility[col] ??
            ALWAYS_VISIBLE.includes(col);

        td.style.display = visible ? '' : 'none';

        input.addEventListener('input', () => {
            clearButton.hidden =
                input.value.trim() === '';

            clearTimeout(state.debounce);

            state.debounce = setTimeout(() => {
                state.search[col] =
                    input.value.trim();

                state.page = 1;
                onSearch?.();
            }, 500);
        });

        clearButton.addEventListener('click', () => {
            clearTimeout(state.debounce);

            input.value = '';
            clearButton.hidden = true;
            delete state.search[col];
            state.page = 1;

            onSearch?.();
            input.focus();
        });

        control.append(input, clearButton);
        td.appendChild(control);
        searchRow.appendChild(td);
    });
}
