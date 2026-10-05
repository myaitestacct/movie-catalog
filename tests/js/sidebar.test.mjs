import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SIDEBAR_STORAGE_KEY,
  SIDEBAR_MODES,
  readStoredSidebarMode,
  writeStoredSidebarMode,
  initSidebar
} from '../../movie-catalog/public/assets/js/table/sidebar.js';

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

  add(...names) {
    names.forEach(n => this.values.add(n));
  }

  remove(...names) {
    names.forEach(n => this.values.delete(n));
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.classList = new MockClassList();
    this.className = '';
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this.title = '';
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  click() {
    this.onclick?.();
    (this.listeners.get('click') || []).forEach(fn => fn());
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    return null;
  }
}

class MockStorage {
  constructor(initial = {}) {
    this.data = new Map(Object.entries(initial));
  }
  getItem(key) {
    return this.data.get(key) ?? null;
  }
  setItem(key, value) {
    this.data.set(key, String(value));
  }
}

test('readStoredSidebarMode falls back to full when storage is empty or invalid', () => {
  const emptyStorage = new MockStorage();
  assert.equal(readStoredSidebarMode(emptyStorage), SIDEBAR_MODES.FULL);

  const invalidStorage = new MockStorage({ [SIDEBAR_STORAGE_KEY]: 'bogus' });
  assert.equal(readStoredSidebarMode(invalidStorage), SIDEBAR_MODES.FULL);
});

test('readStoredSidebarMode correctly reads valid stored modes', () => {
  assert.equal(
    readStoredSidebarMode(new MockStorage({ [SIDEBAR_STORAGE_KEY]: 'partial' })),
    SIDEBAR_MODES.PARTIAL
  );
  assert.equal(
    readStoredSidebarMode(new MockStorage({ [SIDEBAR_STORAGE_KEY]: 'hidden' })),
    SIDEBAR_MODES.HIDDEN
  );
  assert.equal(
    readStoredSidebarMode(new MockStorage({ [SIDEBAR_STORAGE_KEY]: 'full' })),
    SIDEBAR_MODES.FULL
  );
});

test('writeStoredSidebarMode persists valid modes into storage', () => {
  const storage = new MockStorage();
  writeStoredSidebarMode(storage, SIDEBAR_MODES.PARTIAL);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'partial');

  writeStoredSidebarMode(storage, SIDEBAR_MODES.HIDDEN);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'hidden');
});

test('initSidebar applies initial mode classes to documentElement and sidebar', () => {
  const root = {
    documentElement: new MockElement('html'),
    getElementById(id) {
      if (id === 'app-sidebar') return sidebarEl;
      if (id === 'sidebar-edge-toggle') return toggleEl;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const sidebarEl = new MockElement('aside');
  const toggleEl = new MockElement('button');
  const storage = new MockStorage({ [SIDEBAR_STORAGE_KEY]: 'partial' });

  const handle = initSidebar(root, storage);

  assert.equal(handle.getMode(), SIDEBAR_MODES.PARTIAL);
  assert.equal(root.documentElement.classList.contains('sidebar-mode-partial'), true);
  assert.equal(sidebarEl.classList.contains('sidebar-partial'), true);
  assert.equal(toggleEl.getAttribute('aria-expanded'), 'true');
});

test('initSidebar cycling through modes: full -> partial -> hidden -> full', () => {
  const root = {
    documentElement: new MockElement('html'),
    getElementById(id) {
      if (id === 'app-sidebar') return sidebarEl;
      if (id === 'sidebar-edge-toggle') return toggleEl;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const sidebarEl = new MockElement('aside');
  const toggleEl = new MockElement('button');
  const storage = new MockStorage(); // default is full

  const handle = initSidebar(root, storage);
  assert.equal(handle.getMode(), SIDEBAR_MODES.FULL);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'full');

  // Click edge toggle: full -> partial
  toggleEl.click();
  assert.equal(handle.getMode(), SIDEBAR_MODES.PARTIAL);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'partial');
  assert.equal(root.documentElement.classList.contains('sidebar-mode-partial'), true);

  // Click edge toggle: partial -> hidden
  toggleEl.click();
  assert.equal(handle.getMode(), SIDEBAR_MODES.HIDDEN);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'hidden');
  assert.equal(root.documentElement.classList.contains('sidebar-mode-hidden'), true);
  assert.equal(toggleEl.getAttribute('aria-expanded'), 'false');

  // Click edge toggle: hidden -> full
  toggleEl.click();
  assert.equal(handle.getMode(), SIDEBAR_MODES.FULL);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'full');
  assert.equal(root.documentElement.classList.contains('sidebar-mode-full'), true);
  assert.equal(toggleEl.getAttribute('aria-expanded'), 'true');
});

test('handle.setMode directly sets mode and notifies listeners', () => {
  const root = {
    documentElement: new MockElement('html'),
    getElementById(id) {
      if (id === 'app-sidebar') return sidebarEl;
      if (id === 'sidebar-edge-toggle') return toggleEl;
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const sidebarEl = new MockElement('aside');
  const toggleEl = new MockElement('button');
  const storage = new MockStorage();

  let notifiedMode = null;
  const handle = initSidebar(root, storage, mode => {
    notifiedMode = mode;
  });

  handle.setMode('hidden');
  assert.equal(handle.getMode(), SIDEBAR_MODES.HIDDEN);
  assert.equal(storage.getItem(SIDEBAR_STORAGE_KEY), 'hidden');
  assert.equal(notifiedMode, 'hidden');
});
