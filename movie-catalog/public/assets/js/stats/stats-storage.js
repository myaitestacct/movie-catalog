import { formatBytes } from '../utils/format.js';

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

function formatSize(value) {
    return formatBytes(Math.round(toNonNegativeNumber(value)));
}

function normalizeLargestMovie(movie) {
    if (!movie || typeof movie !== 'object') return null;

    const title = String(movie.title || '').trim();
    const size = toNonNegativeNumber(movie.size);

    if (!title || size <= 0) return null;

    return {
        num: movie.num === null || movie.num === undefined
            ? ''
            : String(movie.num).trim(),
        title,
        size,
        sizeLabel: formatSize(size)
    };
}

function normalizeBand(band) {
    return {
        key: String(band?.key || '').trim(),
        label: String(band?.label || '').trim(),
        count: toNonNegativeNumber(band?.count),
        totalSize: toNonNegativeNumber(band?.total_size)
    };
}

function buildBands(bands, sizedMovies) {
    const normalized = Array.isArray(bands)
        ? bands.map(normalizeBand).filter(band => band.key && band.label)
        : [];
    const maximumCount = Math.max(...normalized.map(band => band.count), 1);

    return normalized.map(band => ({
        ...band,
        relativeWidth: (band.count / maximumCount) * 100,
        shareLabel: formatPercentage(
            sizedMovies > 0 ? (band.count / sizedMovies) * 100 : 0
        ),
        totalSizeLabel: formatSize(band.totalSize)
    }));
}

export function createStorageViewModel(analytics, totalMovies) {
    const sizedMovies = toNonNegativeNumber(analytics?.sized_movies);
    const reportedUnsizedMovies = toNonNegativeNumber(
        analytics?.unsized_movies
    );
    const total = Math.max(
        toNonNegativeNumber(totalMovies),
        sizedMovies + reportedUnsizedMovies
    );
    const unsizedMovies = Math.max(
        reportedUnsizedMovies,
        total - sizedMovies
    );
    const totalSize = toNonNegativeNumber(analytics?.total_size);
    const averageSize = toNonNegativeNumber(analytics?.average_size);
    const medianSize = toNonNegativeNumber(analytics?.median_size);

    return {
        sizedMovies,
        unsizedMovies,
        totalMovies: total,
        totalSize,
        totalSizeLabel: formatSize(totalSize),
        averageSize,
        averageSizeLabel: sizedMovies > 0 ? formatSize(averageSize) : '–',
        medianSize,
        medianSizeLabel: sizedMovies > 0 ? formatSize(medianSize) : '–',
        coverageLabel: formatPercentage(
            total > 0 ? (sizedMovies / total) * 100 : 0
        ),
        largestMovie: normalizeLargestMovie(analytics?.largest_movie),
        sizeBands: buildBands(analytics?.size_bands, sizedMovies)
    };
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
    return element;
}

function appendEmptyState(container, message) {
    const empty = document.createElement('p');
    empty.className = 'stats-chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
}

function renderBands(container, model) {
    container.innerHTML = '';

    if (model.sizedMovies === 0 || model.sizeBands.length === 0) {
        appendEmptyState(container, 'No file-size data available.');
        return;
    }

    model.sizeBands.forEach(band => {
        const row = document.createElement('div');
        row.className = 'stats-band-row';
        row.setAttribute(
            'aria-label',
            `${band.label}: ${formatMovieCount(band.count)}, ` +
            `${band.shareLabel}, ${band.totalSizeLabel} total storage`
        );

        const label = document.createElement('strong');
        label.textContent = band.label;
        label.title = band.label;

        const track = document.createElement('span');
        track.className = 'stats-band-track';

        const bar = document.createElement('span');
        bar.className = 'stats-band-bar';
        bar.style.width = `${band.relativeWidth}%`;
        bar.hidden = band.count === 0;
        track.appendChild(bar);

        const value = document.createElement('span');
        value.className = 'stats-band-value';
        value.textContent =
            `${band.count.toLocaleString()} • ${band.shareLabel}`;
        value.title = `${band.totalSizeLabel} total storage`;

        row.append(label, track, value);
        container.appendChild(row);
    });
}

export function renderStorageAnalytics(analytics, totalMovies) {
    const distribution = document.getElementById('storage-size-distribution');
    if (!distribution) return false;

    const model = createStorageViewModel(analytics, totalMovies);
    const largestMovie = setText(
        'largest-storage-movie',
        model.largestMovie?.title || '–'
    );

    if (largestMovie) {
        largestMovie.title = model.largestMovie?.title || '';
    }

    setText(
        'largest-storage-movie-detail',
        model.largestMovie
            ? `${model.largestMovie.sizeLabel}` +
                (model.largestMovie.num
                    ? ` • Movie #${model.largestMovie.num}`
                    : '')
            : 'No file-size data'
    );
    setText('storage-size-coverage', model.coverageLabel);
    setText(
        'storage-size-coverage-detail',
        `${model.sizedMovies.toLocaleString()} recorded • ` +
        `${model.unsizedMovies.toLocaleString()} missing`
    );
    setText('average-storage-size', model.averageSizeLabel);
    setText(
        'average-storage-size-detail',
        model.sizedMovies > 0
            ? `Across ${formatMovieCount(model.sizedMovies)} with size data`
            : 'No file-size data'
    );
    setText('median-storage-size', model.medianSizeLabel);
    setText(
        'median-storage-size-detail',
        model.sizedMovies > 0
            ? `Middle of ${model.sizedMovies.toLocaleString()} recorded sizes`
            : 'No file-size data'
    );
    setText(
        'storage-distribution-summary',
        model.sizedMovies > 0
            ? `${model.sizedMovies.toLocaleString()} recorded • ` +
                `${model.totalSizeLabel} total`
            : 'No file-size data'
    );

    renderBands(distribution, model);
    return true;
}
