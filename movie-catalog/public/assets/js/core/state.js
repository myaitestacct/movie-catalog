export const state = {
  page: 1,
  limit: 50,
  sort: 'NUM',
  dir: 'ASC',
  totalPages: 1,
  columnVisibility: {},
  search: {},
  searchMode: 'AND',
  debounce: null,
  serverMode: true
};

export const ALWAYS_VISIBLE = [
  'NUM','FORMATTEDTITLE','YEAR','RATING','FILESIZE'
];

export const OPTIONAL_COLUMNS = [
  'LANGUAGES','LENGTH','CERTIFICATION','CATEGORY',
  'RESOLUTION','AUDIOFORMAT','FILE','PATH'
];
