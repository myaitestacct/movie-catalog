import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../../public/assets/js/core/state.js';
import {
  ARCHIVE_SHORTCUT,
  ARCHIVE_SOURCE_LABEL,
  DEFAULT_SOURCE_LABEL,
  ARCHIVE_INDICATOR_ID,
  ARCHIVE_VIEW_BODY_CLASS,
  isArchiveView,
  archiveLabel,
  isArchiveShortcut,
  toggleArchiveView,
  syncArchiveIndicator,
  announceArchiveChange
} from '../../public/assets/js/table/archive-toggle.js';

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

  add(...names) {
    names.forEach(name => this.values.add(name));
  }

  remove(...names) {
    names.forEach(name => this.values.delete(name));
  }

  contains(name) {
    return this.values.has(name);
  }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.classList = new MockClassList();
    this.children = [];
    this.attributes = new Map();
    this.hidden = false;
    this.textContent = '';
    this._offsetWidth = 0;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  // Forces the entrance transition restart without a layout engine.
  get offsetWidth() {
    return this._offsetWidth;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    return this.children.find(
      child => `.${child.className}` === selector
    ) ?? null;
  }
}

function makeDocument({ withIndicator = true } = {}) {
  const body = new MockElement('body');
  const indicator = withIndicator ? new MockElement('span') : null;

  return {
    body,
    indicator,
    getElementById(id) {
      return id === ARCHIVE_INDICATOR_ID ? indicator : null;
    },
    createElement(tag) {
      return new MockElement(tag);
    }
  };
}

beforeEach(() => {
  state.archive = false;
  state.page = 3;
});

test('the archive view defaults to the main movies collection', () => {
  assert.equal(isArchiveView(), false);
  assert.equal(archiveLabel(), DEFAULT_SOURCE_LABEL);
  assert.equal(archiveLabel(true), ARCHIVE_SOURCE_LABEL);
});

test('isArchiveShortcut matches only Ctrl+Shift+K without extra modifiers', () => {
  const chord = overrides => ({
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    key: 'k',
    ...overrides
  });

  assert.equal(isArchiveShortcut(chord()), true);
  assert.equal(
    isArchiveShortcut(chord({ key: 'K' })),
    true,
    'uppercase K (Shift produces capitals) must still match'
  );

  assert.equal(isArchiveShortcut(chord({ ctrlKey: false })), false);
  assert.equal(isArchiveShortcut(chord({ shiftKey: false })), false);
  assert.equal(isArchiveShortcut(chord({ altKey: true })), false);
  assert.equal(isArchiveShortcut(chord({ metaKey: true })), false);
  assert.equal(isArchiveShortcut(chord({ key: 'j' })), false);
  assert.equal(isArchiveShortcut(null), false);
});

test('toggleArchiveView flips the source and restarts paging at page one', () => {
  const active = toggleArchiveView();

  assert.equal(active, true);
  assert.equal(state.archive, true);
  assert.equal(state.page, 1);
  assert.equal(isArchiveView(), true);

  state.page = 7;
  assert.equal(toggleArchiveView(), false);
  assert.equal(state.archive, false);
  assert.equal(state.page, 1);
});

test('syncArchiveIndicator mirrors the state onto the body and indicator chip', () => {
  const doc = makeDocument();

  state.archive = true;
  const active = syncArchiveIndicator(doc);

  assert.equal(active, true);
  assert.equal(
    doc.body.classList.contains(ARCHIVE_VIEW_BODY_CLASS),
    true
  );
  assert.equal(doc.indicator.hidden, false);

  state.archive = false;
  syncArchiveIndicator(doc);
  assert.equal(
    doc.body.classList.contains(ARCHIVE_VIEW_BODY_CLASS),
    false
  );
  assert.equal(doc.indicator.hidden, true);
});

test('syncArchiveIndicator still toggles the body class without the indicator element', () => {
  const doc = makeDocument({ withIndicator: false });

  state.archive = true;
  assert.doesNotThrow(() => syncArchiveIndicator(doc));
  assert.equal(
    doc.body.classList.contains(ARCHIVE_VIEW_BODY_CLASS),
    true
  );
});

test('announceArchiveChange creates and reuses one toast with an accessible role', () => {
  const doc = makeDocument();
  const scheduled = [];
  const timers = new Set();

  const setTimeoutFn = (callback, delay) => {
    const timer = { callback, delay };
    timers.add(timer);
    scheduled.push(timer);
    return timer;
  };
  const clearTimeoutFn = timer => timers.delete(timer);

  announceArchiveChange(true, { setTimeoutFn, clearTimeoutFn, doc });

  assert.equal(doc.body.children.length, 1);
  const toast = doc.body.children[0];
  assert.match(toast.className, /archive-toast/);
  assert.equal(toast.classList.contains('is-visible'), true);
  assert.equal(toast.getAttribute('role'), 'status');
  assert.match(toast.textContent, /Paripakva collection/);
  assert.ok(toast.textContent.includes(ARCHIVE_SHORTCUT));
  assert.equal(scheduled.length, 1);

  // Switching back reuses the same element instead of stacking toasts.
  announceArchiveChange(false, { setTimeoutFn, clearTimeoutFn, doc });
  assert.equal(doc.body.children.length, 1);
  assert.match(doc.body.children[0].textContent, /Movies collection/);
  assert.equal(scheduled.length, 2);
});
