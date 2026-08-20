import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRatingRuntimeViewModel
} from '../../movie-catalog/public/assets/js/stats/stats-rating-runtime.js';

test('rating/runtime view model calculates coverage and band shares', () => {
  const model = createRatingRuntimeViewModel({
    rated_movies: 80,
    unrated_movies: 20,
    runtime_known_movies: 90,
    runtime_missing_movies: 10,
    top_rating_band: { key: '7-range', label: '7–7.9', count: 40 },
    common_runtime_band: {
      key: 'standard',
      label: '90–119 min',
      count: 45
    },
    rating_bands: [
      { key: 'under-5', label: 'Under 5', count: 10 },
      { key: '7-range', label: '7–7.9', count: 40 }
    ],
    runtime_bands: [
      { key: 'short', label: 'Under 90 min', count: 15 },
      { key: 'standard', label: '90–119 min', count: 45 }
    ]
  }, 100);

  assert.equal(model.ratedCoverageLabel, '80%');
  assert.equal(model.runtimeCoverageLabel, '90%');
  assert.equal(model.topRatingBand.label, '7–7.9');
  assert.equal(model.commonRuntimeBand.label, '90–119 min');
  assert.equal(model.ratingBands[1].relativeWidth, 100);
  assert.equal(model.ratingBands[1].shareLabel, '50%');
  assert.equal(model.runtimeBands[1].shareLabel, '50%');
});

test('rating/runtime view model handles missing metadata', () => {
  const model = createRatingRuntimeViewModel({
    rated_movies: 0,
    unrated_movies: 25,
    runtime_known_movies: 0,
    runtime_missing_movies: 25,
    top_rating_band: null,
    common_runtime_band: null,
    rating_bands: [],
    runtime_bands: []
  }, 25);

  assert.equal(model.ratedCoverageLabel, '0%');
  assert.equal(model.runtimeCoverageLabel, '0%');
  assert.equal(model.topRatingBand, null);
  assert.equal(model.commonRuntimeBand, null);
  assert.deepEqual(model.ratingBands, []);
  assert.deepEqual(model.runtimeBands, []);
});
