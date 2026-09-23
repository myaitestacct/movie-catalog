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
  titleSearchMode: 'FUZZY',
  fuzzy: true,
  debounce: null
};

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
    search: Object.entries(state.search).sort(
      ([left], [right]) =>
        left.localeCompare(right)
    )
  });
}
