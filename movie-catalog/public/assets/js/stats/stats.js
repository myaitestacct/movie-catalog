import {
    animateBytes,
    animateMetric,
    animateNumber
} from './stats-animations.js';
import { renderStatsPagination } from './stats-pagination.js';
import * as releaseYearAnalytics from './stats-release-years.js';
import * as genreAnalytics from './stats-genres.js';
import * as ratingRuntimeAnalytics from './stats-rating-runtime.js';
import * as certificationAnalytics from './stats-certifications.js';
import * as directorAnalytics from './stats-directors.js';
import * as castAnalytics from './stats-cast.js';
import * as languageCountryAnalytics from './stats-language-country.js';
import * as technicalFormatAnalytics from './stats-technical-formats.js';
import * as storageAnalytics from './stats-storage.js';
import * as metadataCompleteness from './stats-metadata-completeness.js';
import {
    countGroupedRows,
    groupMovieRows,
    LIBRARY_ISSUE_CONFIG
} from './stats-issues.js';
import {
    applyTableFilter,
    getBandTableFilter,
    getDecadeTableFilter,
    getFacetTableFilter,
    getYearTableFilter,
    setTableFilterLoader
} from './stats-table-filters.js';
import {
    fetchBetterCopyRows,
    fetchDuplicates,
    fetchLibraryIssueRows,
    fetchMetadataIssueRows,
    fetchMoviePage,
    fetchStats
} from '../core/api.js';
import { createLatestRequest, isAbortError } from '../core/request.js';
import { state, getMovieStateSignature } from '../core/state.js';
import { clearError, showError } from '../utils/feedback.js';
import { configureExternalLink } from '../utils/url.js';
import { formatBytes } from '../utils/format.js';

// This module must never import from the entry point (../app.js).
// The page loads the entry with a cache key (app.js?v=<mtime>), so an
// import of '../app.js' resolves to a *second* module record and the
// whole application evaluates twice: JS-created toolbar buttons show
// up duplicated, and every addEventListener-bound control flips its
// state twice per click (which looks like "does nothing").
// app.js injects what we need instead -- see setMovieLoader().
let movieLoader = null;

/**
 * Register the movie loader owned by the entry point.
 * @param {() => Promise<*>} loader
 */
export function setMovieLoader(loader) {
    movieLoader = typeof loader === 'function' ? loader : null;
    setTableFilterLoader(movieLoader);
}

let panel, loaded = false;
let statsToggleButton;
let statsBackdrop;
let duplicateModal;

export function isStatsLoaded() {
    return loaded;
}

// duplicate state
let dupGroups = [];
let dupPage = 1;

// Declare getBetterCopyGroups globally, so it can be accessed in other functions
let getBetterCopyGroups = [];
let getBetterCopyPage = 1;

let libraryIssueModal;
let libraryIssueGroups = [];
let libraryIssuePage = 1;
let activeLibraryIssueConfig = null;
let libraryIssueFocusReturn = null;

const statsRequests = createLatestRequest();
const statsDetailRequests = createLatestRequest();
const movieJumpRequests = createLatestRequest();

const REC_PER_PAGE = 10;

function getLibraryIssueCard(config) {
    const card = document.getElementById(config.cardId);
    if (card) return card;

    return document.getElementById(config.metricId)?.closest('.stat-card') ?? null;
}

function bindLibraryIssueCard(issueType, config) {
    const card = getLibraryIssueCard(config);
    if (!card || card.dataset.libraryIssueBound === 'true') return;

    card.id = config.cardId;
    card.classList.add('stat-card-action');
    card.dataset.libraryIssueBound = 'true';
    card.setAttribute('aria-label', `Show ${config.title.toLowerCase()}`);
    card.addEventListener('click', () => loadLibraryIssues(issueType));

    if (card.tagName !== 'BUTTON') {
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.addEventListener('keydown', event => {
            if (event.key !== 'Enter' && event.key !== ' ') return;

            event.preventDefault();
            card.click();
        });
    }
}

function createGroupHeader(group, colspan, alternate, itemLabel = 'copy') {
    const header = document.createElement('tr');
    header.className = `dup-group ${alternate ? 'dup-group-a' : 'dup-group-b'}`;

    const cell = document.createElement('td');
    cell.colSpan = colspan;

    const toggle = document.createElement('span');
    toggle.className = 'dup-toggle';
    toggle.innerHTML = `<i class="fa-solid fa-chevron-${group.open ? 'down' : 'right'}" aria-hidden="true"></i>`;

    const details = document.createTextNode(
        ` ${String(group.title ?? '')} (${String(group.year ?? '')}) `
    );

    const count = Number(group.count) || 0;
    const countLabel = document.createElement('small');
    countLabel.textContent =
        `— ${count} ${itemLabel}${count === 1 ? '' : 's'}`;

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
    statsBackdrop = document.getElementById('stats-backdrop');
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

    Object.entries(LIBRARY_ISSUE_CONFIG).forEach(([issueType, config]) => {
        bindLibraryIssueCard(issueType, config);
    });

    toggleBtn.addEventListener('click', e => {
        e.stopPropagation();
        const open = panel.classList.contains('show');

        panel.classList.toggle('show', !open);
        panel.classList.toggle('hidden', open);
        statsBackdrop?.classList.toggle('show', !open);
        toggleBtn.setAttribute('aria-expanded', String(!open));
        panel.setAttribute('aria-hidden', String(open));

        if (!open && !loaded) {
            refreshStats();
        }
    });

    // Backdrop click closes the drawer (the global outside-click
    // listener below already covers it; this keeps focus on the ribbon).
    statsBackdrop?.addEventListener('click', () => closePanel(true));

    // Section anchor navigation
    panel.querySelectorAll('.stats-section-nav button')
        .forEach(button => {
            button.addEventListener('click', () => {
                const target = document.getElementById(
                    button.dataset.target || ''
                );
                target?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        });

    panel.querySelector('.stats-close')?.addEventListener('click', () => {
        closePanel(true);
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;

        const openModal = document.querySelector('.stats-modal:not(.hidden)');
        if (openModal) {
            if (openModal === libraryIssueModal) {
                closeLibraryIssueModal();
            } else {
                openModal.classList.add('hidden');
            }
            return;
        }

        if (panel.classList.contains('show')) {
            closePanel(true);
        }
    });

    document.addEventListener('click', e => {
        const inStatsModal = e.composedPath().some(element =>
            element?.classList?.contains('stats-modal')
        );
        if (
            !panel.contains(e.target) &&
            e.target !== toggleBtn &&
            !inStatsModal
        ) {
            closePanel(panel.contains(document.activeElement));
        }
    });
}

export async function refreshStats() {
    const request = statsRequests.start();
    panel?.setAttribute('aria-busy', 'true');

    try {
        const data = await fetchStats({ signal: request.signal });
        if (!request.isCurrent()) return false;

        clearError('stats');
        loaded = true;
        latestStatsData = data;

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

        releaseYearAnalytics.renderReleaseYearAnalytics?.(
            data.release_year_analytics,
            data.total_movies,
            handleSliceSelect
        );
        genreAnalytics.renderGenreAnalytics?.(
            data.genre_analytics,
            data.total_movies,
            handleSliceSelect
        );
        ratingRuntimeAnalytics.renderRatingRuntimeAnalytics?.(
            data.rating_runtime_analytics,
            data.total_movies,
            handleSliceSelect
        );
        certificationAnalytics.renderCertificationAnalytics?.(
            data.certification_analytics,
            data.total_movies,
            handleSliceSelect
        );
        directorAnalytics.renderDirectorAnalytics?.(
            data.director_analytics,
            data.total_movies,
            handleSliceSelect
        );
        castAnalytics.renderCastAnalytics?.(
            data.cast_analytics,
            data.total_movies,
            handleSliceSelect
        );
        languageCountryAnalytics.renderLanguageCountryAnalytics?.(
            data.language_country_analytics,
            data.total_movies,
            handleSliceSelect
        );
        technicalFormatAnalytics.renderTechnicalFormatAnalytics?.(
            data.technical_format_analytics,
            data.total_movies,
            handleSliceSelect
        );
        storageAnalytics.renderStorageAnalytics?.(
            data.storage_analytics,
            data.total_movies,
            handleSliceSelect
        );
        metadataCompleteness.renderMetadataCompleteness?.(
            data.metadata_completeness,
            data.total_movies,
            loadMetadataIssues
        );

        bindInsightDrillDowns();

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

        Object.values(LIBRARY_ISSUE_CONFIG).forEach(config => {
            const issueCount = Number(data[config.countField]) || 0;
            const issueCard = getLibraryIssueCard(config);
            if (!issueCard) return;

            const actionText = issueCount > 0
                ? `Show ${issueCount} ${issueCount === 1 ? 'movie' : 'movies'} in ${config.title}`
                : `Check ${config.title}`;

            issueCard.title = actionText;
            issueCard.setAttribute('aria-label', actionText);
        });

        const duplicateCard = el('duplicate-card');
        duplicateCard.disabled = data.duplicate_count === 0;
        duplicateCard.onclick =
            data.duplicate_count > 0 ? loadDuplicates : null;

        // App header summary chips
        const sizeChip = el('summary-size-chip');
        const sizeValue = el('summary-size');
        if (sizeChip && sizeValue) {
            sizeValue.textContent = formatBytes(
                Number(data.total_size) || 0
            );
            sizeChip.hidden = false;
        }

        const healthChip = el('summary-health-chip');
        const healthValue = el('summary-health');
        if (healthChip && healthValue) {
            healthValue.textContent = String(
                Number(data.health_score) || 0
            );
            healthChip.dataset.tier = data.health_score >= 90
                ? 'good'
                : data.health_score >= 75
                    ? 'warning'
                    : 'critical';
            healthChip.hidden = false;
        }

        const betterCopyCard = el('better-copy-card');
        betterCopyCard.title = data.needs_better_copy_count > 0
            ? `Show ${data.needs_better_copy_count} movies marked as needing a better copy`
            : 'Check for movies marked as needing a better copy';

        return true;
    } catch (error) {
        if (!request.isCurrent() || isAbortError(error)) return false;

        loaded = false;
        console.error('Stats API error:', error);
        showError(error.message || 'Unable to load statistics', {
            scope: 'stats',
            retry: refreshStats
        });
        return false;
    } finally {
        if (request.isCurrent()) {
            panel?.setAttribute('aria-busy', 'false');
            request.finish();
        }
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
    statsBackdrop?.classList.remove('show');
}

/**
 * Analytics drill-down: apply the clicked chart slice as a filter on the
 * main movie table, then close the drawer so the filtered results are
 * visible. The filter behaves like any toolbar filter (editable input and
 * removable pill), so further slices stack as AND filters.
 * @param {{column: string, value: string}} spec
 */
function handleSliceSelect(spec) {
    if (!applyTableFilter(spec)) return;

    // Reveal the filtered table behind the drawer.
    closePanel(true);
}

/* =============================
   Insight-card drill-downs
============================= */

// Latest stats payload, so insight cards bound once can resolve their
// filter spec from fresh data on click.
let latestStatsData = null;

// Top-item insight cards that drill down into the main table. `getSpec`
// resolves the filter from the latest stats payload; cards whose data is
// missing stay non-interactive.
const INSIGHT_DRILL_DOWNS = [
    {
        valueId: 'peak-release-year',
        getSpec: data => getYearTableFilter(
            data?.release_year_analytics?.peak_year?.year
        ),
        title: (spec, data) => `Filter the table to movies from ` +
            `${data?.release_year_analytics?.peak_year?.year}`
    },
    {
        valueId: 'busiest-release-decade',
        getSpec: data => getDecadeTableFilter(
            data?.release_year_analytics?.busiest_decade?.start_year
        ),
        title: (spec, data) => `Filter the table to movies from the ` +
            `${data?.release_year_analytics?.busiest_decade?.label}`
    },
    {
        valueId: 'top-genre',
        getSpec: data => getFacetTableFilter(
            'CATEGORY',
            data?.genre_analytics?.top_genre?.label
        ),
        title: spec => `Filter the table to ${spec.value} movies`
    },
    {
        valueId: 'top-rating-band',
        getSpec: data => getBandTableFilter(
            'rating',
            data?.rating_runtime_analytics?.top_rating_band?.key
        ),
        title: (spec, data) => `Filter the table to movies rated ` +
            `${data?.rating_runtime_analytics?.top_rating_band?.label}`
    },
    {
        valueId: 'common-runtime-band',
        getSpec: data => getBandTableFilter(
            'runtime',
            data?.rating_runtime_analytics?.common_runtime_band?.key
        ),
        title: (spec, data) => `Filter the table to movies running ` +
            `${data?.rating_runtime_analytics?.common_runtime_band?.label}`
    },
    {
        valueId: 'top-certification',
        getSpec: data => getFacetTableFilter(
            'CERTIFICATION',
            data?.certification_analytics?.top_item?.label
        ),
        title: spec => `Filter the table to movies certified ${spec.value}`
    },
    {
        valueId: 'top-director',
        getSpec: data => getFacetTableFilter(
            'DIRECTOR',
            data?.director_analytics?.top_item?.label
        ),
        title: spec => `Filter the table to movies directed by ` +
            `${spec.value}`
    },
    {
        valueId: 'top-actor',
        getSpec: data => getFacetTableFilter(
            'ACTORS',
            data?.cast_analytics?.top_actor?.label
        ),
        title: spec => `Filter the table to movies with ${spec.value}`
    },
    {
        valueId: 'top-language',
        getSpec: data => getFacetTableFilter(
            'LANGUAGES',
            data?.language_country_analytics?.languages?.top_item?.label
        ),
        title: spec => `Filter the table to ${spec.value} movies`
    },
    {
        valueId: 'top-country',
        getSpec: data => getFacetTableFilter(
            'COUNTRY',
            data?.language_country_analytics?.countries?.top_item?.label
        ),
        title: spec => `Filter the table to movies from ${spec.value}`
    },
    {
        valueId: 'top-resolution',
        getSpec: data => getFacetTableFilter(
            'RESOLUTION',
            data?.technical_format_analytics?.resolutions?.top_item?.label
        ),
        title: spec => `Filter the table to ${spec.value} movies`
    },
    {
        valueId: 'top-audio-format',
        getSpec: data => getFacetTableFilter(
            'AUDIOFORMAT',
            data?.technical_format_analytics?.audio_formats?.top_item?.label
        ),
        title: spec => `Filter the table to ${spec.value} movies`
    }
];

/**
 * Make the top-item insight cards clickable drill-downs. Bound once per
 * card; each click resolves its filter from the latest stats payload.
 */
function bindInsightDrillDowns() {
    INSIGHT_DRILL_DOWNS.forEach(binding => {
        const card = document
            .getElementById(binding.valueId)
            ?.closest('article');

        if (!card) return;

        if (card.dataset.drillDownBound !== 'true') {
            // Do not style the card as actionable until its data exists.
            if (!binding.getSpec(latestStatsData)) return;

            card.dataset.drillDownBound = 'true';
            card.classList.add('stat-card-action', 'stats-slice-action');
            card.setAttribute('role', 'button');
            card.tabIndex = 0;

            card.addEventListener('click', () => {
                const spec = binding.getSpec(latestStatsData);

                if (spec) handleSliceSelect(spec);
            });

            card.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;

                event.preventDefault();
                card.click();
            });
        }

        const spec = binding.getSpec(latestStatsData);

        if (spec) {
            const description = binding.title(spec, latestStatsData);

            card.title = description;
            card.setAttribute('aria-label', description);
        }
    });

    bindLargestMovieDrillDown();
}

/** The Largest Movie card jumps to that row instead of filtering. */
function bindLargestMovieDrillDown() {
    const card = document
        .getElementById('largest-storage-movie')
        ?.closest('article');

    if (!card || card.dataset.drillDownBound === 'true') return;

    const num = String(
        latestStatsData?.storage_analytics?.largest_movie?.num ?? ''
    );

    if (!num) return;

    card.dataset.drillDownBound = 'true';
    card.classList.add('stat-card-action', 'stats-slice-action');
    card.setAttribute('role', 'button');
    card.tabIndex = 0;

    const description = 'Jump to the largest movie in the table';
    card.title = description;
    card.setAttribute('aria-label', description);

    card.addEventListener('click', () => jumpToMovie(num));

    card.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;

        event.preventDefault();
        card.click();
    });
}

/* =============================
   DUPLICATES
============================= */

async function loadDuplicates() {
    const request = statsDetailRequests.start();

    try {
        const rows = await fetchDuplicates({ signal: request.signal });
        if (!request.isCurrent()) return;

        clearError('duplicates');
        dupGroups = groupDuplicates(rows);
        dupPage = 1;
        showDuplicateModal();
    } catch (error) {
        if (!request.isCurrent() || isAbortError(error)) return;

        console.error('Duplicate load failed', error);
        showError(error.message || 'Unable to load duplicate movies', {
            scope: 'duplicates',
            retry: loadDuplicates
        });
    } finally {
        request.finish();
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
   LIBRARY ISSUES
============================= */

async function loadIssueRows(config) {
    const request = statsDetailRequests.start();

    try {
        const rows = await config.fetchRows(request.signal);
        if (!request.isCurrent()) return;

        clearError(config.scope);

        if (rows.length === 0) {
            alert(config.emptyMessage);
            return;
        }

        activeLibraryIssueConfig = config;
        libraryIssueGroups = groupMovieRows(rows);
        libraryIssuePage = 1;
        showLibraryIssueModal();
    } catch (error) {
        if (!request.isCurrent() || isAbortError(error)) return;

        console.error(`Failed to load ${config.title}`, error);
        showError(
            error.message ||
                `Unable to load ${config.title.toLowerCase()}`,
            {
                scope: config.scope,
                retry: config.retry
            }
        );
    } finally {
        request.finish();
    }
}

function loadLibraryIssues(issueType) {
    const config = LIBRARY_ISSUE_CONFIG[issueType];
    if (!config) return;

    return loadIssueRows({
        ...config,
        scope: `library-issue-${issueType}`,
        fetchRows: signal =>
            fetchLibraryIssueRows(issueType, { signal }),
        retry: () => loadLibraryIssues(issueType)
    });
}

function loadMetadataIssues(field) {
    if (!field?.key || !field?.label) return;

    const title = `Missing ${field.label}`;

    return loadIssueRows({
        title,
        emptyMessage:
            `No movies missing ${field.label.toLowerCase()} were found.`,
        paginationLabel: `${title} pagination`,
        scope: `metadata-field-${field.key}`,
        fetchRows: signal =>
            fetchMetadataIssueRows(field.key, { signal }),
        retry: () => loadMetadataIssues(field)
    });
}

function closeLibraryIssueModal(restoreFocus = true) {
    if (
        !libraryIssueModal ||
        libraryIssueModal.classList.contains('hidden')
    ) {
        return;
    }

    libraryIssueModal.classList.add('hidden');

    const focusTarget = libraryIssueFocusReturn;
    libraryIssueFocusReturn = null;

    if (restoreFocus && focusTarget?.isConnected) {
        requestAnimationFrame(() => focusTarget.focus());
    }
}

function showLibraryIssueModal() {
    const config = activeLibraryIssueConfig;
    if (!config) return;

    if (!libraryIssueModal) {
        libraryIssueModal = document.createElement('div');
        libraryIssueModal.className = 'stats-modal hidden';
        libraryIssueModal.setAttribute('role', 'dialog');
        libraryIssueModal.setAttribute('aria-modal', 'true');
        libraryIssueModal.setAttribute(
            'aria-labelledby',
            'library-issue-title'
        );

        libraryIssueModal.innerHTML = `
            <div class="stats-modal-content">
                <div class="stats-modal-header">
                    <h2 id="library-issue-title"></h2>
                    <button type="button" class="stats-close" aria-label="Close library issue dialog">&times;</button>
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

                <div class="pagination" id="library-issue-pagination"></div>
            </div>
        `;

        document.body.appendChild(libraryIssueModal);

        libraryIssueModal.querySelector('.stats-close').onclick = () => {
            closeLibraryIssueModal();
        };

        libraryIssueModal.onclick = event => {
            if (event.target === libraryIssueModal) {
                closeLibraryIssueModal();
            }
        };
    }

    libraryIssueModal.querySelector(
        '#library-issue-title'
    ).textContent = config.title;

    libraryIssueModal.querySelector('.stats-close').setAttribute(
        'aria-label',
        `Close ${config.title.toLowerCase()} dialog`
    );

    renderLibraryIssuePage();

    if (libraryIssueModal.classList.contains('hidden')) {
        libraryIssueFocusReturn = document.activeElement;
    }

    libraryIssueModal.classList.remove('hidden');

    requestAnimationFrame(() => {
        libraryIssueModal.querySelector('.stats-close')?.focus();
    });
}

function renderLibraryIssuePage() {
    const config = activeLibraryIssueConfig;
    if (!config || !libraryIssueModal) return;

    const tbody = libraryIssueModal.querySelector('tbody');
    const pager = libraryIssueModal.querySelector(
        '#library-issue-pagination'
    );

    tbody.innerHTML = '';

    const start = (libraryIssuePage - 1) * REC_PER_PAGE;
    const pageGroups = libraryIssueGroups.slice(
        start,
        start + REC_PER_PAGE
    );

    let alternate = false;

    pageGroups.forEach(group => {
        alternate = !alternate;

        const header = createGroupHeader(
            group,
            3,
            alternate,
            'movie'
        );

        header.onclick = () => {
            group.open = !group.open;
            renderLibraryIssuePage();
        };

        tbody.appendChild(header);

        if (group.open) {
            group.rows.forEach(row => {
                tbody.appendChild(
                    createMovieReferenceRow(row)
                );
            });
        }
    });

    const totalPages = Math.max(
        1,
        Math.ceil(libraryIssueGroups.length / REC_PER_PAGE)
    );

    renderStatsPagination(pager, {
        currentPage: libraryIssuePage,
        totalPages,
        totalItems: countGroupedRows(libraryIssueGroups),
        itemLabel: 'movie',
        ariaLabel: config.paginationLabel,
        onPageChange: page => {
            libraryIssuePage = page;
            renderLibraryIssuePage();
        }
    });
}

/* =============================
   Better Copy
============================= */

async function loadGetBetterCopy() {
    const request = statsDetailRequests.start();

    try {
        const rows = await fetchBetterCopyRows({
            signal: request.signal
        });

        if (!request.isCurrent()) return;

        clearError('better-copy');

        if (!Array.isArray(rows) || rows.length === 0) {
            alert("No movies found with 'Get Better Copy'!");
            return;
        }

        getBetterCopyGroups = groupMovieRows(rows);
        getBetterCopyPage = 1;
        showGetBetterCopyModal();
    } catch (error) {
        if (!request.isCurrent() || isAbortError(error)) return;

        console.error('Get Better Copy load failed', error);

        showError(
            error.message ||
                'Unable to load better-copy movies',
            {
                scope: 'better-copy',
                retry: loadGetBetterCopy
            }
        );
    } finally {
        request.finish();
    }
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

        getBetterCopyModal.onclick = event => {
            if (event.target === getBetterCopyModal) {
                getBetterCopyModal.classList.add('hidden');
            }
        };
    }

    renderGetBetterCopyPage();
    getBetterCopyModal.classList.remove('hidden');
}

function renderGetBetterCopyPage() {
    const tbody = getBetterCopyModal.querySelector('tbody');
    const pager = getBetterCopyModal.querySelector(
        '#better-copy-pagination'
    );

    tbody.innerHTML = '';
    pager.innerHTML = '';

    const start = (getBetterCopyPage - 1) * REC_PER_PAGE;
    const pageGroups = getBetterCopyGroups.slice(
        start,
        start + REC_PER_PAGE
    );

    let alt = false;

    pageGroups.forEach(group => {
        alt = !alt;

        const header = createGroupHeader(group, 3, alt);

        header.onclick = () => {
            group.open = !group.open;
            renderGetBetterCopyPage();
        };

        tbody.appendChild(header);

        if (group.open) {
            group.rows.forEach(row => {
                tbody.appendChild(
                    createMovieReferenceRow(row)
                );
            });
        }
    });

    const pages = Math.max(
        1,
        Math.ceil(
            getBetterCopyGroups.length / REC_PER_PAGE
        )
    );

    const totalMovies = countGroupedRows(
        getBetterCopyGroups
    );

    renderStatsPagination(pager, {
        currentPage: getBetterCopyPage,
        totalPages: pages,
        totalItems: totalMovies,
        itemLabel: 'movie',
        ariaLabel: 'Needs better copy pagination',
        onPageChange: page => {
            getBetterCopyPage = page;
            renderGetBetterCopyPage();
        }
    });
}

/* =============================
   Jump to table row
============================= */

/**
 * Scroll the table wrapper so a row is comfortably visible below the
 * two-row sticky header (column headers + filter inputs).
 *
 * scrollIntoView() does not account for that sticky overlay — rows have
 * ended up parked behind it after a jump — so the target scroll position
 * is computed manually against the wrapper's real geometry, then a
 * settle loop verifies the row actually landed in the visible strip and
 * re-asserts from live geometry until it does (something may interrupt
 * or supersede the smooth scroll while it animates).
 *
 * Timing matters too: while the table reloads, the wrapper shows an
 * in-flow loading skeleton (::before, 55vh tall) that pushes every row
 * down. Geometry measured during that window overshoots by the
 * skeleton's height once it disappears, so measurement is deferred
 * until the skeleton is gone.
 */
function revealTableRow(row) {
    const wrapper = row.closest('.table-wrapper');

    if (!wrapper) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const getMetrics = () => {
        const table = row.closest('table');

        let headerHeight = 0;

        table?.querySelectorAll('thead tr').forEach(tr => {
            headerHeight += tr.offsetHeight;
        });

        // The floating pagination bar covers the wrapper's bottom
        // padding zone; keep the row out of it too.
        const paginationReserve = parseFloat(
            getComputedStyle(wrapper).paddingBottom
        ) || 0;

        return { headerHeight, paginationReserve };
    };

    const isHidden = ({ headerHeight, paginationReserve }) => {
        const wrapperRect = wrapper.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();

        return (
            rowRect.top < wrapperRect.top + headerHeight + 2 ||
            rowRect.bottom >
                wrapperRect.bottom - paginationReserve + 2
        );
    };

    // Row centered in the visible strip below the sticky header
    // (minimum 16px cushion), clamped to the scrollable range.
    const computeTarget = ({ headerHeight, paginationReserve }) => {
        const visibleHeight =
            wrapper.clientHeight - headerHeight - paginationReserve;

        const wrapperRect = wrapper.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();

        const rowTopInContent =
            wrapper.scrollTop + (rowRect.top - wrapperRect.top);

        const cushion = Math.max(
            16,
            (visibleHeight - row.offsetHeight) / 2
        );

        const maxScroll = Math.max(
            0,
            wrapper.scrollHeight - wrapper.clientHeight
        );

        return Math.min(
            maxScroll,
            Math.max(0, rowTopInContent - headerHeight - cushion)
        );
    };

    const scrollRowIntoView = behavior => {
        const target = computeTarget(getMetrics());
        const before = wrapper.scrollTop;

        wrapper.scrollTo({ top: target, behavior });

        // If the wrapper did not move although it should have, it is not
        // the real scroller in this layout — let the browser resolve it
        // (scroll-margin-top on the rows reserves the sticky header).
        if (
            behavior === 'auto' &&
            Math.abs(target - before) > 2 &&
            wrapper.scrollTop === before
        ) {
            row.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
    };

    const reveal = () => {
        if (!row.isConnected) return;

        scrollRowIntoView('smooth');

        // Settle loop: confirm the row landed in the visible strip; if
        // not, snap it there using freshly measured geometry and check
        // again. Bounded so it can never run forever.
        const deadline = Date.now() + 1600;

        const settle = () => {
            if (!row.isConnected || Date.now() > deadline) return;

            if (!isHidden(getMetrics())) return;

            scrollRowIntoView('auto');
            setTimeout(settle, 250);
        };

        setTimeout(settle, 500);
    };

    if (!wrapper.classList.contains('is-loading')) {
        reveal();
        return;
    }

    // Wait for the loading skeleton to disappear before measuring. The
    // loader removes `is-loading` in a requestAnimationFrame right after
    // the page renders; fall back to a timeout if that never happens.
    let observer;

    const fallback = setTimeout(() => {
        observer?.disconnect();
        reveal();
    }, 800);

    observer = new MutationObserver(() => {
        if (wrapper.classList.contains('is-loading')) return;

        observer.disconnect();
        clearTimeout(fallback);
        reveal();
    });

    observer.observe(wrapper, {
        attributes: true,
        attributeFilter: ['class']
    });
}

async function jumpToMovie(num) {
    const request = movieJumpRequests.start();
    const movieStateSignature =
        getMovieStateSignature();

    try {
        const params = new URLSearchParams({
            num,
            perPage: state.limit,
            sort: state.sort,
            dir: state.dir,
            mode: state.searchMode,
            fuzzy: state.fuzzy,
            titleMode: state.titleSearchMode
        });

        Object.entries(state.search).forEach(
            ([column, value]) => {
                if (value) {
                    params.append(
                        `filters[${column}]`,
                        value
                    );
                }
            }
        );

        const data = await fetchMoviePage(params, {
            signal: request.signal
        });

        if (
            !request.isCurrent() ||
            movieStateSignature !==
                getMovieStateSignature()
        ) {
            return;
        }

        clearError('movie-jump');

        if (!data.found || !data.page) {
            alert(
                'This movie is not included in the current filtered results. ' +
                'Clear or change the filters and try again.'
            );
            return;
        }

        // state.page can already point to a page whose load is still pending
        // (for example after a second click). Await a current render even then.
        state.page = data.page;
        const targetSignature = getMovieStateSignature();
        const rendered = await movieLoader?.();

        if (
            !rendered || !request.isCurrent() ||
            targetSignature !== getMovieStateSignature()
        ) {
            return;
        }

        const row = document.querySelector(
            `tr[data-num="${CSS.escape(String(num))}"]`
        );

        if (!row) return;

        // The jump destination is a table row; reveal the table view when
        // the grid is active (the rows stay rendered in both views).
        if (state.view === 'grid') {
            document.getElementById('view-table')?.click();
        }

        // Reveal the destination rather than leaving it behind a stats dialog.
        duplicateModal?.classList.add('hidden');
        getBetterCopyModal?.classList.add('hidden');
        closeLibraryIssueModal(false);
        closePanel();
        row.querySelector('.movie-title-link')?.focus({ preventScroll: true });

        revealTableRow(row);

        row.classList.add('row-highlight');

        setTimeout(() => {
            row.classList.remove('row-highlight');
        }, 2000);
    } catch (error) {
        if (
            !request.isCurrent() ||
            isAbortError(error)
        ) {
            return;
        }

        console.error('Failed to jump to movie:', error);

        showError(
            error.message ||
                'Unable to locate the movie',
            {
                scope: 'movie-jump',
                retry: () => jumpToMovie(num)
            }
        );
    } finally {
        request.finish();
    }
}
