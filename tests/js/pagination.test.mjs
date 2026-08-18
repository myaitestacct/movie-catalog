import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../../movie-catalog/public/assets/js/core/state.js';
import { renderPagination } from '../../movie-catalog/public/assets/js/table/pagination.js';

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}

class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = new MockClassList();
    this.listeners = new Map();
    this.textContent = '';
    this.className = '';
    this.disabled = false;
    this.selected = false;
    this.value = '';
  }

  set innerHTML(value) {
    if (value === '') this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }
}

globalThis.document = {
  createElement(tagName) {
    return new MockElement(tagName);
  }
};

function renderInfo(page, pages, total, pageSize) {
  state.page = page;

  const container = new MockElement('div');
  renderPagination(
    container,
    pages,
    total,
    pageSize,
    () => {}
  );

  return container.children[0]?.textContent;
}

test('pagination reports full first and middle page ranges', () => {
  assert.equal(
    renderInfo(1, 3, 105, 50),
    'Showing 1-50 of 105 results'
  );
  assert.equal(
    renderInfo(2, 3, 105, 50),
    'Showing 51-100 of 105 results'
  );
});

test('pagination reports the correct short final-page range', () => {
  assert.equal(
    renderInfo(3, 3, 105, 50),
    'Showing 101-105 of 105 results'
  );
});

test('pagination handles a result set smaller than one page', () => {
  assert.equal(
    renderInfo(1, 1, 20, 50),
    'Showing 1-20 of 20 results'
  );
});

test('pagination displays a no-results message', () => {
  assert.equal(
    renderInfo(1, 0, 0, 50),
    'No results found'
  );
});
