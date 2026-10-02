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
}

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.dataset = {};
        this.style = {};
        this.attributes = new Map();
        this.listeners = new Map();
        this.classList = new FakeClassList(this);
        this.textContent = '';
        this.title = '';
        this.tabIndex = null;
        this.hidden = false;
        this.disabled = false;
        this.value = '';
        this.innerHTML = '';
        this.ariaLabel = null;
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
        this.dispatchEvent({ type: 'click', preventDefault() {} });
    }

    focus() {}

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    append(...nodes) {
        this.children.push(...nodes);
    }

    replaceChildren(...nodes) {
        this.children = [...nodes];
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

    querySelector() {
        return null;
    }
}

const registry = new Map();

function register(id, element = new FakeElement()) {
    registry.set(id, element);
    return element;
}

globalThis.document = {
    body: new FakeElement('body'),
    getElementById(id) {
        return registry.get(id) ?? null;
    },
    createElement(tagName) {
        return new FakeElement(tagName);
    },
    querySelector() {
        return null;
    },
    addEventListener() {}
};

globalThis.CSS = { escape: value => String(value) };
globalThis.BASE_URL = '';

const { state } = await import(
    '../../movie-catalog/public/assets/js/core/state.js'
);
const {
    refreshStats,
    setMovieLoader
} = await import(
    '../../movie-catalog/public/assets/js/stats/stats.js'
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

globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify(statsPayload)
});

// Elements refreshStats() touches without null-guards (they always exist
// in the rendered view).
register('health-score-card');
register('duplicate-card');
register('better-copy-card');
register('year-range');

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
register('metadata-completeness-fields');

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

    const loaded = await refreshStats();
    assert.equal(loaded, true, 'refreshStats renders the payload');
});

test('decade rows become clickable and filter YEAR by decade range', () => {
    const row = findSlice(decadeContainer, '2010s');
    assert.ok(row, 'renders the 2010s decade row');
    assert.equal(row.dataset.filterColumn, 'YEAR');
    assert.equal(row.dataset.filterValue, '2010-2019');

    state.search = {};
    row.click();

    assert.equal(state.search.YEAR, '2010-2019');
    assert.equal(state.page, 1);
    assert.equal(loadCount, 1);
});

test('genre rows filter the CATEGORY column', () => {
    const row = findSlice(genreContainer, 'Romance');
    assert.ok(row, 'renders the Romance genre row');

    state.search = {};
    row.click();

    assert.equal(state.search.CATEGORY, 'Romance');
});

test('rating and runtime band rows map to range filters', () => {
    const ratingRow = findSlice(ratingContainer, '7–7.9');
    assert.ok(ratingRow, 'renders the 7–7.9 rating band');

    state.search = {};
    ratingRow.click();
    assert.equal(state.search.RATING, '7-7.9');

    const runtimeRow = findSlice(runtimeContainer, 'Under 90 min');
    assert.ok(runtimeRow, 'renders the Under 90 min runtime band');

    state.search = {};
    runtimeRow.click();
    assert.equal(state.search.LENGTH, '<90');
});

test('director and cast rows filter the filter-only columns', () => {
    const directorRow = findSlice(directorContainer, 'Denis Villeneuve');
    assert.ok(directorRow, 'renders the director row');

    state.search = {};
    directorRow.click();
    assert.equal(state.search.DIRECTOR, 'Denis Villeneuve');

    const castRow = findSlice(castContainer, 'Amy Adams');
    assert.ok(castRow, 'renders the actor row');

    state.search = {};
    castRow.click();
    assert.equal(state.search.ACTORS, 'Amy Adams');
});

test('language, country, certification, resolution, and audio rows map to their columns', () => {
    const cases = [
        [languageContainer, 'English', 'LANGUAGES', 'English'],
        [countryContainer, 'Canada', 'COUNTRY', 'Canada'],
        [certificationContainer, 'PG-13', 'CERTIFICATION', 'PG-13'],
        [resolutionContainer, '1920x1080', 'RESOLUTION', '1920x1080'],
        [audioContainer, 'AAC', 'AUDIOFORMAT', 'AAC']
    ];

    for (const [container, label, column, value] of cases) {
        const row = findSlice(container, label);
        assert.ok(row, `renders the ${label} row`);

        state.search = {};
        row.click();
        assert.equal(state.search[column], value);
    }
});

test('size band rows map to MiB FILESIZE ranges', () => {
    const compactRow = findSlice(storageContainer, 'Under 700 MB');
    assert.ok(compactRow, 'renders the compact size band');

    state.search = {};
    compactRow.click();
    assert.equal(state.search.FILESIZE, '<700');

    const largeRow = findSlice(storageContainer, '6 GB+');

    state.search = {};
    largeRow.click();
    assert.equal(state.search.FILESIZE, '6144+');
});

test('timeline years filter the exact YEAR', () => {
    const timeline = registry.get('release-year-timeline');
    const item = timeline.children.find(
        child => child.title?.includes('Filter the table to movies from 2016')
    );
    assert.ok(item, 'renders the interactive 2016 timeline item');

    state.search = {};
    item.click();
    assert.equal(state.search.YEAR, '2016');
});

test('insight cards become actionable drill-downs', () => {
    assert.ok(
        topDirectorCard.classList.contains('stat-card-action'),
        'top director card is styled actionable'
    );
    assert.equal(topDirectorCard.getAttribute('role'), 'button');

    state.search = {};
    topDirectorCard.click();
    assert.equal(state.search.DIRECTOR, 'Denis Villeneuve');

    state.search = {};
    peakYearCard.click();
    assert.equal(state.search.YEAR, '2016');
});

test('keyboard activation works on chart slices', () => {
    const row = findSlice(decadeContainer, '1940s');
    assert.ok(row, 'renders the 1940s decade row');

    state.search = {};

    row.dispatchEvent({
        type: 'keydown',
        key: 'Enter',
        preventDefault() {}
    });

    assert.equal(state.search.YEAR, '1940-1949');
});

test('slices force AND mode when the table is in OR mode', () => {
    state.search = {};
    state.searchMode = 'OR';

    const row = findSlice(genreContainer, 'Drama');
    row.click();

    assert.equal(state.searchMode, 'AND');
    assert.equal(state.search.CATEGORY, 'Drama');
});
