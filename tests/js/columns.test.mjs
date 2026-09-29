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
    // Stack like the real DOM does: binding the same element twice must be
    // observable, otherwise a duplicated handler cannot fail a test.
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  click() {
    // One click fires the `onclick` property handler *and* every listener.
    this.onclick?.();
    (this.listeners.get('click') ?? []).forEach(listener => listener());
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  insertBefore(child, reference) {
    const index = this.children.indexOf(reference);

    if (index === -1) this.children.push(child);
    else this.children.splice(index, 0, child);

    return child;
  }

  querySelector(selector) {
    if (selector === 'i.fa-eye, i.fa-eye-slash') {
      return this.eyeIcon;
    }

    if (selector === '.toggle-all-columns') {
      return this.children.find(
        child => String(child.className).includes('toggle-all-columns')
      ) ?? null;
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

test('initialising the toolbar twice keeps one Hide All button and one handler per chip', () => {
  // Regression guard: the entry point used to be imported back by stats.js
  // (`import { loadMovies } from '../app.js'`). Because the page loads the
  // entry with a cache key (app.js?v=<mtime>) while internal imports stay
  // unversioned, those two specifiers are different modules -- the whole app
  // booted twice, the toolbar gained a second "Hide All" button, and every
  // column chip ended up with two click handlers that cancelled each other
  // out (clicking Path did nothing at all).
  const columns = ['NUM', 'FORMATTEDTITLE', 'LANGUAGES', 'PATH'];
  const headers = columns.map(makeHeader);
  const tableCells = columns.map(() => [
    new MockElement('th'),
    new MockElement('td')
  ]);

  const table = new MockElement('table');
  table.querySelectorAll = selector => {
    if (selector === 'thead th') return headers;

    const match = selector.match(/nth-child\((\d+)\)/);
    return match ? tableCells[Number(match[1]) - 1] : [];
  };

  const pathButton = makeToggleButton('PATH');
  const toggleContainer = new MockElement('div');
  toggleContainer.querySelectorAll = selector =>
    selector === '.toggle-col' ? [pathButton] : [];

  const storage = new Map();
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  };
  globalThis.document = {
    createElement: tagName => new MockElement(tagName),
    querySelector: () => null
  };

  state.columnVisibility = {};

  initColumnToggles(table, toggleContainer);
  initColumnToggles(table, toggleContainer);

  const hideAllButtons = toggleContainer.children.filter(
    child => String(child.className).includes('toggle-all-columns')
  );

  assert.equal(
    hideAllButtons.length,
    1,
    'a second initialisation must not add another Hide All button'
  );

  pathButton.click();

  assert.equal(state.columnVisibility.PATH, true);
  assert.equal(pathButton.getAttribute('aria-pressed'), 'true');
  assert.equal(tableCells[3][0].style.display, '');
  assert.equal(tableCells[3][1].style.display, '');

  pathButton.click();

  assert.equal(state.columnVisibility.PATH, false);
  assert.equal(tableCells[3][0].style.display, 'none');

  hideAllButtons[0].click();

  assert.equal(state.columnVisibility.PATH, true);
  assert.equal(hideAllButtons[0].textContent, 'Hide All');
});

test('Hide All / Show All covers the poster thumbnails as well as the columns', () => {
  // PATH is the only optional column here (ALWAYS_VISIBLE covers NUM and
  // FORMATTEDTITLE), matching the single chip this toolbar exposes.
  const columns = ['NUM', 'FORMATTEDTITLE', 'PATH'];
  const headers = columns.map(makeHeader);
  const tableCells = columns.map(() => [
    new MockElement('th'),
    new MockElement('td')
  ]);

  const table = new MockElement('table');
  table.querySelectorAll = selector => {
    if (selector === 'thead th') return headers;

    const match = selector.match(/nth-child\((\d+)\)/);
    return match ? tableCells[Number(match[1]) - 1] : [];
  };

  const pathButton = makeToggleButton('PATH');
  const toggleContainer = new MockElement('div');
  toggleContainer.querySelectorAll = selector =>
    selector === '.toggle-col' ? [pathButton] : [];

  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {}
  };
  globalThis.document = {
    createElement: tagName => new MockElement(tagName),
    querySelector: () => null
  };

  // Stand-in for the handle returned by initMiniPosterToggle().
  let postersVisible = true;
  const posterCalls = [];
  const posterToggle = {
    get visible() {
      return postersVisible;
    },
    show() {
      postersVisible = true;
      posterCalls.push('show');
    },
    hide() {
      postersVisible = false;
      posterCalls.push('hide');
    }
  };

  state.columnVisibility = {};

  const handle = initColumnToggles(table, toggleContainer, posterToggle);
  const toggleAllButton = toggleContainer.children[0];

  // No optional column is visible yet, but the thumbnails are, so "All" is
  // not hidden: the button must offer to hide them.
  assert.equal(toggleAllButton.textContent, 'Hide All');
  assert.match(
    toggleAllButton.getAttribute('aria-label'),
    /poster thumbnails/
  );

  toggleAllButton.click();

  assert.deepEqual(posterCalls, ['hide']);
  assert.equal(state.columnVisibility.PATH, false);
  assert.equal(toggleAllButton.textContent, 'Show All');

  toggleAllButton.click();

  assert.deepEqual(posterCalls, ['hide', 'show']);
  assert.equal(state.columnVisibility.PATH, true);
  assert.equal(tableCells[2][0].style.display, '');
  assert.equal(toggleAllButton.textContent, 'Hide All');

  // With every column hidden again, the thumbnails alone decide the label --
  // which is what the Poster chip's onChange callback refreshes.
  pathButton.click();
  assert.equal(state.columnVisibility.PATH, false);
  assert.equal(toggleAllButton.textContent, 'Hide All');

  postersVisible = false;
  handle.refresh();
  assert.equal(toggleAllButton.textContent, 'Show All');

  postersVisible = true;
  handle.refresh();
  assert.equal(toggleAllButton.textContent, 'Hide All');
});
