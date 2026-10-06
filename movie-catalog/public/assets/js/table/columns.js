// columns.js
import { qs, qsa } from '../core/dom.js';
import { state, ALWAYS_VISIBLE } from '../core/state.js';

/**
 * Wire the column chips plus the bulk Hide/Show All button.
 *
 * @param {HTMLTableElement} table
 * @param {HTMLElement} toggleContainer toolbar group holding the chips
 * @param {{visible: boolean, show: Function, hide: Function}|null} [posterToggle]
 *   handle from initMiniPosterToggle(). The thumbnails are not a column, but
 *   "All" means all: the bulk button hides and shows them too, and counts them
 *   when deciding which label to show.
 * @returns {{refresh: Function}|null} `refresh()` recomputes the bulk button
 *   label; call it when the poster chip changes on its own.
 */
export function initColumnToggles(table, toggleContainer, posterToggle = null) {
    if (!table || !toggleContainer) return null;

    const columns = [...table.querySelectorAll('thead th')]
        .map(header => header.dataset.col);
    const optionalColumns = columns
        .filter(column => !ALWAYS_VISIBLE.includes(column));
    const toggleButtons = qsa('.toggle-col', toggleContainer);

    // Optional columns come from state; the thumbnails come from their own
    // module, so "anything visible" is the union of the two.
    const anythingVisible = () =>
        optionalColumns
            .some(column => state.columnVisibility[column]) ||
        (posterToggle ? Boolean(posterToggle.visible) : false);

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
        toggleAllButton.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i><span class="sidebar-label">Hide All</span>';

        // Append "Hide All" as the last chip of the display group, directly
        // under the Poster chip it bulk-toggles. (The theme toggle used to
        // anchor this insert, but it now lives in the sidebar header.)
        toggleContainer.appendChild(toggleAllButton);
    }

    // Single-owner handler, same reasoning as the column chips above.
    toggleAllButton.onclick = () => {
        const visible = !anythingVisible();

        optionalColumns.forEach(column => {
            setColumnVisibility(column, visible);
        });

        // Drive the Poster chip through its own module so the <html> class,
        // the chip state and the stored preference all stay in sync.
        if (posterToggle) {
            if (visible) posterToggle.show();
            else posterToggle.hide();
        }

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
        const anyVisible = anythingVisible();
        const text = anyVisible ? 'Hide All' : 'Show All';
        const iconClass = anyVisible ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';

        const labelSpan = toggleAllButton.querySelector('.sidebar-label');
        const iconEl = toggleAllButton.querySelector('i');

        if (labelSpan && iconEl) {
            labelSpan.textContent = text;
            iconEl.className = iconClass;
        } else {
            toggleAllButton.textContent = text;
        }

        toggleAllButton.title = anyVisible
            ? 'Hide all optional columns and poster thumbnails'
            : 'Show all optional columns and poster thumbnails';
        toggleAllButton.setAttribute(
            'aria-label',
            anyVisible
                ? 'Hide all optional columns and poster thumbnails'
                : 'Show all optional columns and poster thumbnails'
        );
    }

    return Object.freeze({
        refresh: updateToggleAllButton
    });
}
