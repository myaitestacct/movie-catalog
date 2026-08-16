import { animateNumber, animateBytes } from './stats-animations.js';
import { state } from '../core/state.js';
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
            loaded = true;
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
        const res = await fetch('api/stats.php');
        const data = await res.json();

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
        console.error('Stats API error:', err);
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
        const res = await fetch('api/duplicates.php');
        const rows = await res.json();

        dupGroups = groupDuplicates(rows);
        dupPage = 1;
        showDuplicateModal();
    } catch (e) {
        console.error('Duplicate load failed', e);
    }
}

/* Group rows by ORIGINALTITLE + YEAR + URL */
function groupDuplicates(rows) {
    const map = new Map();

    rows.forEach(row => {
        const key = `${row.ORIGINALTITLE}__${row.YEAR}__${row.URL}`;
        if (!map.has(key)) {
            map.set(key, {
                key,
                title: row.ORIGINALTITLE,
                year: row.YEAR,
                url: row.URL,
                count: row.dup_count,
                rows: [],
                open: false
            });
        }
        map.get(key).rows.push(row);
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
        const header = document.createElement('tr');
        header.className = `dup-group ${alt ? 'dup-group-a' : 'dup-group-b'}`;

        header.innerHTML = `
            <td colspan="3">
                <span class="dup-toggle">${group.open ? '▼' : '▶'}</span>
                ${group.title} (${group.year})
                <small>— ${group.count} copies</small>
            </td>
        `;

        header.onclick = () => {
            group.open = !group.open;
            renderDuplicatePage();
        };

        tbody.appendChild(header);

        /* ---------- CHILD ROWS ---------- */
        if (group.open) {
            group.rows.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = 'dup-child';

                tr.innerHTML = `
                    <td><a href="#" data-num="${row.NUM}" class="jump-to-row">${row.NUM}</a></td>
                    <td>${row.YEAR}</td>
                    <td><a href="${row.URL}" target="_blank">IMDB</a></td>
                `;

                tr.querySelector('a').onclick = e => {
                    e.preventDefault();
                    jumpToMovie(row.NUM);
                };

                tbody.appendChild(tr);
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
        // Fetch data from the backend API
        const res = await fetch('api/better-copy.php'); // Adjust the URL as necessary
        const rows = await res.json();
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
                count: 1, // All rows should have 1 for 'needs_better_copy'
                rows: [],
                open: false
            });
        }
        map.get(key).rows.push(row);
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
        const header = document.createElement('tr');
        header.className = `dup-group ${alt ? 'dup-group-a' : 'dup-group-b'}`;

        header.innerHTML = `
            <td colspan="4">
                <span class="dup-toggle">${group.open ? '▼' : '▶'}</span>
                ${group.title} (${group.year})
                <small>— ${group.count} copies</small>
            </td>
        `;

        header.onclick = () => {
            group.open = !group.open;
            renderGetBetterCopyPage();
        };

        tbody.appendChild(header);

        /* ---------- CHILD ROWS ---------- */
        if (group.open) {
            group.rows.forEach(row => {
                const tr = document.createElement('tr');
                tr.className = 'dup-child';

                tr.innerHTML = `
                    <td><a href="#" data-num="${row.NUM}" class="jump-to-row">${row.NUM}</a></td>
                    <td>${row.YEAR}</td>
                    <td><a href="${row.URL}" target="_blank">IMDB</a></td>
                `;

                // Link NUM to the original table row
                tr.querySelector('td').onclick = (e) => {
                    e.preventDefault();
                    jumpToMovie(row.NUM); // This will scroll to the original row in the movie table
                };

                tbody.appendChild(tr);
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
        // Get the page containing this movie
        const res = await fetch(`api/movie-page.php?num=${num}&perPage=50&sort=${state.sort}&dir=${state.dir}`);
        const data = await res.json();

        if (data.error) {
            console.error('Server error:', data.error);
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
    }
}
function highlightCurrentPage() {
    document
        .querySelectorAll('.pagination button')
        .forEach(btn => {
            btn.classList.toggle(
                'active',
                Number(btn.textContent) === state.page
            );
        });
}

function highlightMovieRow(num) {
    const row = document.querySelector(`tr[data-num="${num}"]`);
    if (!row) return;

    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('row-highlight');

    setTimeout(() => row.classList.remove('row-highlight'), 2000);
}
