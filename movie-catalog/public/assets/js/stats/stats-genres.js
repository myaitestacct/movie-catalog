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

function formatDecimal(value) {
    return toNonNegativeNumber(value).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
}

function formatMovieCount(count) {
    const value = toNonNegativeNumber(count);
    return `${value.toLocaleString()} ${value === 1 ? 'movie' : 'movies'}`;
}

export function createGenreViewModel(analytics, totalMovies, limit = 12) {
    const taggedMovies = toNonNegativeNumber(analytics?.tagged_movies);
    const untaggedMovies = toNonNegativeNumber(analytics?.untagged_movies);
    const genreAssignments = toNonNegativeNumber(analytics?.genre_assignments);
    const total = Math.max(
        toNonNegativeNumber(totalMovies),
        taggedMovies + untaggedMovies
    );
    const genres = Array.isArray(analytics?.genres)
        ? analytics.genres.map(entry => ({
            label: String(entry?.label || '').trim(),
            count: toNonNegativeNumber(entry?.count)
        })).filter(entry => entry.label)
        : [];
    genres.sort((left, right) =>
        right.count - left.count || left.label.localeCompare(right.label)
    );

    const maximumCount = Math.max(...genres.map(entry => entry.count), 1);
    const displayLimit = Math.max(1, Number.parseInt(limit, 10) || 12);
    const topGenre = analytics?.top_genre
        ? {
            label: String(analytics.top_genre.label || '').trim(),
            count: toNonNegativeNumber(analytics.top_genre.count)
        }
        : genres[0] || null;

    return {
        taggedMovies,
        untaggedMovies,
        genreAssignments,
        totalMovies: total,
        coverageLabel: formatPercentage(
            total > 0 ? (taggedMovies / total) * 100 : 0
        ),
        averageGenresLabel: formatDecimal(
            taggedMovies > 0 ? genreAssignments / taggedMovies : 0
        ),
        topGenre,
        totalGenres: genres.length,
        genres: genres.slice(0, displayLimit).map(entry => ({
            ...entry,
            relativeWidth: (entry.count / maximumCount) * 100,
            shareLabel: formatPercentage(
                taggedMovies > 0 ? (entry.count / taggedMovies) * 100 : 0
            )
        }))
    };
}

function appendEmptyState(container, message) {
    const empty = document.createElement('p');
    empty.className = 'stats-chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
}

const DONUT_TOP_SEGMENTS = 6;

/* Static conic-gradient donut: one inline style, zero DOM churn per
   segment (the legend list is the only repeated node). */
function renderGenreDonut(model) {
    const donut = document.getElementById('genre-donut');
    const legend = document.getElementById('genre-donut-legend');
    const count = document.getElementById('genre-donut-count');
    const card = donut?.closest('.stats-genre-donut-card');

    if (!donut || !legend || !card) return;

    if (model.genres.length === 0 || model.taggedMovies <= 0) {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    if (count) {
        count.textContent = model.taggedMovies.toLocaleString();
    }

    const top = model.genres.slice(0, DONUT_TOP_SEGMENTS);
    const topTotal = top.reduce((sum, genre) => sum + genre.count, 0);
    const otherCount = Math.max(0, model.taggedMovies - topTotal);

    const segments = top.map((genre, index) => ({
        label: genre.label,
        count: genre.count,
        color: `var(--chart-${index + 1})`
    }));

    if (otherCount > 0) {
        segments.push({
            label: 'Other',
            count: otherCount,
            color: `var(--chart-${Math.min(DONUT_TOP_SEGMENTS + 1, 10)})`
        });
    }

    let cursor = 0;
    const stops = segments.map(segment => {
        const start = cursor;
        cursor += (segment.count / model.taggedMovies) * 100;
        return `${segment.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });

    donut.style.background =
        `conic-gradient(from -90deg, ${stops.join(', ')})`;

    donut.setAttribute(
        'aria-label',
        `Share of tagged movies per leading genre: ` +
        segments
            .map(segment =>
                `${segment.label} ${Math.round(
                    (segment.count / model.taggedMovies) * 100
                )}%`
            )
            .join(', ')
    );

    legend.replaceChildren();

    segments.forEach(segment => {
        const item = document.createElement('li');

        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = segment.color;

        const label = document.createElement('span');
        label.className = 'legend-label';
        label.textContent = segment.label;
        label.title = segment.label;

        const share = document.createElement('span');
        share.className = 'legend-share';
        share.textContent = formatPercentage(
            (segment.count / model.taggedMovies) * 100
        );

        item.append(swatch, label, share);
        legend.appendChild(item);
    });
}

export function renderGenreAnalytics(analytics, totalMovies) {
    const container = document.getElementById('genre-distribution');
    if (!container) return false;

    const model = createGenreViewModel(analytics, totalMovies);

    renderGenreDonut(model);
    const topGenre = document.getElementById('top-genre');
    const topGenreDetail = document.getElementById('top-genre-detail');
    const coverage = document.getElementById('genre-coverage');
    const coverageDetail = document.getElementById('genre-coverage-detail');
    const averageGenres = document.getElementById('average-genres-per-movie');
    const assignmentDetail = document.getElementById('genre-assignment-detail');
    const summary = document.getElementById('genre-distribution-summary');

    if (topGenre) {
        topGenre.textContent = model.topGenre?.label || '–';
    }
    if (topGenreDetail) {
        topGenreDetail.textContent = model.topGenre
            ? formatMovieCount(model.topGenre.count)
            : 'No genre data';
    }
    if (coverage) {
        coverage.textContent = model.coverageLabel;
    }
    if (coverageDetail) {
        coverageDetail.textContent =
            `${model.taggedMovies.toLocaleString()} tagged • ` +
            `${model.untaggedMovies.toLocaleString()} untagged`;
    }
    if (averageGenres) {
        averageGenres.textContent = model.averageGenresLabel;
    }
    if (assignmentDetail) {
        assignmentDetail.textContent =
            `${model.genreAssignments.toLocaleString()} total assignments`;
    }
    if (summary) {
        summary.textContent = model.totalGenres > model.genres.length
            ? `Top ${model.genres.length} of ${model.totalGenres} genres`
            : `${model.totalGenres.toLocaleString()} ` +
                `${model.totalGenres === 1 ? 'genre' : 'genres'}`;
    }

    container.innerHTML = '';
    if (model.genres.length === 0) {
        appendEmptyState(container, 'No genre data available.');
        return true;
    }

    model.genres.forEach(genre => {
        const row = document.createElement('div');
        row.className = 'stats-genre-row';
        row.setAttribute(
            'aria-label',
            `${genre.label}: ${formatMovieCount(genre.count)}, ` +
            `${genre.shareLabel} of tagged movies`
        );

        const label = document.createElement('strong');
        label.textContent = genre.label;

        const track = document.createElement('span');
        track.className = 'stats-genre-track';

        const bar = document.createElement('span');
        bar.className = 'stats-genre-bar';
        bar.style.width = `${genre.relativeWidth}%`;
        track.appendChild(bar);

        const value = document.createElement('span');
        value.className = 'stats-genre-value';
        value.textContent =
            `${genre.count.toLocaleString()} • ${genre.shareLabel}`;

        row.append(label, track, value);
        container.appendChild(row);
    });

    return true;
}
