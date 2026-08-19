import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectColumnSearchTerms,
  escapeHTML,
  fuzzyMatch,
  highlightMatch,
  parseTitleSearch,
  shouldHighlight
} from '../../movie-catalog/public/assets/js/utils/highlighttext.js';

test(
  'title search extracts only a trailing parenthesized year',
  () => {
    assert.deepEqual(
      parseTitleSearch(
        'Sing (2016)'
      ),
      {
        title: 'Sing',
        year: '2016'
      }
    );

    assert.deepEqual(
      parseTitleSearch(
        'Sing(2016)'
      ),
      {
        title: 'Sing',
        year: '2016'
      }
    );

    assert.deepEqual(
      parseTitleSearch(
        '(2016)'
      ),
      {
        title: '',
        year: '2016'
      }
    );
  }
);

test(
  'numeric movie titles remain title searches',
  () => {
    for (
      const title of [
        '1917',
        '1984',
        '2012',
        '2001: A Space Odyssey',
        'Blade Runner 2049',
        'Class of 1984'
      ]
    ) {
      assert.deepEqual(
        parseTitleSearch(title),
        {
          title,
          year: null
        }
      );
    }
  }
);

test(
  'title and extracted year highlight their own columns',
  () => {
    const search = {
      FORMATTEDTITLE:
        'Sing (2016)',

      CATEGORY:
        'Animation'
    };

    assert.deepEqual(
      collectColumnSearchTerms(
        search,
        'FORMATTEDTITLE'
      ),
      [
        'Sing'
      ]
    );

    assert.deepEqual(
      collectColumnSearchTerms(
        search,
        'YEAR'
      ),
      [
        '2016'
      ]
    );

    assert.deepEqual(
      collectColumnSearchTerms(
        search,
        'CATEGORY'
      ),
      [
        'Animation'
      ]
    );

    assert.deepEqual(
      collectColumnSearchTerms(
        search,
        'RATING'
      ),
      []
    );
  }
);

test(
  'title and year values receive highlighted markup',
  () => {
    const search = {
      FORMATTEDTITLE:
        'Sing (2016)'
    };

    const titleTerms =
      collectColumnSearchTerms(
        search,
        'FORMATTEDTITLE'
      );

    const yearTerms =
      collectColumnSearchTerms(
        search,
        'YEAR'
      );

    assert.equal(
      shouldHighlight(
        'Sing',
        titleTerms,
        'OR',
        false
      ),
      true
    );

    assert.equal(
      shouldHighlight(
        '2016',
        yearTerms,
        'OR',
        false
      ),
      true
    );

    assert.equal(
      highlightMatch(
        'Sing',
        titleTerms,
        false
      ),
      '<mark>Sing</mark>'
    );

    assert.equal(
      highlightMatch(
        '2016',
        yearTerms,
        false
      ),
      '<mark>2016</mark>'
    );
  }
);

test(
  'fuzzy matching requires ordered characters',
  () => {
    assert.equal(
      fuzzyMatch(
        'alien',
        'aln'
      ),
      true
    );

    assert.equal(
      fuzzyMatch(
        'alien',
        'ain'
      ),
      true
    );

    assert.equal(
      fuzzyMatch(
        'alien',
        'azn'
      ),
      false
    );
  }
);

test(
  'highlighting matches apostrophes before escaping HTML',
  () => {
    assert.equal(
      highlightMatch(
        "April Fool's Day",
        [
          "april fool's day"
        ],
        false
      ),
      '<mark>' +
      'April Fool&#39;s Day' +
      '</mark>'
    );

    assert.equal(
      highlightMatch(
        "April Fool's Day",
        [
          "fool's"
        ],
        false
      ),
      'April ' +
      '<mark>Fool&#39;s</mark>' +
      ' Day'
    );
  }
);

test(
  'highlighting escapes untrusted text before adding markup',
  () => {
    assert.equal(
      escapeHTML(
        '<script>' +
        'alert("x")' +
        '</script>'
      ),
      '&lt;script&gt;' +
      'alert(&quot;x&quot;)' +
      '&lt;/script&gt;'
    );

    assert.equal(
      highlightMatch(
        '<b>Sing</b>',
        [
          'Sing'
        ],
        false
      ),
      '&lt;b&gt;' +
      '<mark>Sing</mark>' +
      '&lt;/b&gt;'
    );

    assert.equal(
      highlightMatch(
        'Rock & Roll',
        [
          '&'
        ],
        false
      ),
      'Rock ' +
      '<mark>&amp;</mark>' +
      ' Roll'
    );
  }
);
