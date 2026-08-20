import {
    animateBytes,
    animateMetric,
    animateNumber
} from './stats-animations.js';
import {
    fetchBetterCopyRows,
    fetchDuplicates,
    fetchMoviePage,
    fetchStats
} from '../core/api.js';
import { state } from '../core/state.js';
import { clearError, showError } from '../utils/feedback.js';
import { configureExternalLink } from '../utils/url.js';
import { loadMovies } from '../app.js';

let panel, loaded = false;
let statsToggleButton;
let duplicateModal;

// duplicate state
let dupGroups = [];
let dupPage = 1;

// Declare getBetterCopyGroups globally, so it can be accessed in other functions
let getBetterCopyGroups = [];
let getBetterCopyPage = 1;

const REC_PER_PAGE = 10;

function createGroupHeader(group, colspan, alternate) {
    const header = document.createElement('tr');
    header.className = `dup-group ${alternate ? 'dup-group-a' : 'dup-group-b'}`;

    const cell = document.createElement('td');
    cell.colSpan = colspan;

    const toggle = document.createElement('span');
    toggle.className = 'dup-toggle';
    toggle.textContent = group.open ? '▼' : '▶';

    const details = document.createTextNode(
        ` ${String(group.title ?? '')} (${String(group.year ?? '')}) `
    );

    const count = Number(group.count) || 0;
    const countLabel = document.createElement('small');
    countLabel.textContent = `— ${count} ${count === 1 ? 'copy' : 'copies'}`;

    cell.append(toggle, details, countLabel);
    header.appendChild(cell);

    return header;
}

function createMovieReferenceRow(row) {
    const tr = document.createElement('tr');
    tr.className = 'dup-child';

    const numCell = document.createElement('td');
    const jumpLink = document.createElement('a');
    jumpLink.href = '#';
    jumpLink.className = 'jump-to-row';
    jumpLink.dataset.num = String(row.NUM ?? '');
    jumpLink.textContent = String(row.NUM ?? '');
    jumpLink.onclick = e => {
        e.preventDefault();
        jumpToMovie(row.NUM);
    };
    numCell.appendChild(jumpLink);

    const yearCell = document.createElement('td');
    yearCell.textContent = String(row.YEAR ?? '');

    const imdbCell = document.createElement('td');
    const imdbLink = document.createElement('a');

    if (configureExternalLink(imdbLink, row.URL)) {
        imdbLink.textContent = 'IMDB';
        imdbCell.appendChild(imdbLink);
    } else {
        imdbCell.textContent = 'IMDB';
    }

    tr.append(numCell, yearCell, imdbCell);
    return tr;
}

export function initStats(toggleBtn, statsPanel) {
    panel = statsPanel;
    statsToggleButton = toggleBtn;
    loaded = false;
    if (!toggleBtn || !panel) return;

    toggleBtn.setAttribute(
        'aria-expanded',
        String(panel.classList.contains('show'))
    );
    panel.setAttribute(
        'aria-hidden',
        String(!panel.classList.contains('show'))
    );

    // Keep the detail list available independently of the summary request.
    // This preserves the original behavior even if the aggregate count is 0
    // or the dashboard request has not finished yet.
    panel.querySelector('#better-copy-card')?.addEventListener(
        'click',
        loadGetBetterCopy
    );

    toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = panel.classList.contains('show');

        panel.classList.toggle('show', !open);
        panel.classList.toggle('hidden', open);
        toggleBtn.setAttribute('aria-expanded', String(!open));
        panel.setAttribute('aria-hidden', String(open));

        if (!open && !loaded) {
            refreshStats();
        }
    });

    panel.querySelector('.stats-close')?.addEventListener('click', () => {
        closePanel(true);
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;

        const openModal = document.querySelector('.stats-modal:not(.hidden)');
        if (openModal) {
            openModal.classList.add('hidden');
            return;
        }

        if (panel.classList.contains('show')) {
            closePanel(true);
        }
    });

    document.addEventListener('click', e => {
        if (!panel.contains(e.target) && e.target !== toggleBtn) {
            closePanel(panel.contains(document.activeElement));
        }
    });
}

export async function refreshStats() {
    panel?.setAttribute('aria-busy', 'true');

    try {
        const data = await fetchStats();

        clearError('stats');
        loaded = true;

        const el = id => document.getElementById(id);
        animateNumber(el('total-movies'), data.total_movies);
        animateBytes(el('total-size'), data.total_size);
        animateMetric(el('average-rating'), data.average_rating, {
            decimals: 1
        });
        animateMetric(el('average-runtime'), data.average_runtime, {
            suffix: ' min'
        });
        animateNumber(el('total-years'), data.years);
        animateNumber(el('total-genres'), data.genres);
        animateNumber(el('total-languages'), data.languages);
        animateNumber(el('total-countries'), data.countries);
        animateMetric(el('health-score'), data.health_score, {
            suffix: '/100'
        });
        animateNumber(el('missing-files'), data.missing_files);
        animateNumber(el('missing-posters'), data.missing_posters);
        animateNumber(el('incomplete-metadata'), data.incomplete_metadata);
        animateNumber(el('needs-better-copy-count'), data.needs_better_copy_count);
        animateNumber(el('duplicate-count'), data.duplicate_count);

        const yearRange = el('year-range');
        const oldestYear = Number(data.oldest_year);
        const newestYear = Number(data.newest_year);
        yearRange.textContent = oldestYear > 0 && newestYear > 0
            ? `${oldestYear}–${newestYear}`
            : 'No dated movies';

        const healthCard = el('health-score-card');
        healthCard.dataset.health = data.health_score >= 90
            ? 'good'
            : data.health_score >= 75
                ? 'warning'
                : 'critical';
        const healthIssues = [
            `${data.missing_files} missing files`,
            `${data.needs_better_copy_count} replacement copies`,
            `${data.duplicate_count} duplicate rows`,
            `${data.missing_posters} missing posters`,
            `${data.incomplete_metadata} incomplete metadata records`
        ];
        healthCard.title = healthIssues.join(' • ');
        healthCard.setAttribute(
            'aria-label',
            `Health score ${data.health_score} out of 100. ${healthIssues.join(', ')}.`
        );

        const duplicateCard = el('duplicate-card');
        duplicateCard.disabled = data.duplicate_count === 0;
        duplicateCard.onclick = data.duplicate_count > 0 ? loadDuplicates : null;

        const betterCopyCard = el('better-copy-card');
        betterCopyCard.title = data.needs_better_copy_count > 0
            ? `Show ${data.needs_better_copy_count} movies marked as needing a better copy`
            : 'Check for movies marked as needing a better copy';
    } catch (err) {
        loaded = false;
        console.error('Stats API error:', err);
        showError(err.message || 'Unable to load statistics', {
            scope: 'stats',
            retry: refreshStats
        });
    } finally {
        panel?.setAttribute('aria-busy', 'false');
    }
}

function closePanel(restoreFocus = false) {
    if (!panel) return;

    if (restoreFocus) {
        statsToggleButton?.focus();
    }

    panel.classList.remove('show');
    panel.classList.add('hidden');
    panel.setAttribute('aria-hidden', 'true');
    statsToggleButton?.setAttribute('aria-expanded', 'false');
}

/* =============================
   DUPLICATES
============================= */

async function loadDuplicates() {
    try {
        const rows = await fetchDuplicates();

        clearError('duplicates');
        dupGroups = groupDuplicates(rows);
        dupPage = 1;
        showDuplicateModal();
    } catch (e) {
        console.error('Duplicate load failed', e);
        showError(e.message || 'Unable to load duplicate movies', {
            scope: 'duplicates',
            retry: loadDuplicates
        });
    }
}

/* Group rows by the same IMDb URL used by the backend duplicate query. */
function groupDuplicates(rows) {
    const map = new Map();

    rows.forEach(row => {
        const key = row.URL;
        if (!map.has(key)) {
            map.set(key, {
                key,
                title: row.ORIGINALTITLE,
                year: row.YEAR,
                url: row.URL,
                count: 0,
                rows: [],
                open: false
            });
        }

        const group = map.get(key);
        group.rows.push(row);
        group.count = group.rows.length;
    });

    return Array.from(map.values());
}

function showDuplicateModal() {
    if (!duplicateModal) {
        duplicateModal = document.createElement('div');
        duplicateModal.className = 'stats-modal hidden';
        duplicateModal.innerHTML = `
            <div class="stats-modal-content">
                <div class="stats-modal-header">
                    <h2>Duplicate Movies</h2>
                    <button type="button" class="stats-close" aria-label="Close duplicate movies dialog">&times;</button>
                </div>

                <div class="stats-modal-body">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <div class="pagination" id="dup-pagination"></div>
            </div>
        `;
        document.body.appendChild(duplicateModal);

        duplicateModal.querySelector('.stats-close').onclick =
            () => duplicateModal.classList.add('hidden');

        duplicateModal.onclick = e => {
            if (e.target === duplicateModal) {
                duplicateModal.classList.add('hidden');
            }
        };
    }

    renderDuplicatePage();
    duplicateModal.classList.remove('hidden');
}

function renderDuplicatePage() {
    const tbody = duplicateModal.querySelector('tbody');
    const pager = duplicateModal.querySelector('#dup-pagination');

    tbody.innerHTML = '';
    pager.innerHTML = '';

    const start = (dupPage - 1) * REC_PER_PAGE;
    const pageGroups = dupGroups.slice(start, start + REC_PER_PAGE);

    let alt = false;
//console.log('Rendering Get Better Copy Page', pageGroups);  // Debugging step

    pageGroups.forEach(group => {
        alt = !alt;

        /* ---------- GROUP HEADER ---------- */
        const header = createGroupHeader(group, 3, alt);
        header.onclick = () => {
            group.open = !group.open;
            renderDuplicatePage();
        };

        tbody.appendChild(header);

        /* ---------- CHILD ROWS ---------- */
        if (group.open) {
            group.rows.forEach(row => {
                tbody.appendChild(createMovieReferenceRow(row));
            });
        }
    });

    const pages = Math.ceil(dupGroups.length / REC_PER_PAGE);
    for (let i = 1; i <= pages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === dupPage ? 'active' : '';
        btn.onclick = () => {
            dupPage = i;
            renderDuplicatePage();
        };
        pager.appendChild(btn);
    }
}

/* =============================
   Better Copy
============================= */

async function loadGetBetterCopy() {
    try {
        const rows = await fetchBetterCopyRows();

        clearError('better-copy');
        // Check if there are movies to display
        if (!Array.isArray(rows) || rows.length === 0) {
            alert("No movies found with 'Get Better Copy'!");
            return;
        }

        // Group the movies by the necessary fields
        getBetterCopyGroups = groupGetBetterCopy(rows);
        getBetterCopyPage = 1;
        showGetBetterCopyModal();
    } catch (e) {
        console.error('Get Better Copy load failed', e);
        showError(e.message || 'Unable to load better-copy movies', {
            scope: 'better-copy',
            retry: loadGetBetterCopy
        });
    }
}

function groupGetBetterCopy(rows) {
    const map = new Map();

    rows.forEach(row => {
        const key = `${row.ORIGINALTITLE}__${row.YEAR}__${row.URL}`;
        if (!map.has(key)) {
            map.set(key, {
                key,
                title: row.ORIGINALTITLE,
                year: row.YEAR,
                url: row.URL,
                count: 0,
                rows: [],
                open: false
            });
        }

        const group = map.get(key);
        group.rows.push(row);
        group.count = group.rows.length;
    });

    return Array.from(map.values());
}

let getBetterCopyModal;

function showGetBetterCopyModal() {
    if (!getBetterCopyModal) {
        getBetterCopyModal = document.createElement('div');
        getBetterCopyModal.className = 'stats-modal hidden';
        getBetterCopyModal.innerHTML = `
            <div class="stats-modal-content">
                <div class="stats-modal-header">
                    <h2>Get Better Copy Movies</h2>
                    <button type="button" class="stats-close" aria-label="Close better-copy movies dialog">&times;</button>
                </div>

                <div class="stats-modal-body">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <div class="pagination" id="better-copy-pagination"></div>
            </div>
        `;
        document.body.appendChild(getBetterCopyModal);

        getBetterCopyModal.querySelector('.stats-close').onclick =
            () => getBetterCopyModal.classList.add('hidden');

        getBetterCopyModal.onclick = e => {
            if (e.target === getBetterCopyModal) {
                getBetterCopyModal.classList.add('hidden');
            }
        };
    }

    renderGetBetterCopyPage();
    getBetterCopyModal.classList.remove('hidden');
}

function renderGetBetterCopyPage() {
    const tbody = getBetterCopyModal.querySelector('tbody');
    const pager = getBetterCopyModal.querySelector('#better-copy-pagination');

    tbody.innerHTML = '';
    pager.innerHTML = '';

    const start = (getBetterCopyPage - 1) * REC_PER_PAGE;
    const pageGroups = getBetterCopyGroups.slice(start, start + REC_PER_PAGE);

    let alt = false;

    pageGroups.forEach(group => {
        alt = !alt;

        /* ---------- GROUP HEADER ---------- */
        const header = createGroupHeader(group, 4, alt);
        header.onclick = () => {
            group.open = !group.open;
            renderGetBetterCopyPage();
        };

        tbody.appendChild(header);

        /* ---------- CHILD ROWS ---------- */
        if (group.open) {
            group.rows.forEach(row => {
                tbody.appendChild(createMovieReferenceRow(row));
            });
        }
    });

    const pages = Math.ceil(getBetterCopyGroups.length / REC_PER_PAGE);
    for (let i = 1; i <= pages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = i === getBetterCopyPage ? 'active' : '';
        btn.onclick = () => {
            getBetterCopyPage = i;
            renderGetBetterCopyPage();
        };
        pager.appendChild(btn);
    }
}

/* =============================
   Jump to table row
============================= */
async function jumpToMovie(num) {
    try {
        const params = new URLSearchParams({
            num,
            perPage: state.limit,
            sort: state.sort,
            dir: state.dir,
            mode: state.searchMode,
            fuzzy: state.fuzzy
        });

        Object.entries(state.search).forEach(([column, value]) => {
            if (value) params.append(`filters[${column}]`, value);
        });

        // Get the page containing this movie under the current table state.
        const data = await fetchMoviePage(params);

        clearError('movie-jump');

        if (!data.found || !data.page) {
            alert(
                'This movie is not included in the current filtered results. ' +
                'Clear or change the filters and try again.'
            );
            return;
        }

        const targetPage = data.page;
        if (targetPage !== state.page) {
            state.page = targetPage;
            await loadMovies(); // reload table with correct page
        }

        // Scroll to the row
        const row = document.querySelector(`tr[data-num="${num}"]`);
        if (!row) return;

        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('row-highlight');

        setTimeout(() => row.classList.remove('row-highlight'), 2000);
    } catch (err) {
        console.error('Failed to jump to movie:', err);
        showError(err.message || 'Unable to locate the movie', {
            scope: 'movie-jump',
            retry: () => jumpToMovie(num)
        });
    }
}
