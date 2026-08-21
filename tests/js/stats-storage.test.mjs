import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createStorageViewModel
} from '../../movie-catalog/public/assets/js/stats/stats-storage.js';

test('storage model calculates coverage, formatted sizes, and band shares', () => {
  const model = createStorageViewModel({
    sized_movies: 3,
    unsized_movies: 1,
    total_size: 6442450944,
    average_size: 2147483648,
    median_size: 1610612736,
    largest_movie: {
      num: '42',
      title: 'Largest Movie',
      size: 3221225472
    },
    size_bands: [
      {
        key: 'compact',
        label: 'Under 700 MB',
        count: 2,
        total_size: 1073741824
      },
      {
        key: 'large',
        label: '3–5.99 GB',
        count: 1,
        total_size: 5368709120
      }
    ]
  }, 4);

  assert.equal(model.coverageLabel, '75%');
  assert.equal(model.totalSizeLabel, '6.00 GB');
  assert.equal(model.averageSizeLabel, '2.00 GB');
  assert.equal(model.medianSizeLabel, '1.50 GB');
  assert.deepEqual(model.largestMovie, {
    num: '42',
    title: 'Largest Movie',
    size: 3221225472,
    sizeLabel: '3.00 GB'
  });
  assert.deepEqual(
    model.sizeBands.map(band => ({
      key: band.key,
      relativeWidth: band.relativeWidth,
      shareLabel: band.shareLabel,
      totalSizeLabel: band.totalSizeLabel
    })),
    [
      {
        key: 'compact',
        relativeWidth: 100,
        shareLabel: '66.7%',
        totalSizeLabel: '1.00 GB'
      },
      {
        key: 'large',
        relativeWidth: 50,
        shareLabel: '33.3%',
        totalSizeLabel: '5.00 GB'
      }
    ]
  );
});

test('storage model handles a collection without file-size data', () => {
  const model = createStorageViewModel(undefined, 8);

  assert.equal(model.sizedMovies, 0);
  assert.equal(model.unsizedMovies, 8);
  assert.equal(model.totalMovies, 8);
  assert.equal(model.coverageLabel, '0%');
  assert.equal(model.totalSizeLabel, '0 B');
  assert.equal(model.averageSizeLabel, '–');
  assert.equal(model.medianSizeLabel, '–');
  assert.equal(model.largestMovie, null);
  assert.deepEqual(model.sizeBands, []);
});
