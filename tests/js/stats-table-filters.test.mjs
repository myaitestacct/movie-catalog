import test from 'node:test';
import assert from 'node:assert/strict';
import {
    applyTableFilter,
    FILTER_COLUMN_LABELS,
    getBandTableFilter,
    getDecadeTableFilter,
    getFacetTableFilter,
    getYearTableFilter,
    setTableFilterLoader
} from '../../movie-catalog/public/assets/js/stats/stats-table-filters.js';
import {
    state
} from '../../movie-catalog/public/assets/js/core/state.js';

const createdInputs = [];

globalThis.document = {
    _modeButton: null,
    getElementById(id) {
        if (id === 'search-mode') {
            if (!this._modeButton) {
                this._modeButton = {
                    textContent: 'OR',
                    classList: {
                        classes: new Set(['or']),
                        remove(name) {
                            this.classes.delete(name);
                        }
                    }
                };
            }

            return this._modeButton;
        }

        return null;
    },
    querySelector(selector) {
        const match =
            selector.match(/^#search-row input\[data-col="([A-Z]+)"\]$/);

        if (!match) return null;

        const existing = createdInputs.find(
            input => input.dataset.col === match[1]
        );

        return existing ?? null;
    }
};

function resetState() {
    state.search = {};
    state.page = 4;
    state.searchMode = 'OR';
    state.debounce = null;
    createdInputs.length = 0;
}

test('decade slices map to an inclusive YEAR range', () => {
    assert.deepEqual(
        getDecadeTableFilter(2000),
        { column: 'YEAR', value: '2000-2009' }
    );

    assert.deepEqual(
        getDecadeTableFilter('1940'),
        { column: 'YEAR', value: '1940-1949' }
    );

    assert.equal(getDecadeTableFilter('not-a-year'), null);
    assert.equal(getDecadeTableFilter(-100), null);
});

test('timeline slices map to an exact YEAR', () => {
    assert.deepEqual(
        getYearTableFilter(1996),
        { column: 'YEAR', value: '1996' }
    );

    assert.equal(getYearTableFilter(0), null);
});

test('facet slices carry their column and trimmed label', () => {
    assert.deepEqual(
        getFacetTableFilter('DIRECTOR', ' Denis Villeneuve '),
        { column: 'DIRECTOR', value: 'Denis Villeneuve' }
    );

    assert.equal(getFacetTableFilter('DIRECTOR', '  '), null);
    assert.equal(getFacetTableFilter('', 'Ava Example'), null);
});

test('production rating/runtime band keys map to range filters', () => {
    assert.deepEqual(
        getBandTableFilter('rating', 'under-5'),
        { column: 'RATING', value: '<5' }
    );

    assert.deepEqual(
        getBandTableFilter('rating', '7-range'),
        { column: 'RATING', value: '7-7.9' }
    );

    assert.deepEqual(
        getBandTableFilter('rating', '8-plus'),
        { column: 'RATING', value: '8+' }
    );

    assert.deepEqual(
        getBandTableFilter('runtime', 'short'),
        { column: 'LENGTH', value: '<90' }
    );

    assert.deepEqual(
        getBandTableFilter('runtime', 'epic'),
        { column: 'LENGTH', value: '150+' }
    );

    assert.deepEqual(
        getBandTableFilter('fileSize', 'very-large'),
        { column: 'FILESIZE', value: '6144+' }
    );

    assert.deepEqual(
        getBandTableFilter('fileSize', 'high-definition'),
        { column: 'FILESIZE', value: '1536-3071.99' }
    );
});

test('demo band keys map to range filters too', () => {
    assert.deepEqual(
        getBandTableFilter('runtime', '120-plus'),
        { column: 'LENGTH', value: '120+' }
    );

    assert.deepEqual(
        getBandTableFilter('fileSize', '2-gb-plus'),
        { column: 'FILESIZE', value: '2147483648+' }
    );

    assert.equal(getBandTableFilter('rating', 'unknown-band'), null);
});

test('filter-only analytics columns have pill labels', () => {
    assert.equal(FILTER_COLUMN_LABELS.DIRECTOR, 'Director');
    assert.equal(FILTER_COLUMN_LABELS.ACTORS, 'Cast');
    assert.equal(FILTER_COLUMN_LABELS.COUNTRY, 'Country');
    assert.equal(FILTER_COLUMN_LABELS.YEAR, 'Year');
});

test('applyTableFilter writes the slice into state and reloads page one', () => {
    resetState();

    let loads = 0;
    setTableFilterLoader(() => {
        loads += 1;
    });

    createdInputs.push({
        dataset: { col: 'YEAR' },
        value: ''
    });

    const applied = applyTableFilter({
        column: 'YEAR',
        value: '2000-2009'
    });

    assert.equal(applied, true);
    assert.equal(state.search.YEAR, '2000-2009');
    assert.equal(state.page, 1);
    assert.equal(loads, 1);
    assert.equal(createdInputs[0].value, '2000-2009');
});

test('applyTableFilter forces AND mode and syncs the toggle', () => {
    resetState();

    setTableFilterLoader(() => {});

    applyTableFilter({
        column: 'DIRECTOR',
        value: 'Denis Villeneuve'
    });

    assert.equal(state.searchMode, 'AND');
    assert.equal(
        globalThis.document._modeButton.textContent,
        'AND'
    );
    assert.equal(
        globalThis.document._modeButton.classList.classes.has('or'),
        false
    );
});

test('applyTableFilter rejects empty specs without reloading', () => {
    resetState();

    let loads = 0;
    setTableFilterLoader(() => {
        loads += 1;
    });

    assert.equal(applyTableFilter(null), false);
    assert.equal(
        applyTableFilter({ column: 'YEAR', value: '  ' }),
        false
    );
    assert.equal(
        applyTableFilter({ column: '', value: '2000' }),
        false
    );
    assert.equal(loads, 0);
});

test('applyTableFilter survives a missing loader', () => {
    resetState();

    setTableFilterLoader(null);

    assert.equal(
        applyTableFilter({ column: 'CATEGORY', value: 'Drama' }),
        true
    );
    assert.equal(state.search.CATEGORY, 'Drama');
});
