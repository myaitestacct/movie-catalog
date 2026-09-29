import test from 'node:test';
import assert from 'node:assert/strict';

import {
  initMiniPosterToggle,
  MINI_POSTER_BUTTON_SELECTOR,
  MINI_POSTER_STORAGE_KEY,
  HIDE_MINI_POSTERS_CLASS
} from '../../movie-catalog/public/assets/js/table/poster-toggle.js';

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

class MockButton {
  constructor({ id = 'toggle-mini-poster', ui = 'miniPoster' } = {}) {
    this.tagName = 'BUTTON';
    this.id = id;
    this.dataset = ui ? { ui } : {};
    this.classList = new MockClassList();
    this.attributes = new Map();
    this.onclick = null;
    this.listenerCalls = [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    this.listenerCalls.push({ type, listener });
  }

  click() {
    this.onclick?.();
  }
}

class MockStorage {
  constructor(initial = {}, { throwsOn = null } = {}) {
    this.values = new Map(Object.entries(initial));
    this.throwsOn = throwsOn;
  }

  getItem(key) {
    if (this.throwsOn === 'getItem') throw new Error('denied');
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (this.throwsOn === 'setItem') throw new Error('denied');
    this.values.set(key, String(value));
  }
}

/**
 * Minimal stand-in for the document: resolves the module's compound selector
 * against the supplied candidates the way the DOM would (first match in
 * document order).
 */
function makeRoot({ buttons = [], withDocumentElement = true } = {}) {
  const matches = button => {
    if (MINI_POSTER_BUTTON_SELECTOR.includes(`#${button.id}`) && button.id) {
      return true;
    }

    return button.dataset.ui === 'miniPoster';
  };

  return {
    documentElement: withDocumentElement
      ? { classList: new MockClassList() }
      : null,
    querySelector(selector) {
      assert.equal(selector, MINI_POSTER_BUTTON_SELECTOR);
      return buttons.find(matches) ?? null;
    }
  };
}

test('selector covers both the id and the data-ui contract', () => {
  assert.match(MINI_POSTER_BUTTON_SELECTOR, /#toggle-mini-poster/);
  assert.match(
    MINI_POSTER_BUTTON_SELECTOR,
    /\[data-ui="miniPoster"\]/
  );
});

test('posters are visible by default and the chip reads as pressed', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });
  const storage = new MockStorage();

  const toggle = initMiniPosterToggle(root, storage);

  assert.equal(toggle.visible, true);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    false
  );
  assert.equal(button.classList.contains('active'), true);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(storage.getItem(MINI_POSTER_STORAGE_KEY), 'show');
});

test('clicking the chip hides the thumbnails and persists the choice', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });
  const storage = new MockStorage();

  initMiniPosterToggle(root, storage);

  button.click();

  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );
  assert.equal(button.classList.contains('active'), false);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(storage.getItem(MINI_POSTER_STORAGE_KEY), 'hide');

  button.click();

  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    false
  );
  assert.equal(button.classList.contains('active'), true);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(storage.getItem(MINI_POSTER_STORAGE_KEY), 'show');
});

test('a stored hide preference is applied before the first click', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });
  const storage = new MockStorage({
    [MINI_POSTER_STORAGE_KEY]: 'hide'
  });

  const toggle = initMiniPosterToggle(root, storage);

  assert.equal(toggle.visible, false);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );
  assert.equal(button.getAttribute('aria-pressed'), 'false');

  button.click();

  assert.equal(toggle.visible, true);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    false
  );
});

test('an unrecognised stored value falls back to showing posters', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });
  const storage = new MockStorage({
    [MINI_POSTER_STORAGE_KEY]: 'true'
  });

  const toggle = initMiniPosterToggle(root, storage);

  assert.equal(toggle.visible, true);
  assert.equal(storage.getItem(MINI_POSTER_STORAGE_KEY), 'show');
});

test('initializing twice still toggles exactly once per click', () => {
  // A second handler would flip the class twice and leave the chip dead —
  // the failure mode this module is written to avoid.
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });
  const storage = new MockStorage();

  initMiniPosterToggle(root, storage);
  initMiniPosterToggle(root, storage);

  assert.deepEqual(button.listenerCalls, []);

  button.click();

  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );

  button.click();

  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    false
  );
});

test('the chip is found through its data-ui contract alone', () => {
  const button = new MockButton({ id: '' });
  const root = makeRoot({ buttons: [button] });

  const toggle = initMiniPosterToggle(root, new MockStorage());

  assert.equal(toggle.visible, true);

  button.click();

  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );
});

test('the stored preference is honoured even without the chip in the markup', () => {
  const root = makeRoot({ buttons: [] });
  const storage = new MockStorage({
    [MINI_POSTER_STORAGE_KEY]: 'hide'
  });

  const toggle = initMiniPosterToggle(root, storage);

  assert.equal(toggle.visible, false);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );
});

test('unavailable storage does not break toggling', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });

  const toggle = initMiniPosterToggle(
    root,
    new MockStorage({}, { throwsOn: 'setItem' })
  );

  assert.equal(toggle.visible, true);

  button.click();

  assert.equal(toggle.visible, false);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );
});

test('the returned handle can show, hide and report visibility', () => {
  const button = new MockButton();
  const root = makeRoot({ buttons: [button] });

  const toggle = initMiniPosterToggle(root, new MockStorage());

  toggle.hide();
  assert.equal(toggle.visible, false);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    true
  );

  toggle.show();
  assert.equal(toggle.visible, true);
  assert.equal(
    root.documentElement.classList.contains(HIDE_MINI_POSTERS_CLASS),
    false
  );

  toggle.toggle();
  assert.equal(toggle.visible, false);
  assert.equal(button.getAttribute('aria-pressed'), 'false');
});

test('a missing chip is a no-op and a missing root returns null', () => {
  assert.notEqual(
    initMiniPosterToggle(makeRoot({}), new MockStorage()),
    null
  );

  assert.equal(
    initMiniPosterToggle(
      makeRoot({ withDocumentElement: false }),
      new MockStorage()
    ),
    null
  );
});
