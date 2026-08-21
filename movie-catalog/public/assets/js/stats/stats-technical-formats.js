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

function facetOrEmpty(facet, totalMovies) {
    if (facet && typeof facet === 'object') return facet;

    return {
        tagged_movies: 0,
        untagged_movies: toNonNegativeNumber(totalMovies),
        assignments: 0,
        top_item: null,
        items: []
    };
}

export function createTechnicalFormatViewModel(
    analytics,
    totalMovies,
    limit = 10
) {
    const sharedModel = createLanguageCountryViewModel({
        languages: facetOrEmpty(analytics?.resolutions, totalMovies),
        countries: facetOrEmpty(analytics?.audio_formats, totalMovies)
    }, totalMovies, limit);

    return {
        resolutions: sharedModel.languages,
        audioFormats: sharedModel.countries
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

function renderFacetList(container, facet, singularLabel) {
    container.innerHTML = '';

    if (facet.items.length === 0) {
        appendEmptyState(container, `No ${singularLabel} data available.`);
        return;
    }

    facet.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'stats-origin-row';
        row.setAttribute(
            'aria-label',
            `${item.label}: ${formatMovieCount(item.count)}, ` +
            `${item.shareLabel} of tagged movies`
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

function summaryText(facet, pluralLabel) {
    return facet.totalItems > facet.items.length
        ? `Top ${facet.items.length} of ${facet.totalItems} ${pluralLabel}`
        : `${facet.totalItems.toLocaleString()} ${pluralLabel}`;
}

function renderFacetSummary(facet, config) {
    setText(config.topId, facet.topItem?.label || '–');
    setText(
        config.topDetailId,
        facet.topItem
            ? formatMovieCount(facet.topItem.count)
            : `No ${config.singularLabel} data`
    );
    setText(config.coverageId, facet.coverageLabel);
    setText(
        config.coverageDetailId,
        `${facet.taggedMovies.toLocaleString()} tagged • ` +
        `${facet.untaggedMovies.toLocaleString()} untagged`
    );
    setText(
        config.summaryId,
        summaryText(facet, config.pluralLabel)
    );
}

export function renderTechnicalFormatAnalytics(analytics, totalMovies) {
    const resolutionContainer = document.getElementById(
        'resolution-distribution'
    );
    const audioContainer = document.getElementById(
        'audio-format-distribution'
    );

    if (!resolutionContainer || !audioContainer) return false;

    const model = createTechnicalFormatViewModel(analytics, totalMovies);

    renderFacetSummary(model.resolutions, {
        topId: 'top-resolution',
        topDetailId: 'top-resolution-detail',
        coverageId: 'resolution-coverage',
        coverageDetailId: 'resolution-coverage-detail',
        summaryId: 'resolution-distribution-summary',
        singularLabel: 'resolution',
        pluralLabel: 'resolutions'
    });
    renderFacetSummary(model.audioFormats, {
        topId: 'top-audio-format',
        topDetailId: 'top-audio-format-detail',
        coverageId: 'audio-format-coverage',
        coverageDetailId: 'audio-format-coverage-detail',
        summaryId: 'audio-format-distribution-summary',
        singularLabel: 'audio format',
        pluralLabel: 'audio formats'
    });

    renderFacetList(
        resolutionContainer,
        model.resolutions,
        'resolution'
    );
    renderFacetList(
        audioContainer,
        model.audioFormats,
        'audio format'
    );

    return true;
}
