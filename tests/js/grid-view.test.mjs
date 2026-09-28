import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderGridView,
  loadStoredView,
  storeView,
  VIEWS
} from '../../movie-catalog/public/assets/js/table/grid-view.js';

class MockGrid {
  constructor() {
    this.innerHTML = '';
    this.onclick = null;
    this.onkeydown = null;
    this.onerror = null;
    this._cleared = false;
  }

  replaceChildren() {
    this.innerHTML = '';
  }

  insertAdjacentHTML(position, html) {
    assert.equal(position, 'beforeend');
    this.innerHTML += html;
  }

  querySelector(selector) {
    if (selector === '.grid-clear-filters') {
      return {
        addEventListener() {},
        click() {
          this._cleared = true;
        }
      };
    }

    return null;
  }

  querySelectorAll() {
    return [];
  }

  contains() {
    return true;
  }
}

test('grid view renders one card per movie with escaped content', () => {
  const grid = new MockGrid();

  renderGridView(grid, [
    {
      NUM: '1',
      FORMATTEDTITLE: 'Arrival <script>alert(1)</script>',
      YEAR: '2016',
      RATING: '7.9',
      FILE: 'arrival.mkv',
      PICTURENAME: 'arrival.jpg'
    },
    {
      NUM: '11',
      FORMATTEDTITLE: 'Missing One',
      YEAR: '2001',
      RATING: '4.2',
      FILE: 'MISSING',
      PICTURENAME: null
    },
    {
      NUM: '51',
      FORMATTEDTITLE: 'Get Better Copy',
      YEAR: '2019',
      RATING: null,
      FILE: 'get-better-copy-Get.Better.Copy.mkv',
      PICTURENAME: 'gbc.jpg'
    }
  ]);

  const html = grid.innerHTML;

  assert.ok(html.includes('data-num="1"'));
  assert.ok(html.includes('data-num="11"'));
  assert.ok(html.includes('data-num="51"'));

  // XSS safety: titles are escaped
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));

  // Poster attributes: lazy, sized, correct URL, fallback when absent
  assert.ok(html.includes('loading="lazy"'));
  assert.ok(html.includes('decoding="async"'));
  assert.ok(
    html.includes('src="/movies/antexport/arrival.jpg"')
  );
  assert.ok(
    html.includes(
      'src="/movies/antexport/movies_0000-coming_soon.jpg"'
    )
  );

  // Rating tiers
  assert.ok(html.includes('rating-badge rating-good'));
  assert.ok(html.includes('rating-badge rating-bad'));

  // Status ribbons only where applicable
  assert.ok(html.includes('movie-card-status missing'));
  assert.ok(html.includes('movie-card-status better'));
  assert.ok(html.includes('class="movie-card missing-file"'));
  assert.ok(html.includes('class="movie-card better-copy"'));

  // No rating → no badge at all for that card
  const card51 = html.split('data-num="51"')[1].split('</article>')[0];
  assert.ok(!card51.includes('rating-badge'));
});

test('grid view renders an empty state with a clear-filters action', () => {
  const grid = new MockGrid();

  renderGridView(grid, []);

  assert.ok(grid.innerHTML.includes('movie-grid-empty'));
  assert.ok(
    grid.innerHTML.includes('Clear all filters')
  );
  assert.ok(typeof grid.onclick === 'undefined' || grid.onclick === null);
});

test('grid view ignores non-array payloads', () => {
  const grid = new MockGrid();

  renderGridView(grid, null);

  assert.ok(grid.innerHTML.includes('movie-grid-empty'));
});

test('view preference storage round-trips and falls back to table', () => {
  const store = new Map();

  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value))
  };

  assert.ok(VIEWS.includes('table'));
  assert.ok(VIEWS.includes('grid'));

  // No stored value → default
  assert.equal(loadStoredView(), 'table');

  storeView('grid');
  assert.equal(loadStoredView(), 'grid');

  store.set('movieCatalogView', 'bogus');
  assert.equal(loadStoredView(), 'table');
});
