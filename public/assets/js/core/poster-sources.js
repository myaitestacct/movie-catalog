// poster-sources.js
//
// Poster image locations per collection. The main library exports its
// posters under /movies/antexport; the hidden paripakva archive keeps its
// own export tree under /movies_template/paripakva. Both trees share the
// same fallback filename convention for missing posters.
import { state } from './state.js';

export const POSTER_FALLBACK_FILE =
  'movies_0000-coming_soon.jpg';

export const POSTER_SOURCES = Object.freeze({
  movies: Object.freeze({
    base: '/movies/antexport',
    fallback: `/movies/antexport/${POSTER_FALLBACK_FILE}`
  }),
  paripakva: Object.freeze({
    base: '/movies_template/paripakva',
    fallback: `/movies_template/paripakva/${POSTER_FALLBACK_FILE}`
  })
});

/**
 * Resolve the poster base/fallback for the active collection. Passing an
 * explicit archive flag keeps the function usable outside the global state
 * (tests, pre-rendered snapshots).
 */
export function getPosterSource(archive = state.archive) {
  return POSTER_SOURCES[archive ? 'paripakva' : 'movies'];
}

export function posterUrl(pictureName, archive = state.archive) {
  const { base, fallback } = getPosterSource(archive);

  return pictureName
    ? `${base}/${encodeURIComponent(pictureName)}`
    : fallback;
}
