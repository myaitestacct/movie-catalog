import {
    createLanguageCountryViewModel
} from './stats-language-country.js';

function toNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatMovieCount(count) {
    const value = toNonNegativeNumber(count);
    return `${value.toLocaleString()} ${value === 1 ? 'movie' : 'movies'}`;
}

function formatAssignmentCount(count) {
    const value = toNonNegativeNumber(count);
    return `${value.toLocaleString()} ` +
        `${value === 1 ? 'assignment' : 'assignments'}`;
}

function certificationFacetOrEmpty(analytics, totalMovies) {
    if (analytics && typeof analytics === 'object') return analytics;

    return {
        tagged_movies: 0,
        untagged_movies: toNonNegativeNumber(totalMovies),
        assignments: 0,
        top_item: null,
        items: []
    };
}

export function createCertificationViewModel(analytics, totalMovies) {
    const model = createLanguageCountryViewModel({
        languages: certificationFacetOrEmpty(analytics, totalMovies),
        countries: certificationFacetOrEmpty(null, totalMovies)
    }, totalMovies, Number.MAX_SAFE_INTEGER);

    return model.languages;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function appendEmptyState(container, message) {
    const empty = document.createElement('p');
    empty.className = 'stats-chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
}

function renderCertificationList(container, model) {
    container.innerHTML = '';

    if (model.items.length === 0) {
        appendEmptyState(container, 'No certification data available.');
        return;
    }

    model.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'stats-genre-row';
        row.setAttribute(
            'aria-label',
            `${item.label}: ${formatMovieCount(item.count)}, ` +
            `${item.shareLabel} of certified movies`
        );

        const label = document.createElement('strong');
        label.textContent = item.label;
        label.title = item.label;

        const track = document.createElement('span');
        track.className = 'stats-genre-track';

        const bar = document.createElement('span');
        bar.className = 'stats-genre-bar';
        bar.style.width = `${item.relativeWidth}%`;
        bar.hidden = item.count === 0;
        track.appendChild(bar);

        const value = document.createElement('span');
        value.className = 'stats-genre-value';
        value.textContent =
            `${item.count.toLocaleString()} • ${item.shareLabel}`;

        row.append(label, track, value);
        container.appendChild(row);
    });
}

export function renderCertificationAnalytics(analytics, totalMovies) {
    const distribution = document.getElementById(
        'certification-distribution'
    );
    if (!distribution) return false;

    const model = createCertificationViewModel(analytics, totalMovies);

    setText('top-certification', model.topItem?.label || '–');
    setText(
        'top-certification-detail',
        model.topItem
            ? formatMovieCount(model.topItem.count)
            : 'No certification data'
    );
    setText('certification-coverage', model.coverageLabel);
    setText(
        'certification-coverage-detail',
        `${model.taggedMovies.toLocaleString()} certified • ` +
        `${model.untaggedMovies.toLocaleString()} unclassified`
    );
    setText(
        'unique-certifications',
        model.totalItems.toLocaleString()
    );
    setText(
        'unique-certifications-detail',
        model.assignments > 0
            ? formatAssignmentCount(model.assignments)
            : 'No certification assignments'
    );
    setText(
        'certification-distribution-summary',
        model.totalItems > 0
            ? `${model.totalItems.toLocaleString()} ` +
                `${model.totalItems === 1 ? 'certification' : 'certifications'}`
            : 'No certification data'
    );

    renderCertificationList(distribution, model);
    return true;
}
