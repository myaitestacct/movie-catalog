function toNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatPercentage(value) {
    const rounded = Math.round(toNonNegativeNumber(value) * 10) / 10;
    return `${rounded.toLocaleString(undefined, {
        maximumFractionDigits: 1
    })}%`;
}

function formatMovieCount(count) {
    const value = toNonNegativeNumber(count);
    return `${value.toLocaleString()} ${value === 1 ? 'movie' : 'movies'}`;
}

function createFacetViewModel(facet, totalMovies, limit) {
    const taggedMovies = toNonNegativeNumber(facet?.tagged_movies);
    const untaggedMovies = toNonNegativeNumber(facet?.untagged_movies);
    const assignments = toNonNegativeNumber(facet?.assignments);
    const total = Math.max(
        toNonNegativeNumber(totalMovies),
        taggedMovies + untaggedMovies
    );
    const items = Array.isArray(facet?.items)
        ? facet.items.map(item => ({
            label: String(item?.label || '').trim(),
            count: toNonNegativeNumber(item?.count)
        })).filter(item => item.label)
        : [];
    items.sort((left, right) =>
        right.count - left.count || left.label.localeCompare(right.label)
    );

    const maximumCount = Math.max(...items.map(item => item.count), 1);
    const topItem = facet?.top_item
        ? {
            label: String(facet.top_item.label || '').trim(),
            count: toNonNegativeNumber(facet.top_item.count)
        }
        : items[0] || null;

    return {
        taggedMovies,
        untaggedMovies,
        assignments,
        totalMovies: total,
        coverageLabel: formatPercentage(
            total > 0 ? (taggedMovies / total) * 100 : 0
        ),
        topItem,
        totalItems: items.length,
        items: items.slice(0, limit).map(item => ({
            ...item,
            relativeWidth: (item.count / maximumCount) * 100,
            shareLabel: formatPercentage(
                taggedMovies > 0 ? (item.count / taggedMovies) * 100 : 0
            )
        }))
    };
}

export function createLanguageCountryViewModel(
    analytics,
    totalMovies,
    limit = 10
) {
    const displayLimit = Math.max(1, Number.parseInt(limit, 10) || 10);

    return {
        languages: createFacetViewModel(
            analytics?.languages,
            totalMovies,
            displayLimit
        ),
        countries: createFacetViewModel(
            analytics?.countries,
            totalMovies,
            displayLimit
        )
    };
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

        const track = document.createElement('span');
        track.className = 'stats-origin-track';

        const bar = document.createElement('span');
        bar.className = 'stats-origin-bar';
        bar.style.width = `${item.relativeWidth}%`;
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

export function renderLanguageCountryAnalytics(analytics, totalMovies) {
    const languageContainer = document.getElementById(
        'language-distribution'
    );
    const countryContainer = document.getElementById(
        'country-distribution'
    );

    if (!languageContainer || !countryContainer) return false;

    const model = createLanguageCountryViewModel(analytics, totalMovies);
    const topLanguage = document.getElementById('top-language');
    const topLanguageDetail = document.getElementById('top-language-detail');
    const topCountry = document.getElementById('top-country');
    const topCountryDetail = document.getElementById('top-country-detail');
    const languageCoverage = document.getElementById('language-coverage');
    const languageCoverageDetail = document.getElementById(
        'language-coverage-detail'
    );
    const countryCoverage = document.getElementById('country-coverage');
    const countryCoverageDetail = document.getElementById(
        'country-coverage-detail'
    );
    const languageSummary = document.getElementById(
        'language-distribution-summary'
    );
    const countrySummary = document.getElementById(
        'country-distribution-summary'
    );

    if (topLanguage) {
        topLanguage.textContent = model.languages.topItem?.label || '–';
    }
    if (topLanguageDetail) {
        topLanguageDetail.textContent = model.languages.topItem
            ? formatMovieCount(model.languages.topItem.count)
            : 'No language data';
    }
    if (topCountry) {
        topCountry.textContent = model.countries.topItem?.label || '–';
    }
    if (topCountryDetail) {
        topCountryDetail.textContent = model.countries.topItem
            ? formatMovieCount(model.countries.topItem.count)
            : 'No country data';
    }
    if (languageCoverage) {
        languageCoverage.textContent = model.languages.coverageLabel;
    }
    if (languageCoverageDetail) {
        languageCoverageDetail.textContent =
            `${model.languages.taggedMovies.toLocaleString()} tagged • ` +
            `${model.languages.untaggedMovies.toLocaleString()} untagged`;
    }
    if (countryCoverage) {
        countryCoverage.textContent = model.countries.coverageLabel;
    }
    if (countryCoverageDetail) {
        countryCoverageDetail.textContent =
            `${model.countries.taggedMovies.toLocaleString()} tagged • ` +
            `${model.countries.untaggedMovies.toLocaleString()} untagged`;
    }
    if (languageSummary) {
        languageSummary.textContent = summaryText(
            model.languages,
            'languages'
        );
    }
    if (countrySummary) {
        countrySummary.textContent = summaryText(
            model.countries,
            'countries'
        );
    }

    renderFacetList(languageContainer, model.languages, 'language');
    renderFacetList(countryContainer, model.countries, 'country');
    return true;
}
