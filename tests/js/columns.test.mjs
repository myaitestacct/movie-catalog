import test from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../../movie-catalog/public/assets/js/core/state.js';
import { initColumnToggles } from '../../movie-catalog/public/assets/js/table/columns.js';

class MockClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    const enabled = force ?? !this.values.has(name);

    if (enabled) this.values.add(name);
    else this.values.delete(name);

    return enabled;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.classList = new MockClassList();
    this.className = '';
    this.textContent = '';
    this.type = '';
    this.eyeIcon = null;
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

  click() {
    this.listeners.get('click')?.();
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    if (selector === 'i.fa-eye, i.fa-eye-slash') {
      return this.eyeIcon;
    }

    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function makeHeader(column) {
  const header = new MockElement('th');
  header.dataset.col = column;
  return header;
}

function makeToggleButton(column, withEyeIcon = false) {
  const button = new MockElement('button');
  button.dataset.col = column;

  if (withEyeIcon) {
    button.eyeIcon = new MockElement('i');
    button.eyeIcon.className = 'fa-solid fa-eye-slash';
  }

  return button;
}

test('bulk column toggle synchronizes visibility and every button state', () => {
  const columns = ['NUM', 'FORMATTEDTITLE', 'LANGUAGES', 'PATH'];
  const headers = columns.map(makeHeader);
  const tableCells = columns.map(() => [
    new MockElement('th'),
    new MockElement('td')
  ]);
  const searchCells = columns.map(() => new MockElement('td'));

  const table = new MockElement('table');
  table.querySelectorAll = selector => {
    if (selector === 'thead th') return headers;

    const match = selector.match(/nth-child\((\d+)\)/);
    return match ? tableCells[Number(match[1]) - 1] : [];
  };

  const languageButton = makeToggleButton('LANGUAGES', true);
  const pathButton = makeToggleButton('PATH');
  const toggleContainer = new MockElement('div');
  toggleContainer.querySelectorAll = selector =>
    selector === '.toggle-col'
      ? [languageButton, pathButton]
      : [];

  const storage = new Map();
  globalThis.localStorage = {
    getItem(key) {
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    }
  };

  globalThis.document = {
    createElement(tagName) {
      return new MockElement(tagName);
    },
    querySelector(selector) {
      const match = selector.match(/nth-child\((\d+)\)/);
      return match ? searchCells[Number(match[1]) - 1] : null;
    }
  };

  state.columnVisibility = {};
  initColumnToggles(table, toggleContainer);

  const toggleAllButton = toggleContainer.children[0];

  assert.equal(state.columnVisibility.LANGUAGES, false);
  assert.equal(state.columnVisibility.PATH, false);
  assert.equal(languageButton.classList.contains('active'), false);
  assert.equal(pathButton.classList.contains('active'), false);
  assert.equal(languageButton.getAttribute('aria-pressed'), 'false');
  assert.equal(toggleAllButton.textContent, 'Show All');

  toggleAllButton.click();

  assert.equal(state.columnVisibility.LANGUAGES, true);
  assert.equal(state.columnVisibility.PATH, true);
  assert.equal(languageButton.classList.contains('active'), true);
  assert.equal(pathButton.classList.contains('active'), true);
  assert.equal(languageButton.getAttribute('aria-pressed'), 'true');
  assert.equal(pathButton.getAttribute('aria-pressed'), 'true');
  assert.equal(languageButton.eyeIcon.className, 'fa-solid fa-eye');
  assert.equal(tableCells[2][0].style.display, '');
  assert.equal(tableCells[3][1].style.display, '');
  assert.equal(searchCells[2].style.display, '');
  assert.equal(toggleAllButton.textContent, 'Hide All');

  toggleAllButton.click();

  assert.equal(state.columnVisibility.LANGUAGES, false);
  assert.equal(state.columnVisibility.PATH, false);
  assert.equal(languageButton.classList.contains('active'), false);
  assert.equal(pathButton.classList.contains('active'), false);
  assert.equal(languageButton.getAttribute('aria-pressed'), 'false');
  assert.equal(pathButton.getAttribute('aria-pressed'), 'false');
  assert.equal(languageButton.eyeIcon.className, 'fa-solid fa-eye-slash');
  assert.equal(tableCells[2][0].style.display, 'none');
  assert.equal(tableCells[3][1].style.display, 'none');
  assert.equal(searchCells[3].style.display, 'none');
  assert.equal(toggleAllButton.textContent, 'Show All');

  pathButton.click();

  assert.equal(state.columnVisibility.PATH, true);
  assert.equal(pathButton.classList.contains('active'), true);
  assert.equal(pathButton.getAttribute('aria-pressed'), 'true');
  assert.equal(toggleAllButton.textContent, 'Hide All');

  const saved = JSON.parse(storage.get('movieCatalogColumns'));
  assert.equal(saved.PATH, true);
  assert.equal(saved.LANGUAGES, false);
});
