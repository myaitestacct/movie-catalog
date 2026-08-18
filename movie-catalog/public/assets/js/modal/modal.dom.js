import { createEl, appendKV } from './modal.utils.js';

export function createModalDOM() {
    const modal = createEl('div', 'movie-modal');
    modal.id = 'movieModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modalTitle');
    modal.setAttribute('aria-hidden', 'true');

    const content = createEl('div', 'movie-modal-content');
    content.tabIndex = -1;

    /* ===== Header ===== */
    const header = createEl('div', 'modal-header');

    const prevBtn = createEl('button', 'modal-nav', '◀');
    prevBtn.type = 'button';
    prevBtn.title = 'Previous';
    prevBtn.setAttribute('aria-label', 'Previous movie');

    const nextBtn = createEl('button', 'modal-nav', '▶');
    nextBtn.type = 'button';
    nextBtn.title = 'Next';
    nextBtn.setAttribute('aria-label', 'Next movie');

    const title = createEl('h2');
    title.id = 'modalTitle';

    const rating = createEl('a', 'modal-rating');
    rating.id = 'modalRating';

    const closeBtn = createEl('button', 'modal-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close movie details');

    header.append(prevBtn, nextBtn, title, rating, closeBtn);
    content.append(header, createEl('hr'));

    /* ===== Body ===== */
    const body = createEl('div', 'modal-body');

    const posterSection = createEl('div', 'poster-section');
    const poster = createEl('img');
    poster.id = 'modalPoster';
    poster.alt = 'Movie poster';
    poster.tabIndex = 0;
    poster.setAttribute('role', 'button');
    poster.setAttribute('aria-label', 'Enlarge movie poster');
    posterSection.appendChild(poster);
    body.appendChild(posterSection);

    const details = createEl('div', 'details-section');
    const desc = createEl('p');
    desc.id = 'modalDescription';
    details.append(desc, createEl('hr'));

    const infoGrid = createEl('div', 'info-grid');
    ['Year','Length','Certification','Language','Category','Country'].forEach(label =>
        appendKV(infoGrid, label+':', 'modal'+label)
    );
    details.appendChild(infoGrid);

    const crewGrid = createEl('div', 'crew-info info-grid');
    ['Director','Actors'].forEach(label =>
        appendKV(crewGrid, label+':', 'modal'+label)
    );
    details.append(crewGrid, createEl('hr'));

    /* ===== Technical details ===== */
    const techPanel = createEl('details', 'tech-panel');
    techPanel.open = true;

    const summary = createEl('summary');
    summary.append(
        createEl('span', 'summary-arrow'),
        createEl('span', 'summary-text', 'Technical details')
    );
    techPanel.appendChild(summary);

    const techContent = createEl('div', 'tech-content');
    const techGrid = createEl('div', 'tech-media-grid');

    // Instead of relying on appendKV for Num, create it manually like File
    const numLabel = createEl('div', 'k', 'Num:');
    const numValue = createEl('div', 'v');
    numValue.id = 'modalNum';
    const numSpan = createEl('span', 'num-value', ''); // empty, will fill later
    const numBtn = createEl('button', 'copy-btn icon-btn', '📋');
    numBtn.type = 'button';
    numBtn.title = 'Copy Num';
    numValue.append(numSpan, numBtn);
    techGrid.append(numLabel, numValue);

    ['Filesize','Resolution','Audio','Subtitles','Path'].forEach(label =>
        appendKV(techGrid, label+':', 'modal'+label)
    );

    techContent.appendChild(techGrid);

    // ===== File field with copy button =====
    const mediaInfo = createEl('div', 'media-info');
    mediaInfo.append(createEl('div', 'k', 'File:'));
    const fileVal = createEl('div', 'v');
    fileVal.id = 'modalFile';

    const fileSpan = createEl('span', 'file-name');
    const fileBtn = createEl('button', 'copy-btn icon-btn');
    fileBtn.type = 'button';
    fileBtn.textContent = '📋';
    fileBtn.title = 'Copy File Name';

    fileVal.append(fileSpan, fileBtn);
    mediaInfo.appendChild(fileVal);
    techContent.appendChild(mediaInfo);

    techPanel.appendChild(techContent);
    details.appendChild(techPanel);

    body.appendChild(details);
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);

    /* ===== Poster Zoom ===== */
    const posterZoom = createEl('div');
    posterZoom.id = 'posterZoom';
    posterZoom.tabIndex = -1;
    posterZoom.setAttribute('role', 'dialog');
    posterZoom.setAttribute('aria-modal', 'true');
    posterZoom.setAttribute('aria-label', 'Enlarged movie poster');
    posterZoom.setAttribute('aria-hidden', 'true');
    const posterZoomImg = createEl('img');
    posterZoomImg.alt = 'Enlarged movie poster';
    posterZoom.appendChild(posterZoomImg);
    document.body.appendChild(posterZoom);

    return { modal, content, poster, posterZoom, posterZoomImg, prevBtn, nextBtn, closeBtn };
}