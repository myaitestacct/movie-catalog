import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initSearch
} from '../../movie-catalog/public/assets/js/table/search.js';
import {
  state
} from '../../movie-catalog/public/assets/js/core/state.js';

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = '';
    this.type = '';
  }

  setAttribute(name, value) {
    this.attributes.set(
      name,
      String(value)
    );
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren() {
    this.children.length = 0;
  }
}

globalThis.document = {
  createElement(tagName) {
    return new MockElement(tagName);
  }
};

test(
  'search controls expose accessible filter inputs without per-column clear buttons',
  () => {
    const searchRow =
      new MockElement('tr');

    state.search = {
      FORMATTEDTITLE: 'Arrival'
    };

    state.columnVisibility = {};
    state.page = 1;

    initSearch(
      ['FORMATTEDTITLE'],
      searchRow,
      () => {}
    );

    const cell =
      searchRow.children[0];

    const input =
      cell.children[0];

    assert.equal(
      input.type,
      'search'
    );

    assert.equal(
      input.value,
      'Arrival'
    );

    assert.equal(
      input.getAttribute(
        'aria-label'
      ),
      'Filter by FORMATTEDTITLE'
    );

    assert.equal(
      cell.children.length,
      1
    );
  }
);

test('editing two columns within one debounce interval retains both filters', t => {
  const timers = new Map();
  let nextTimer = 0;
  t.mock.method(globalThis, 'setTimeout', callback => {
    timers.set(++nextTimer, callback);
    return nextTimer;
  });
  t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id));

  state.search = {};
  state.page = 3;
  let reloads = 0;
  let changes = 0;
  const row = new MockElement('tr');
  initSearch(['FORMATTEDTITLE', 'YEAR'], row, () => reloads++, () => changes++);
  const title = row.children[0].children[0];
  const year = row.children[1].children[0];

  title.value = ' Arrival ';
  title.oninput();
  year.value = '2016';
  year.oninput();

  assert.deepEqual(state.search, { FORMATTEDTITLE: 'Arrival', YEAR: '2016' });
  assert.equal(state.page, 1);
  assert.equal(changes, 2, 'clear-filter controls can update before the debounce');
  assert.equal(reloads, 0);
  assert.equal(timers.size, 1);
  [...timers.values()][0]();
  assert.equal(reloads, 1);
  assert.equal(state.debounce, null);
});

test('clearing a field updates state before a pending response can render', t => {
  t.mock.method(globalThis, 'setTimeout', () => 1);
  t.mock.method(globalThis, 'clearTimeout', () => {});
  state.search = { FILEPATH: 'missing' };
  const row = new MockElement('tr');
  initSearch(['FILEPATH'], row, () => {});
  const input = row.children[0].children[0];
  input.value = '';
  input.oninput();
  assert.equal(state.search.FILEPATH, '');
  assert.match(input.title, /filename only/);
});

test('re-initialising the search row keeps one cell per column', t => {
  // A second boot used to append a second set of filter cells to #search-row
  // (invisible in table view, duplicated as soon as search mode is opened).
  const timers = new Map();
  let nextTimer = 0;
  t.mock.method(globalThis, 'setTimeout', callback => {
    timers.set(++nextTimer, callback);
    return nextTimer;
  });
  t.mock.method(globalThis, 'clearTimeout', id => timers.delete(id));

  state.search = {};
  state.columnVisibility = {};
  state.page = 4;

  let reloads = 0;
  let changes = 0;
  const row = new MockElement('tr');

  initSearch(['FORMATTEDTITLE', 'YEAR'], row, () => reloads++, () => changes++);
  initSearch(['FORMATTEDTITLE', 'YEAR'], row, () => reloads++, () => changes++);

  assert.equal(row.children.length, 2, 'one cell per column, not per boot');

  const title = row.children[0].children[0];
  title.value = 'Arrival';
  title.oninput();

  assert.equal(state.search.FORMATTEDTITLE, 'Arrival');
  assert.equal(state.page, 1);
  assert.equal(changes, 1, 'only the surviving input reports changes');
  assert.equal(reloads, 0);

  [...timers.values()].forEach(timer => timer());
  assert.equal(reloads, 1, 'the debounced reload fires exactly once');
});
