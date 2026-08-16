// columns.js
import { qs, qsa } from '../core/dom.js';
import { state, ALWAYS_VISIBLE } from '../core/state.js';


export function initColumnToggles(table, toggleContainer) {
    if (!table || !toggleContainer) return;

    const columns = [...table.querySelectorAll('thead th')].map(th => th.dataset.col);
    const optionalColumns = columns.filter(c => !ALWAYS_VISIBLE.includes(c));

    // Load saved prefs
    const savedPrefs = JSON.parse(localStorage.getItem('movieCatalogColumns') || '{}');
    columns.forEach(col => {
        const visible = ALWAYS_VISIBLE.includes(col) ? true : (savedPrefs[col] ?? false);
        setColumnVisibility(col, visible, true);
    });

    // Individual column buttons
    qsa('.toggle-col', toggleContainer).forEach(btn => {
        btn.type = 'button';
        const col = btn.dataset.col;
        const eyeIcon = btn.querySelector('i.fa-eye, i.fa-eye-slash');

        btn.classList.toggle('active', state.columnVisibility[col]);
        if (eyeIcon) eyeIcon.className = state.columnVisibility[col] ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';

        btn.addEventListener('click', () => {
            const newVisible = !state.columnVisibility[col];
            setColumnVisibility(col, newVisible);
            btn.classList.toggle('active', newVisible);
            if (eyeIcon) eyeIcon.className = newVisible ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            savePrefs();
            updateToggleAllButton();
        });
    });

    // Show/Hide All button
    const toggleAllBtn = document.createElement('button');
    //toggleAllBtn.textContent = 'Show/Hide All';
    toggleAllBtn.addEventListener('click', () => {
        const anyVisible = optionalColumns.some(c => state.columnVisibility[c]);
        optionalColumns.forEach(c => setColumnVisibility(c, !anyVisible));
//        qsa('.toggle-col', toggleContainer).forEach(btn => {
//            const col = btn.dataset.col;
//            btn.classList.toggle('active', state.columnVisibility[col]);
//            const eyeIcon = btn.querySelector('i.fa-eye, i.fa-eye-slash');
//            if (eyeIcon) eyeIcon.className = state.columnVisibility[col] ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
//        });
        updateToggleAllButton();
        savePrefs();
    });
    toggleContainer.appendChild(toggleAllBtn);
    updateToggleAllButton();

    function setColumnVisibility(col, visible, skipSave = false) {
        const idx = columns.indexOf(col) + 1;
        qsa(`thead th:nth-child(${idx}), tbody td:nth-child(${idx})`, table)
            .forEach(el => el.style.display = visible ? '' : 'none');

        const searchTd = qs(`#search-row td:nth-child(${idx})`);
        if (searchTd) searchTd.style.display = visible ? '' : 'none';

        state.columnVisibility[col] = visible;
        if (!skipSave) savePrefs();
    }

    function savePrefs() {
        localStorage.setItem('movieCatalogColumns', JSON.stringify(state.columnVisibility));
    }

    function updateToggleAllButton() {
        if (!toggleAllBtn) return;
        const anyVisible = optionalColumns.some(c => state.columnVisibility[c]);
        toggleAllBtn.textContent = anyVisible ? 'Hide All' : 'Show All';
    }
}
