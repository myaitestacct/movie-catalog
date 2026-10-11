import test from 'node:test';
import assert from 'node:assert/strict';

/*
 * Unit tests for the analytics movie-list overlay: minimal movie rows
 * (title, number, year, rating, stored size, external link), paging,
 * empty/error states, the jump-to-movie link, the optional
 * "Filter the table" action, the shared source for unpaginated list
 * endpoints, and the ways it closes.
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

function sourceFrom(pages) {
    const calls = [];

    return {
        calls,
        source: {
            fetchPage: async (page, signal) => {
                calls.push({ page, signal });

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

    assert.equal(cells[0].textContent, 'Arrival');
    assert.equal(cells[1].textContent, '1');
    assert.equal(cells[2].textContent, '2016');
    assert.equal(cells[3].textContent, '7.9');
    assert.equal(cells[4].textContent, '1200');

    const imdb = cells[5].children[0];
    assert.equal(imdb.textContent, 'IMDB');
    assert.equal(imdb.href, 'https://www.imdb.com/title/tt2543164/');
    assert.equal(imdb.target, '_blank');
    assert.equal(imdb.rel, 'noopener noreferrer');

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

    const imdb = rows()[0].children[5].children[0];

    assert.equal(imdb.hasAttribute('href'), false);
    assert.equal(imdb.getAttribute('aria-disabled'), 'true');
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
