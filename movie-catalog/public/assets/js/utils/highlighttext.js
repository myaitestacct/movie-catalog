// highlighttext.js

/**
 * Collect all search terms from the search state
 * @param {Object} searchState - state.search
 * @returns {Array} Array of all non-empty search terms
 */
export function collectSearchTerms(searchState) {
  if (!searchState || typeof searchState !== 'object') return [];
  return Object.values(searchState)
    .filter(v => v && v.toString().trim().length > 0)
    .map(v => v.toString().trim());
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