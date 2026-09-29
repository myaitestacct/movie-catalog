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

        // Poster/UI-only toggles live alongside column toggles but are
        // wired up elsewhere (they have no data-col). Skip them here.
        if (!button.dataset.col) return;

        // `onclick` rather than addEventListener: a handler attached twice
        // (e.g. if the toolbar is ever initialised twice) flips the column
        // back to its original state on every click -- two flips, no change.
        button.onclick = () => {
            const column = button.dataset.col;
            const visible = !state.columnVisibility[column];

            setColumnVisibility(column, visible);
            syncToggleButton(button);
            savePreferences();
            updateToggleAllButton();
        };
    });

    // Reuse an existing Hide/Show All button instead of creating another
    // one: initialising the toolbar twice must not duplicate the control.
    const existingToggleAllButton = qs(
        '.toggle-all-columns',
        toggleContainer
    );
    const toggleAllButton = existingToggleAllButton
        ?? document.createElement('button');

    if (!existingToggleAllButton) {
        toggleAllButton.type = 'button';
        toggleAllButton.className = 'toggle-all-columns';

        // Keep the theme toggle as the right-most toolbar control:
        // insert "Hide All" before it when present.
        const anchorButton = toggleContainer.querySelector(
            '#theme-toggle, #stats-toggle'
        );

        if (anchorButton) {
            toggleContainer.insertBefore(toggleAllButton, anchorButton);
        } else {
            toggleContainer.appendChild(toggleAllButton);
        }
    }

    // Single-owner handler, same reasoning as the column chips above.
    toggleAllButton.onclick = () => {
        const anyVisible = optionalColumns
            .some(column => state.columnVisibility[column]);
        const visible = !anyVisible;

        optionalColumns.forEach(column => {
            setColumnVisibility(column, visible);
        });

        syncAllToggleButtons();
        savePreferences();
        updateToggleAllButton();
    };

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
        if (!column) return; // UI-only toggles manage their own state
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
