import { fetchMovies } from './api.js';
import { createLatestRequest, isAbortError } from './request.js';
import { state, getMovieStateSignature } from './state.js';

/**
 * Coordinate movie loads independently of DOM rendering. A load returns true
 * only when its response was rendered; superseded, cancelled, or failed loads
 * return false (also used by the analytics jump-to-movie flow).
 */
export function createMovieLoader({
  render,
  onError,
  onStart = () => {},
  onFinish = () => {},
  fetchPage = fetchMovies,
  waitBeforeFetch = () => new Promise(resolve => setTimeout(resolve, 150))
}) {
  const requests = createLatestRequest();

  return async function loadMovies() {
    // Start before the animation delay so even a queued load supersedes the
    // previous one. Capture the query now, not after that delay.
    const request = requests.start();
    const signature = getMovieStateSignature();
    const params = new URLSearchParams({
      page: state.page,
      limit: state.limit,
      sort: state.sort,
      dir: state.dir,
      mode: state.searchMode,
      titleMode: state.titleSearchMode
    });

    Object.entries(state.search).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    if (state.fuzzy) params.append('fuzzy', 'true');

    // Input state can change during the search debounce, before another load
    // starts. Request identity alone cannot detect that kind of stale response.
    const isCurrent = () => request.isCurrent() &&
      signature === getMovieStateSignature();

    try {
      onStart();
      await waitBeforeFetch();
      if (!isCurrent()) return false;

      const data = await fetchPage(params, { signal: request.signal });
      if (!isCurrent()) return false;

      render(data);
      return true;
    } catch (error) {
      if (!isCurrent() || isAbortError(error)) return false;

      onError(error);
      return false;
    } finally {
      if (request.isCurrent()) {
        // Delayed animation callbacks must also check request identity before
        // clearing a newer load's busy/fade state.
        onFinish(request.isCurrent);
      }
      request.finish();
    }
  };
}
