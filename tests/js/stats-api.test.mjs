import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCompleteGenreAnalytics,
  isCompleteLanguageCountryAnalytics,
  isCompleteRatingRuntimeAnalytics,
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
  },
  genre_analytics: {
    tagged_movies: 225,
    untagged_movies: 25,
    genre_assignments: 410,
    top_genre: { label: 'Drama', count: 120 },
    genres: [
      { label: 'Drama', count: 120 },
      { label: 'Comedy', count: 80 }
    ]
  },
  rating_runtime_analytics: {
    rated_movies: 230,
    unrated_movies: 20,
    runtime_known_movies: 240,
    runtime_missing_movies: 10,
    top_rating_band: { key: '7-range', label: '7–7.9', count: 75 },
    common_runtime_band: {
      key: 'standard',
      label: '90–119 min',
      count: 110
    },
    rating_bands: [
      { key: 'under-5', label: 'Under 5', count: 10 },
      { key: '7-range', label: '7–7.9', count: 75 }
    ],
    runtime_bands: [
      { key: 'standard', label: '90–119 min', count: 110 },
      { key: 'long', label: '120–149 min', count: 60 }
    ]
  },
  language_country_analytics: {
    languages: {
      tagged_movies: 240,
      untagged_movies: 10,
      assignments: 300,
      top_item: { label: 'English', count: 200 },
      items: [
        { label: 'English', count: 200 },
        { label: 'French', count: 40 }
      ]
    },
    countries: {
      tagged_movies: 230,
      untagged_movies: 20,
      assignments: 280,
      top_item: { label: 'USA', count: 150 },
      items: [
        { label: 'USA', count: 150 },
        { label: 'UK', count: 50 }
      ]
    }
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

test('statistics validation requires every core dashboard metric', () => {
  const optionalAnalytics = new Set([
    'release_year_analytics',
    'genre_analytics',
    'rating_runtime_analytics',
    'language_country_analytics'
  ]);

  for (const field of Object.keys(completePayload)) {
    if (optionalAnalytics.has(field)) continue;

    const incompletePayload = { ...completePayload };
    delete incompletePayload[field];

    assert.equal(
      isCompleteStatsPayload(incompletePayload),
      false,
      `${field} should be required`
    );
  }
});

test('statistics validation permits independently deployed analytics sections', () => {
  const corePayload = { ...completePayload };
  delete corePayload.release_year_analytics;
  delete corePayload.genre_analytics;
  delete corePayload.rating_runtime_analytics;
  delete corePayload.language_country_analytics;

  assert.equal(isCompleteStatsPayload(corePayload), true);
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

test('genre validation rejects malformed distribution data', () => {
  assert.equal(
    isCompleteGenreAnalytics({
      ...completePayload.genre_analytics,
      genres: [{ label: '', count: 10 }]
    }),
    false
  );
  assert.equal(
    isCompleteGenreAnalytics({
      ...completePayload.genre_analytics,
      genre_assignments: 'many'
    }),
    false
  );
});

test('rating/runtime validation rejects malformed band data', () => {
  assert.equal(
    isCompleteRatingRuntimeAnalytics({
      ...completePayload.rating_runtime_analytics,
      rating_bands: [{ key: '', label: 'Broken', count: 5 }]
    }),
    false
  );
  assert.equal(
    isCompleteRatingRuntimeAnalytics({
      ...completePayload.rating_runtime_analytics,
      runtime_missing_movies: 'unknown'
    }),
    false
  );
});

test('language/country validation rejects malformed facet data', () => {
  assert.equal(
    isCompleteLanguageCountryAnalytics({
      ...completePayload.language_country_analytics,
      languages: {
        ...completePayload.language_country_analytics.languages,
        items: [{ label: '', count: 1 }]
      }
    }),
    false
  );
  assert.equal(
    isCompleteLanguageCountryAnalytics({
      ...completePayload.language_country_analytics,
      countries: {
        ...completePayload.language_country_analytics.countries,
        assignments: 'many'
      }
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
