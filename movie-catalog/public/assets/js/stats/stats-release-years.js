function toNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
}

function formatCount(count, item = 'movie') {
    const value = toNonNegativeNumber(count);
    return `${value.toLocaleString()} ${item}${value === 1 ? '' : 's'}`;
}

function formatPercentage(value) {
    const rounded = Math.round(toNonNegativeNumber(value) * 10) / 10;
    return `${rounded.toLocaleString(undefined, {
        maximumFractionDigits: 1
    })}%`;
}

export function buildReleaseTimeline(yearEntries, maximumSpan = 250) {
    const counts = new Map();

    yearEntries.forEach(entry => {
        const year = Number.parseInt(entry?.year, 10);
        const count = toNonNegativeNumber(entry?.count);

        if (Number.isFinite(year) && year > 0) {
            counts.set(year, (counts.get(year) || 0) + count);
        }
    });

    const representedYears = Array.from(counts.keys()).sort((a, b) => a - b);
    if (representedYears.length === 0) return [];

    const firstYear = representedYears[0];
    const lastYear = representedYears[representedYears.length - 1];
    const span = lastYear - firstYear + 1;
    const years = span <= maximumSpan
        ? Array.from({ length: span }, (_, index) => firstYear + index)
        : representedYears;
    const maximumCount = Math.max(...counts.values(), 1);

    return years.map(year => {
        const count = counts.get(year) || 0;
        return {
            year,
            count,
            height: count === 0 ? 0 : Math.max(4, (count / maximumCount) * 100)
        };
    });
}

export function createReleaseYearViewModel(analytics, totalMovies) {
    const datedMovies = toNonNegativeNumber(analytics?.dated_movies);
    const undatedMovies = toNonNegativeNumber(analytics?.undated_movies);
    const total = Math.max(
        toNonNegativeNumber(totalMovies),
        datedMovies + undatedMovies
    );
    const coverage = total > 0 ? (datedMovies / total) * 100 : 0;
    const peakYear = analytics?.peak_year
        ? {
            year: Number.parseInt(analytics.peak_year.year, 10),
            count: toNonNegativeNumber(analytics.peak_year.count)
        }
        : null;
    const busiestDecade = analytics?.busiest_decade
        ? {
            label: String(analytics.busiest_decade.label || ''),
            count: toNonNegativeNumber(analytics.busiest_decade.count)
        }
        : null;
    const decades = Array.isArray(analytics?.decades)
        ? analytics.decades.map(entry => ({
            startYear: Number.parseInt(entry.start_year, 10),
            label: String(entry.label || ''),
            count: toNonNegativeNumber(entry.count)
        })).filter(entry => Number.isFinite(entry.startYear) && entry.label)
        : [];
    const maximumDecadeCount = Math.max(
        ...decades.map(entry => entry.count),
        1
    );

    return {
        datedMovies,
        undatedMovies,
        totalMovies: total,
        coverage,
        coverageLabel: formatPercentage(coverage),
        peakYear,
        busiestDecade,
        decades: decades.map(entry => ({
            ...entry,
            relativeWidth: (entry.count / maximumDecadeCount) * 100,
            shareLabel: formatPercentage(
                datedMovies > 0 ? (entry.count / datedMovies) * 100 : 0
            )
        })),
        timeline: buildReleaseTimeline(
            Array.isArray(analytics?.years) ? analytics.years : []
        )
    };
}

function appendEmptyState(container, message) {
    const empty = document.createElement('p');
    empty.className = 'stats-chart-empty';
    empty.textContent = message;
    container.appendChild(empty);
}

export function renderReleaseYearAnalytics(analytics, totalMovies) {
    const decadeContainer = document.getElementById('decade-distribution');
    const timelineContainer = document.getElementById('release-year-timeline');

    if (!decadeContainer || !timelineContainer) return false;

    const model = createReleaseYearViewModel(analytics, totalMovies);
    const peakYear = document.getElementById('peak-release-year');
    const peakYearDetail = document.getElementById('peak-release-year-detail');
    const busiestDecade = document.getElementById('busiest-release-decade');
    const busiestDecadeDetail = document.getElementById(
        'busiest-release-decade-detail'
    );
    const coverage = document.getElementById('release-year-coverage');
    const coverageDetail = document.getElementById(
        'release-year-coverage-detail'
    );

    if (peakYear) {
        peakYear.textContent = model.peakYear?.year || '–';
    }
    if (peakYearDetail) {
        peakYearDetail.textContent = model.peakYear
            ? formatCount(model.peakYear.count)
            : 'No dated movies';
    }
    if (busiestDecade) {
        busiestDecade.textContent = model.busiestDecade?.label || '–';
    }
    if (busiestDecadeDetail) {
        busiestDecadeDetail.textContent = model.busiestDecade
            ? formatCount(model.busiestDecade.count)
            : 'No dated movies';
    }
    if (coverage) {
        coverage.textContent = model.coverageLabel;
    }
    if (coverageDetail) {
        coverageDetail.textContent =
            `${model.datedMovies.toLocaleString()} of ` +
            `${model.totalMovies.toLocaleString()} movies • ` +
            `${model.undatedMovies.toLocaleString()} undated`;
    }

    decadeContainer.innerHTML = '';
    if (model.decades.length === 0) {
        appendEmptyState(decadeContainer, 'No decade data available.');
    } else {
        model.decades.forEach(decade => {
            const row = document.createElement('div');
            row.className = 'stats-decade-row';
            row.setAttribute(
                'aria-label',
                `${decade.label}: ${formatCount(decade.count)}, ` +
                `${decade.shareLabel} of dated movies`
            );

            const label = document.createElement('strong');
            label.textContent = decade.label;

            const track = document.createElement('span');
            track.className = 'stats-decade-track';

            const bar = document.createElement('span');
            bar.className = 'stats-decade-bar';
            bar.style.width = `${decade.relativeWidth}%`;
            track.appendChild(bar);

            const value = document.createElement('span');
            value.className = 'stats-decade-value';
            value.textContent =
                `${decade.count.toLocaleString()} • ${decade.shareLabel}`;

            row.append(label, track, value);
            decadeContainer.appendChild(row);
        });
    }

    timelineContainer.innerHTML = '';
    if (model.timeline.length === 0) {
        appendEmptyState(timelineContainer, 'No release-year data available.');
    } else {
        timelineContainer.setAttribute('role', 'list');
        timelineContainer.setAttribute(
            'aria-label',
            `Release-year timeline from ${model.timeline[0].year} to ` +
            `${model.timeline[model.timeline.length - 1].year}`
        );

        model.timeline.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'stats-timeline-year';
            item.tabIndex = 0;
            item.setAttribute('role', 'listitem');
            item.setAttribute(
                'aria-label',
                `${entry.year}: ${formatCount(entry.count)}`
            );
            item.title = `${entry.year}: ${formatCount(entry.count)}`;

            const barArea = document.createElement('span');
            barArea.className = 'stats-timeline-bar-area';

            const bar = document.createElement('span');
            bar.className = 'stats-timeline-bar';
            bar.style.height = `${entry.height}%`;
            barArea.appendChild(bar);

            const year = document.createElement('small');
            year.textContent = entry.year;

            item.append(barArea, year);
            timelineContainer.appendChild(item);
        });
    }

    return true;
}
