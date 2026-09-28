import test from 'node:test';
import assert from 'node:assert/strict';
import { state, TITLE_SEARCH_MODES } from '../../movie-catalog/public/assets/js/core/state.js';

test('search defaults to contains matching without the fuzzy flag', () => {
  assert.equal(state.titleSearchMode, 'CONTAINS');
  assert.ok(TITLE_SEARCH_MODES.includes(state.titleSearchMode));
  assert.equal(state.fuzzy, false);
});
