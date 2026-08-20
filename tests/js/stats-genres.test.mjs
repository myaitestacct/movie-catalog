import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createGenreViewModel
} from '../../movie-catalog/public/assets/js/stats/stats-genres.js';

test('genre view model calculates coverage, averages, and shares', () => {
  const model = createGenreViewModel({
    tagged_movies: 80,
    untagged_movies: 20,
    genre_assignments: 160,
    top_genre: { label: 'Drama', count: 40 },
    genres: [
      { label: 'Comedy', count: 20 },
      { label: 'Drama', count: 40 },
      { label: 'Action', count: 30 }
    ]
  }, 100);

  assert.equal(model.coverageLabel, '80%');
  assert.equal(model.averageGenresLabel, '2.0');
  assert.equal(model.topGenre.label, 'Drama');
  assert.deepEqual(
    model.genres.map(genre => genre.label),
    ['Drama', 'Action', 'Comedy']
  );
  assert.equal(model.genres[0].relativeWidth, 100);
  assert.equal(model.genres[0].shareLabel, '50%');
});

test('genre view model limits the displayed distribution', () => {
  const genres = Array.from({ length: 20 }, (_, index) => ({
    label: `Genre ${index + 1}`,
    count: 20 - index
  }));
  const model = createGenreViewModel({
    tagged_movies: 100,
    untagged_movies: 0,
    genre_assignments: 210,
    top_genre: genres[0],
    genres
  }, 100, 12);

  assert.equal(model.totalGenres, 20);
  assert.equal(model.genres.length, 12);
});

test('genre view model handles an untagged collection', () => {
  const model = createGenreViewModel({
    tagged_movies: 0,
    untagged_movies: 50,
    genre_assignments: 0,
    top_genre: null,
    genres: []
  }, 50);

  assert.equal(model.coverageLabel, '0%');
  assert.equal(model.averageGenresLabel, '0.0');
  assert.equal(model.topGenre, null);
  assert.deepEqual(model.genres, []);
});
