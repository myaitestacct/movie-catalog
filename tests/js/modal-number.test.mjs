import test from 'node:test';
import assert from 'node:assert/strict';

class MockClassList {
  constructor() {
    this.values = new Set();
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
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = new MockClassList();
    this.style = {};
    this.id = '';
    this.className = '';
    this.type = '';
    this.title = '';
    this.tabIndex = 0;
    this.disabled = false;
    this.inert = false;
    this.isConnected = true;
    this._textContent = '';
  }

  set textContent(value) {
    this._textContent = String(value ?? '');
    this.children = [];
  }

  get textContent() {
    return this._textContent;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    delete this[name];
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  focus() {
    document.activeElement = this;
  }

  contains(element) {
    if (element === this) return true;
    return this.children.some(child =>
      child instanceof MockElement && child.contains(element)
    );
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach(child => this.appendChild(child));
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      return findElement(this, element => element.id === selector.slice(1));
    }

    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      return findElement(
        this,
        element => element.className.split(/\s+/).includes(className)
      );
    }

    return null;
  }

  querySelectorAll() {
    return [];
  }
}

function findElement(root, predicate) {
  if (predicate(root)) return root;

  for (const child of root.children) {
    if (!(child instanceof MockElement)) continue;

    const match = findElement(child, predicate);
    if (match) return match;
  }

  return null;
}

function findElements(root, predicate, results = []) {
  if (predicate(root)) results.push(root);

  for (const child of root.children) {
    if (child instanceof MockElement) {
      findElements(child, predicate, results);
    }
  }

  return results;
}

const documentListeners = new Map();
const activeMovieRow = new MockElement('tr');

globalThis.document = {
  body: new MockElement('body'),
  activeElement: null,
  createElement(tagName) {
    return new MockElement(tagName);
  },
  createTextNode(text) {
    const node = new MockElement('#text');
    node.textContent = text;
    return node;
  },
  addEventListener(type, listener) {
    documentListeners.set(type, listener);
  },
  querySelector(selector) {
    if (selector.startsWith('tr[data-num=')) return activeMovieRow;
    return this.body.querySelector(selector);
  }
};

globalThis.requestAnimationFrame = callback => {
  callback();
  return 1;
};

const { createModalDOM } = await import(
  '../../movie-catalog/public/assets/js/modal/modal.dom.js'
);
const { fillFields } = await import(
  '../../movie-catalog/public/assets/js/modal/modal.utils.js'
);
const { Modal } = await import(
  '../../movie-catalog/public/assets/js/modal/modal.js'
);

test('movie-number field contains one persistent span and copy button', () => {
  const { modal } = createModalDOM();
  const numberField = modal.querySelector('#modalNum');

  assert.ok(numberField);

  const numberSpans = findElements(
    numberField,
    element => element.className.split(/\s+/).includes('num-value')
  );
  const copyButtons = findElements(
    numberField,
    element =>
      element.tagName === 'BUTTON' &&
      element.className.split(/\s+/).includes('copy-btn')
  );

  assert.equal(numberSpans.length, 1);
  assert.equal(copyButtons.length, 1);
  assert.equal(copyButtons[0].type, 'button');
  assert.equal(copyButtons[0].title, 'Copy Num');
});

test('updating ordinary modal fields does not rebuild movie-number controls', () => {
  const { modal } = createModalDOM();
  const numberField = modal.querySelector('#modalNum');
  const originalChildren = [...numberField.children];

  fillFields(modal, {
    modalYear: 2016,
    modalLength: 108
  });

  assert.deepEqual(numberField.children, originalChildren);
  assert.equal(
    findElements(
      numberField,
      element => element.tagName === 'BUTTON'
    ).length,
    1
  );
});

test('modal DOM exposes accessible labels and poster controls', () => {
  const {
    modal,
    content,
    poster,
    posterZoom,
    posterZoomImg,
    prevBtn,
    nextBtn,
    closeBtn
  } = createModalDOM();

  assert.equal(modal.getAttribute('role'), 'dialog');
  assert.equal(modal.getAttribute('aria-modal'), 'true');
  assert.equal(modal.getAttribute('aria-hidden'), 'true');
  assert.equal(content.tabIndex, -1);

  assert.equal(prevBtn.type, 'button');
  assert.equal(prevBtn.getAttribute('aria-label'), 'Previous movie');
  assert.equal(nextBtn.type, 'button');
  assert.equal(nextBtn.getAttribute('aria-label'), 'Next movie');
  assert.equal(closeBtn.type, 'button');
  assert.equal(closeBtn.getAttribute('aria-label'), 'Close movie details');

  assert.equal(poster.alt, 'Movie poster');
  assert.equal(poster.tabIndex, 0);
  assert.equal(poster.getAttribute('role'), 'button');
  assert.equal(poster.getAttribute('aria-label'), 'Enlarge movie poster');

  assert.equal(posterZoom.getAttribute('role'), 'dialog');
  assert.equal(posterZoom.getAttribute('aria-hidden'), 'true');
  assert.equal(posterZoomImg.alt, 'Enlarged movie poster');
});

test('opening and closing modal isolates background and restores focus', () => {
  document.body.children = [];
  activeMovieRow.classList = new MockClassList();

  const trigger = new MockElement('a');
  document.body.appendChild(trigger);
  document.activeElement = trigger;

  Modal.setMovies([]);
  Modal.show({
    NUM: 42,
    FORMATTEDTITLE: 'Sing',
    YEAR: 2016,
    LENGTH: 108,
    CERTIFICATION: 'PG',
    LANGUAGES: 'English',
    CATEGORY: 'Animation',
    COUNTRY: 'USA',
    DIRECTOR: 'Garth Jennings',
    ACTORS: 'Matthew McConaughey',
    FILESIZE: 1000,
    RESOLUTION: '1080p',
    AUDIOFORMAT: 'AAC',
    SUBTITLES: 'English',
    FILEPATH: 'C:\\Movies\\Sing.mkv',
    URL: 'https://www.imdb.com/title/tt3470600/',
    PICTURENAME: 'sing.jpg'
  });

  const modal = document.body.querySelector('#movieModal');
  const closeButton = modal.querySelector('.modal-close');

  assert.equal(modal.classList.contains('open'), true);
  assert.equal(modal.getAttribute('aria-hidden'), 'false');
  assert.equal(trigger.inert, true);
  assert.equal(trigger.getAttribute('aria-hidden'), 'true');
  assert.equal(document.activeElement, closeButton);
  assert.equal(activeMovieRow.classList.contains('active-movie-row'), true);

  closeButton.onclick();

  assert.equal(modal.classList.contains('open'), false);
  assert.equal(modal.getAttribute('aria-hidden'), 'true');
  assert.equal(trigger.inert, false);
  assert.equal(trigger.getAttribute('aria-hidden'), null);
  assert.equal(document.activeElement, trigger);
  assert.equal(activeMovieRow.classList.contains('active-movie-row'), false);
});
