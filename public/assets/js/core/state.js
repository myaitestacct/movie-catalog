export const TITLE_SEARCH_MODES = Object.freeze([
  'EXACT',
  'CONTAINS',
  'FUZZY'
]);

export const state = {
  page: 1,
  limit: 50,
  sort: 'NUM',
  dir: 'ASC',
  totalPages: 1,
  columnVisibility: {},
  search: {},
  searchMode: 'AND',
  titleSearchMode: 'CONTAINS',
  fuzzy: false,
  debounce: null,
  // Hidden archive view: false (default) serves the `movies` table,
  // true serves the `paripakva` table. Toggled with Ctrl+Shift+K; always
  // resets to false on a fresh page load, so movies stays the default.
  // Query-affecting, so it is part of the state signature below.
  archive: false,
  // UI-only (not part of the query signature)
  view: 'table'
};

// Query-string flag understood by every API endpoint (see MovieTable.php).
export const ARCHIVE_PARAM = 'archive';

export const ALWAYS_VISIBLE = [
  'NUM',
  'FORMATTEDTITLE',
  'YEAR',
  'RATING',
  'FILESIZE'
];

// Include every query-affecting value, but not UI-only state.
export function getMovieStateSignature() {
  return JSON.stringify({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    dir: state.dir,
    mode: state.searchMode,
    fuzzy: state.fuzzy,
    titleMode: state.titleSearchMode,
    archive: state.archive,
    search: Object.entries(state.search).sort(
      ([left], [right]) =>
        left.localeCompare(right)
    )
  });
}
