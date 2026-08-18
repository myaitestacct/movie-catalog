export const state = {
  page: 1,
  limit: 50,
  sort: 'NUM',
  dir: 'ASC',
  totalPages: 1,
  columnVisibility: {},
  search: {},
  searchMode: 'AND',
  fuzzy: true,
  debounce: null
};

export const ALWAYS_VISIBLE = [
  'NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'
];
