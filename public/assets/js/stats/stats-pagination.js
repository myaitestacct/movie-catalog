function normalizePage(value, fallback = 1) {
    const page = Number.parseInt(value, 10);
    return Number.isFinite(page) && page > 0 ? page : fallback;
}

export function getStatsPageWindow(currentPage, totalPages, radius = 2) {
    const pages = Math.max(1, normalizePage(totalPages));
    const current = Math.min(pages, normalizePage(currentPage));
    const windowRadius = Math.max(0, normalizePage(radius, 0));
    const start = Math.max(1, current - windowRadius);
    const end = Math.min(pages, current + windowRadius);

    return Array.from(
        { length: end - start + 1 },
        (_, index) => start + index
    );
}

function createPageButton(label, page, currentPage, totalPages, onPageChange) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = page < 1 || page > totalPages || page === currentPage;

    if (typeof label === 'number') {
        button.setAttribute('aria-label', `Go to page ${page}`);

        if (page === currentPage) {
            button.classList.add('active');
            button.setAttribute('aria-current', 'page');
        }
    } else {
        button.setAttribute('aria-label', `${label} page`);
    }

    button.addEventListener('click', () => {
        if (!button.disabled) onPageChange(page);
    });

    return button;
}

export function renderStatsPagination(
    container,
    {
        currentPage,
        totalPages,
        totalItems = 0,
        itemLabel = 'item',
        ariaLabel = 'Pagination',
        onPageChange
    }
) {
    if (!container) return;

    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', ariaLabel);

    const pages = Math.max(1, normalizePage(totalPages));
    const current = Math.min(pages, normalizePage(currentPage));
    const count = Math.max(0, Number(totalItems) || 0);
    const changePage = page => onPageChange?.(
        Math.max(1, Math.min(pages, page))
    );

    container.innerHTML = '';

    const info = document.createElement('span');
    info.className = 'stats-pagination-info';
    info.textContent =
        `Page ${current} of ${pages} • ${count.toLocaleString()} ` +
        `${itemLabel}${count === 1 ? '' : 's'}`;
    container.appendChild(info);

    if (pages === 1) return;

    const controls = document.createElement('span');
    controls.className = 'stats-pagination-controls';
    controls.append(
        createPageButton('First', 1, current, pages, changePage),
        createPageButton('Prev', current - 1, current, pages, changePage)
    );

    getStatsPageWindow(current, pages).forEach(page => {
        controls.appendChild(
            createPageButton(page, page, current, pages, changePage)
        );
    });

    controls.append(
        createPageButton('Next', current + 1, current, pages, changePage),
        createPageButton('Last', pages, current, pages, changePage)
    );
    container.appendChild(controls);

    const jumpLabel = document.createElement('label');
    jumpLabel.className = 'stats-pagination-jump';

    const jumpText = document.createElement('span');
    jumpText.textContent = 'Jump to';

    const jumpSelect = document.createElement('select');
    jumpSelect.setAttribute('aria-label', `Jump to page — ${ariaLabel}`);

    for (let page = 1; page <= pages; page++) {
        const option = document.createElement('option');
        option.value = String(page);
        option.textContent = `Page ${page}`;
        option.selected = page === current;
        jumpSelect.appendChild(option);
    }

    jumpSelect.addEventListener('change', event => {
        changePage(normalizePage(event.target.value));
    });

    jumpLabel.append(jumpText, jumpSelect);
    container.appendChild(jumpLabel);
}
