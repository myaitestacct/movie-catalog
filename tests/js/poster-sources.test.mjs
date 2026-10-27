import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { state } from '../../public/assets/js/core/state.js';
import {
  POSTER_FALLBACK_FILE,
  POSTER_SOURCES,
  getPosterSource,
  posterUrl
} from '../../public/assets/js/core/poster-sources.js';

beforeEach(() => {
  state.archive = false;
});

test('the main library keeps the antexport poster tree', () => {
  assert.deepEqual(getPosterSource(), POSTER_SOURCES.movies);
  assert.equal(
    getPosterSource().base,
    '/movies/antexport'
  );
  assert.equal(
    getPosterSource().fallback,
    `/movies/antexport/${POSTER_FALLBACK_FILE}`
  );
});

test('the archive view resolves posters under movies_template/paripakva', () => {
  state.archive = true;

  assert.deepEqual(getPosterSource(), POSTER_SOURCES.paripakva);
  assert.equal(
    getPosterSource().base,
    '/movies_template/paripakva'
  );
  assert.equal(
    getPosterSource().fallback,
    `/movies_template/paripakva/${POSTER_FALLBACK_FILE}`
  );
});

test('an explicit archive argument overrides the global state', () => {
  state.archive = false;
  assert.equal(
    getPosterSource(true).base,
    '/movies_template/paripakva'
  );

  state.archive = true;
  assert.equal(
    getPosterSource(false).base,
    '/movies/antexport'
  );
});

test('posterUrl encodes the picture name and falls back per source', () => {
  assert.equal(
    posterUrl('Sing poster.jpg'),
    '/movies/antexport/Sing%20poster.jpg'
  );
  assert.equal(
    posterUrl('', true),
    '/movies_template/paripakva/movies_0000-coming_soon.jpg'
  );
  assert.equal(
    posterUrl(null, true),
    '/movies_template/paripakva/movies_0000-coming_soon.jpg'
  );
  assert.equal(
    posterUrl('paripakva-title.jpg', true),
    '/movies_template/paripakva/paripakva-title.jpg'
  );
});

test('the source map cannot be mutated at runtime', () => {
  assert.throws(() => {
    POSTER_SOURCES.paripakva.base = '/elsewhere';
  }, TypeError);
});
