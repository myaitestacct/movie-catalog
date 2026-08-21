import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createTechnicalFormatViewModel
} from '../../movie-catalog/public/assets/js/stats/stats-technical-formats.js';

test('technical-format model calculates coverage and distribution shares', () => {
  const model = createTechnicalFormatViewModel({
    resolutions: {
      tagged_movies: 90,
      untagged_movies: 10,
      assignments: 95,
      top_item: { label: '1080p', count: 60 },
      items: [
        { label: '4K', count: 20 },
        { label: '1080p', count: 60 }
      ]
    },
    audio_formats: {
      tagged_movies: 80,
      untagged_movies: 20,
      assignments: 100,
      top_item: { label: 'DTS', count: 40 },
      items: [
        { label: 'AAC', count: 20 },
        { label: 'DTS', count: 40 }
      ]
    }
  }, 100);

  assert.equal(model.resolutions.coverageLabel, '90%');
  assert.equal(model.audioFormats.coverageLabel, '80%');
  assert.equal(model.resolutions.topItem.label, '1080p');
  assert.equal(model.audioFormats.topItem.label, 'DTS');
  assert.equal(model.resolutions.items[0].relativeWidth, 100);
  assert.equal(model.resolutions.items[0].shareLabel, '66.7%');
  assert.equal(model.audioFormats.items[0].shareLabel, '50%');
});

test('technical-format model limits each displayed distribution', () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    label: `Format ${index + 1}`,
    count: 12 - index
  }));
  const facet = {
    tagged_movies: 50,
    untagged_movies: 0,
    assignments: 60,
    top_item: items[0],
    items
  };
  const model = createTechnicalFormatViewModel({
    resolutions: facet,
    audio_formats: facet
  }, 50, 10);

  assert.equal(model.resolutions.totalItems, 12);
  assert.equal(model.resolutions.items.length, 10);
  assert.equal(model.audioFormats.items.length, 10);
});

test('technical-format model treats a missing section as untagged data', () => {
  const model = createTechnicalFormatViewModel(undefined, 25);

  assert.equal(model.resolutions.coverageLabel, '0%');
  assert.equal(model.resolutions.untaggedMovies, 25);
  assert.equal(model.audioFormats.coverageLabel, '0%');
  assert.equal(model.audioFormats.untaggedMovies, 25);
  assert.equal(model.resolutions.topItem, null);
  assert.equal(model.audioFormats.topItem, null);
  assert.deepEqual(model.resolutions.items, []);
  assert.deepEqual(model.audioFormats.items, []);
});
