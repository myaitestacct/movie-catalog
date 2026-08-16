// modal.js
import { splitPath, setMultilineText, setPoster, fillFields } from './modal.utils.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { createModalDOM } from './modal.dom.js';

let movies = [], currentIndex = -1;

export const Modal = (() => {
    let modal, content, poster, posterZoom, posterZoomImg;
    let prevBtn, nextBtn, closeBtn, activeRow = null;

    function initDOM() {
        if (modal) return;

        const dom = createModalDOM();
        ({ modal, content, poster, posterZoom, posterZoomImg, prevBtn, nextBtn, closeBtn } = dom);

        prevBtn.onclick = () => Modal.prev();
        nextBtn.onclick = () => Modal.next();
        closeBtn.onclick = () => modal.classList.remove('open');

        modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

        document.addEventListener('keydown', e => {
            if (!modal.classList.contains('open')) return;
            if (e.key === 'Escape') modal.classList.remove('open');
            if (e.key === 'ArrowRight') Modal.next();
            if (e.key === 'ArrowLeft') Modal.prev();
        });

        // Poster click to maximize
        poster.onclick = () => {
            posterZoomImg.src = poster.src;
            posterZoom.classList.add('open');
        };

        // Click anywhere on zoomed poster to close
        posterZoom.onclick = () => posterZoom.classList.remove('open');
    }

    function highlightRow(movie) {
        if (activeRow) activeRow.classList.remove('active-movie-row');
        activeRow = document.querySelector(`tr[data-num="${movie.NUM}"]`);
        if (activeRow) activeRow.classList.add('active-movie-row');
    }

    function renderMovieView(movie) {
        // Poster
        setPoster(poster, movie.PICTURENAME, '/movies/antexport', '/movies/antexport/movies_0000-coming_soon.jpg');

        // Header
        const titleEl = modal.querySelector('#modalTitle');
        titleEl.textContent = (movie.FORMATTEDTITLE || movie.ORIGINALTITLE || '').trim();

        const ratingEl = modal.querySelector('#modalRating');
        ratingEl.textContent = movie.RATING || '';
        ratingEl.href = movie.URL || '#';

        // Description
        setMultilineText(modal.querySelector('#modalDescription'), movie.DESCRIPTION || '');

        // Map basic fields
        const map = {
            modalYear: movie.YEAR,
            modalLength: movie.LENGTH,
            modalCert: movie.CERTIFICATION,
            modalLanguage: movie.LANGUAGES,
            modalCategory: movie.CATEGORY,
            modalCountry: movie.COUNTRY,
            modalDirector: movie.DIRECTOR,
            modalActors: movie.ACTORS,
            modalNum: movie.NUM,
            modalFilesize: movie.FILESIZE,
            modalResolution: movie.RESOLUTION,
            modalAudio: movie.AUDIOFORMAT,
            modalSubtitles: movie.SUBTITLES
        };
        fillFields(modal, map);

        // ===== File info with copy button =====
        const { path, file } = splitPath(movie.FILEPATH);
        modal.querySelector('#modalPath').textContent = path;

        const fileContainer = modal.querySelector('#modalFile');
        const fileSpan = fileContainer.querySelector('.file-name');
        const fileBtn = fileContainer.querySelector('.copy-btn');

        if (fileSpan) fileSpan.textContent = file || '';

        if (fileBtn) {
            fileBtn.onclick = e => {
                e.stopPropagation();
                copyToClipboard(file || '', fileBtn);
            };
        }

        // Get the #modalNum div
        const numDiv = document.querySelector('#modalNum');

        // Wrap the number in a span if it isn't already
        let numSpan = numDiv.querySelector('span.num-value');
        if (!numSpan) {
            numSpan = document.createElement('span');
            numSpan.className = 'num-value';
            numSpan.textContent = numDiv.textContent; // preserve existing number
            numDiv.textContent = '';
            numDiv.appendChild(numSpan);
        }

        // Create the copy button
        const numBtn = document.createElement('button');
        numBtn.className = 'copy-btn icon-btn';
        numBtn.title = 'Copy Num';
        numBtn.textContent = '📋'; // native clipboard icon
        numDiv.appendChild(numBtn);

        // Attach click handler
        numBtn.onclick = e => {
            e.stopPropagation();
            const value = numSpan.textContent;
            copyToClipboard(value + '__', numBtn);
        };

        highlightRow(movie);
    }

    function renderMovie(movie) {
        if (!modal) initDOM();
        renderMovieView(movie);
        modal.classList.add('open');
    }

    return {
        setMovies(list) { movies = list || []; },
        show(movie, index = -1) { currentIndex = index; if (movie) renderMovie(movie); },
        next() {
            if (!movies.length) return;
            currentIndex = (currentIndex + 1) % movies.length;
            renderMovie(movies[currentIndex]);
        },
        prev() {
            if (!movies.length) return;
            currentIndex = (currentIndex - 1 + movies.length) % movies.length;
            renderMovie(movies[currentIndex]);
        }
    };
})();