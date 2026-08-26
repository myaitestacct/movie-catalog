import test from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../../movie-catalog/public/assets/js/core/state.js';
import { renderTable } from '../../movie-catalog/public/assets/js/table/table.js';

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.colSpan = 1;
    this.href = '';
    this.target = '';
    this.rel = '';
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = {
      _set: new Set(),
      add: name => this.classList._set.add(name),
      contains: name => this.classList._set.has(name),
      toggle: (name, force) => {
        const hasClass = this.classList._set.has(name);
        const enabled = force !== undefined ? force : !hasClass;

        if (enabled) {
          this.classList._set.add(name);
        } else {
          this.classList._set.delete(name);
        }

        return enabled;
      }
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach(child => this.children.push(child));
  }

  replaceChildren(...children) {
    this.children = [...children];
    this.innerHTML = '';
  }

  querySelector(selector) {
    if (selector === 'tbody') return this.tbody || null;
    return null;
  }
}

function installDocumentMock(searchGroupInfo = null) {
  globalThis.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    getElementById(id) {
      return id === 'search-group-info' ? searchGroupInfo : null;
    },
    querySelector() {
      return null;
    }
  };
}

function makeTable() {
  const table = new MockElement('table');
  const tbody = new MockElement('tbody');
  table.tbody = tbody;
  table.querySelector = selector => selector === 'tbody' ? tbody : null;
  return { table, tbody };
}

function makeRows() {
  return [
    {
      NUM: '1',
      FORMATTEDTITLE: 'Arrival',
      YEAR: '2016',
      RATING: '7.9',
      FILESIZE: '1000',
      FILE: 'arrival.mkv',
      URL: 'https://example.com'
    },
    {
      NUM: '2',
      FORMATTEDTITLE: 'Arrival 2',
      YEAR: '2020',
      RATING: '6.0',
      FILESIZE: '1200',
      FILE: 'arrival2.mkv',
      URL: 'https://example.com'
    },
    {
      NUM: '3',
      FORMATTEDTITLE: 'The Arrival',
      YEAR: '1996',
      RATING: '5.5',
      FILESIZE: '800',
      FILE: 'thearrival.mkv',
      URL: 'https://example.com'
    }
  ];
}

test('exact and fuzzy title matches render in separate groups', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  installDocumentMock();
  state.search = { FORMATTEDTITLE: 'Arrival' };
  state.columnVisibility = {};
  state.fuzzy = true;

  renderTable(table, makeRows(), columns);

  assert.equal(tbody.children.length, 5);
  assert.equal(tbody.children[0].className, 'group-header exact-header');
  assert.equal(tbody.children[0].dataset.testid, 'exact-header');
  assert.equal(tbody.children[0].children[0].colSpan, columns.length);
  assert.equal(tbody.children[1].dataset.matchType, 'exact');
  assert.equal(tbody.children[2].className, 'group-header fuzzy-header');
  assert.equal(tbody.children[2].dataset.testid, 'fuzzy-header');
  assert.equal(tbody.children[3].dataset.matchType, 'fuzzy');
  assert.equal(tbody.children[4].dataset.matchType, 'fuzzy');
});

test('search group info uses separate DOM elements for untrusted titles', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table } = makeTable();
  const infoBanner = new MockElement('div');
  installDocumentMock(infoBanner);
  const unsafeTitle = '<img src=x onerror=alert(1)>';
  const rows = makeRows();
  rows[0].FORMATTEDTITLE = unsafeTitle;
  rows[1].FORMATTEDTITLE = `${unsafeTitle} sequel`;

  state.search = { FORMATTEDTITLE: unsafeTitle };
  state.columnVisibility = {};
  state.fuzzy = true;

  renderTable(table, rows, columns);

  assert.equal(infoBanner.className, 'search-group-info');
  assert.equal(infoBanner.children.length, 4);
  assert.deepEqual(
    infoBanner.children.map(child => child.className),
    ['info-exact', 'info-sep', 'info-fuzzy', 'info-hint']
  );
  assert.ok(
    infoBanner.children.every(child => child.children.length === 0)
  );
});

test('no exact-match group is rendered when there is no exact match', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  installDocumentMock();
  state.search = { FORMATTEDTITLE: 'Nonexistent' };
  state.columnVisibility = {};
  state.fuzzy = true;

  renderTable(table, makeRows(), columns);

  assert.equal(tbody.children.length, 3);
  assert.ok(tbody.children.every(row => row.dataset.matchType === 'fuzzy'));
});

test('exact matches remain grouped when no fuzzy matches are returned', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  const infoBanner = new MockElement('div');
  installDocumentMock(infoBanner);
  state.search = { FORMATTEDTITLE: 'Arrival' };
  state.columnVisibility = {};
  state.fuzzy = true;
  const rows = [
    {
      NUM: '1',
      FORMATTEDTITLE: 'Arrival',
      YEAR: '2016',
      RATING: '7.9',
      FILESIZE: '1000',
      FILE: 'arrival.mkv',
      URL: 'https://example.com'
    }
  ];

  renderTable(table, rows, columns);

  assert.equal(tbody.children.length, 2);
  assert.equal(tbody.children[0].className, 'group-header exact-header');
  assert.equal(tbody.children[1].dataset.matchType, 'exact');
  assert.equal(infoBanner.className, 'search-group-info');
  assert.equal(infoBanner.children.length, 2);
  assert.equal(
    infoBanner.children[0].textContent,
    '✅ 1 exact match for "Arrival"'
  );
  assert.equal(
    infoBanner.children[1].textContent,
    'No additional matches'
  );
});

test('search group info describes a title search with no matches', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  const infoBanner = new MockElement('div');
  installDocumentMock(infoBanner);
  state.search = { FORMATTEDTITLE: 'The Breakfast Club' };
  state.columnVisibility = {};
  state.fuzzy = true;

  renderTable(table, [], columns);

  assert.equal(tbody.children.length, 0);
  assert.equal(infoBanner.className, 'search-group-info');
  assert.equal(infoBanner.children.length, 1);
  assert.equal(
    infoBanner.children[0].textContent,
    'No matches for "The Breakfast Club"'
  );
});

test('exact matches remain grouped when fuzzy search is disabled', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  installDocumentMock();
  state.search = { FORMATTEDTITLE: 'Arrival' };
  state.columnVisibility = {};
  state.fuzzy = false;
  const rows = [
    {
      NUM: '1',
      FORMATTEDTITLE: 'Arrival',
      YEAR: '2016',
      RATING: '7.9',
      FILESIZE: '1000',
      FILE: 'arrival.mkv',
      URL: 'https://example.com'
    },
    {
      NUM: '2',
      FORMATTEDTITLE: 'Arrival',
      YEAR: '2016',
      RATING: '7.9',
      FILESIZE: '1000',
      FILE: 'arrival.mkv',
      URL: 'https://example.com'
    }
  ];

  renderTable(table, rows, columns);

  assert.equal(tbody.children.length, 3);
  assert.equal(tbody.children[0].className, 'group-header exact-header');
  assert.ok(
    tbody.children.slice(1).every(row => row.dataset.matchType === 'exact')
  );
});

test('title and year parsing still groups exact and fuzzy matches', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'YEAR', 'RATING', 'FILESIZE'];
  const { table, tbody } = makeTable();
  installDocumentMock();
  state.search = { FORMATTEDTITLE: 'Arrival (2016)' };
  state.columnVisibility = {};
  state.fuzzy = true;

  renderTable(table, makeRows(), columns);

  assert.equal(tbody.children.length, 5);
  assert.equal(tbody.children[0].className, 'group-header exact-header');
  assert.equal(tbody.children[1].dataset.matchType, 'exact');
  assert.equal(tbody.children[2].className, 'group-header fuzzy-header');
  assert.equal(tbody.children[3].dataset.matchType, 'fuzzy');
  assert.equal(tbody.children[4].dataset.matchType, 'fuzzy');
});
