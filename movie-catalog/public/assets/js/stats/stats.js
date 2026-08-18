import { animateNumber, animateBytes } from './stats-animations.js';
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
    loaded = false;
    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = panel.classList.contains('show');

        panel.classList.toggle('show', !open);
        panel.classList.toggle('hidden', open);

        if (!open && !loaded) {
            refreshStats();
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closePanel();
    });

    document.addEventListener('click', e => {
        if (!panel.contains(e.target) && e.target !== toggleBtn) {
            closePanel();
        }
    });
}

export async function refreshStats() {
    try {
        const data = await fetchStats();

        clearError('stats');
        loaded = true;

        const el = id => document.getElementById(id);
        animateNumber(el('total-movies'), data.total_movies);
        animateNumber(el('total-years'), data.years);
        animateNumber(el('total-genres'), data.genres);
        animateBytes(el('total-size'), data.total_size);
        animateNumber(el('missing-files'), data.missing_files);
        animateNumber(el('needs-better-copy-count'), data.needs_better_copy_count);
        animateNumber(el('duplicate-count'), data.duplicate_count);

        const dupEl = el('duplicate-count');
        if (data.duplicate_count > 0) {
            dupEl.style.cursor = 'pointer';
            dupEl.onclick = loadDuplicates;  // Set function to open modal
        } else {
            dupEl.style.cursor = 'default';
            dupEl.onclick = null;
        }

        const betterCopyEl = el('needs-better-copy-count');
        if (data.needs_better_copy_count > 0) {
            betterCopyEl.style.cursor = 'pointer';
            betterCopyEl.onclick = loadGetBetterCopy;  // Set function to open modal
        } else {
            betterCopyEl.style.cursor = 'default';
            betterCopyEl.onclick = null;
        }
    } catch (err) {
        loaded = false;
        console.error('Stats API error:', err);
        showError(err.message || 'Unable to load statistics', {
            scope: 'stats',
            retry: refreshStats
        });
    }
}

function closePanel() {
    panel.classList.remove('show');
    panel.classList.add('hidden');
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
                    <button class="stats-close">&times;</button>
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
                    <button class="stats-close">&times;</button>
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
