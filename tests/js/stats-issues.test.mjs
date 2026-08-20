import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countGroupedRows,
  groupMovieRows,
  LIBRARY_ISSUE_CONFIG
} from '../../movie-catalog/public/assets/js/stats/stats-issues.js';

test('library issue configuration exposes all clickable health lists', () => {
  assert.deepEqual(
    Object.keys(LIBRARY_ISSUE_CONFIG),
    ['missing-files', 'missing-posters', 'incomplete-metadata']
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-files'].cardId,
    'missing-files-card'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-files'].metricId,
    'missing-files'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-posters'].countField,
    'missing_posters'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['incomplete-metadata'].paginationLabel,
    'Incomplete metadata pagination'
  );
});

test('movie rows are grouped for expandable issue-list entries', () => {
  const rows = [
    {
      NUM: '1',
      ORIGINALTITLE: 'Alien',
      FORMATTEDTITLE: 'Alien',
      YEAR: '1979',
      URL: 'https://www.imdb.com/title/tt0078748/'
    },
    {
      NUM: '2',
      ORIGINALTITLE: 'Alien',
      FORMATTEDTITLE: 'Alien',
      YEAR: '1979',
      URL: 'https://www.imdb.com/title/tt0078748/'
    },
    {
      NUM: '3',
      ORIGINALTITLE: '   ',
      FORMATTEDTITLE: 'Arrival',
      YEAR: '2016',
      URL: ''
    }
  ];

  const groups = groupMovieRows(rows);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].title, 'Alien');
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].rows.length, 2);
  assert.equal(groups[1].title, 'Arrival');
  assert.equal(countGroupedRows(groups), 3);
});

test('movie grouping supplies a readable fallback for missing titles', () => {
  const groups = groupMovieRows([
    {
      NUM: '42',
      ORIGINALTITLE: null,
      FORMATTEDTITLE: '',
      YEAR: null,
      URL: null
    }
  ]);

  assert.equal(groups[0].title, 'Movie #42');
  assert.equal(groups[0].year, '');
  assert.equal(groups[0].url, '');
});
