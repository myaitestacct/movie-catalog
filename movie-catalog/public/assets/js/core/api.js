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

async function fetchJson(url) {
  let response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new ApiError('Unable to reach the server', 0, error);
  }

  let responseBody;

  try {
    responseBody = await response.text();
  } catch (error) {
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

export async function fetchMovies(params) {
  const data = await fetchJson(apiUrl('movies.php', params));

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

  return STATS_NUMERIC_FIELDS.every(field => isNumericValue(data[field])) &&
    releaseYearsAreValid &&
    genresAreValid;
}

export async function fetchStats() {
  const data = await fetchJson(apiUrl('stats.php'));

  if (!isCompleteStatsPayload(data)) {
    throw new ApiError('The statistics response is incomplete');
  }

  return data;
}

export async function fetchDuplicates() {
  const data = await fetchJson(apiUrl('duplicates.php'));

  if (!Array.isArray(data)) {
    throw new ApiError('The duplicate movie response is incomplete');
  }

  return data;
}

export async function fetchBetterCopyRows() {
  const data = await fetchJson(apiUrl('better-copy.php'));

  if (!Array.isArray(data)) {
    throw new ApiError('The better-copy response is incomplete');
  }

  return data;
}

export async function fetchLibraryIssueRows(issueType) {
  const params = new URLSearchParams({ type: issueType });
  const data = await fetchJson(apiUrl('library-issues.php', params));

  if (!Array.isArray(data)) {
    throw new ApiError('The library issue response is incomplete');
  }

  return data;
}

export async function fetchMoviePage(params) {
  const data = await fetchJson(apiUrl('movie-page.php', params));

  if (
    typeof data?.found !== 'boolean' ||
    (data.found && !Number.isFinite(Number(data.page)))
  ) {
    throw new ApiError('The movie page response is incomplete');
  }

  return data;
}
