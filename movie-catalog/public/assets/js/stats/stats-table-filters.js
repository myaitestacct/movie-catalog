import { state } from '../core/state.js';

/*
 * Analytics drill-down: clicking a chart slice (decade bar, director row,
 * rating band, ...) applies the matching filter to the main movie table.
 *
 * The filter is written into the same `state.search` map the toolbar inputs
 * use, so it shows up as a normal, editable, removable filter: the column
 * input (when the column has one) receives the value and a filter pill is
 * rendered. Numeric columns understand the range grammar shared with the
 * backend: `2000-2009` (inclusive), `8+` (at least), `<90` (below), or an
 * exact number.
 *
 * This module never imports the entry point (../app.js); the movie loader
 * is injected from stats.js, which receives it from the entry point.
 */

let tableLoader = null;

/**
 * Register the movie loader used to reload the table after a filter is
 * applied. Owned by stats.js (injected there by the entry point).
 * @param {() => Promise<*>} loader
 */
export function setTableFilterLoader(loader) {
    tableLoader = typeof loader === 'function' ? loader : null;
}

// Pill labels for every filterable column, including the filter-only
// columns that have no table header to read a label from.
export const FILTER_COLUMN_LABELS = Object.freeze({
    NUM: 'No',
    FORMATTEDTITLE: 'Title',
    YEAR: 'Year',
    LENGTH: 'Length',
    CERTIFICATION: 'Cert',
    RATING: 'Rating',
    FILESIZE: 'Size',
    LANGUAGES: 'Language',
    CATEGORY: 'Genre',
    RESOLUTION: 'Resolution',
    AUDIOFORMAT: 'Audio',
    FILEPATH: 'File',
    PATH: 'Path',
    DIRECTOR: 'Director',
    ACTORS: 'Cast',
    COUNTRY: 'Country'
});

/*
 * Band key -> numeric range filter, mirroring the band boundaries used by
 * StatsController (RATING is DECIMAL(3,1), FILESIZE is stored in MiB as
 * DECIMAL(14,2), LENGTH is whole minutes). Demo-mode keys from the mock
 * server are included so the demo drill-down works too.
 */
const BAND_TABLE_FILTERS = Object.freeze({
    rating: Object.freeze({
        'under-5': '<5',
        '5-range': '5-5.9',
        '6-range': '6-6.9',
        '7-range': '7-7.9',
        '8-plus': '8+',
        // demo/mock keys
        '6-6.9': '6-6.9',
        '7-7.9': '7-7.9',
        '8-10': '8-10'
    }),
    runtime: Object.freeze({
        short: '<90',
        standard: '90-119',
        long: '120-149',
        epic: '150+',
        // demo/mock keys
        'under-90': '<90',
        '90-119': '90-119',
        '120-plus': '120+'
    }),
    fileSize: Object.freeze({
        compact: '<700',
        'standard-definition': '700-1535.99',
        'high-definition': '1536-3071.99',
        large: '3072-6143.99',
        'very-large': '6144+',
        // demo/mock keys (fixture sizes are byte-scale values)
        'under-1-gb': '<1073741824',
        '1-2-gb': '1073741824-2147483648',
        '2-gb-plus': '2147483648+'
    })
});

const BAND_FILTER_COLUMNS = Object.freeze({
    rating: 'RATING',
    runtime: 'LENGTH',
    fileSize: 'FILESIZE'
});

/**
 * Filter spec for a rating/runtime/file-size band, or null when the band
 * key is unknown (the slice then stays non-interactive).
 * @param {'rating'|'runtime'|'fileSize'} kind
 * @param {string} key
 * @returns {{column: string, value: string} | null}
 */
export function getBandTableFilter(kind, key) {
    const value = BAND_TABLE_FILTERS[kind]?.[String(key ?? '').trim()];

    if (!value) return null;

    return {
        column: BAND_FILTER_COLUMNS[kind],
        value
    };
}

/** Filter spec for a decade (`2000-2009` style YEAR range). */
export function getDecadeTableFilter(startYear) {
    const start = Number.parseInt(startYear, 10);

    if (!Number.isFinite(start) || start <= 0) return null;

    return {
        column: 'YEAR',
        value: `${start}-${start + 9}`
    };
}

/** Filter spec for a single release year. */
export function getYearTableFilter(year) {
    const value = Number.parseInt(year, 10);

    if (!Number.isFinite(value) || value <= 0) return null;

    return {
        column: 'YEAR',
        value: String(value)
    };
}

/** Filter spec for a named facet value (genre, director, language, ...). */
export function getFacetTableFilter(column, label) {
    const value = String(label ?? '').trim();

    if (!column || value === '') return null;

    return { column, value };
}

/**
 * Apply a filter spec to the main table: write it into `state.search`,
 * sync the toolbar input (when the column has one), force AND mode so the
 * drill-down is conjunctive with any other active filters, reset to the
 * first page, and reload.
 *
 * @param {{column: string, value: string|number}} spec
 * @returns {boolean} whether a filter was applied
 */
export function applyTableFilter(spec) {
    const column = String(spec?.column ?? '').trim();
    const value = String(spec?.value ?? '').trim();

    if (!column || value === '') return false;

    if (state.debounce) {
        clearTimeout(state.debounce);
        state.debounce = null;
    }

    state.search[column] = value;
    state.page = 1;

    // Drill-down must mean "movies matching this slice"; in OR mode an
    // unrelated filter could keep non-matching rows in the results.
    if (state.searchMode === 'OR') {
        state.searchMode = 'AND';

        const modeButton = document.getElementById('search-mode');

        if (modeButton) {
            modeButton.textContent = 'AND';
            modeButton.classList.remove('or');
        }
    }

    const input = document.querySelector(
        `#search-row input[data-col="${column}"]`
    );

    if (input) input.value = value;

    tableLoader?.();
    return true;
}

/**
 * Make an analytics chart element behave like the Metadata Completeness
 * rows: keyboard-operable, announced as a button, with an explanatory
 * tooltip. The click invokes `onSelect(spec)`.
 *
 * @param {HTMLElement} element
 * @param {{column: string, value: string}|null} spec
 * @param {string} title e.g. "Filter the table to movies from the 2000s"
 * @param {(spec: object) => void} onSelect
 * @param {{keepRole?: boolean}} [options]
 * @returns {boolean} whether the element became interactive
 */
export function makeSliceInteractive(
    element,
    spec,
    title,
    onSelect,
    options = {}
) {
    if (
        !element ||
        !spec ||
        typeof onSelect !== 'function'
    ) {
        return false;
    }

    // stat-card-action reuses the exact affordance of the clickable
    // Metadata Completeness rows; stats-slice-action adds chart-slice
    // specific tweaks.
    element.classList.add('stat-card-action', 'stats-slice-action');

    if (!options.keepRole) {
        element.setAttribute('role', 'button');
    }

    if (!element.hasAttribute('tabindex')) {
        element.tabIndex = 0;
    }

    element.title = title;
    element.dataset.filterColumn = spec.column;
    element.dataset.filterValue = spec.value;

    if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', title);
    }

    element.addEventListener('click', () => onSelect(spec));

    element.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        element.click();
    });

    return true;
}
