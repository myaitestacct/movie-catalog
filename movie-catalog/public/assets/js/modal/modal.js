// modal.js
import {
    splitPath,
    setMultilineText,
    setPoster,
    fillFields
} from './modal.utils.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { configureExternalLink } from '../utils/url.js';
import { createModalDOM } from './modal.dom.js';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',');

let movies = [];
let currentIndex = -1;

export const Modal = (() => {
    let modal;
    let content;
    let poster;
    let posterZoom;
    let posterZoomImg;
    let prevBtn;
    let nextBtn;
    let closeBtn;
    let activeRow = null;
    let lastFocusedElement = null;
    let backgroundState = [];

    function initDOM() {
        if (modal) return;

        const dom = createModalDOM();
        ({
            modal,
            content,
            poster,
            posterZoom,
            posterZoomImg,
            prevBtn,
            nextBtn,
            closeBtn
        } = dom);

        prevBtn.onclick = () => Modal.prev();
        nextBtn.onclick = () => Modal.next();
        closeBtn.onclick = closeModal;

        modal.addEventListener('click', event => {
            if (event.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', handleKeydown);

        poster.onclick = openPosterZoom;
        poster.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPosterZoom();
            }
        };

        posterZoom.onclick = () => closePosterZoom();
    }

    function getFocusableElements(root) {
        return [...root.querySelectorAll(FOCUSABLE_SELECTOR)]
            .filter(element =>
                !element.disabled &&
                element.getAttribute('aria-hidden') !== 'true'
            );
    }

    function trapFocus(event) {
        const focusable = getFocusableElements(modal);

        if (focusable.length === 0) {
            event.preventDefault();
            content.focus();
            return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (
            event.shiftKey &&
            (active === first || !modal.contains(active))
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            (active === last || !modal.contains(active))
        ) {
            event.preventDefault();
            first.focus();
        }
    }

    function handleKeydown(event) {
        if (posterZoom?.classList.contains('open')) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closePosterZoom();
            } else if (event.key === 'Tab') {
                event.preventDefault();
                posterZoom.focus();
            }

            return;
        }

        if (!modal?.classList.contains('open')) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            Modal.next();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            Modal.prev();
        } else if (event.key === 'Tab') {
            trapFocus(event);
        }
    }

    function setBackgroundInert(inert) {
        if (inert) {
            backgroundState = [...document.body.children]
                .filter(element =>
                    element !== modal &&
                    element !== posterZoom
                )
                .map(element => ({
                    element,
                    inert: Boolean(element.inert),
                    ariaHidden: element.getAttribute('aria-hidden')
                }));

            backgroundState.forEach(({ element }) => {
                element.inert = true;
                element.setAttribute('aria-hidden', 'true');
            });

            return;
        }

        backgroundState.forEach(({
            element,
            inert: wasInert,
            ariaHidden
        }) => {
            element.inert = wasInert;

            if (ariaHidden === null) {
                element.removeAttribute('aria-hidden');
            } else {
                element.setAttribute('aria-hidden', ariaHidden);
            }
        });

        backgroundState = [];
    }

    function openModal() {
        if (modal.classList.contains('open')) return;

        lastFocusedElement = document.activeElement;
        setBackgroundInert(true);
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.add('open');

        requestAnimationFrame(() => closeBtn.focus());
    }

    function closeModal() {
        if (!modal?.classList.contains('open')) return;

        closePosterZoom(false);
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        setBackgroundInert(false);
        clearActiveRow();

        const focusTarget = lastFocusedElement;
        lastFocusedElement = null;

        requestAnimationFrame(() => {
            if (
                focusTarget?.isConnected &&
                typeof focusTarget.focus === 'function'
            ) {
                focusTarget.focus();
            }
        });
    }

    function openPosterZoom() {
        if (!poster?.src) return;

        posterZoomImg.src = poster.src;
        posterZoomImg.alt =
            poster.alt || 'Enlarged movie poster';

        modal.inert = true;
        modal.setAttribute('aria-hidden', 'true');
        posterZoom.setAttribute('aria-hidden', 'false');
        posterZoom.classList.add('open');
        posterZoom.focus();
    }

    function closePosterZoom(restorePosterFocus = true) {
        if (!posterZoom?.classList.contains('open')) return;

        posterZoom.classList.remove('open');
        posterZoom.setAttribute('aria-hidden', 'true');
        modal.inert = false;

        if (modal.classList.contains('open')) {
            modal.setAttribute('aria-hidden', 'false');
        }

        if (restorePosterFocus) {
            poster.focus();
        }
    }

    function clearActiveRow() {
        if (activeRow) {
            activeRow.classList.remove('active-movie-row');
            activeRow = null;
        }
    }

    function highlightRow(movie) {
        clearActiveRow();

        activeRow = document.querySelector(
            `tr[data-num="${movie.NUM}"]`
        );

        if (activeRow) {
            activeRow.classList.add('active-movie-row');
        }
    }

    function renderMovieView(movie) {
        setPoster(
            poster,
            movie.PICTURENAME,
            '/movies/antexport',
            '/movies/antexport/movies_0000-coming_soon.jpg'
        );

        const displayTitle = (
            movie.FORMATTEDTITLE ||
            movie.ORIGINALTITLE ||
            ''
        ).trim();

        const titleEl = modal.querySelector('#modalTitle');
        titleEl.textContent = displayTitle;

        poster.alt = displayTitle
            ? `${displayTitle} poster`
            : 'Movie poster';

        const ratingEl = modal.querySelector('#modalRating');
        ratingEl.textContent = movie.RATING || '';

        const hasRatingLink = configureExternalLink(
            ratingEl,
            movie.URL
        );

        ratingEl.setAttribute(
            'aria-label',
            hasRatingLink && displayTitle
                ? `Open external rating for ${displayTitle}`
                : 'External rating link unavailable'
        );

        setMultilineText(
            modal.querySelector('#modalDescription'),
            movie.DESCRIPTION || ''
        );

        fillFields(modal, {
            modalYear: movie.YEAR,
            modalLength: movie.LENGTH,
            modalCertification: movie.CERTIFICATION,
            modalLanguage: movie.LANGUAGES,
            modalCategory: movie.CATEGORY,
            modalCountry: movie.COUNTRY,
            modalDirector: movie.DIRECTOR,
            modalActors: movie.ACTORS,
            modalFilesize: movie.FILESIZE,
            modalResolution: movie.RESOLUTION,
            modalAudio: movie.AUDIOFORMAT,
            modalSubtitles: movie.SUBTITLES
        });

        const { path, file } = splitPath(movie.FILEPATH);

        modal.querySelector('#modalPath').textContent = path;

        const fileContainer = modal.querySelector('#modalFile');
        const fileSpan = fileContainer.querySelector('.file-name');
        const fileBtn = fileContainer.querySelector('.copy-btn');

        if (fileSpan) {
            fileSpan.textContent = file || '';
        }

        if (fileBtn) {
            fileBtn.onclick = event => {
                event.stopPropagation();
                copyToClipboard(file || '', fileBtn);
            };
        }

        const numContainer = modal.querySelector('#modalNum');
        const numSpan = numContainer?.querySelector('.num-value');
        const numBtn = numContainer?.querySelector('.copy-btn');

        if (numSpan) {
            numSpan.textContent = movie.NUM ?? '';
        }

        if (numBtn) {
            numBtn.onclick = event => {
                event.stopPropagation();
                copyToClipboard(
                    `${movie.NUM ?? ''}__`,
                    numBtn
                );
            };
        }

        highlightRow(movie);
    }

    function renderMovie(movie) {
        if (!modal) {
            initDOM();
        }

        renderMovieView(movie);
        openModal();
    }

    function requestWrapConfirmation(direction) {
        const message = direction === 'next'
            ? 'You are viewing the last movie. Continue to the first movie?'
            : 'You are viewing the first movie. Continue to the last movie?';

        if (typeof globalThis.confirm !== 'function') {
            return false;
        }

        return globalThis.confirm(message);
    }

    return {
        setMovies(list) {
            movies = list || [];
        },

        show(movie, index = -1) {
            currentIndex = index;

            if (movie) {
                renderMovie(movie);
            }
        },

        close: closeModal,

        next() {
            if (!movies.length) return;

            const isAtLastMovie =
                currentIndex >= movies.length - 1;

            if (isAtLastMovie) {
                const shouldWrap =
                    requestWrapConfirmation('next');

                if (!shouldWrap) return;

                currentIndex = 0;
            } else {
                currentIndex += 1;
            }

            renderMovie(movies[currentIndex]);
        },

        prev() {
            if (!movies.length) return;

            const isAtFirstMovie = currentIndex <= 0;

            if (isAtFirstMovie) {
                const shouldWrap =
                    requestWrapConfirmation('previous');

                if (!shouldWrap) return;

                currentIndex = movies.length - 1;
            } else {
                currentIndex -= 1;
            }

            renderMovie(movies[currentIndex]);
        }
    };
})();
