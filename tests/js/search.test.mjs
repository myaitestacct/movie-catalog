import test from 'node:test';
import assert from 'node:assert/strict';
import { initSearch } from '../../movie-catalog/public/assets/js/table/search.js';
import { state } from '../../movie-catalog/public/assets/js/core/state.js';

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = '';
    this.hidden = false;
    this.type = '';
    this.focused = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
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

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  focus() {
    this.focused = true;
  }
}

globalThis.document = {
  createElement(tagName) {
    return new MockElement(tagName);
  }
};

test('search controls expose accessible inputs and individual clear buttons', () => {
  const searchRow = new MockElement('tr');

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

  const cell = searchRow.children[0];
  const control = cell.children[0];
  const input = control.children[0];
  const clearButton = control.children[1];

  assert.equal(input.type, 'search');
  assert.equal(input.value, 'Arrival');

  assert.equal(
    input.getAttribute('aria-label'),
    'Filter by FORMATTEDTITLE'
  );

  assert.equal(clearButton.hidden, false);

  assert.equal(
    clearButton.getAttribute('aria-label'),
    'Clear FORMATTEDTITLE filter'
  );
});

test('individual clear buttons reset their filter and trigger a reload', () => {
  const searchRow = new MockElement('tr');
  let searchCount = 0;

  state.search = {
    FORMATTEDTITLE: 'Arrival'
  };
  state.columnVisibility = {};
  state.page = 1;
  state.debounce = null;

  initSearch(
    ['FORMATTEDTITLE'],
    searchRow,
    () => {
      searchCount++;
    }
  );

  const clearButton =
    searchRow.children[0]
      .children[0]
      .children[1];

  const input =
    searchRow.children[0]
      .children[0]
      .children[0];

  clearButton.listeners.get('click')();

  assert.equal(input.value, '');
  assert.equal(clearButton.hidden, true);
  assert.equal(
    state.search.FORMATTEDTITLE,
    undefined
  );
  assert.equal(state.page, 1);
  assert.equal(input.focused, true);
  assert.equal(searchCount, 1);
});
