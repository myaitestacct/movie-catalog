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

function directorFacetOrEmpty(analytics, totalMovies) {
    if (analytics && typeof analytics === 'object') return analytics;

    return {
        tagged_movies: 0,
        untagged_movies: toNonNegativeNumber(totalMovies),
        assignments: 0,
        top_item: null,
        items: []
    };
}

export function createDirectorViewModel(
    analytics,
    totalMovies,
    limit = 10
) {
    const sharedModel = createLanguageCountryViewModel({
        languages: directorFacetOrEmpty(analytics, totalMovies),
        countries: directorFacetOrEmpty(null, totalMovies)
    }, totalMovies, limit);
    const directors = sharedModel.languages;
    const averageDirectors = directors.taggedMovies > 0
        ? directors.assignments / directors.taggedMovies
        : 0;

    return {
        ...directors,
        averageDirectors,
        averageDirectorsLabel: averageDirectors.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })
    };
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

function renderDirectorList(container, model) {
    container.innerHTML = '';

    if (model.items.length === 0) {
        appendEmptyState(container, 'No director data available.');
        return;
    }

    model.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'stats-origin-row';
        row.setAttribute(
            'aria-label',
            `${item.label}: ${formatMovieCount(item.count)}, ` +
            `${item.shareLabel} of movies with director data`
        );

        const label = document.createElement('strong');
        label.textContent = item.label;
        label.title = item.label;

        const track = document.createElement('span');
        track.className = 'stats-origin-track';

        const bar = document.createElement('span');
        bar.className = 'stats-origin-bar';
        bar.style.width = `${item.relativeWidth}%`;
        bar.hidden = item.count === 0;
        track.appendChild(bar);

        const value = document.createElement('span');
        value.className = 'stats-origin-value';
        value.textContent =
            `${item.count.toLocaleString()} • ${item.shareLabel}`;

        row.append(label, track, value);
        container.appendChild(row);
    });
}

function distributionSummary(model) {
    if (model.totalItems === 0) return 'No director data';

    return model.totalItems > model.items.length
        ? `Top ${model.items.length} of ${model.totalItems} directors`
        : `${model.totalItems.toLocaleString()} ` +
            `${model.totalItems === 1 ? 'director' : 'directors'}`;
}

export function renderDirectorAnalytics(analytics, totalMovies) {
    const distribution = document.getElementById('director-distribution');
    if (!distribution) return false;

    const model = createDirectorViewModel(analytics, totalMovies);

    setText('top-director', model.topItem?.label || '–');
    setText(
        'top-director-detail',
        model.topItem
            ? formatMovieCount(model.topItem.count)
            : 'No director data'
    );
    setText('director-coverage', model.coverageLabel);
    setText(
        'director-coverage-detail',
        `${model.taggedMovies.toLocaleString()} credited • ` +
        `${model.untaggedMovies.toLocaleString()} missing`
    );
    setText('unique-directors', model.totalItems.toLocaleString());
    setText(
        'unique-directors-detail',
        model.assignments > 0
            ? `${model.assignments.toLocaleString()} director ` +
                `${model.assignments === 1 ? 'credit' : 'credits'}`
            : 'No director credits'
    );
    setText('average-directors', model.averageDirectorsLabel);
    setText(
        'average-directors-detail',
        model.taggedMovies > 0
            ? 'Directors per credited movie'
            : 'No director data'
    );
    setText('director-distribution-summary', distributionSummary(model));

    renderDirectorList(distribution, model);
    return true;
}
