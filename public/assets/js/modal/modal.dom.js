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

    const prevBtn = createEl('button', 'modal-nav', '');
    prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
    prevBtn.type = 'button';
    prevBtn.title = 'Previous';
    prevBtn.setAttribute('aria-label', 'Previous movie');

    const nextBtn = createEl('button', 'modal-nav', '');
    nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
    nextBtn.type = 'button';
    nextBtn.title = 'Next';
    nextBtn.setAttribute('aria-label', 'Next movie');

    const title = createEl('h2');
    title.id = 'modalTitle';

    const rating = createEl('a', 'modal-rating');
    rating.id = 'modalRating';

    const closeBtn = createEl('button', 'modal-close', '');
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
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
    desc.classList.add('modal-description');
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
    const numBtn = createEl('button', 'copy-btn icon-btn', '');
    numBtn.innerHTML = '<i class="fa-solid fa-copy" aria-hidden="true"></i>';
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
    fileBtn.innerHTML = '<i class="fa-solid fa-copy" aria-hidden="true"></i>';
    fileBtn.type = 'button';
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
    posterZoom.setAttribute('aria-label', 'Full-size movie poster viewer');
    posterZoom.setAttribute('aria-hidden', 'true');

    // Toolbar with zoom controls
    const zoomToolbar = createEl('div', 'poster-zoom-toolbar');

    const zoomOutBtn = createEl('button', 'zoom-tool-btn', '');
    zoomOutBtn.type = 'button';
    zoomOutBtn.title = 'Zoom out (-)';
    zoomOutBtn.setAttribute('aria-label', 'Zoom out');
    zoomOutBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>';

    const zoomInBtn = createEl('button', 'zoom-tool-btn', '');
    zoomInBtn.type = 'button';
    zoomInBtn.title = 'Zoom in (+)';
    zoomInBtn.setAttribute('aria-label', 'Zoom in');
    zoomInBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i>';

    const zoomResetBtn = createEl('button', 'zoom-tool-btn zoom-reset', '');
    zoomResetBtn.type = 'button';
    zoomResetBtn.title = 'Fit to window (0)';
    zoomResetBtn.setAttribute('aria-label', 'Reset zoom to fit');
    zoomResetBtn.innerHTML = '<i class="fa-solid fa-expand" aria-hidden="true"></i>';

    const zoomActualBtn = createEl('button', 'zoom-tool-btn', '');
    zoomActualBtn.type = 'button';
    zoomActualBtn.title = 'Actual size 1:1 (1)';
    zoomActualBtn.setAttribute('aria-label', 'Show actual size');
    zoomActualBtn.innerHTML = '<i class="fa-solid fa-1" aria-hidden="true"></i>';

    const zoomSpacer = createEl('span', 'zoom-toolbar-spacer');

    const zoomCloseBtn = createEl('button', 'zoom-tool-btn zoom-close', '');
    zoomCloseBtn.type = 'button';
    zoomCloseBtn.title = 'Close (Esc)';
    zoomCloseBtn.setAttribute('aria-label', 'Close full-size viewer');
    zoomCloseBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    zoomToolbar.append(zoomOutBtn, zoomInBtn, zoomResetBtn, zoomActualBtn, zoomSpacer, zoomCloseBtn);

    const zoomStage = createEl('div', 'poster-zoom-stage');
    const posterZoomImg = createEl('img');
    posterZoomImg.alt = 'Enlarged movie poster';
    posterZoomImg.draggable = false;
    zoomStage.appendChild(posterZoomImg);

    const zoomHint = createEl('div', 'poster-zoom-hint');
    zoomHint.innerHTML = '<span><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Scroll to zoom</span>'
        + '<span><i class="fa-solid fa-hand" aria-hidden="true"></i> Drag to pan</span>'
        + '<span><i class="fa-solid fa-mouse-pointer" aria-hidden="true"></i> Double-click to toggle 1:1</span>';

    posterZoom.append(zoomToolbar, zoomStage, zoomHint);
    document.body.appendChild(posterZoom);

    return {
        modal, content, poster, posterZoom, zoomStage, posterZoomImg,
        prevBtn, nextBtn, closeBtn,
        zoomInBtn, zoomOutBtn, zoomResetBtn, zoomActualBtn, zoomCloseBtn
    };
}
