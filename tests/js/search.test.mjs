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
