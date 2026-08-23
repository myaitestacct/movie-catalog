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
fetchBetterCopyRows,
fetchDuplicates,
fetchLibraryIssueRows,
fetchMetadataIssueRows,
fetchMoviePage,
fetchStats
} from '../core/api.js';

import {
createLatestRequest,
isAbortError
} from '../core/request.js';

import { state } from '../core/state.js';
import { clearError, showError } from '../utils/feedback.js';
import { configureExternalLink } from '../utils/url.js';
import { loadMovies } from '../app.js';

let panel;
let loaded = false;
let statsToggleButton;
let duplicateModal;

let dupGroups = [];
let dupPage = 1;

let getBetterCopyGroups = [];
let getBetterCopyPage = 1;

let libraryIssueModal;
let libraryIssueGroups = [];
let libraryIssuePage = 1;
let activeLibraryIssueConfig = null;

const statsRequests = createLatestRequest();
const statsDetailRequests = createLatestRequest();
const movieJumpRequests = createLatestRequest();

const REC_PER_PAGE = 10;

function getLibraryIssueCard(config) {
const card = document.getElementById(config.cardId);

if (card) return card;

return document
.getElementById(config.metricId)
?.closest('.stat-card') ?? null;
}

function bindLibraryIssueCard(issueType, config) {
const card = getLibraryIssueCard(config);

if (!card || card.dataset.libraryIssueBound === 'true') {
return;
}

card.id = config.cardId;
card.classList.add('stat-card-action');
card.dataset.libraryIssueBound = 'true';
card.setAttribute(
'aria-label',
`Show ${config.title.toLowerCase()}`
);
card.addEventListener(
'click',
() => loadLibraryIssues(issueType)
);

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

function createGroupHeader(
group,
colspan,
alternate,
itemLabel = 'copy'
) {
const header = document.createElement('tr');

header.className =
`dup-group ${alternate ? 'dup-group-a' : 'dup-group-b'}`;

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

jumpLink.onclick = event => {
event.preventDefault();
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

panel.querySelector('#better-copy-card')?.addEventListener(
'click',
loadGetBetterCopy
);

Object.entries(LIBRARY_ISSUE_CONFIG).forEach(
([issueType, config]) => {
bindLibraryIssueCard(issueType, config);
}
);

toggleBtn.addEventListener('click', event => {
event.stopPropagation();

const open = panel.classList.contains('show');

panel.classList.toggle('show', !open);
panel.classList.toggle('hidden', open);
toggleBtn.setAttribute('aria-expanded', String(!open));
panel.setAttribute('aria-hidden', String(open));

if (!open && !loaded) {
refreshStats();
}
});

panel.querySelector('.stats-close')?.addEventListener(
'click',
() => closePanel(true)
);

document.addEventListener('keydown', event => {
if (event.key !== 'Escape') return;

const openModal = document.querySelector(
'.stats-modal:not(.hidden)'
);

if (openModal) {
openModal.classList.add('hidden');
return;
}

if (panel.classList.contains('show')) {
closePanel(true);
}
});

document.addEventListener('click', event => {
if (
!panel.contains(event.target) &&
event.target !== toggleBtn
) {
closePanel(panel.contains(document.activeElement));
}
});
}

export async function refreshStats() {
const request = statsRequests.start();

panel?.setAttribute('aria-busy', 'true');

try {
const data = await fetchStats({
signal: request.signal
});

if (!request.isCurrent()) return false;

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
animateNumber(
el('incomplete-metadata'),
data.incomplete_metadata
);
animateNumber(
el('needs-better-copy-count'),
data.needs_better_copy_count
);
animateNumber(el('duplicate-count'), data.duplicate_count);

const yearRange = el('year-range');
const oldestYear = Number(data.oldest_year);
const newestYear = Number(data.newest_year);

yearRange.textContent =
oldestYear > 0 && newestYear > 0
? `${oldestYear}–${newestYear}`
: 'No dated movies';

releaseYearAnalytics.renderReleaseYearAnalytics?.(
data.release_year_analytics,
data.total_movies
);

genreAnalytics.renderGenreAnalytics?.(
data.genre_analytics,
data.total_movies
);

ratingRuntimeAnalytics.renderRatingRuntimeAnalytics?.(
data.rating_runtime_analytics,
data.total_movies
);

certificationAnalytics.renderCertificationAnalytics?.(
data.certification_analytics,
data.total_movies
);

directorAnalytics.renderDirectorAnalytics?.(
data.director_analytics,
data.total_movies
);

castAnalytics.renderCastAnalytics?.(
data.cast_analytics,
data.total_movies
);

languageCountryAnalytics.renderLanguageCountryAnalytics?.(
data.language_country_analytics,
data.total_movies
);

technicalFormatAnalytics.renderTechnicalFormatAnalytics?.(
data.technical_format_analytics,
data.total_movies
);

storageAnalytics.renderStorageAnalytics?.(
data.storage_analytics,
data.total_movies
);

metadataCompleteness.renderMetadataCompleteness?.(
data.metadata_completeness,
data.total_movies,
loadMetadataIssues
);

const healthCard = el('health-score-card');

healthCard.dataset.health =
data.health_score >= 90
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
`Health score ${data.health_score} out of 100. ` +
`${healthIssues.join(', ')}.`
);

Object.values(LIBRARY_ISSUE_CONFIG).forEach(config => {
const issueCount = Number(data[config.countField]) || 0;
const issueCard = getLibraryIssueCard(config);

if (!issueCard) return;

const actionText =
issueCount > 0
? `Show ${issueCount} ` +
`${issueCount === 1 ? 'movie' : 'movies'} ` +
`in ${config.title}`
: `Check ${config.title}`;

issueCard.title = actionText;
issueCard.setAttribute('aria-label', actionText);
});

const duplicateCard = el('duplicate-card');

duplicateCard.disabled = data.duplicate_count === 0;
duplicateCard.onclick =
data.duplicate_count > 0
? loadDuplicates
: null;

const betterCopyCard = el('better-copy-card');

betterCopyCard.title =
data.needs_better_copy_count > 0
? `Show ${data.needs_better_copy_count} movies ` +
'marked as needing a better copy'
: 'Check for movies marked as needing a better copy';

return true;
} catch (error) {
if (!request.isCurrent() || isAbortError(error)) {
return false;
}

loaded = false;

console.error('Stats API error:', error);

showError(
error.message || 'Unable to load statistics',
{
scope: 'stats',
retry: refreshStats
}
);

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
}

async function loadDuplicates() {
const request = statsDetailRequests.start();

try {
const rows = await fetchDuplicates({
signal: request.signal
});

if (!request.isCurrent()) return;

clearError('duplicates');

dupGroups = groupDuplicates(rows);
dupPage = 1;

showDuplicateModal();
} catch (error) {
if (!request.isCurrent() || isAbortError(error)) return;

console.error('Duplicate load failed', error);

showError(
error.message || 'Unable to load duplicate movies',
{
scope: 'duplicates',
retry: loadDuplicates
}
);
} finally {
request.finish();
}
}

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
<button
type="button"
class="stats-close"
aria-label="Close duplicate movies dialog"
>&times;</button>
</div>
<div class="stats-modal-body">
<table class="table">
<thead>
<tr><th>Details</th></tr>
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

duplicateModal.onclick = event => {
if (event.target === duplicateModal) {
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
const pageGroups = dupGroups.slice(
start,
start + REC_PER_PAGE
);

let alternate = false;

pageGroups.forEach(group => {
alternate = !alternate;

const header = createGroupHeader(
group,
3,
alternate
);

header.onclick = () => {
group.open = !group.open;
renderDuplicatePage();
};

tbody.appendChild(header);

if (group.open) {
group.rows.forEach(row => {
tbody.appendChild(createMovieReferenceRow(row));
});
}
});

const pages = Math.ceil(
dupGroups.length / REC_PER_PAGE
);

for (let page = 1; page <= pages; page++) {
const button = document.createElement('button');

button.textContent = page;
button.className = page === dupPage ? 'active' : '';

button.onclick = () => {
dupPage = page;
renderDuplicatePage();
};

pager.appendChild(button);
}
}

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
<button
type="button"
class="stats-close"
aria-label="Close library issue dialog"
>&times;</button>
</div>
<div class="stats-modal-body">
<table class="table">
<thead>
<tr><th>Details</th></tr>
</thead>
<tbody></tbody>
</table>
</div>
<div
class="pagination"
id="library-issue-pagination"
></div>
</div>
`;

document.body.appendChild(libraryIssueModal);

libraryIssueModal.querySelector('.stats-close').onclick =
() => libraryIssueModal.classList.add('hidden');

libraryIssueModal.onclick = event => {
if (event.target === libraryIssueModal) {
libraryIssueModal.classList.add('hidden');
}
};
}

libraryIssueModal.querySelector(
'#library-issue-title'
).textContent = config.title;

libraryIssueModal.querySelector(
'.stats-close'
).setAttribute(
'aria-label',
`Close ${config.title.toLowerCase()} dialog`
);

renderLibraryIssuePage();
libraryIssueModal.classList.remove('hidden');
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
tbody.appendChild(createMovieReferenceRow(row));
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
error.message || 'Unable to load better-copy movies',
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
<button
type="button"
class="stats-close"
aria-label="Close better-copy movies dialog"
>&times;</button>
</div>
<div class="stats-modal-body">
<table class="table">
<thead>
<tr><th>Details</th></tr>
</thead>
<tbody></tbody>
</table>
</div>
<div
class="pagination"
id="better-copy-pagination"
></div>
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

let alternate = false;

pageGroups.forEach(group => {
alternate = !alternate;

const header = createGroupHeader(
group,
3,
alternate
);

header.onclick = () => {
group.open = !group.open;
renderGetBetterCopyPage();
};

tbody.appendChild(header);

if (group.open) {
group.rows.forEach(row => {
tbody.appendChild(createMovieReferenceRow(row));
});
}
});

const pages = Math.max(
1,
Math.ceil(getBetterCopyGroups.length / REC_PER_PAGE)
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

function getMovieStateSignature() {
return JSON.stringify({
page: state.page,
limit: state.limit,
sort: state.sort,
dir: state.dir,
mode: state.searchMode,
fuzzy: state.fuzzy,
search: Object.entries(state.search).sort(
([left], [right]) =>
left.localeCompare(right)
)
});
}

async function jumpToMovie(num) {
const request = movieJumpRequests.start();
const movieStateSignature = getMovieStateSignature();

try {
const params = new URLSearchParams({
num,
perPage: state.limit,
sort: state.sort,
dir: state.dir,
mode: state.searchMode,
fuzzy: state.fuzzy
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

const data = await fetchMoviePage(
params,
{
signal: request.signal
}
);

if (
!request.isCurrent() ||
movieStateSignature !== getMovieStateSignature()
) {
return;
}

clearError('movie-jump');

if (!data.found || !data.page) {
alert(
'This movie is not included in the current filtered ' +
'results. Clear or change the filters and try again.'
);
return;
}

const targetPage = data.page;

if (targetPage !== state.page) {
state.page = targetPage;

const rendered = await loadMovies();

if (!rendered || !request.isCurrent()) {
return;
}
}

const row = document.querySelector(
`tr[data-num="${num}"]`
);

if (!row) return;

row.scrollIntoView({
behavior: 'smooth',
block: 'center'
});

row.classList.add('row-highlight');

setTimeout(
() => row.classList.remove('row-highlight'),
2000
);
} catch (error) {
if (!request.isCurrent() || isAbortError(error)) return;

console.error('Failed to jump to movie:', error);

showError(
error.message || 'Unable to locate the movie',
{
scope: 'movie-jump',
retry: () => jumpToMovie(num)
}
);
} finally {
request.finish();
}
}
