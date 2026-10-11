import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Integration smoke test for the analytics drill-down: refreshStats()
 * renders the charts against a stats payload, chart slices and insight
 * cards become interactive, and clicking them applies the matching filter
 * to the shared table state via the injected movie loader.
 */

class FakeClassList {
    constructor(element) {
        this.element = element;
        this.classes = new Set();
    }

    add(...names) {
        names.forEach(name => this.classes.add(name));
    }

    remove(...names) {
        names.forEach(name => this.classes.delete(name));
    }

    toggle(name, force) {
        const wanted = force ?? !this.classes.has(name);
        wanted ? this.classes.add(name) : this.classes.delete(name);
        return wanted;
    }

    contains(name) {
        return this.classes.has(name);
    }

    setFrom(value) {
        this.classes = new Set(
            String(value).split(/\s+/).filter(Boolean)
        );
    }

    join() {
        return [...this.classes].join(' ');
    }
}

class FakeElement {
    constructor(tagName = 'div', ownerDocument = null) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.parentNode = null;
        this.children = [];
        this.dataset = {};
        this.style = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.classList = new FakeClassList(this);
        this._textContent = '';
        this.title = '';
        this.tabIndex = null;
        this.hidden = false;
        this.disabled = false;
        this.value = '';
        this.selected = false;
        this.innerHTML = '';
        this.ariaLabel = null;
        this.href = '';
        this.rel = '';
        this.target = '';
        this.type = '';
    }

    get className() {
        return this.classList.join();
    }

    set className(value) {
        this.classList.setFrom(value);
    }

    get textContent() {
        return this._textContent +
            this.children.map(child => child.textContent ?? '').join('');
    }

    set textContent(value) {
        this._textContent = String(value);
        this.children = [];
    }

    get isConnected() {
        let node = this;

        while (node) {
            if (node.tagName === 'BODY') return true;
            node = node.parentNode;
        }

        return false;
    }

    setAttribute(name, value) {
        if (name === 'aria-label') this.ariaLabel = String(value);
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
        if (name === 'aria-label') {
            return this.ariaLabel ?? this.attributes.get(name) ?? null;
        }

        return this.attributes.get(name) ?? null;
    }

    hasAttribute(name) {
        return this.attributes.has(name);
    }

    removeAttribute(name) {
        this.attributes.delete(name);
    }

    addEventListener(type, listener) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(listener);
    }

    dispatchEvent(event) {
        (this.listeners.get(event.type) ?? [])
            .forEach(listener => listener(event));
    }

    click() {
        const event = { type: 'click', target: this, preventDefault() {} };

        this.dispatchEvent(event);
        // Browsers run the onclick property handler alongside listeners;
        // the duplicate card is wired through `onclick`.
        this.onclick?.(event);
    }

    focus() {
        if (this.ownerDocument) this.ownerDocument.activeElement = this;
    }

    remove() {
        if (!this.parentNode) return;

        this.parentNode.children = this.parentNode.children.filter(
            child => child !== this
        );
        this.parentNode = null;
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        nodes.forEach(node => this.appendChild(node));
    }

    replaceChildren(...nodes) {
        this.children.forEach(child => {
            child.parentNode = null;
        });

        this.children = [];
        this.append(...nodes);
    }

    get firstChild() {
        return this.children[0] ?? null;
    }

    set innerHTML(value) {
        this._innerHTML = value;

        if (value === '') this.children = [];
    }

    get innerHTML() {
        return this._innerHTML ?? '';
    }

    closest() {
        return this.parent ?? null;
    }

    querySelector(selector) {
        const idMatch = /^#([\w-]+)$/.exec(String(selector));

        return idMatch ? (registry.get(idMatch[1]) ?? null) : null;
    }

    querySelectorAll() {
        return [];
    }
}

const registry = new Map();

function register(id, element = new FakeElement()) {
    registry.set(id, element);
    return element;
}

const documentListeners = new Map();

globalThis.document = {
    body: new FakeElement('body'),
    activeElement: null,
    getElementById(id) {
        return registry.get(id) ?? null;
    },
    createElement(tagName) {
        return new FakeElement(tagName, globalThis.document);
    },
    querySelector() {
        return null;
    },
    querySelectorAll() {
        return [];
    },
    addEventListener(type, listener) {
        if (!documentListeners.has(type)) {
            documentListeners.set(type, []);
        }

        documentListeners.get(type).push(listener);
    },
    dispatch(type, event) {
        (documentListeners.get(type) ?? [])
            .forEach(listener => listener(event));
    }
};

globalThis.CSS = { escape: value => String(value) };
globalThis.BASE_URL = '';

const { state } = await import(
    '../../public/assets/js/core/state.js'
);
const {
    initStats,
    refreshStats,
    setMovieLoader
} = await import(
    '../../public/assets/js/stats/stats.js'
);
const { MOVIE_LIST_PAGE_SIZE } = await import(
    '../../public/assets/js/stats/stats-movie-list.js'
);

// Stats payload mirroring the mock server (complete per the API
// validators), reduced to the sections exercised here.
const statsPayload = {
    total_movies: 55,
    years: 45,
    genres: 4,
    languages: 2,
    countries: 2,
    total_size: 94_000_000_000,
    average_rating: 7.4,
    average_runtime: 112,
    oldest_year: 1942,
    newest_year: 2024,
    health_score: 91,
    missing_files: 1,
    missing_posters: 2,
    incomplete_metadata: 8,
    needs_better_copy_count: 1,
    duplicate_count: 2,
    release_year_analytics: {
        dated_movies: 54,
        undated_movies: 1,
        peak_year: { year: 2016, count: 3 },
        busiest_decade: {
            start_year: 2010,
            label: '2010s',
            count: 18
        },
        years: [
            { year: 1942, count: 1 },
            { year: 2016, count: 3 }
        ],
        decades: [
            { start_year: 1940, label: '1940s', count: 1 },
            { start_year: 2010, label: '2010s', count: 18 }
        ]
    },
    genre_analytics: {
        tagged_movies: 53,
        untagged_movies: 2,
        genre_assignments: 76,
        top_genre: { label: 'Drama', count: 31 },
        genres: [
            { label: 'Drama', count: 31 },
            { label: 'Romance', count: 9 }
        ]
    },
    rating_runtime_analytics: {
        rated_movies: 54,
        unrated_movies: 1,
        runtime_known_movies: 54,
        runtime_missing_movies: 1,
        top_rating_band: {
            key: '7-range',
            label: '7–7.9',
            count: 24
        },
        common_runtime_band: {
            key: 'standard',
            label: '90–119 min',
            count: 29
        },
        rating_bands: [
            { key: '7-range', label: '7–7.9', count: 24 },
            { key: '8-plus', label: '8+', count: 18 }
        ],
        runtime_bands: [
            { key: 'short', label: 'Under 90 min', count: 8 },
            { key: 'standard', label: '90–119 min', count: 29 }
        ]
    },
    certification_analytics: {
        tagged_movies: 52,
        untagged_movies: 3,
        assignments: 52,
        top_item: { label: 'PG-13', count: 28 },
        items: [{ label: 'PG-13', count: 28 }]
    },
    director_analytics: {
        tagged_movies: 53,
        untagged_movies: 2,
        assignments: 55,
        top_item: { label: 'Denis Villeneuve', count: 4 },
        items: [{ label: 'Denis Villeneuve', count: 4 }]
    },
    cast_analytics: {
        tagged_movies: 53,
        untagged_movies: 2,
        cast_assignments: 159,
        unique_actors: 112,
        average_cast_size: 3,
        top_actor: { label: 'Amy Adams', count: 4 },
        top_actors: [{ label: 'Amy Adams', count: 4 }]
    },
    language_country_analytics: {
        languages: {
            tagged_movies: 54,
            untagged_movies: 1,
            assignments: 72,
            top_item: { label: 'English', count: 54 },
            items: [{ label: 'English', count: 54 }]
        },
        countries: {
            tagged_movies: 54,
            untagged_movies: 1,
            assignments: 63,
            top_item: { label: 'United States', count: 45 },
            items: [{ label: 'Canada', count: 18 }]
        }
    },
    technical_format_analytics: {
        resolutions: {
            tagged_movies: 54,
            untagged_movies: 1,
            assignments: 54,
            top_item: { label: '1920x1080', count: 42 },
            items: [{ label: '1920x1080', count: 42 }]
        },
        audio_formats: {
            tagged_movies: 54,
            untagged_movies: 1,
            assignments: 54,
            top_item: { label: 'AAC', count: 28 },
            items: [{ label: 'AAC', count: 28 }]
        }
    },
    storage_analytics: {
        sized_movies: 54,
        unsized_movies: 1,
        total_size: 94_000_000_000,
        average_size: 1_740_740_741,
        median_size: 1_650_000_000,
        largest_movie: {
            num: '55',
            title: 'Movie 055',
            size: 2_375_000_000
        },
        size_bands: [
            {
                key: 'compact',
                label: 'Under 700 MB',
                count: 8,
                total_size: 6_000_000_000
            },
            {
                key: 'very-large',
                label: '6 GB+',
                count: 10,
                total_size: 32_000_000_000
            }
        ]
    },
    metadata_completeness: {
        total_movies: 55,
        complete_movies: 47,
        incomplete_movies: 8,
        fields: [
            {
                key: 'file-size',
                label: 'File Size',
                missing_count: 1,
                complete_count: 54
            }
        ]
    }
};


// Fixture rows returned for movie-list overlay requests: the overlay asks
// /api/movies.php with the clicked slice as an ordinary column filter.
const sliceRows = [
    {
        NUM: '1',
        FORMATTEDTITLE: 'Arrival',
        ORIGINALTITLE: 'Arrival',
        YEAR: '2016',
        RATING: '7.9',
        FILESIZE: '1200',
        URL: 'https://www.imdb.com/title/tt2543164/'
    },
    {
        NUM: '4',
        FORMATTEDTITLE: 'Arrival: Directors Cut',
        ORIGINALTITLE: 'Arrival: Directors Cut',
        YEAR: '2017',
        RATING: '6.5',
        FILESIZE: '1400',
        URL: 'https://www.imdb.com/title/tt2543165/'
    }
];

// Fixture rows for Metadata Completeness field clicks
// (/api/library-issues.php?type=metadata-field&field=...). Only the first
// page is used; the overlay pages them client-side.
const metadataRows = Array.from({ length: 30 }, (_, index) => ({
    NUM: String(100 + index),
    FORMATTEDTITLE: `Metadata Movie ${index}`,
    ORIGINALTITLE: `Metadata Movie ${index}`,
    YEAR: '1999',
    RATING: '6.4',
    FILESIZE: '900',
    URL: 'https://www.imdb.com/title/tt0100001/'
}));

// Fixture rows for the other movie-table entry points (duplicates /
// better copy), which share the overlay through createListSource.
const duplicateRows = [
    {
        NUM: '14',
        FORMATTEDTITLE: 'Blade Runner 2049',
        ORIGINALTITLE: 'Blade Runner 2049',
        YEAR: '2017',
        RATING: '8.0',
        FILESIZE: '2100',
        URL: 'https://www.imdb.com/title/tt1856101/'
    },
    {
        NUM: '15',
        FORMATTEDTITLE: 'Blade Runner 2049',
        ORIGINALTITLE: 'Blade Runner 2049',
        YEAR: '2017',
        RATING: '8.0',
        FILESIZE: '2600',
        URL: 'https://www.imdb.com/title/tt1856101/'
    }
];

const betterCopyRows = [
    {
        NUM: '51',
        FORMATTEDTITLE: 'Movie 051',
        ORIGINALTITLE: 'Movie 051',
        YEAR: '2001',
        RATING: '5.5',
        FILESIZE: '700',
        URL: 'https://www.imdb.com/title/tt0000051/'
    }
];

const requestedUrls = [];

globalThis.fetch = async url => {
    const text = String(url);

    requestedUrls.push(text);

    let payload;

    if (text.includes('stats.php')) {
        payload = statsPayload;
    } else if (text.includes('library-issues.php')) {
        payload = metadataRows;
    } else if (text.includes('duplicates.php')) {
        payload = duplicateRows;
    } else if (text.includes('better-copy.php')) {
        payload = betterCopyRows;
    } else if (text.includes('movies.php')) {
        const params = new URL(text, 'http://localhost').searchParams;

        payload = {
            data: sliceRows,
            page: Number(params.get('page') || 1),
            limit: Number(params.get('limit') || 25),
            pages: 1,
            total: sliceRows.length
        };
    } else {
        payload = { error: true, message: `Unexpected request: ${text}` };
    }

    return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        text: async () => JSON.stringify(payload)
    };
};

const flush = () => new Promise(resolve => setImmediate(resolve));

function lastRequestMatching(fragment) {
    const matches = requestedUrls.filter(url => url.includes(fragment));

    return new URL(matches[matches.length - 1], 'http://localhost');
}

function findAll(root, predicate, results = []) {
    root.children.forEach(child => {
        if (predicate(child)) results.push(child);
        findAll(child, predicate, results);
    });

    return results;
}

function findOverlay() {
    return document.body.children.find(
        child => child.classList.contains('stats-modal')
    ) ?? null;
}

function overlayIsOpen() {
    const overlay = findOverlay();

    return Boolean(overlay) && !overlay.classList.contains('hidden');
}

function overlayTitle() {
    const heading = findAll(
        document.body,
        element => element.classList.contains('stats-movie-list-title')
    )[0];

    return heading?.textContent ?? null;
}

function overlayRows() {
    const tbody = findAll(
        document.body,
        element => element.tagName === 'TBODY'
    )[0];

    return tbody ? tbody.children : [];
}

function overlayFilterButton() {
    return findAll(
        document.body,
        element => element.classList.contains('stats-movie-list-filter')
    )[0] ?? null;
}

// Elements refreshStats() touches without null-guards (they always exist
// in the rendered view).
register('health-score-card');
register('duplicate-card');
register('better-copy-card');
register('year-range');
register('missing-files-card');
register('missing-posters-card');
register('incomplete-metadata-card');

// Chart containers.
const decadeContainer = register('decade-distribution');
register('release-year-timeline');
const genreContainer = register('genre-distribution');
const ratingContainer = register('rating-band-distribution');
const runtimeContainer = register('runtime-band-distribution');
const certificationContainer = register('certification-distribution');
const directorContainer = register('director-distribution');
const castContainer = register('cast-distribution');
const languageContainer = register('language-distribution');
const countryContainer = register('country-distribution');
const resolutionContainer = register('resolution-distribution');
const audioContainer = register('audio-format-distribution');
const storageContainer = register('storage-size-distribution');
const metadataContainer = register('metadata-completeness-fields');

// Insight cards: value span inside an article.
function registerInsightCard(valueId) {
    const article = new FakeElement('article');
    const span = new FakeElement('span');
    span.parent = article;
    article.children.push(span);
    registry.set(valueId, span);
    return article;
}

const peakYearCard = registerInsightCard('peak-release-year');
registerInsightCard('busiest-release-decade');
registerInsightCard('top-genre');
registerInsightCard('top-rating-band');
registerInsightCard('common-runtime-band');
registerInsightCard('top-certification');
const topDirectorCard = registerInsightCard('top-director');
registerInsightCard('top-actor');
registerInsightCard('top-language');
registerInsightCard('top-country');
registerInsightCard('top-resolution');
registerInsightCard('top-audio-format');
registerInsightCard('largest-storage-movie');

let loadCount = 0;
setMovieLoader(async () => {
    loadCount += 1;
    return true;
});

function findSlice(container, label) {
    return container.children.find(
        child =>
            child.attributes?.get('aria-label')?.includes(label) ||
            child.title?.includes(label)
    );
}

test.before(async () => {
    state.search = {};
    state.page = 1;
    state.searchMode = 'AND';

    // initStats() binds the panel's card entry points (library health,
    // duplicates, better copy) to the shared overlay.
    const statsPanel = register('stats-panel');
    const ribbon = new FakeElement('button');
    initStats(ribbon, statsPanel);

    const loaded = await refreshStats();
    assert.equal(loaded, true, 'refreshStats renders the payload');
});

test('decade rows open the movie-list overlay with the slice movies', async () => {
    const row = findSlice(decadeContainer, '2010s');
    assert.ok(row, 'renders the 2010s decade row');
    assert.equal(row.dataset.filterColumn, 'YEAR');
    assert.equal(row.dataset.filterValue, '2010-2019');

    state.search = {};
    state.page = 3;
    row.click();

    assert.equal(overlayIsOpen(), true, 'the overlay opens');
    assert.equal(overlayTitle(), 'Movies from the 2010s');

    await flush();

    const request = lastRequestMatching('movies.php');
    assert.equal(request.searchParams.get('YEAR'), '2010-2019');
    assert.equal(request.searchParams.get('page'), '1');
    assert.equal(request.searchParams.get('limit'), '25');

    // The overlay never touches the table state.
    assert.deepEqual(state.search, {});
    assert.equal(state.page, 3);

    const rows = overlayRows();
    assert.equal(rows.length, sliceRows.length);
    assert.equal(rows[0].children[0].textContent, 'Arrival');
    assert.equal(rows[0].children[1].textContent, '1');
    assert.equal(rows[0].children[2].textContent, '2016');
    assert.equal(rows[0].children[3].textContent, '7.9');
    assert.equal(rows[0].children[4].textContent, '1200');
    assert.equal(rows[0].children[5].textContent, 'IMDB');
});

test('genre rows request the CATEGORY column', async () => {
    const row = findSlice(genreContainer, 'Romance');
    assert.ok(row, 'renders the Romance genre row');

    row.click();
    await flush();

    assert.equal(
        lastRequestMatching('movies.php').searchParams.get('CATEGORY'),
        'Romance'
    );
    assert.equal(overlayTitle(), 'Romance movies');
    assert.deepEqual(state.search, {});
});

test('rating, runtime, and size bands request range values', async () => {
    const cases = [
        [ratingContainer, '7–7.9', 'RATING', '7-7.9'],
        [runtimeContainer, 'Under 90 min', 'LENGTH', '<90'],
        [storageContainer, 'Under 700 MB', 'FILESIZE', '<700']
    ];

    for (const [container, label, column, value] of cases) {
        const row = findSlice(container, label);
        assert.ok(row, `renders the ${label} band`);

        row.click();
        await flush();

        assert.equal(
            lastRequestMatching('movies.php').searchParams.get(column),
            value
        );
    }
});

test('facet rows request their columns', async () => {
    const cases = [
        [directorContainer, 'Denis Villeneuve', 'DIRECTOR', 'Denis Villeneuve'],
        [castContainer, 'Amy Adams', 'ACTORS', 'Amy Adams'],
        [languageContainer, 'English', 'LANGUAGES', 'English'],
        [countryContainer, 'Canada', 'COUNTRY', 'Canada'],
        [certificationContainer, 'PG-13', 'CERTIFICATION', 'PG-13'],
        [resolutionContainer, '1920x1080', 'RESOLUTION', '1920x1080'],
        [audioContainer, 'AAC', 'AUDIOFORMAT', 'AAC']
    ];

    for (const [container, label, column, value] of cases) {
        const row = findSlice(container, label);
        assert.ok(row, `renders the ${label} row`);

        row.click();
        await flush();

        assert.equal(
            lastRequestMatching('movies.php').searchParams.get(column),
            value
        );
    }
});

test('timeline years open the overlay for the exact YEAR', async () => {
    const timeline = registry.get('release-year-timeline');
    const item = timeline.children.find(
        child => child.title?.includes('Movies from 2016')
    );
    assert.ok(item, 'renders the interactive 2016 timeline item');

    item.click();
    await flush();

    assert.equal(
        lastRequestMatching('movies.php').searchParams.get('YEAR'),
        '2016'
    );
    assert.equal(overlayTitle(), 'Movies from 2016');
});

test('insight cards open the overlay with the same slice', async () => {
    assert.ok(
        topDirectorCard.classList.contains('stat-card-action'),
        'top director card is styled actionable'
    );
    assert.equal(topDirectorCard.getAttribute('role'), 'button');

    topDirectorCard.click();
    await flush();

    assert.equal(
        lastRequestMatching('movies.php').searchParams.get('DIRECTOR'),
        'Denis Villeneuve'
    );
    assert.equal(
        overlayTitle(),
        'Movies directed by Denis Villeneuve'
    );

    peakYearCard.click();
    await flush();

    assert.equal(
        lastRequestMatching('movies.php').searchParams.get('YEAR'),
        '2016'
    );
    assert.equal(overlayTitle(), 'Movies from 2016');
});

test('keyboard activation works on chart slices', async () => {
    const row = findSlice(decadeContainer, '1940s');
    assert.ok(row, 'renders the 1940s decade row');

    row.dispatchEvent({
        type: 'keydown',
        key: 'Enter',
        preventDefault() {}
    });

    await flush();

    assert.equal(
        lastRequestMatching('movies.php').searchParams.get('YEAR'),
        '1940-1949'
    );
    assert.equal(overlayIsOpen(), true);
});

test('metadata completeness fields open the missing-movies overlay', async () => {
    const row = findSlice(metadataContainer, 'File Size');
    assert.ok(row, 'renders the File Size field row');

    row.click();

    assert.equal(overlayTitle(), 'Missing File Size');

    await flush();

    const request = lastRequestMatching('library-issues.php');
    assert.equal(request.searchParams.get('type'), 'metadata-field');
    assert.equal(request.searchParams.get('field'), 'file-size');

    // 25 rows per page, the fixture holds 30.
    assert.equal(overlayRows().length, 25);
});

test('the overlay keeps the old drill-down as a filter action', async () => {
    const row = findSlice(genreContainer, 'Drama');
    assert.ok(row, 'renders the Drama genre row');

    state.search = {};
    state.page = 3;
    loadCount = 0;

    row.click();
    await flush();

    const filterButton = overlayFilterButton();
    assert.ok(filterButton, 'the filter action is rendered');
    assert.equal(filterButton.hidden, false);

    filterButton.click();

    assert.equal(state.search.CATEGORY, 'Drama');
    assert.equal(state.page, 1);
    assert.equal(loadCount, 1);
    assert.equal(overlayIsOpen(), false, 'the overlay closes');
});

test('opening the overlay leaves the active filters and OR mode alone', async () => {
    state.search = { FORMATTEDTITLE: 'Arrival' };
    state.searchMode = 'OR';

    const row = findSlice(genreContainer, 'Drama');
    row.click();
    await flush();

    assert.deepEqual(state.search, { FORMATTEDTITLE: 'Arrival' });
    assert.equal(state.searchMode, 'OR');
    assert.equal(overlayFilterButton().hidden, false);

    state.search = {};
    state.searchMode = 'AND';
});

test('Escape closes the overlay', async () => {
    const row = findSlice(genreContainer, 'Drama');
    row.click();
    await flush();

    assert.equal(overlayIsOpen(), true);

    document.dispatch('keydown', { key: 'Escape' });

    assert.equal(overlayIsOpen(), false);
});

test('library health cards open the shared movie-list overlay', async () => {
    const card = registry.get('missing-files-card');

    assert.ok(card, 'the card is part of the rendered view');

    card.click();

    assert.equal(overlayIsOpen(), true, 'the overlay opens');
    assert.equal(overlayTitle(), 'Missing Files');

    await flush();

    const request = lastRequestMatching('library-issues.php');
    assert.equal(request.searchParams.get('type'), 'missing-files');
    assert.equal(
        overlayRows().length,
        Math.min(metadataRows.length, MOVIE_LIST_PAGE_SIZE)
    );

    // A library issue has no table filter, so no footer action.
    assert.equal(overlayFilterButton().hidden, true);
});

test('the duplicate card opens the overlay with every duplicate row', async () => {
    registry.get('duplicate-card').click();

    assert.equal(overlayIsOpen(), true);
    assert.equal(overlayTitle(), 'Duplicate Movies');

    await flush();

    assert.ok(lastRequestMatching('duplicates.php'));
    assert.equal(overlayRows().length, duplicateRows.length);
    assert.equal(overlayRows()[0].dataset.num, '14');
    assert.equal(overlayRows()[1].dataset.num, '15');
});

test('the better-copy card opens the overlay with the replacement movies', async () => {
    registry.get('better-copy-card').click();

    assert.equal(overlayIsOpen(), true);
    assert.equal(overlayTitle(), 'Get Better Copy Movies');

    await flush();

    assert.ok(lastRequestMatching('better-copy.php'));
    assert.equal(overlayRows().length, betterCopyRows.length);
    assert.equal(overlayRows()[0].dataset.num, '51');
});
