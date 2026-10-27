import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  renderGridView,
  loadStoredView,
  storeView,
  VIEWS
} from '../../public/assets/js/table/grid-view.js';
import { state } from '../../public/assets/js/core/state.js';

beforeEach(() => {
  state.archive = false;
});

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

test('the rating badge is the movie page link and keeps its own click', () => {
  const grid = new MockGrid();

  renderGridView(grid, [
    {
      NUM: '1',
      FORMATTEDTITLE: 'Arrival',
      RATING: '7.9',
      URL: 'https://www.imdb.com/title/tt2543164/'
    },
    {
      NUM: '2',
      FORMATTEDTITLE: 'Unsafe',
      RATING: '6.0',
      URL: 'javascript:alert(1)'
    }
  ]);

  const html = grid.innerHTML;

  // Safe URL → a real link in a new tab
  assert.ok(html.includes('class="rating-badge rating-good"'));
  assert.ok(html.includes('href="https://www.imdb.com/title/tt2543164/"'));
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('title="Open the movie page on IMDb"'));

  // Unsafe URL → inert badge, no javascript: URL anywhere
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('title="Movie page link unavailable"'));

  // Clicking/keying the badge is the link's business, not the card's
  const badge = {
    closest: selector => (selector === 'a.rating-badge' ? {} : null)
  };
  assert.doesNotThrow(() => grid.onclick({ target: badge }));

  const keyEvent = {
    key: 'Enter',
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
    target: badge
  };

  grid.onkeydown(keyEvent);
  assert.equal(keyEvent.prevented, false);
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

test('archive cards use the paripakva poster tree and source badges', () => {
  state.archive = true;
  const grid = new MockGrid();

  renderGridView(grid, [
    {
      NUM: '5001',
      FORMATTEDTITLE: 'Paripakva Title 1',
      YEAR: '2019',
      RATING: '7.1',
      PICTURENAME: 'archive-one.jpg'
    },
    {
      NUM: '5002',
      FORMATTEDTITLE: 'No Poster',
      PICTURENAME: null
    }
  ]);

  const html = grid.innerHTML;

  assert.ok(
    html.includes('src="/movies_template/paripakva/archive-one.jpg"')
  );
  assert.ok(
    html.includes(
      'src="/movies_template/paripakva/movies_0000-coming_soon.jpg"'
    )
  );
  assert.ok(html.includes('class="source-badge"'));

  // Restoring the default collection brings the antexport tree back.
  state.archive = false;
  const defaultGrid = new MockGrid();
  renderGridView(defaultGrid, [
    { NUM: '1', FORMATTEDTITLE: 'Arrival', PICTURENAME: 'arrival.jpg' }
  ]);
  assert.ok(
    defaultGrid.innerHTML.includes('src="/movies/antexport/arrival.jpg"')
  );
});
