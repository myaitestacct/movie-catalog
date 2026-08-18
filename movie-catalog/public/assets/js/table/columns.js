// columns.js
import { qs, qsa } from '../core/dom.js';
import { state, ALWAYS_VISIBLE } from '../core/state.js';

export function initColumnToggles(table, toggleContainer) {
    if (!table || !toggleContainer) return;

    const columns = [...table.querySelectorAll('thead th')]
        .map(header => header.dataset.col);
    const optionalColumns = columns
        .filter(column => !ALWAYS_VISIBLE.includes(column));
    const toggleButtons = qsa('.toggle-col', toggleContainer);

    let savedPreferences = {};

    try {
        const parsed = JSON.parse(
            localStorage.getItem('movieCatalogColumns') || '{}'
        );
        if (parsed && typeof parsed === 'object') {
            savedPreferences = parsed;
        }
    } catch {
        savedPreferences = {};
    }

    columns.forEach(column => {
        const visible = ALWAYS_VISIBLE.includes(column)
            ? true
            : (savedPreferences[column] ?? false);
        setColumnVisibility(column, visible);
    });

    toggleButtons.forEach(button => {
        button.type = 'button';
        syncToggleButton(button);

        button.addEventListener('click', () => {
            const column = button.dataset.col;
            const visible = !state.columnVisibility[column];

            setColumnVisibility(column, visible);
            syncToggleButton(button);
            savePreferences();
            updateToggleAllButton();
        });
    });

    const toggleAllButton = document.createElement('button');
    toggleAllButton.type = 'button';
    toggleAllButton.className = 'toggle-all-columns';

    toggleAllButton.addEventListener('click', () => {
        const anyVisible = optionalColumns
            .some(column => state.columnVisibility[column]);
        const visible = !anyVisible;

        optionalColumns.forEach(column => {
            setColumnVisibility(column, visible);
        });

        syncAllToggleButtons();
        savePreferences();
        updateToggleAllButton();
    });

    toggleContainer.appendChild(toggleAllButton);
    updateToggleAllButton();

    function setColumnVisibility(column, visible) {
        const index = columns.indexOf(column) + 1;

        qsa(
            `thead th:nth-child(${index}), tbody td:nth-child(${index})`,
            table
        ).forEach(element => {
            element.style.display = visible ? '' : 'none';
        });

        const searchCell = qs(`#search-row td:nth-child(${index})`);
        if (searchCell) {
            searchCell.style.display = visible ? '' : 'none';
        }

        state.columnVisibility[column] = visible;
    }

    function syncToggleButton(button) {
        const column = button.dataset.col;
        const visible = Boolean(state.columnVisibility[column]);
        const eyeIcon = button.querySelector('i.fa-eye, i.fa-eye-slash');

        button.classList.toggle('active', visible);
        button.setAttribute('aria-pressed', String(visible));

        if (eyeIcon) {
            eyeIcon.className = visible
                ? 'fa-solid fa-eye'
                : 'fa-solid fa-eye-slash';
        }
    }

    function syncAllToggleButtons() {
        toggleButtons.forEach(syncToggleButton);
    }

    function savePreferences() {
        localStorage.setItem(
            'movieCatalogColumns',
            JSON.stringify(state.columnVisibility)
        );
    }

    function updateToggleAllButton() {
        const anyVisible = optionalColumns
            .some(column => state.columnVisibility[column]);

        toggleAllButton.textContent = anyVisible
            ? 'Hide All'
            : 'Show All';
        toggleAllButton.setAttribute(
            'aria-label',
            anyVisible
                ? 'Hide all optional columns'
                : 'Show all optional columns'
        );
    }
}
