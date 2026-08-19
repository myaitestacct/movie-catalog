// highlighttext.js

/**
 * Split only an explicitly parenthesized trailing year from a title search.
 * This mirrors MovieRepository::parseTitleFilter().
 */
export function parseTitleSearch(value = '') {
  const original = value.toString().trim();

  const match = original.match(
    /\s*\(((?:19|20)\d{2})\)\s*$/
  );

  if (!match) {
    return {
      title: original,
      year: null
    };
  }

  return {
    title: original
      .replace(
        /\s*\((?:19|20)\d{2}\)\s*$/,
        ''
      )
      .trim(),

    year: match[1]
  };
}

/**
 * Return only the search terms that apply to a particular rendered column.
 * A year entered as part of "Title (YEAR)" also applies to the YEAR column.
 */
export function collectColumnSearchTerms(
  searchState,
  column
) {
  if (
    !searchState ||
    typeof searchState !== 'object'
  ) {
    return [];
  }

  const terms = [];

  const ownValue =
    searchState[column]
      ?.toString()
      .trim() || '';

  if (column === 'FORMATTEDTITLE') {
    const {
      title
    } = parseTitleSearch(ownValue);

    if (title) {
      terms.push(title);
    }
  } else {
    if (ownValue) {
      terms.push(ownValue);
    }

    if (column === 'YEAR') {
      const {
        year
      } = parseTitleSearch(
        searchState.FORMATTEDTITLE || ''
      );

      if (year) {
        terms.push(year);
      }
    }
  }

  return [
    ...new Set(terms)
  ];
}

/**
 * Determine whether a value should be highlighted.
 */
export function shouldHighlight(
  text = '',
  terms = [],
  mode = 'AND',
  fuzzy = false
) {
  if (
    !Array.isArray(terms) ||
    terms.length === 0
  ) {
    return false;
  }

  if (!text) {
    return false;
  }

  const lower =
    text.toString().toLowerCase();

  const matchFunction = fuzzy
    ? term => fuzzyMatch(
        lower,
        term.toLowerCase()
      )
    : term => lower.includes(
        term.toLowerCase()
      );

  return mode === 'AND'
    ? terms.every(matchFunction)
    : terms.some(matchFunction);
}

/**
 * Highlight matching ranges while safely escaping all rendered text.
 */
export function highlightMatch(
  text = '',
  terms = [],
  fuzzy = false
) {
  if (!text) {
    return '';
  }

  const original =
    text.toString();

  if (
    !Array.isArray(terms) ||
    terms.length === 0
  ) {
    return escapeHTML(original);
  }

  /*
   * Matches are calculated against the original
   * unescaped text. This allows apostrophes and
   * other HTML-sensitive characters to match.
   */
  const ranges =
    collectMatchRanges(
      original,
      terms,
      fuzzy
    );

  if (ranges.length === 0) {
    return escapeHTML(original);
  }

  let result = '';
  let cursor = 0;

  ranges.forEach(
    ([start, end]) => {
      result += escapeHTML(
        original.slice(
          cursor,
          start
        )
      );

      result +=
        '<mark>' +
        escapeHTML(
          original.slice(
            start,
            end
          )
        ) +
        '</mark>';

      cursor = end;
    }
  );

  result += escapeHTML(
    original.slice(cursor)
  );

  return result;
}

/**
 * Find exact or fuzzy match ranges in the original text.
 */
function collectMatchRanges(
  text,
  terms,
  fuzzy
) {
  const ranges = [];

  terms.forEach(term => {
    const value =
      term?.toString();

    if (!value) {
      return;
    }

    const pattern = fuzzy
      ? Array.from(value)
          .map(escapeRegExp)
          .join('.*?')
      : escapeRegExp(value);

    const regex =
      new RegExp(
        pattern,
        'gi'
      );

    for (
      const match of
      text.matchAll(regex)
    ) {
      ranges.push([
        match.index,
        match.index +
          match[0].length
      ]);
    }
  });

  ranges.sort(
    (left, right) =>
      left[0] - right[0] ||
      left[1] - right[1]
  );

  /*
   * Merge overlapping ranges so nested or
   * conflicting mark elements are not produced.
   */
  return ranges.reduce(
    (merged, range) => {
      const previous =
        merged.at(-1);

      if (
        previous &&
        range[0] <= previous[1]
      ) {
        previous[1] = Math.max(
          previous[1],
          range[1]
        );
      } else {
        merged.push([
          ...range
        ]);
      }

      return merged;
    },
    []
  );
}

/**
 * Return true when all characters of the term
 * appear in order in the text.
 */
export function fuzzyMatch(
  text = '',
  term = ''
) {
  if (!text || !term) {
    return false;
  }

  const characters =
    term.split('');

  let index = 0;

  for (
    const character of
    characters
  ) {
    index = text.indexOf(
      character,
      index
    );

    if (index === -1) {
      return false;
    }

    index++;
  }

  return true;
}

/**
 * Escape regular-expression special characters.
 */
export function escapeRegExp(
  string = ''
) {
  return string
    .toString()
    .replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );
}

/**
 * Escape HTML-sensitive characters.
 */
export function escapeHTML(
  string = ''
) {
  return string
    .toString()
    .replace(
      /[&<>"']/g,
      character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]
    );
}
