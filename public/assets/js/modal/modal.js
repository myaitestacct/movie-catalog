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
    let zoomStage;
    let posterZoomImg;
    let prevBtn;
    let nextBtn;
    let closeBtn;
    let zoomInBtn;
    let zoomOutBtn;
    let zoomResetBtn;
    let zoomActualBtn;
    let zoomCloseBtn;
    let activeRow = null;
    let lastFocusedElement = null;
    let backgroundState = [];

    // Pan / zoom state for the full-size viewer
    const zoom = {
        scale: 1,
        minScale: 0.1,
        maxScale: 8,
        tx: 0,
        ty: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        dragStartTx: 0,
        dragStartTy: 0,
        fitScale: 1
    };

    function initDOM() {
        if (modal) return;

        const dom = createModalDOM();
        ({
            modal,
            content,
            poster,
            posterZoom,
            zoomStage,
            posterZoomImg,
            prevBtn,
            nextBtn,
            closeBtn,
            zoomInBtn,
            zoomOutBtn,
            zoomResetBtn,
            zoomActualBtn,
            zoomCloseBtn
        } = dom);

        prevBtn.onclick = () => Modal.prev();
        nextBtn.onclick = () => Modal.next();
        closeBtn.onclick = closeModal;
        zoomCloseBtn.onclick = closePosterZoom;
        zoomInBtn.onclick = () => stepZoom(1.25);
        zoomOutBtn.onclick = () => stepZoom(1 / 1.25);
        zoomResetBtn.onclick = () => resetZoom(true);
        zoomActualBtn.onclick = () => setZoom(1, true);

        modal.addEventListener('click', event => {
            if (event.target === modal) {
                closeModal();
            }
        });

        // Click on the backdrop or empty stage closes the viewer; clicks
        // on toolbar buttons / the image itself are handled separately.
        posterZoom.addEventListener('click', event => {
            if (event.target === posterZoom || event.target === zoomStage) {
                closePosterZoom();
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

        // Wheel zoom centered on the cursor
        zoomStage.addEventListener('wheel', event => {
            event.preventDefault();
            const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
            const rect = zoomStage.getBoundingClientRect();
            const cx = event.clientX - rect.left - rect.width / 2;
            const cy = event.clientY - rect.top - rect.height / 2;
            zoomAt(factor, cx, cy);
        }, { passive: false });

        // Pointer drag to pan (works for mouse, touch, pen)
        zoomStage.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            zoom.isDragging = true;
            zoom.dragStartX = event.clientX;
            zoom.dragStartY = event.clientY;
            zoom.dragStartTx = zoom.tx;
            zoom.dragStartTy = zoom.ty;
            try { zoomStage.setPointerCapture(event.pointerId); } catch (_) { /* noop */ }
            updateCursor();
        });

        zoomStage.addEventListener('pointermove', event => {
            if (!zoom.isDragging) return;
            zoom.tx = zoom.dragStartTx + (event.clientX - zoom.dragStartX);
            zoom.ty = zoom.dragStartTy + (event.clientY - zoom.dragStartY);
            applyTransform(false);
        });

        const endDrag = event => {
            if (!zoom.isDragging) return;
            zoom.isDragging = false;
            try { zoomStage.releasePointerCapture(event.pointerId); } catch (_) { /* noop */ }
            clampPan();
            applyTransform(true);
            updateCursor();
        };
        zoomStage.addEventListener('pointerup', endDrag);
        zoomStage.addEventListener('pointercancel', endDrag);
        zoomStage.addEventListener('lostpointercapture', endDrag);

        // Double-click toggles fit-to-window and actual (1:1) size, anchored
        // at the point the user clicked.
        zoomStage.addEventListener('dblclick', event => {
            event.preventDefault();
            const rect = zoomStage.getBoundingClientRect();
            const cx = event.clientX - rect.left - rect.width / 2;
            const cy = event.clientY - rect.top - rect.height / 2;
            const target = Math.abs(zoom.scale - 1) < 0.01 ? zoom.fitScale : 1;
            zoomTo(target, cx, cy, true);
        });
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
            } else if (event.key === '+' || event.key === '=') {
                event.preventDefault();
                stepZoom(1.25);
            } else if (event.key === '-' || event.key === '_') {
                event.preventDefault();
                stepZoom(1 / 1.25);
            } else if (event.key === '0') {
                event.preventDefault();
                resetZoom(true);
            } else if (event.key === '1') {
                event.preventDefault();
                setZoom(1, true);
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

    function applyTransform(animate) {
        posterZoomImg.style.transition = animate
            ? 'transform 0.2s ease'
            : 'none';
        posterZoomImg.style.transform =
            `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`;
        updateCursor();
    }

    function updateCursor() {
        if (!zoomStage) return;

        if (zoom.isDragging) {
            zoomStage.style.cursor = 'grabbing';
            return;
        }

        if (zoom.scale > zoom.fitScale * 1.02) {
            zoomStage.style.cursor = 'grab';
            return;
        }

        zoomStage.style.cursor = zoom.scale >= zoom.maxScale * 0.98
            ? 'zoom-out'
            : 'zoom-in';
    }

    function clampPan() {
        if (!zoomStage || !posterZoomImg.naturalWidth) return;

        const rect = zoomStage.getBoundingClientRect();
        const sw = rect.width;
        const sh = rect.height;
        const iw = posterZoomImg.naturalWidth;
        const ih = posterZoomImg.naturalHeight;

        if (!iw || !ih) return;

        const fitScale = Math.min(sw / iw, sh / ih);
        zoom.fitScale = fitScale;

        const renderedW = iw * zoom.scale;
        const renderedH = ih * zoom.scale;

        // Allow panning up to the image edge (no more than half the
        // stage empty on either side).
        const maxTx = Math.max(0, (renderedW - sw) / 2);
        const maxTy = Math.max(0, (renderedH - sh) / 2);

        if (zoom.tx > maxTx) zoom.tx = maxTx;
        if (zoom.tx < -maxTx) zoom.tx = -maxTx;
        if (zoom.ty > maxTy) zoom.ty = maxTy;
        if (zoom.ty < -maxTy) zoom.ty = -maxTy;
    }

    function zoomTo(targetScale, cx = 0, cy = 0, animate = true) {
        const clamped = Math.min(
            zoom.maxScale,
            Math.max(zoom.minScale, targetScale)
        );

        // Keep the world-space point under (cx, cy) anchored while scaling.
        const ratio = clamped / zoom.scale;
        zoom.tx = cx - (cx - zoom.tx) * ratio;
        zoom.ty = cy - (cy - zoom.ty) * ratio;
        zoom.scale = clamped;
        clampPan();
        applyTransform(animate);
    }

    function zoomAt(factor, cx, cy) {
        zoomTo(zoom.scale * factor, cx, cy, false);
    }

    function stepZoom(factor) {
        zoomTo(zoom.scale * factor, 0, 0, true);
    }

    function setZoom(scale, animate) {
        zoomTo(scale, 0, 0, animate);
    }

    function fitToStage() {
        if (!zoomStage || !posterZoomImg.naturalWidth) return;

        const rect = zoomStage.getBoundingClientRect();
        const iw = posterZoomImg.naturalWidth;
        const ih = posterZoomImg.naturalHeight;

        zoom.fitScale = Math.min(rect.width / iw, rect.height / ih);
        zoom.scale = zoom.fitScale;
        zoom.tx = 0;
        zoom.ty = 0;
    }

    function resetZoom(animate) {
        // Defer so the stage has its final "open" size.
        requestAnimationFrame(() => {
            fitToStage();
            applyTransform(animate);
        });
    }

    function openPosterZoom() {
        if (!poster?.src) return;

        posterZoomImg.src = poster.src;
        posterZoomImg.alt =
            poster.alt || 'Enlarged movie poster';

        zoom.scale = 1;
        zoom.tx = 0;
        zoom.ty = 0;

        const whenReady = () => {
            fitToStage();
            applyTransform(false);
        };

        posterZoomImg.onload = whenReady;

        if (posterZoomImg.complete && posterZoomImg.naturalWidth) {
            whenReady();
        }

        modal.inert = true;
        modal.setAttribute('aria-hidden', 'true');
        posterZoom.setAttribute('aria-hidden', 'false');
        posterZoom.classList.add('open');
        posterZoom.focus();

        // Re-fit once the opening transition starts so the stage has
        // its final dimensions.
        requestAnimationFrame(() => {
            fitToStage();
            applyTransform(false);
        });
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
