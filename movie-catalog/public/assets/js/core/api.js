export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
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

  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      'The server returned an invalid response',
      response.status
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

export async function fetchStats() {
  const data = await fetchJson(apiUrl('stats.php'));
  const requiredValues = [
    data?.total_movies,
    data?.years,
    data?.genres,
    data?.total_size,
    data?.missing_files,
    data?.needs_better_copy_count,
    data?.duplicate_count
  ];

  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    requiredValues.some(value => !Number.isFinite(Number(value)))
  ) {
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
