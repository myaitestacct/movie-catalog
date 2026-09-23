import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createMovieLoader } from '../../movie-catalog/public/assets/js/core/movie-loader.js';
import { state, getMovieStateSignature } from '../../movie-catalog/public/assets/js/core/state.js';

beforeEach(() => {
  Object.assign(state, {
    page: 1, limit: 50, sort: 'NUM', dir: 'ASC', search: {},
    searchMode: 'AND', titleSearchMode: 'FUZZY', fuzzy: true
  });
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function setup(overrides = {}) {
  const requests = [];
  const rendered = [];
  const errors = [];
  const finishes = [];
  const load = createMovieLoader({
    render: data => rendered.push(data),
    onError: error => errors.push(error),
    onFinish: isCurrent => finishes.push(isCurrent),
    waitBeforeFetch: () => Promise.resolve(),
    // Deliberately ignore abort here: a cancelled response must still never
    // render, even if a transport or an already-parsed response finishes late.
    fetchPage(params, options) {
      const request = { ...deferred(), params, ...options };
      requests.push(request);
      return request.promise;
    },
    ...overrides
  });
  return { load, requests, rendered, errors, finishes };
}

test('a successful load snapshots the query, forwards a signal, and returns true', async () => {
  state.search = { FORMATTEDTITLE: 'Arrival (2016)', FILEPATH: 'missing', YEAR: '' };
  state.page = 2;
  const { load, requests, rendered, finishes } = setup();
  const result = load();
  await Promise.resolve();

  assert.deepEqual(Object.fromEntries(requests[0].params), {
    page: '2', limit: '50', sort: 'NUM', dir: 'ASC', mode: 'AND',
    titleMode: 'FUZZY', FORMATTEDTITLE: 'Arrival (2016)', FILEPATH: 'missing', fuzzy: 'true'
  });
  assert.ok(requests[0].signal instanceof AbortSignal);
  const data = { data: [], page: 2, limit: 50, pages: 2, total: 55 };
  requests[0].resolve(data);
  assert.equal(await result, true);
  assert.deepEqual(rendered, [data]);
  assert.equal(finishes.length, 1);
  assert.equal(finishes[0](), true);
});

test('a newer page wins even when an aborted response arrives last', async () => {
  const { load, requests, rendered, errors, finishes } = setup();
  const first = load();
  await Promise.resolve();
  state.page = 2;
  const second = load();
  await Promise.resolve();

  assert.equal(requests[0].signal.aborted, true);
  assert.equal(requests[1].signal.aborted, false);
  requests[1].resolve('page 2');
  assert.equal(await second, true);
  requests[0].resolve('page 1');
  assert.equal(await first, false);
  assert.deepEqual(rendered, ['page 2']);
  assert.deepEqual(errors, []);
  assert.equal(finishes.length, 1, 'old loads cannot reset the newer load UI');
});

test('a late failure cannot replace a newer successful result with an error', async () => {
  const { load, requests, rendered, errors } = setup();
  const first = load();
  await Promise.resolve();
  const second = load();
  await Promise.resolve();
  requests[1].resolve('fresh');
  await second;
  requests[0].reject(new Error('obsolete failure'));
  assert.equal(await first, false);
  assert.deepEqual(errors, []);
  assert.deepEqual(rendered, ['fresh']);
});

test('starting another load during the fade delay avoids the obsolete fetch', async () => {
  const delays = [];
  const { load, requests } = setup({
    waitBeforeFetch() {
      const delay = deferred();
      delays.push(delay);
      return delay.promise;
    }
  });
  const first = load();
  state.sort = 'YEAR';
  const second = load();
  delays[0].resolve();
  assert.equal(await first, false);
  assert.equal(requests.length, 0);
  delays[1].resolve();
  await Promise.resolve();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].params.get('sort'), 'YEAR');
  requests[0].resolve('sorted');
  assert.equal(await second, true);
});

test('typing during the debounce invalidates an in-flight response immediately', async () => {
  const { load, requests, rendered } = setup();
  const result = load();
  await Promise.resolve();
  state.search.FILEPATH = 'missing';
  requests[0].resolve('unfiltered movies');
  assert.equal(await result, false);
  assert.deepEqual(rendered, []);
});

test('changing filters during the fade delay prevents fetching an obsolete query', async () => {
  const delay = deferred();
  const { load, requests } = setup({ waitBeforeFetch: () => delay.promise });
  const result = load();
  state.search.FORMATTEDTITLE = 'Arrival';
  delay.resolve();
  assert.equal(await result, false);
  assert.equal(requests.length, 0);
});

test('a current error returns false, reports it, and permits retry', async () => {
  const { load, requests, rendered, errors } = setup();
  const first = load();
  await Promise.resolve();
  const error = new Error('server unavailable');
  requests[0].reject(error);
  assert.equal(await first, false);
  assert.deepEqual(errors, [error]);
  assert.deepEqual(rendered, []);

  const retry = load();
  await Promise.resolve();
  requests[1].resolve('recovered');
  assert.equal(await retry, true);
  assert.deepEqual(rendered, ['recovered']);
});

test('aborts do not display error banners', async () => {
  const { load, requests, errors } = setup();
  const result = load();
  await Promise.resolve();
  requests[0].reject(new DOMException('Cancelled', 'AbortError'));
  assert.equal(await result, false);
  assert.deepEqual(errors, []);
});

test('a queued finish animation can detect that a new request has started', async () => {
  const { load, requests, finishes } = setup();
  const first = load();
  await Promise.resolve();
  requests[0].resolve('first');
  await first;
  const canFinish = finishes[0];
  const second = load();
  assert.equal(canFinish(), false);
  await Promise.resolve();
  requests[1].resolve('second');
  await second;
});

test('query signatures ignore filter insertion order and UI-only changes', () => {
  state.search = { YEAR: '2016', FORMATTEDTITLE: 'Arrival' };
  const signature = getMovieStateSignature();
  state.search = { FORMATTEDTITLE: 'Arrival', YEAR: '2016' };
  state.columnVisibility = { FILEPATH: true };
  state.totalPages = 3;
  assert.equal(getMovieStateSignature(), signature);
  state.titleSearchMode = 'EXACT';
  assert.notEqual(getMovieStateSignature(), signature);
});
