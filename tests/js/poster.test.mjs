import test from 'node:test';
import assert from 'node:assert/strict';

import { setPoster } from '../../movie-catalog/public/assets/js/modal/modal.utils.js';

const BASE_PATH = '/movies/antexport';
const FALLBACK = '/movies/antexport/movies_0000-coming_soon.jpg';

test('poster uses the requested encoded filename', () => {
  const image = {
    src: '',
    onerror: null
  };

  setPoster(
    image,
    'Sing poster.jpg',
    BASE_PATH,
    FALLBACK
  );

  assert.equal(
    image.src,
    '/movies/antexport/Sing%20poster.jpg'
  );
  assert.equal(typeof image.onerror, 'function');
});

test('poster failure switches to fallback and clears the handler first', () => {
  const assignments = [];
  const image = {
    onerror: null,
    set src(value) {
      assignments.push({
        value,
        handler: this.onerror
      });
    },
    get src() {
      return assignments.at(-1)?.value || '';
    }
  };

  setPoster(
    image,
    'missing.jpg',
    BASE_PATH,
    FALLBACK
  );

  assert.equal(image.src, '/movies/antexport/missing.jpg');
  assert.equal(typeof image.onerror, 'function');

  const primaryErrorHandler = image.onerror;
  primaryErrorHandler();

  assert.equal(image.onerror, null);
  assert.equal(image.src, FALLBACK);
  assert.equal(assignments.length, 2);
  assert.equal(assignments[1].handler, null);
});

test('missing picture name uses fallback without installing an error loop', () => {
  const image = {
    src: '',
    onerror: () => {}
  };

  setPoster(
    image,
    '',
    BASE_PATH,
    FALLBACK
  );

  assert.equal(image.src, FALLBACK);
  assert.equal(image.onerror, null);
});

test('missing image element is ignored', () => {
  assert.doesNotThrow(() => {
    setPoster(null, 'poster.jpg', BASE_PATH, FALLBACK);
  });
});
