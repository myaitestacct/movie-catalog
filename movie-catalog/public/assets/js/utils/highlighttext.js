// highlighttext.js

/**
 * Split only an explicitly parenthesized trailing year from a title search.
 * This mirrors MovieRepository::parseTitleFilter().
 */
export function parseTitleSearch(value = '') {
  const original = value.toString().trim();
  const match = original.match(/\s*\(((?:19|20)\d{2})\)\s*$/);

  if (!match) {
    return { title: original, year: null };
  }

  return {
    title: original.replace(/\s*\((?:19|20)\d{2}\)\s*$/, '').trim(),
    year: match[1]
  };
}

/**
 * Return only the search terms that apply to a particular rendered column.
 * A year entered as part of "Title (YEAR)" also applies to the YEAR column.
 */
export function collectColumnSearchTerms(searchState, column) {
  if (!searchState || typeof searchState !== 'object') return [];

  const terms = [];
  const ownValue = searchState[column]?.toString().trim() || '';

  if (column === 'FORMATTEDTITLE') {
    const { title } = parseTitleSearch(ownValue);
    if (title) terms.push(title);
  } else {
    if (ownValue) terms.push(ownValue);

    if (column === 'YEAR') {
      const { year } = parseTitleSearch(searchState.FORMATTEDTITLE || '');
      if (year) terms.push(year);
    }
  }

  return [...new Set(terms)];
}

/**
 * Determine if a value should be highlighted
 * Supports AND / OR mode and fuzzy search
 * @param {string} text - Cell text
 * @param {Array} terms - Array of search terms
 * @param {'AND'|'OR'} mode - AND or OR search mode
 * @param {boolean} fuzzy - If true, allows fuzzy match
 * @returns {boolean}
 */
export function shouldHighlight(text = '', terms = [], mode = 'AND', fuzzy = false) {
  if (!Array.isArray(terms) || terms.length === 0) return false;
  if (!text) return false;

  const lower = text.toString().toLowerCase();

  const matchFn = fuzzy
    ? term => fuzzyMatch(lower, term.toLowerCase())
    : term => lower.includes(term.toLowerCase());

  return mode === 'AND'
    ? terms.every(matchFn)
    : terms.some(matchFn);
}

/**
 * Highlight search terms in text
 * Supports fuzzy search by bolding approximate matches
 * @param {string} text
 * @param {Array} terms
 * @param {boolean} fuzzy
 * @returns {string} HTML with <mark> tags
 */
export function highlightMatch(text = '', terms = [], fuzzy = false) {
  if (!Array.isArray(terms) || terms.length === 0) return escapeHTML(text);
  if (!text) return '';

  let result = escapeHTML(text.toString());

  terms.forEach(term => {
    if (!term) return;
    
    const safeTerm = escapeRegExp(term);

    const regex = fuzzy
      ? new RegExp(`(${safeTerm.split('').join('.*?')})`, 'gi')
      : new RegExp(`(${safeTerm})`, 'gi');

    result = result.replace(regex, '<mark>$1</mark>');
  });

  return result;
}

/**
 * Simple fuzzy matching: returns true if all chars of 'term' appear in order in 'text'
 * e.g., fuzzyMatch("hello world", "hlo") => true
 */
export function fuzzyMatch(text = '', term = '') {
  if (!text || !term) return false;

  const chars = term.split('');
  let index = 0;

  for (let c of chars) {
    index = text.indexOf(c, index);
    if (index === -1) return false;
    index++;
  }

  return true;
}

/**
 * Escape regex special characters in string
 */
export function escapeRegExp(string = '') {
  return string.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function escapeHTML(str = '') {
  return str.toString().replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[s]);
}