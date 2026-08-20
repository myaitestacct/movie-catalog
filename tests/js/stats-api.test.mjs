import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCompleteReleaseYearAnalytics,
  isCompleteStatsPayload,
  parseJsonResponseBody
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
  duplicate_count: 6,
  release_year_analytics: {
    dated_movies: 240,
    undated_movies: 10,
    peak_year: { year: 1999, count: 12 },
    busiest_decade: {
      start_year: 1990,
      label: '1990s',
      count: 60
    },
    years: [
      { year: 1999, count: 12 },
      { year: 2000, count: 8 }
    ],
    decades: [
      { start_year: 1990, label: '1990s', count: 60 },
      { start_year: 2000, label: '2000s', count: 45 }
    ]
  }
};

test('JSON response parsing tolerates whitespace and byte-order marks', () => {
  assert.deepEqual(
    parseJsonResponseBody('\uFEFF  {"ok":true}\n'),
    { ok: true }
  );
});

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
  const databasePayload = JSON.parse(
    JSON.stringify(completePayload),
    (_field, value) => typeof value === 'number' ? String(value) : value
  );

  assert.equal(isCompleteStatsPayload(databasePayload), true);
});

test('release-year validation rejects malformed chart data', () => {
  assert.equal(
    isCompleteReleaseYearAnalytics({
      ...completePayload.release_year_analytics,
      years: [{ year: 1999, count: 'many' }]
    }),
    false
  );
  assert.equal(
    isCompleteReleaseYearAnalytics({
      ...completePayload.release_year_analytics,
      busiest_decade: { label: '1990s', count: 60 }
    }),
    false
  );
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
