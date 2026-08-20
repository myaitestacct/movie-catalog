import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCompleteStatsPayload
} from '../../movie-catalog/public/assets/js/core/api.js';

const completePayload = {
  total_movies: 250,
  years: 75,
  genres: 24,
  languages: 18,
  countries: 32,
  total_size: 1099511627776,
  average_rating: 7.4,
  average_runtime: 112,
  oldest_year: 1920,
  newest_year: 2026,
  health_score: 94,
  missing_files: 2,
  missing_posters: 3,
  incomplete_metadata: 5,
  needs_better_copy_count: 4,
  duplicate_count: 6
};

test('statistics validation accepts the complete dashboard payload', () => {
  assert.equal(isCompleteStatsPayload(completePayload), true);
});

test('statistics validation requires every dashboard metric', () => {
  for (const field of Object.keys(completePayload)) {
    const incompletePayload = { ...completePayload };
    delete incompletePayload[field];

    assert.equal(
      isCompleteStatsPayload(incompletePayload),
      false,
      `${field} should be required`
    );
  }
});

test('statistics validation accepts numeric database strings', () => {
  const databasePayload = Object.fromEntries(
    Object.entries(completePayload).map(([field, value]) => [field, String(value)])
  );

  assert.equal(isCompleteStatsPayload(databasePayload), true);
});

test('statistics validation rejects empty and non-numeric metrics', () => {
  assert.equal(
    isCompleteStatsPayload({ ...completePayload, average_rating: null }),
    false
  );
  assert.equal(
    isCompleteStatsPayload({ ...completePayload, oldest_year: '' }),
    false
  );
  assert.equal(
    isCompleteStatsPayload({ ...completePayload, health_score: 'healthy' }),
    false
  );
});  
