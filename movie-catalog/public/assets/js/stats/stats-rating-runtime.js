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

function normalizeBand(band) {
    return {
        key: String(band?.key || '').trim(),
        label: String(band?.label || '').trim(),
        count: toNonNegativeNumber(band?.count)
    };
}

function buildBands(bands, coveredMovies) {
    const normalized = Array.isArray(bands)
        ? bands.map(normalizeBand).filter(band => band.key && band.label)
        : [];
    const maximumCount = Math.max(...normalized.map(band => band.count), 1);

    return normalized.map(band => ({
        ...band,
        relativeWidth: (band.count / maximumCount) * 100,
        shareLabel: formatPercentage(
            coveredMovies > 0 ? (band.count / coveredMovies) * 100 : 0
        )
    }));
}

export function createRatingRuntimeViewModel(analytics, totalMovies) {
    const ratedMovies = toNonNegativeNumber(analytics?.rated_movies);
    const unratedMovies = toNonNegativeNumber(analytics?.unrated_movies);
    const runtimeKnownMovies = toNonNegativeNumber(
        analytics?.runtime_known_movies
    );
    const runtimeMissingMovies = toNonNegativeNumber(
        analytics?.runtime_missing_movies
    );
    const total = Math.max(
        toNonNegativeNumber(totalMovies),
        ratedMovies + unratedMovies,
        runtimeKnownMovies + runtimeMissingMovies
    );

    return {
        ratedMovies,
        unratedMovies,
        runtimeKnownMovies,
        runtimeMissingMovies,
        totalMovies: total,
        ratedCoverageLabel: formatPercentage(
            total > 0 ? (ratedMovies / total) * 100 : 0
        ),
        runtimeCoverageLabel: formatPercentage(
            total > 0 ? (runtimeKnownMovies / total) * 100 : 0
        ),
        topRatingBand: analytics?.top_rating_band
            ? normalizeBand(analytics.top_rating_band)
            : null,
        commonRuntimeBand: analytics?.common_runtime_band
            ? normalizeBand(analytics.common_runtime_band)
            : null,
        ratingBands: buildBands(analytics?.rating_bands, ratedMovies),
        runtimeBands: buildBands(
            analytics?.runtime_bands,
            runtimeKnownMovies
        )
    };
}

function appendEmptyState(container, message) {
    const empty = document.createElement('p');
    empty.className = 'stats-chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
}

function renderBandList(container, bands, coveredMovies, emptyMessage) {
    container.innerHTML = '';

    if (coveredMovies === 0 || bands.length === 0) {
        appendEmptyState(container, emptyMessage);
        return;
    }

    bands.forEach(band => {
        const row = document.createElement('div');
        row.className = 'stats-band-row';
        row.setAttribute(
            'aria-label',
            `${band.label}: ${formatMovieCount(band.count)}, ` +
            `${band.shareLabel}`
        );

        const label = document.createElement('strong');
        label.textContent = band.label;

        const track = document.createElement('span');
        track.className = 'stats-band-track';

        const bar = document.createElement('span');
        bar.className = 'stats-band-bar';
        bar.style.width = `${band.relativeWidth}%`;
        track.appendChild(bar);

        const value = document.createElement('span');
        value.className = 'stats-band-value';
        value.textContent =
            `${band.count.toLocaleString()} • ${band.shareLabel}`;

        row.append(label, track, value);
        container.appendChild(row);
    });
}

export function renderRatingRuntimeAnalytics(analytics, totalMovies) {
    const ratingContainer = document.getElementById(
        'rating-band-distribution'
    );
    const runtimeContainer = document.getElementById(
        'runtime-band-distribution'
    );

    if (!ratingContainer || !runtimeContainer) return false;

    const model = createRatingRuntimeViewModel(analytics, totalMovies);
    const topRatingBand = document.getElementById('top-rating-band');
    const topRatingDetail = document.getElementById('top-rating-band-detail');
    const commonRuntimeBand = document.getElementById('common-runtime-band');
    const commonRuntimeDetail = document.getElementById(
        'common-runtime-band-detail'
    );
    const ratedCoverage = document.getElementById('rated-movie-coverage');
    const ratedCoverageDetail = document.getElementById(
        'rated-movie-coverage-detail'
    );
    const runtimeCoverage = document.getElementById('runtime-coverage');
    const runtimeCoverageDetail = document.getElementById(
        'runtime-coverage-detail'
    );

    if (topRatingBand) {
        topRatingBand.textContent = model.topRatingBand?.label || '–';
    }
    if (topRatingDetail) {
        topRatingDetail.textContent = model.topRatingBand
            ? formatMovieCount(model.topRatingBand.count)
            : 'No rating data';
    }
    if (commonRuntimeBand) {
        commonRuntimeBand.textContent = model.commonRuntimeBand?.label || '–';
    }
    if (commonRuntimeDetail) {
        commonRuntimeDetail.textContent = model.commonRuntimeBand
            ? formatMovieCount(model.commonRuntimeBand.count)
            : 'No runtime data';
    }
    if (ratedCoverage) {
        ratedCoverage.textContent = model.ratedCoverageLabel;
    }
    if (ratedCoverageDetail) {
        ratedCoverageDetail.textContent =
            `${model.ratedMovies.toLocaleString()} rated • ` +
            `${model.unratedMovies.toLocaleString()} unrated`;
    }
    if (runtimeCoverage) {
        runtimeCoverage.textContent = model.runtimeCoverageLabel;
    }
    if (runtimeCoverageDetail) {
        runtimeCoverageDetail.textContent =
            `${model.runtimeKnownMovies.toLocaleString()} known • ` +
            `${model.runtimeMissingMovies.toLocaleString()} missing`;
    }

    renderBandList(
        ratingContainer,
        model.ratingBands,
        model.ratedMovies,
        'No rating data available.'
    );
    renderBandList(
        runtimeContainer,
        model.runtimeBands,
        model.runtimeKnownMovies,
        'No runtime data available.'
    );

    return true;
}
