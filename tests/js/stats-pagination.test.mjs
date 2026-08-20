import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStatsPageWindow,
  renderStatsPagination
} from '../../movie-catalog/public/assets/js/stats/stats-pagination.js';

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
    this.attributes = new Map();
    this.className = '';
    this.textContent = '';
    this.type = '';
    this.value = '';
    this.disabled = false;
    this.selected = false;
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

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

globalThis.document = {
  createElement(tagName) {
    return new MockElement(tagName);
  }
};

test('page window stays compact at the beginning, middle, and end', () => {
  assert.deepEqual(getStatsPageWindow(1, 20), [1, 2, 3]);
  assert.deepEqual(getStatsPageWindow(10, 20), [8, 9, 10, 11, 12]);
  assert.deepEqual(getStatsPageWindow(20, 20), [18, 19, 20]);
});

test('better-copy pagination renders compact navigation and jump controls', () => {
  const container = new MockElement('div');
  const requestedPages = [];

  renderStatsPagination(container, {
    currentPage: 50,
    totalPages: 100,
    totalItems: 997,
    itemLabel: 'movie',
    ariaLabel: 'Needs better copy pagination',
    onPageChange: page => requestedPages.push(page)
  });

  assert.equal(container.attributes.get('role'), 'navigation');
  assert.equal(
    container.attributes.get('aria-label'),
    'Needs better copy pagination'
  );
  assert.equal(container.children.length, 3);
  assert.equal(
    container.children[0].textContent,
    'Page 50 of 100 • 997 movies'
  );

  const controls = container.children[1];
  assert.deepEqual(
    controls.children.map(child => child.textContent),
    ['First', 'Prev', 48, 49, 50, 51, 52, 'Next', 'Last']
  );

  const currentButton = controls.children[4];
  assert.equal(currentButton.classList.contains('active'), true);
  assert.equal(currentButton.attributes.get('aria-current'), 'page');

  controls.children[7].listeners.get('click')();
  assert.deepEqual(requestedPages, [51]);

  const jumpSelect = container.children[2].children[1];
  assert.equal(
    jumpSelect.attributes.get('aria-label'),
    'Jump to page — Needs better copy pagination'
  );
  assert.equal(jumpSelect.children.length, 100);
  jumpSelect.listeners.get('change')({ target: { value: '87' } });
  assert.deepEqual(requestedPages, [51, 87]);
});

test('single-page results show information without redundant controls', () => {
  const container = new MockElement('div');

  renderStatsPagination(container, {
    currentPage: 1,
    totalPages: 1,
    totalItems: 1,
    itemLabel: 'movie',
    onPageChange: () => {}
  });

  assert.equal(container.children.length, 1);
  assert.equal(container.children[0].textContent, 'Page 1 of 1 • 1 movie');
});
