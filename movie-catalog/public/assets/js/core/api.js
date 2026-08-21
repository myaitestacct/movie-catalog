export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function parseJsonResponseBody(responseBody) {
  return JSON.parse(String(responseBody).trim());
}

async function fetchJson(url, { signal } = {}) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      },
      signal
    });
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw error;

    throw new ApiError('Unable to reach the server', 0, error);
  }

  let responseBody;

  try {
    responseBody = await response.text();
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw error;

    throw new ApiError(
      `The server response could not be read (HTTP ${response.status})`,
      response.status,
      error
    );
  }

  let payload;

  try {
    payload = parseJsonResponseBody(responseBody);
  } catch {
    const responsePreview = responseBody.trim().slice(0, 500);
    const contentType = response.headers.get('content-type') || '';
    const diagnostic = {
      url,
      status: response.status,
      contentType,
      responsePreview
    };

    console.error(
      'Invalid JSON API response\n' +
      `URL: ${url}\n` +
      `Status: ${response.status}\n` +
      `Content-Type: ${contentType || '[not provided]'}\n` +
      `Response preview: ${responsePreview || '[empty response]'}`
    );
    throw new ApiError(
      `The server returned an invalid response (HTTP ${response.status})`,
      response.status,
      diagnostic
    );
  }

  if (!response.ok || payload?.error) {
    const message =
      typeof payload?.message === 'string'
        ? payload.message
        : typeof payload?.error === 'string'
          ? payload.error
          : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, payload);
  }

  return payload;
}

function apiUrl(endpoint, params = null) {
  const query = params ? `?${params}` : '';
  return `${BASE_URL}/api/${endpoint}${query}`;
}

export async function fetchMovies(params, options = {}) {
  const data = await fetchJson(apiUrl('movies.php', params), options);

  if (
    !Array.isArray(data?.data) ||
    !Number.isFinite(Number(data?.page)) ||
    !Number.isFinite(Number(data?.limit)) ||
    !Number.isFinite(Number(data?.pages)) ||
    !Number.isFinite(Number(data?.total))
  ) {
    throw new ApiError('The movie data response is incomplete');
  }

  return data;
}

function isNumericValue(value) {
  return value !== null &&
    value !== '' &&
    Number.isFinite(Number(value));
}

export function isCompleteReleaseYearAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  const validYearEntry = entry =>
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    isNumericValue(entry.year) &&
    Number(entry.year) > 0 &&
    isNumericValue(entry.count) &&
    Number(entry.count) >= 0;
  const validDecadeEntry = entry =>
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    isNumericValue(entry.start_year) &&
    typeof entry.label === 'string' &&
    entry.label.trim() !== '' &&
    isNumericValue(entry.count) &&
    Number(entry.count) >= 0;

  return isNumericValue(analytics.dated_movies) &&
    isNumericValue(analytics.undated_movies) &&
    (analytics.peak_year === null || validYearEntry(analytics.peak_year)) &&
    (
      analytics.busiest_decade === null ||
      validDecadeEntry(analytics.busiest_decade)
    ) &&
    Array.isArray(analytics.years) &&
    analytics.years.every(validYearEntry) &&
    Array.isArray(analytics.decades) &&
    analytics.decades.every(validDecadeEntry);
}

export function isCompleteGenreAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  const validGenreEntry = entry =>
    entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    typeof entry.label === 'string' &&
    entry.label.trim() !== '' &&
    isNumericValue(entry.count) &&
    Number(entry.count) >= 0;

  return isNumericValue(analytics.tagged_movies) &&
    isNumericValue(analytics.untagged_movies) &&
    isNumericValue(analytics.genre_assignments) &&
    (analytics.top_genre === null || validGenreEntry(analytics.top_genre)) &&
    Array.isArray(analytics.genres) &&
    analytics.genres.every(validGenreEntry);
}

export function isCompleteRatingRuntimeAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  const validBand = band =>
    band &&
    typeof band === 'object' &&
    !Array.isArray(band) &&
    typeof band.key === 'string' &&
    band.key.trim() !== '' &&
    typeof band.label === 'string' &&
    band.label.trim() !== '' &&
    isNumericValue(band.count) &&
    Number(band.count) >= 0;

  return isNumericValue(analytics.rated_movies) &&
    isNumericValue(analytics.unrated_movies) &&
    isNumericValue(analytics.runtime_known_movies) &&
    isNumericValue(analytics.runtime_missing_movies) &&
    (
      analytics.top_rating_band === null ||
      validBand(analytics.top_rating_band)
    ) &&
    (
      analytics.common_runtime_band === null ||
      validBand(analytics.common_runtime_band)
    ) &&
    Array.isArray(analytics.rating_bands) &&
    analytics.rating_bands.every(validBand) &&
    Array.isArray(analytics.runtime_bands) &&
    analytics.runtime_bands.every(validBand);
}

export function isCompleteStorageAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  const validBand = band =>
    band &&
    typeof band === 'object' &&
    !Array.isArray(band) &&
    typeof band.key === 'string' &&
    band.key.trim() !== '' &&
    typeof band.label === 'string' &&
    band.label.trim() !== '' &&
    isNumericValue(band.count) &&
    Number(band.count) >= 0 &&
    isNumericValue(band.total_size) &&
    Number(band.total_size) >= 0;
  const validLargestMovie = movie =>
    movie &&
    typeof movie === 'object' &&
    !Array.isArray(movie) &&
    (
      movie.num === null ||
      typeof movie.num === 'string' ||
      typeof movie.num === 'number'
    ) &&
    typeof movie.title === 'string' &&
    movie.title.trim() !== '' &&
    isNumericValue(movie.size) &&
    Number(movie.size) > 0;

  return isNumericValue(analytics.sized_movies) &&
    Number(analytics.sized_movies) >= 0 &&
    isNumericValue(analytics.unsized_movies) &&
    Number(analytics.unsized_movies) >= 0 &&
    isNumericValue(analytics.total_size) &&
    Number(analytics.total_size) >= 0 &&
    isNumericValue(analytics.average_size) &&
    Number(analytics.average_size) >= 0 &&
    isNumericValue(analytics.median_size) &&
    Number(analytics.median_size) >= 0 &&
    (
      analytics.largest_movie === null ||
      validLargestMovie(analytics.largest_movie)
    ) &&
    Array.isArray(analytics.size_bands) &&
    analytics.size_bands.every(validBand);
}

function isCompleteDelimitedFacet(facet) {
  const validItem = item =>
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    typeof item.label === 'string' &&
    item.label.trim() !== '' &&
    isNumericValue(item.count) &&
    Number(item.count) >= 0;

  return facet &&
    typeof facet === 'object' &&
    !Array.isArray(facet) &&
    isNumericValue(facet.tagged_movies) &&
    isNumericValue(facet.untagged_movies) &&
    isNumericValue(facet.assignments) &&
    (facet.top_item === null || validItem(facet.top_item)) &&
    Array.isArray(facet.items) &&
    facet.items.every(validItem);
}

export function isCompleteLanguageCountryAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  return isCompleteDelimitedFacet(analytics.languages) &&
    isCompleteDelimitedFacet(analytics.countries);
}

export function isCompleteTechnicalFormatAnalytics(analytics) {
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) {
    return false;
  }

  return isCompleteDelimitedFacet(analytics.resolutions) &&
    isCompleteDelimitedFacet(analytics.audio_formats);
}

const STATS_NUMERIC_FIELDS = [
  'total_movies',
  'years',
  'genres',
  'languages',
  'countries',
  'total_size',
  'average_rating',
  'average_runtime',
  'oldest_year',
  'newest_year',
  'health_score',
  'missing_files',
  'missing_posters',
  'incomplete_metadata',
  'needs_better_copy_count',
  'duplicate_count'
];

export function isCompleteStatsPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  const releaseYearsAreValid = data.release_year_analytics === undefined ||
    isCompleteReleaseYearAnalytics(data.release_year_analytics);
  const genresAreValid = data.genre_analytics === undefined ||
    isCompleteGenreAnalytics(data.genre_analytics);
  const ratingRuntimeIsValid = data.rating_runtime_analytics === undefined ||
    isCompleteRatingRuntimeAnalytics(data.rating_runtime_analytics);
  const languageCountryIsValid =
    data.language_country_analytics === undefined ||
    isCompleteLanguageCountryAnalytics(data.language_country_analytics);
  const storageIsValid = data.storage_analytics === undefined ||
    isCompleteStorageAnalytics(data.storage_analytics);
  const technicalFormatsAreValid =
    data.technical_format_analytics === undefined ||
    isCompleteTechnicalFormatAnalytics(data.technical_format_analytics);

  return STATS_NUMERIC_FIELDS.every(field => isNumericValue(data[field])) &&
    releaseYearsAreValid &&
    genresAreValid &&
    ratingRuntimeIsValid &&
    languageCountryIsValid &&
    storageIsValid &&
    technicalFormatsAreValid;
}

export async function fetchStats(options = {}) {
  const data = await fetchJson(apiUrl('stats.php'), options);

  if (!isCompleteStatsPayload(data)) {
    throw new ApiError('The statistics response is incomplete');
  }

  return data;
}

export async function fetchDuplicates(options = {}) {
  const data = await fetchJson(apiUrl('duplicates.php'), options);

  if (!Array.isArray(data)) {
    throw new ApiError('The duplicate movie response is incomplete');
  }

  return data;
}

export async function fetchBetterCopyRows(options = {}) {
  const data = await fetchJson(apiUrl('better-copy.php'), options);

  if (!Array.isArray(data)) {
    throw new ApiError('The better-copy response is incomplete');
  }

  return data;
}

export async function fetchLibraryIssueRows(issueType, options = {}) {
  const params = new URLSearchParams({ type: issueType });
  const data = await fetchJson(apiUrl('library-issues.php', params), options);

  if (!Array.isArray(data)) {
    throw new ApiError('The library issue response is incomplete');
  }

  return data;
}

export async function fetchMoviePage(params, options = {}) {
  const data = await fetchJson(apiUrl('movie-page.php', params), options);

  if (
    typeof data?.found !== 'boolean' ||
    (data.found && !Number.isFinite(Number(data.page)))
  ) {
    throw new ApiError('The movie page response is incomplete');
  }

  return data;
}
