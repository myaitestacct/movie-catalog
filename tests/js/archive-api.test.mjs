import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { fetchMovies, fetchDuplicates } from '../../public/assets/js/core/api.js';
import { state } from '../../public/assets/js/core/state.js';

const completePage = {
  data: [],
  page: 1,
  limit: 50,
  pages: 1,
  total: 0
};

let originalFetch;
let originalBaseUrl;

function stubFetch(capturedUrls, body) {
  globalThis.fetch = async url => {
    capturedUrls.push(String(url));
    return {
      ok: true,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(body)
    };
  };
}

beforeEach(() => {
  state.archive = false;
  originalFetch = globalThis.fetch;
  originalBaseUrl = globalThis.BASE_URL;
  globalThis.BASE_URL = '';
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalBaseUrl === undefined) {
    delete globalThis.BASE_URL;
  } else {
    globalThis.BASE_URL = originalBaseUrl;
  }

  state.archive = false;
});

test('archive view appends archive=1 centrally to every API request', async () => {
  const urls = [];
  stubFetch(urls, completePage);

  state.archive = true;
  await fetchMovies(new URLSearchParams({ page: '1' }));

  const movieUrl = new URL(urls[0], 'http://localhost');
  assert.equal(movieUrl.pathname, '/api/movies.php');
  assert.equal(movieUrl.searchParams.get('archive'), '1');
  assert.equal(movieUrl.searchParams.get('page'), '1');

  stubFetch(urls, []);
  await fetchDuplicates();

  const duplicatesUrl = new URL(urls[1], 'http://localhost');
  assert.equal(duplicatesUrl.pathname, '/api/duplicates.php');
  assert.equal(duplicatesUrl.searchParams.get('archive'), '1');
});

test('the default view sends no archive flag at all', async () => {
  const urls = [];
  stubFetch(urls, completePage);

  await fetchMovies(new URLSearchParams({ page: '2' }));

  const movieUrl = new URL(urls[0], 'http://localhost');
  assert.equal(movieUrl.searchParams.has('archive'), false);
});

test('an explicit archive parameter on the query is never duplicated', async () => {
  const urls = [];
  stubFetch(urls, completePage);

  state.archive = true;
  await fetchMovies(new URLSearchParams({ archive: '1', page: '1' }));

  const movieUrl = new URL(urls[0], 'http://localhost');
  assert.deepEqual(movieUrl.searchParams.getAll('archive'), ['1']);
});
