import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Unit tests for the movie-list overlay: minimal movie rows (title, number,
 * year, rating, stored size) where the rating badge is the IMDb link,
 * sortable headers, paging, empty/error states, the jump-to-movie link, the
 * optional "Filter the table" action, the shared source for unpaginated
 * list endpoints (sorted by No), and the ways it closes.
 */

class FakeClassList {
    constructor() {
        this.classes = new Set();
    }

    add(...names) {
        names.forEach(name => this.classes.add(name));
    }

    remove(...names) {
        names.forEach(name => this.classes.delete(name));
    }

    contains(name) {
        return this.classes.has(name);
    }

    setFrom(value) {
        this.classes = new Set(String(value).split(/\s+/).filter(Boolean));
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
        this.attributes = new Map();
        this.listeners = new Map();
        this.classList = new FakeClassList();
        this._textContent = '';
        this.hidden = false;
        this.disabled = false;
        this.value = '';
        this.selected = false;
        this.title = '';
        this.id = '';
        this.type = '';
        this.href = '';
        this.rel = '';
        this.target = '';
        this.tabIndex = null;
    }

    get className() {
        return this.classList.join();
    }

    set className(value) {
        this.classList.setFrom(value);
    }

    get textContent() {
        return this._textContent +
            this.children.map(child => child.textContent).join('');
    }

    set textContent(value) {
        this._textContent = String(value);
        this.children = [];
    }

    set innerHTML(value) {
        if (value === '') {
            this.children.forEach(child => {
                child.parentNode = null;
            });
            this.children = [];
        }
    }

    get innerHTML() {
        return '';
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
        this.attributes.set(name, String(value));
    }

    getAttribute(name) {
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
        this.dispatchEvent({
            type: 'click',
            target: this,
            preventDefault() {}
        });
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

    closest() {
        return this.parentNode;
    }

    querySelector() {
        return null;
    }
}

const documentListeners = new Map();

globalThis.document = {
    body: new FakeElement('body'),
    activeElement: null,
    createElement(tagName) {
        return new FakeElement(tagName, globalThis.document);
    },
    getElementById() {
        return null;
    },
    querySelector() {
        return null;
    },
    querySelectorAll() {
        return [];
    },
    addEventListener(type, listener) {
        if (!documentListeners.has(type)) documentListeners.set(type, []);
        documentListeners.get(type).push(listener);
    },
    dispatch(type, event) {
        (documentListeners.get(type) ?? []).forEach(listener => {
            listener(event);
        });
    }
};

globalThis.fetch = async () => {
    throw new Error('Unexpected network access in the overlay unit test');
};

const {
    MOVIE_LIST_PAGE_SIZE,
    closeMovieListOverlay,
    compareByNum,
    compareBySort,
    createListSource,
    openMovieListOverlay,
    setMovieJumper
} = await import('../../public/assets/js/stats/stats-movie-list.js');

const flush = () => new Promise(resolve => setImmediate(resolve));

function findAll(root, predicate, results = []) {
    root.children.forEach(child => {
        if (predicate(child)) results.push(child);
        findAll(child, predicate, results);
    });

    return results;
}

function byClass(name) {
    return findAll(
        document.body,
        element => element.classList.contains(name)
    );
}

function overlay() {
    return document.body.children.find(
        element => element.classList.contains('stats-modal')
    ) ?? null;
}

function isOpen() {
    return Boolean(overlay()) && !overlay().classList.contains('hidden');
}

function rows() {
    const tbody = findAll(
        document.body,
        element => element.tagName === 'TBODY'
    )[0];

    return tbody ? tbody.children : [];
}

function status() {
    return byClass('stats-movie-list-status')[0] ?? null;
}

function filterButton() {
    return byClass('stats-movie-list-filter')[0] ?? null;
}

function closeButton() {
    return byClass('stats-close')[0] ?? null;
}

function pagerButton(label) {
    return byClass('stats-pagination-controls')[0]?.children.find(
        button => button.textContent === label
    ) ?? null;
}

function headerButtons() {
    return byClass('stats-movie-sort');
}

function headerButton(column) {
    return headerButtons().find(
        button => button.dataset.sort === column
    ) ?? null;
}

function headerLabel(index) {
    return headerButton(
        ['FORMATTEDTITLE', 'NUM', 'YEAR', 'RATING', 'FILESIZE'][index]
    ).children[0];
}

function sourceFrom(pages) {
    const calls = [];

    return {
        calls,
        source: {
            fetchPage: async (page, signal, sort) => {
                calls.push({ page, signal, sort });

                const result = pages[page - 1];
                if (result instanceof Error) throw result;

                return result;
            }
        }
    };
}

function makeRow(overrides = {}) {
    return {
        NUM: '1',
        FORMATTEDTITLE: 'Arrival',
        ORIGINALTITLE: 'Arrival',
        YEAR: '2016',
        RATING: '7.9',
        FILESIZE: '1200',
        URL: 'https://www.imdb.com/title/tt2543164/',
        ...overrides
    };
}

test.beforeEach(() => {
    closeMovieListOverlay(false);
    setMovieJumper(null);
});

test('renders the minimal movie rows', async () => {
    const { source } = sourceFrom([
        { rows: [makeRow()], total: 1 }
    ]);

    openMovieListOverlay({
        title: 'Movies certified PG-13',
        source
    });

    assert.equal(isOpen(), true);
    assert.equal(byClass('stats-movie-list-title')[0].textContent, 'Movies certified PG-13');

    await flush();

    const cells = rows()[0].children;

    // Five columns: the IMDb column is gone, because the rating badge is
    // the external link.
    assert.equal(cells.length, 5);
    assert.equal(cells[0].textContent, 'Arrival');
    assert.equal(cells[1].textContent, '1');
    assert.equal(cells[2].textContent, '2016');
    assert.equal(cells[3].textContent, '7.9');
    assert.equal(cells[4].textContent, '1200');

    const rating = cells[3].children[0];
    assert.equal(rating.className, 'rating-badge rating-good');
    assert.equal(rating.textContent, '7.9');
    assert.equal(rating.href, 'https://www.imdb.com/title/tt2543164/');
    assert.equal(rating.target, '_blank');
    assert.equal(rating.rel, 'noopener noreferrer');

    // No slice spec, so the filter action stays hidden.
    assert.equal(filterButton().hidden, true);
});

test('falls back to the original title, then the movie number', async () => {
    const { source } = sourceFrom([
        {
            rows: [
                makeRow({ FORMATTEDTITLE: '', NUM: '2' }),
                makeRow({ FORMATTEDTITLE: '', ORIGINALTITLE: '', NUM: '3' })
            ],
            total: 2
        }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const [first, second] = rows();

    assert.equal(first.children[0].textContent, 'Arrival');
    assert.equal(second.children[0].textContent, 'Movie #3');
});

test('unknown ratings and sizes render as dashes', async () => {
    const { source } = sourceFrom([
        {
            rows: [makeRow({ RATING: '0', FILESIZE: '', YEAR: '' })],
            total: 1
        }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const cells = rows()[0].children;

    assert.equal(cells[2].textContent, '\u2013');
    assert.equal(cells[3].textContent, '\u2013');
    assert.equal(cells[4].textContent, '\u2013');
});

test('rating badges follow the table tier colors', async () => {
    const { source } = sourceFrom([
        {
            rows: [
                makeRow({ NUM: '1', RATING: '8.2' }),
                makeRow({ NUM: '2', RATING: '5.5' }),
                makeRow({ NUM: '3', RATING: '4.1' })
            ],
            total: 3
        }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const tiers = rows().map(
        row => row.children[3].children[0].className
    );

    assert.deepEqual(tiers, [
        'rating-badge rating-good',
        'rating-badge rating-mid',
        'rating-badge rating-bad'
    ]);
});

test('unsafe external links are disabled', async () => {
    const { source } = sourceFrom([
        { rows: [makeRow({ URL: 'javascript:alert(1)' })], total: 1 }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const rating = rows()[0].children[3].children[0];

    assert.equal(rating.hasAttribute('href'), false);
    assert.equal(rating.getAttribute('aria-disabled'), 'true');

    // The badge still shows the rating, it just cannot be followed.
    assert.equal(rating.textContent, '7.9');
});

test('an unknown rating renders as a dash, not a link', async () => {
    const { source } = sourceFrom([
        { rows: [makeRow({ RATING: '0' })], total: 1 }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const ratingCell = rows()[0].children[3];

    assert.equal(ratingCell.textContent, '\u2013');
    assert.equal(ratingCell.children.length, 0);
});

test('the No link jumps to the movie through the injected handler', async () => {
    const jumped = [];

    setMovieJumper(num => jumped.push(num));

    const { source } = sourceFrom([
        { rows: [makeRow({ NUM: '17' })], total: 1 }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    rows()[0].children[1].children[0].click();

    assert.deepEqual(jumped, ['17']);
});

test('pages through the source with the shared pager', async () => {
    const page = rows => ({ rows, total: MOVIE_LIST_PAGE_SIZE * 3 });
    const { calls, source } = sourceFrom([
        page([makeRow({ NUM: '1' })]),
        page([makeRow({ NUM: '26' })]),
        page([makeRow({ NUM: '51' })])
    ]);

    openMovieListOverlay({ title: 'Movies from the 2010s', source });
    await flush();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].page, 1);
    assert.match(
        findAll(document.body, el => el.classList.contains('stats-pagination-info'))[0].textContent,
        /Page 1 of 3/
    );

    pagerButton('Next').click();
    await flush();

    assert.equal(calls.length, 2);
    assert.equal(calls[1].page, 2);
    assert.equal(rows()[0].children[1].textContent, '26');
});

test('an empty result renders the empty status', async () => {
    const { source } = sourceFrom([{ rows: [], total: 0 }]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    assert.equal(status().textContent, 'No movies match this selection.');
    assert.equal(rows().length, 0);
});

test('a custom empty message replaces the default status', async () => {
    const { source } = sourceFrom([{ rows: [], total: 0 }]);

    openMovieListOverlay({
        title: 'Missing Files',
        emptyMessage: 'No movies with missing files were found.',
        source
    });
    await flush();

    assert.equal(
        status().textContent,
        'No movies with missing files were found.'
    );
});

test('createListSource pages unpaginated rows client-side', async () => {
    const all = Array.from(
        { length: MOVIE_LIST_PAGE_SIZE + 5 },
        (_, index) => makeRow({ NUM: String(index + 1) })
    );
    const requests = [];
    const source = createListSource(async signal => {
        requests.push(signal);
        return all;
    });

    openMovieListOverlay({ title: 'Duplicate Movies', source });
    await flush();

    assert.equal(requests.length, 1);
    assert.equal(rows().length, MOVIE_LIST_PAGE_SIZE);

    const totalText = byClass('stats-pagination-info')[0].textContent;
    assert.match(totalText, new RegExp(`Page 1 of 2 . ${all.length} movies`));

    pagerButton('Next').click();
    await flush();

    assert.equal(requests.length, 2);
    assert.equal(rows().length, 5);
    assert.equal(rows()[0].children[1].textContent, String(MOVIE_LIST_PAGE_SIZE + 1));
});

test('createListSource sorts the list by No, numerically', async () => {
    const shuffled = [
        makeRow({ NUM: '10' }),
        makeRow({ NUM: '2' }),
        makeRow({ NUM: '30' }),
        makeRow({ NUM: '9' }),
        makeRow({ NUM: '101' })
    ];
    const source = createListSource(async () => shuffled);

    openMovieListOverlay({ title: 'Duplicate Movies', source });
    await flush();

    assert.deepEqual(
        rows().map(row => row.dataset.num),
        ['2', '9', '10', '30', '101']
    );
    // The caller's array is left untouched.
    assert.equal(shuffled[0].NUM, '10');
});

test('sorting applies before paging, so pages stay ordered', async () => {
    const all = Array.from(
        { length: MOVIE_LIST_PAGE_SIZE + 3 },
        (_, index) => makeRow({
            NUM: String((MOVIE_LIST_PAGE_SIZE + 3) - index)
        })
    );
    const source = createListSource(async () => all);

    openMovieListOverlay({ title: 'Missing Files', source });
    await flush();

    const firstPage = rows().map(row => Number(row.dataset.num));
    assert.deepEqual(
        firstPage,
        Array.from({ length: MOVIE_LIST_PAGE_SIZE }, (_, index) => index + 1)
    );

    pagerButton('Next').click();
    await flush();

    assert.deepEqual(
        rows().map(row => Number(row.dataset.num)),
        [MOVIE_LIST_PAGE_SIZE + 1, MOVIE_LIST_PAGE_SIZE + 2, MOVIE_LIST_PAGE_SIZE + 3]
    );
});

test('compareByNum falls back to a string compare for odd values', () => {
    assert.equal(compareByNum({ NUM: '9' }, { NUM: '10' }) < 0, true);
    assert.equal(compareByNum({ NUM: '10' }, { NUM: '9' }) > 0, true);
    assert.equal(compareByNum({ NUM: '7' }, { NUM: '7' }), 0);
    assert.equal(compareByNum({}, {}) <= 0, true);

    // A missing NUM sorts first (empty string), then digits, then words.
    const mixed = [{ NUM: 'beta' }, { NUM: '12' }, { NUM: 'alpha' }, {}]
        .sort(compareByNum)
        .map(row => String(row.NUM ?? ''));

    assert.deepEqual(mixed, ['', '12', 'alpha', 'beta']);
});

test('headers are sortable: No ascending by default, click toggles', async () => {
    const calls = [];
    const source = {
        fetchPage: async (page, signal, sort) => {
            calls.push({ page, sort });

            return { rows: [makeRow()], total: 1 };
        }
    };

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    // The overlay opens sorted by No ascending.
    assert.deepEqual(calls[0].sort, { column: 'NUM', dir: 'ASC' });
    assert.equal(headerLabel(0).textContent, 'Title');
    assert.equal(headerLabel(4).textContent, 'Size');
    assert.equal(rows()[0].children.length, 5, 'no IMDb column');

    // Sorting by Title starts ascending, from page 1.
    headerButton('FORMATTEDTITLE').click();
    await flush();

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].sort, { column: 'FORMATTEDTITLE', dir: 'ASC' });
    assert.equal(calls[1].page, 1);

    // The same header flips to descending.
    headerButton('FORMATTEDTITLE').click();
    await flush();

    assert.deepEqual(calls[2].sort, { column: 'FORMATTEDTITLE', dir: 'DESC' });

    // A different header starts ascending again.
    headerButton('FILESIZE').click();
    await flush();

    assert.deepEqual(calls[3].sort, { column: 'FILESIZE', dir: 'ASC' });
});

test('the active header carries aria-sort and an indicator', async () => {
    const { source } = sourceFrom([{ rows: [makeRow()], total: 1 }]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    const headers = byClass('stats-movie-table')[0].children[0].children[0];
    const [titleTh, numTh] = headers.children;

    assert.equal(numTh.getAttribute('aria-sort'), 'ascending');
    assert.equal(numTh.children[0].children[1].textContent, '\u25b2');
    assert.equal(titleTh.getAttribute('aria-sort'), 'none');
    assert.equal(titleTh.children[0].children[1].textContent, '\u21c5');

    headerButton('FORMATTEDTITLE').click();
    await flush();

    assert.equal(titleTh.getAttribute('aria-sort'), 'ascending');
    assert.equal(titleTh.children[0].children[1].textContent, '\u25b2');
    assert.equal(numTh.getAttribute('aria-sort'), 'none');

    headerButton('FORMATTEDTITLE').click();
    await flush();

    assert.equal(titleTh.getAttribute('aria-sort'), 'descending');
    assert.equal(titleTh.children[0].children[1].textContent, '\u25bc');
});

test('a sortable header resets the list to page one', async () => {
    const { source, calls } = sourceFrom([
        { rows: [makeRow({ NUM: '1' })], total: 60 },
        { rows: [makeRow({ NUM: '26' })], total: 60 },
        { rows: [makeRow({ NUM: '1' })], total: 60 }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    pagerButton('Next').click();
    await flush();

    assert.equal(calls[calls.length - 1].page, 2);

    headerButton('YEAR').click();
    await flush();

    assert.equal(calls[calls.length - 1].page, 1);
});

test('reopening the overlay returns to the default No ordering', async () => {
    const { source, calls } = sourceFrom([
        { rows: [makeRow()], total: 1 },
        { rows: [makeRow()], total: 1 }
    ]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    headerButton('RATING').click();
    await flush();

    assert.deepEqual(calls[calls.length - 1].sort, { column: 'RATING', dir: 'ASC' });

    closeMovieListOverlay(false);
    openMovieListOverlay({ title: 'Other movies', source });
    await flush();

    assert.deepEqual(calls[calls.length - 1].sort, { column: 'NUM', dir: 'ASC' });
});

test('compareBySort mirrors ORDER BY column, then NUM', () => {
    const rows = [
        { NUM: '3', YEAR: '2017', RATING: '7.5', FORMATTEDTITLE: 'beta' },
        { NUM: '1', YEAR: '2016', RATING: '8.4', FORMATTEDTITLE: 'Beta' },
        { NUM: '2', YEAR: '2016', RATING: '6.1', FORMATTEDTITLE: 'alpha' }
    ];

    const byYear = rows.slice().sort(compareBySort({ column: 'YEAR', dir: 'ASC' }));
    assert.deepEqual(byYear.map(row => row.NUM), ['1', '2', '3']);

    const byYearDesc = rows.slice().sort(compareBySort({ column: 'YEAR', dir: 'DESC' }));
    assert.deepEqual(byYearDesc.map(row => row.NUM), ['3', '1', '2']);

    // Titles compare case-insensitively; NUM breaks the tie.
    const byTitle = rows.slice().sort(
        compareBySort({ column: 'FORMATTEDTITLE', dir: 'ASC' })
    );
    assert.deepEqual(byTitle.map(row => row.NUM), ['2', '1', '3']);

    // Numeric, not lexicographic: 8.4 before 6.1 descending, 10 after 9.
    const byRating = rows.slice().sort(
        compareBySort({ column: 'RATING', dir: 'DESC' })
    );
    assert.deepEqual(byRating.map(row => row.RATING), ['8.4', '7.5', '6.1']);

    const tens = [{ NUM: '10' }, { NUM: '9' }]
        .sort(compareBySort({ column: 'NUM', dir: 'ASC' }));
    assert.deepEqual(tens.map(row => row.NUM), ['9', '10']);
});

test('a failed request offers a retry', async () => {
    const calls = [];

    const source = {
        fetchPage: async (page, signal) => {
            calls.push({ page, signal });

            if (calls.length === 1) throw new Error('boom');

            return { rows: [makeRow()], total: 1 };
        }
    };

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    assert.match(status().textContent, /^Unable to load movies\./);

    const retry = byClass('stats-movie-list-retry')[0];
    assert.ok(retry, 'renders a retry button');

    retry.click();
    await flush();

    assert.equal(calls.length, 2);
    assert.equal(rows().length, 1);
});

test('the filter action applies the slice and closes the overlay', async () => {
    const applied = [];
    const { source } = sourceFrom([{ rows: [makeRow()], total: 1 }]);

    openMovieListOverlay({
        title: 'Movies certified PG-13',
        source,
        spec: { column: 'CERTIFICATION', value: 'PG-13' },
        onFilter: spec => applied.push(spec)
    });

    await flush();

    assert.equal(filterButton().hidden, false);

    filterButton().click();

    assert.deepEqual(applied, [
        { column: 'CERTIFICATION', value: 'PG-13' }
    ]);
    assert.equal(isOpen(), false);
});

test('closing restores focus to the previously focused element', async () => {
    const trigger = new FakeElement('button', globalThis.document);

    document.body.appendChild(trigger);
    trigger.focus();

    const { source } = sourceFrom([{ rows: [makeRow()], total: 1 }]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();

    assert.equal(globalThis.document.activeElement, closeButton());

    closeMovieListOverlay();

    assert.equal(globalThis.document.activeElement, trigger);
    assert.equal(isOpen(), false);
});

test('the close button, the backdrop, and Escape all close it', async () => {
    const { source } = sourceFrom([{ rows: [makeRow()], total: 1 }]);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();
    closeButton().click();
    assert.equal(isOpen(), false);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();
    overlay().dispatchEvent({
        type: 'click',
        target: overlay(),
        preventDefault() {}
    });
    assert.equal(isOpen(), false);

    openMovieListOverlay({ title: 'Movies', source });
    await flush();
    document.dispatch('keydown', { key: 'Escape' });
    assert.equal(isOpen(), false);
});
