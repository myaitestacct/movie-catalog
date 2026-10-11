// grid-view.js
// Poster-card grid, rendered from the same page payload as the table.
// Performance notes:
//  - one innerHTML write per page (string build, no per-node DOM churn)
//  - posters use loading="lazy" + decoding="async"
//  - no re-render unless the movie array reference changed
import { Modal } from '../modal/modal.js';

const POSTER_BASE_PATH = '/movies/antexport';
const POSTER_FALLBACK = '/movies/antexport/movies_0000-coming_soon.jpg';

const VIEW_STORAGE_KEY = 'movieCatalogView';

export const VIEWS = Object.freeze(['table', 'grid']);

export function loadStoredView() {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    return VIEWS.includes(stored) ? stored : 'table';
  } catch {
    return 'table';
  }
}

export function storeView(view) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* storage unavailable — keep in-memory value */
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function ratingTier(value) {
  const rating = parseFloat(value);

  if (Number.isNaN(rating)) return '';

  if (rating >= 7) return 'rating-good';

  if (rating >= 5) return 'rating-mid';

  return 'rating-bad';
}

function posterSrc(pictureName) {
  return pictureName
    ? `${POSTER_BASE_PATH}/${encodeURIComponent(pictureName)}`
    : POSTER_FALLBACK;
}

function cardHtml(movie, index) {
  const title = (
    movie.FORMATTEDTITLE ||
    movie.ORIGINALTITLE ||
    `Movie ${movie.NUM}`
  ).trim();

  const missing = movie.FILE?.toUpperCase() === 'MISSING';
  const betterCopy = movie.FILE?.includes('-Get.Better.Copy');
  const status = missing
    ? '<span class="movie-card-status missing">Missing file</span>'
    : betterCopy
      ? '<span class="movie-card-status better">Better copy</span>'
      : '';

  const rating = movie.RATING
    ? `<a class="rating-badge ${ratingTier(movie.RATING)}" href="#" tabindex="-1" aria-hidden="true">${escapeHtml(movie.RATING)}</a>`
    : '';

  const year = movie.YEAR ? `<span>${escapeHtml(movie.YEAR)}</span>` : '';

  return `
    <article
      class="movie-card${missing ? ' missing-file' : ''}${betterCopy ? ' better-copy' : ''}"
      data-num="${escapeHtml(movie.NUM)}"
      data-index="${index}"
      role="button"
      tabindex="0"
      aria-label="Open details for ${escapeHtml(title)}"
    >
      <div class="movie-card-poster">
        <img
          loading="lazy"
          decoding="async"
          width="270"
          height="405"
          alt=""
          src="${escapeHtml(posterSrc(movie.PICTURENAME))}"
        >
        ${status}
      </div>
      <div class="movie-card-body">
        <h3 class="movie-card-title">${escapeHtml(title)}</h3>
        <div class="movie-card-meta">
          ${year}
          ${rating}
        </div>
      </div>
    </article>`;
}

function emptyHtml() {
  return `
    <div class="movie-grid-empty">
      <i class="fa-solid fa-film" aria-hidden="true"></i>
      <div class="movie-grid-empty-title">No movies match your filters</div>
      <div>Try a different search term, or clear the filters to see everything.</div>
      <button type="button" class="grid-clear-filters">Clear all filters</button>
    </div>`;
}

/**
 * Render (and wire up) the grid for one page of movies.
 * The container is assumed to be visible when called.
 */
export function renderGridView(container, movies) {
  if (!container) return;

  container.replaceChildren();

  if (!Array.isArray(movies) || movies.length === 0) {
    container.insertAdjacentHTML('beforeend', emptyHtml());
    container
      .querySelector('.grid-clear-filters')
      ?.addEventListener('click', () => {
        document.getElementById('clear-filters')?.click();
      });
    return;
  }

  // Single DOM write: build the whole page as one HTML string.
  container.innerHTML = movies
    .map((movie, index) => cardHtml(movie, index))
    .join('');

  // Wire up one delegated click handler (survives re-renders is not
  // guaranteed, so re-attach on each render — one node listener).
  container.onclick = event => {
    const card = event.target.closest('.movie-card');
    if (!card || !container.contains(card)) return;

    openMovieAt(container, movies, card);
  };

  container.onkeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const card = event.target.closest('.movie-card');
    if (!card || !container.contains(card)) return;

    event.preventDefault();
    openMovieAt(container, movies, card);
  };

  // Delegated error handler: mark failed posters so the styled
  // placeholder glyph shows instead of a broken-image icon.
  container.onerror = event => {
    const img = event.target;

    if (img.tagName !== 'IMG' || !container.contains(img)) return;

    img.classList.add('poster-missing');
  };

  // "load" cannot be delegated; mark visible images on each render.
  const images = container.querySelectorAll('img');

  images.forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'), {
        once: true
      });
    }
  });
}

function openMovieAt(container, movies, card) {
  const index = Number(card.dataset.index);
  const movie = movies[index];
  if (!movie) return;

  const rect = card.getBoundingClientRect();
  const modalContent = document.querySelector('.movie-modal-content');

  if (modalContent) {
    modalContent.style.transformOrigin =
      `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
  }

  Modal.setMovies(movies);
  Modal.show(movie, index);
}
