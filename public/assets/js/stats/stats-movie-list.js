import { isAbortError } from '../core/request.js';
import { configureExternalLink } from '../utils/url.js';
import { renderStatsPagination } from './stats-pagination.js';

/*
 * Analytics movie-list overlay.
 *
 * Clicking a chart slice, an insight card, a Metadata Completeness field
 * row, or a Library Health / duplicate / better-copy card opens this dialog
 * with the movies behind that number/issue instead of filtering the main
 * table. The list stays deliberately minimal -- title, number, year, rating,
 * and stored size -- and every column header is clickable: the list sorts by
 * No (`NUM`) ascending by default, like the main table. The rating badge is
 * the external link to the movie's page, so there is no separate IMDb
 * column. For chart slices the slice itself remains reachable through the
 * footer's "Filter the table" button, which reuses the normal table-filter
 * code path.
 *
 * The movie jumper (jumpToMovie, owned by stats.js) is injected through
 * setMovieJumper(); this module must never import the entry point (see the
 * module-cycle note in stats.js).
 */

export const MOVIE_LIST_PAGE_SIZE = 25;

/**
 * Order two movie rows by No (`NUM`), numerically so "9" sorts before "10".
 * Rows without a numeric NUM fall back to a string compare, which keeps the
 * ordering deterministic.
 * @param {object} left
 * @param {object} right
 */
export function compareByNum(left, right) {
    const leftNum = Number(left?.NUM);
    const rightNum = Number(right?.NUM);

    if (
        Number.isFinite(leftNum) &&
        Number.isFinite(rightNum) &&
        leftNum !== rightNum
    ) {
        return leftNum - rightNum;
    }

    return String(left?.NUM ?? '').localeCompare(String(right?.NUM ?? ''));
}

/** Columns whose values compare numerically. */
const NUMERIC_SORT_COLUMNS = Object.freeze([
    'NUM',
    'YEAR',
    'RATING',
    'FILESIZE'
]);

function sortableNumber(value) {
    const text = String(value ?? '').trim();

    if (text === '') return null;

    const number = Number(text);

    return Number.isFinite(number) ? number : null;
}

function compareValues(left, right, numeric) {
    if (!numeric) {
        return String(left ?? '')
            .trim()
            .localeCompare(String(right ?? '').trim(), 'en', {
                sensitivity: 'base'
            });
    }

    const leftNumber = sortableNumber(left);
    const rightNumber = sortableNumber(right);

    // Missing values first, like an SQL NULL in an ASC ordering.
    if (leftNumber === null && rightNumber === null) return 0;
    if (leftNumber === null) return -1;
    if (rightNumber === null) return 1;
    if (leftNumber === rightNumber) return 0;

    return leftNumber < rightNumber ? -1 : 1;
}

/**
 * Comparator for an overlay sort spec. The requested column decides the
 * order, No (`NUM`) ascending breaks ties -- the same shape as the backend's
 * `ORDER BY <column> <dir>, NUM ASC`.
 * @param {{column: string, dir: string}} sort
 */
export function compareBySort(sort) {
    const key = String(sort?.column ?? DEFAULT_SORT.column).toUpperCase();
    const numeric = NUMERIC_SORT_COLUMNS.includes(key);
    const factor =
        String(sort?.dir ?? DEFAULT_SORT.dir).toUpperCase() === 'DESC'
            ? -1
            : 1;

    return (left, right) => {
        const primary = compareValues(left?.[key], right?.[key], numeric);

        return primary !== 0 ? primary * factor : compareByNum(left, right);
    };
}

/**
 * Build an overlay source from an unpaginated list request -- the library
 * issue, duplicate, and better-copy endpoints return every row at once.
 * Rows are sorted by the requested column (No ascending by default), then
 * paged client-side with the overlay's page size so every list behaves
 * exactly like the slice lists, where movies.php sorts server-side.
 *
 * @param {(signal: AbortSignal) => Promise<object[]>} fetchRows
 */
export function createListSource(fetchRows) {
    return {
        fetchPage: async (page, signal, sort = DEFAULT_SORT) => {
            const rows = await fetchRows(signal);
            const list = (Array.isArray(rows) ? rows : [])
                .slice()
                .sort(compareBySort(sort));
            const start =
                (Math.max(1, Number(page) || 1) - 1) * MOVIE_LIST_PAGE_SIZE;

            return {
                rows: list.slice(start, start + MOVIE_LIST_PAGE_SIZE),
                total: list.length
            };
        }
    };
}

/*
 * The visible columns and the API column each header sorts by. Rating
 * doubles as the external link, so there is no IMDb column.
 */
const COLUMNS = Object.freeze([
    Object.freeze({ label: 'Title', sort: 'FORMATTEDTITLE' }),
    Object.freeze({ label: 'No', sort: 'NUM' }),
    Object.freeze({ label: 'Year', sort: 'YEAR' }),
    Object.freeze({ label: 'Rating', sort: 'RATING' }),
    Object.freeze({ label: 'Size', sort: 'FILESIZE' })
]);

const DEFAULT_SORT = Object.freeze({ column: 'NUM', dir: 'ASC' });

const SORT_INDICATORS = Object.freeze({
    ascending: '\u25b2',
    descending: '\u25bc',
    none: '\u21c5'
});

const TITLE_ID = 'stats-movie-list-title';

let movieJumper = null;
let elements = null;
let focusReturn = null;
let activeSource = null;
let activeSpec = null;
let activeFilter = null;
let activePage = 1;
let activeEmptyMessage = 'No movies match this selection.';
let activeSort = { ...DEFAULT_SORT };
let inFlight = null;

/**
 * Register the jump-to-movie handler owned by stats.js.
 * @param {(num: string|number) => void} jumper
 */
export function setMovieJumper(jumper) {
    movieJumper = typeof jumper === 'function' ? jumper : null;
}

function createElement(tagName, className = '', text = '') {
    const element = document.createElement(tagName);

    if (className) element.className = className;
    if (text) element.textContent = text;

    return element;
}

function buildOverlay() {
    const overlay = createElement('div', 'stats-modal hidden');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', TITLE_ID);

    const content = createElement(
        'div',
        'stats-modal-content stats-movie-list'
    );

    const header = createElement('div', 'stats-modal-header');
    const heading = createElement('h2', 'stats-movie-list-title');
    heading.id = TITLE_ID;

    const close = createElement('button', 'stats-close', '\u00d7');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close movie list dialog');

    header.append(heading, close);

    const body = createElement('div', 'stats-modal-body');
    const status = createElement('p', 'stats-movie-list-status');
    status.setAttribute('role', 'status');

    const table = createElement('table', 'table stats-movie-table');
    const headRow = createElement('tr');
    const headCells = COLUMNS.map(column => {
        const th = createElement('th');
        th.scope = 'col';

        const button = createElement('button', 'stats-movie-sort');
        button.type = 'button';
        button.dataset.sort = column.sort;

        const label = createElement(
            'span',
            'stats-movie-sort-label',
            column.label
        );
        const indicator = createElement('span', 'stats-movie-sort-indicator');
        indicator.setAttribute('aria-hidden', 'true');

        button.append(label, indicator);
        button.addEventListener('click', () => changeSort(column.sort));
        th.appendChild(button);
        headRow.appendChild(th);

        return th;
    });
    const thead = createElement('thead');
    thead.appendChild(headRow);

    const tbody = createElement('tbody');
    table.append(thead, tbody);
    body.append(status, table);

    const footer = createElement('div', 'stats-movie-list-footer');
    const pager = createElement(
        'div',
        'pagination stats-movie-list-pagination'
    );
    const filterButton = createElement(
        'button',
        'stats-movie-list-filter',
        'Filter the table'
    );
    filterButton.type = 'button';
    footer.append(pager, filterButton);

    content.append(header, body, footer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    close.addEventListener('click', () => closeMovieListOverlay());
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeMovieListOverlay();
    });
    filterButton.addEventListener('click', () => {
        const spec = activeSpec;
        const filter = activeFilter;

        if (!spec || !filter) return;

        closeMovieListOverlay(false);
        filter(spec);
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (overlay.classList.contains('hidden')) return;

        closeMovieListOverlay();
    });

    return {
        overlay,
        heading,
        close,
        status,
        table,
        headCells,
        tbody,
        pager,
        filterButton
    };
}

function ensureOverlay() {
    if (!elements) elements = buildOverlay();

    return elements;
}

/**
 * Clicking a header sorts by that column: the same column flips between
 * ascending and descending, a new column starts ascending (mirrors the main
 * table). The list restarts at page one, since the ordering changed.
 * @param {string} column
 */
function changeSort(column) {
    activeSort = {
        column,
        dir:
            activeSort.column === column && activeSort.dir === 'ASC'
                ? 'DESC'
                : 'ASC'
    };

    syncSortIndicators();
    loadPage(1);
}

/** Reflect the active sort in the headers' aria-sort and indicators. */
function syncSortIndicators() {
    const { headCells } = elements;

    COLUMNS.forEach((column, index) => {
        const th = headCells[index];
        const button = th?.children[0];
        const labelSpan = button?.children[0];
        const indicator = button?.children[1];
        const active = activeSort.column === column.sort;
        const state = active
            ? (activeSort.dir === 'ASC' ? 'ascending' : 'descending')
            : 'none';

        th.setAttribute('aria-sort', state);
        if (indicator) indicator.textContent = SORT_INDICATORS[state];

        if (!button) return;

        button.title = active
            ? `Sorted by ${column.label} ` +
                `${activeSort.dir === 'ASC' ? 'ascending' : 'descending'}` +
                ' \u2014 click to reverse'
            : `Sort by ${column.label} ascending`;
        button.setAttribute(
            'aria-label',
            active
                ? `Sort by ${column.label}, currently ` +
                    `${activeSort.dir === 'ASC' ? 'ascending' : 'descending'}`
                : `Sort by ${column.label}`
        );
        button.setAttribute(
            'aria-pressed',
            String(active)
        );

        if (labelSpan) labelSpan.textContent = column.label;
    });
}

function cancelInFlight() {
    if (inFlight) {
        inFlight.abort();
        inFlight = null;
    }
}

function setStatus(message, { retry = null } = {}) {
    const { status } = elements;

    status.textContent = String(message || '');
    status.hidden = !message;

    if (!retry) return;

    const button = createElement('button', 'stats-movie-list-retry', 'Retry');
    button.type = 'button';
    button.addEventListener('click', retry);

    status.appendChild(button);
}

function valueOrDash(value) {
    const text = String(value ?? '').trim();

    return text === '' || text === '0' ? '\u2013' : text;
}

function ratingTier(rating) {
    if (rating >= 7) return 'rating-good';
    if (rating >= 5) return 'rating-mid';

    return 'rating-bad';
}

function movieTitle(row) {
    const formatted = String(row?.FORMATTEDTITLE ?? '').trim();
    const original = String(row?.ORIGINALTITLE ?? '').trim();

    return formatted || original || `Movie #${String(row?.NUM ?? '')}`;
}

/*
 * The rating badge is the row's external link: clicking it opens the
 * movie's page (IMDb) in a new tab. With no safe URL the badge renders as
 * an inert, aria-disabled anchor -- the same contract as the main table's
 * rating column.
 */
function createRatingCell(row) {
    const cell = createElement('td', 'stats-movie-cell-rating');
    const rating = Number(row?.RATING);

    if (!Number.isFinite(rating) || rating <= 0) {
        cell.textContent = '\u2013';
        return cell;
    }

    const badge = document.createElement('a');
    badge.className = `rating-badge ${ratingTier(rating)}`.trim();
    badge.textContent = String(row.RATING);

    if (configureExternalLink(badge, row?.URL)) {
        badge.title = 'Open the movie page on IMDb';
    } else {
        badge.title = 'Movie page link unavailable';
    }

    cell.appendChild(badge);
    return cell;
}

function createNumberCell(row) {
    const cell = createElement('td', 'stats-movie-cell-num');
    const num = String(row?.NUM ?? '').trim();

    if (num === '' || typeof movieJumper !== 'function') {
        cell.textContent = num || '\u2013';
        return cell;
    }

    const link = createElement('a', 'jump-to-row', num);
    link.href = '#';
    link.dataset.num = num;
    link.addEventListener('click', event => {
        event.preventDefault();
        movieJumper(num);
    });

    cell.appendChild(link);
    return cell;
}

function renderRow(row) {
    const tr = document.createElement('tr');
    tr.className = 'stats-movie-row';
    tr.dataset.num = String(row?.NUM ?? '');

    tr.appendChild(
        createElement('td', 'stats-movie-cell-title', movieTitle(row))
    );
    tr.appendChild(createNumberCell(row));
    tr.appendChild(
        createElement('td', 'stats-movie-cell-year', valueOrDash(row?.YEAR))
    );
    tr.appendChild(createRatingCell(row));
    tr.appendChild(
        createElement('td', 'stats-movie-cell-size', valueOrDash(row?.FILESIZE))
    );

    return tr;
}

function renderPager(total) {
    const { pager } = elements;
    const totalPages = Math.max(
        1,
        Math.ceil(total / MOVIE_LIST_PAGE_SIZE)
    );

    renderStatsPagination(pager, {
        currentPage: activePage,
        totalPages,
        totalItems: total,
        itemLabel: 'movie',
        ariaLabel: 'Movie list pagination',
        onPageChange: page => loadPage(page)
    });
}

function renderPage(result) {
    const rows = Array.isArray(result?.rows) ? result.rows : [];
    const total = Math.max(
        rows.length,
        Number(result?.total) || 0
    );

    elements.tbody.replaceChildren();
    elements.pager.replaceChildren();

    if (rows.length === 0) {
        elements.table.hidden = true;
        setStatus(activeEmptyMessage);
        renderPager(0);
        return;
    }

    elements.table.hidden = false;
    setStatus('');
    rows.forEach(row => elements.tbody.appendChild(renderRow(row)));
    renderPager(total);
}

function loadPage(page) {
    cancelInFlight();

    activePage = Math.max(1, Number(page) || 1);

    const controller = new AbortController();
    inFlight = controller;

    elements.table.hidden = true;
    elements.tbody.replaceChildren();
    elements.pager.replaceChildren();
    setStatus('Loading movies\u2026');

    Promise.resolve()
        .then(() => activeSource.fetchPage(
            activePage,
            controller.signal,
            { ...activeSort }
        ))
        .then(result => {
            if (inFlight !== controller) return;

            renderPage(result);
        })
        .catch(error => {
            if (inFlight !== controller || isAbortError(error)) return;

            setStatus('Unable to load movies.', {
                retry: () => loadPage(activePage)
            });
        })
        .finally(() => {
            if (inFlight === controller) inFlight = null;
        });
}

/**
 * Open the overlay with the movies behind an analytics item.
 *
 * @param {object} options
 * @param {string} options.title Heading, e.g. "Movies certified PG-13".
 * @param {{fetchPage: (page: number, signal: AbortSignal) =>
 *   Promise<{rows: object[], total: number}>}} options.source
 * @param {{column: string, value: string}|null} [options.spec] Slice filter;
 *   with `onFilter` it enables the "Filter the table" footer button.
 * @param {(spec: object) => void} [options.onFilter]
 * @param {string} [options.emptyMessage] Shown when the list has no movies.
 */
export function openMovieListOverlay({
    title = 'Movies',
    source,
    spec = null,
    onFilter = null,
    emptyMessage = 'No movies match this selection.'
} = {}) {
    if (typeof source?.fetchPage !== 'function') return;

    const {
        overlay,
        heading,
        close,
        filterButton
    } = ensureOverlay();

    activeSource = source;
    activeSpec = spec;
    activeFilter = typeof onFilter === 'function' ? onFilter : null;
    activeEmptyMessage = String(emptyMessage || 'No movies match this selection.');
    // Every list opens in the default order: No ascending.
    activeSort = { ...DEFAULT_SORT };

    heading.textContent = String(title || 'Movies');
    filterButton.hidden = !(activeSpec && activeFilter);

    if (overlay.classList.contains('hidden')) {
        focusReturn = document.activeElement ?? null;
    }

    overlay.classList.remove('hidden');
    syncSortIndicators();
    close.focus?.();

    loadPage(1);
}

/**
 * Close the overlay and cancel any in-flight page request.
 * @param {boolean} [restoreFocus]
 */
export function closeMovieListOverlay(restoreFocus = true) {
    if (!elements) return;
    if (elements.overlay.classList.contains('hidden')) return;

    cancelInFlight();
    elements.overlay.classList.add('hidden');

    const target = focusReturn;
    focusReturn = null;

    if (restoreFocus && target?.isConnected) target.focus?.();
}
