import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDirectorViewModel
} from '../../movie-catalog/public/assets/js/stats/stats-directors.js';

test('director model calculates coverage, credits, averages, and shares', () => {
  const model = createDirectorViewModel({
    tagged_movies: 50,
    untagged_movies: 10,
    assignments: 60,
    top_item: { label: 'Christopher Nolan', count: 10 },
    items: [
      { label: 'Denis Villeneuve', count: 5 },
      { label: 'Christopher Nolan', count: 10 }
    ]
  }, 60);

  assert.equal(model.coverageLabel, '83.3%');
  assert.equal(model.assignments, 60);
  assert.equal(model.averageDirectors, 1.2);
  assert.equal(model.averageDirectorsLabel, '1.2');
  assert.equal(model.topItem.label, 'Christopher Nolan');
  assert.equal(model.items[0].relativeWidth, 100);
  assert.equal(model.items[0].shareLabel, '20%');
  assert.equal(model.items[1].relativeWidth, 50);
});

test('director model limits the chart while retaining the unique total', () => {
  const items = Array.from({ length: 14 }, (_, index) => ({
    label: `Director ${index + 1}`,
    count: 14 - index
  }));
  const model = createDirectorViewModel({
    tagged_movies: 100,
    untagged_movies: 0,
    assignments: 120,
    top_item: items[0],
    items
  }, 100, 10);

  assert.equal(model.totalItems, 14);
  assert.equal(model.items.length, 10);
  assert.equal(model.items[0].label, 'Director 1');
});

test('director model treats a missing section as missing credits', () => {
  const model = createDirectorViewModel(undefined, 25);

  assert.equal(model.coverageLabel, '0%');
  assert.equal(model.taggedMovies, 0);
  assert.equal(model.untaggedMovies, 25);
  assert.equal(model.assignments, 0);
  assert.equal(model.averageDirectorsLabel, '0.0');
  assert.equal(model.topItem, null);
  assert.equal(model.totalItems, 0);
  assert.deepEqual(model.items, []);
});
