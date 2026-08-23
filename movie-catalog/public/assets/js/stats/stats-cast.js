function toNonNegativeNumber(value) {
    const number = Number(value);

    return Number.isFinite(number) &&
        number >= 0
        ? number
        : 0;
}

function formatPercentage(value) {
    const rounded =
        Math.round(
            toNonNegativeNumber(value) *
            10
        ) / 10;

    return `${rounded.toLocaleString(
        undefined,
        {
            maximumFractionDigits: 1
        }
    )}%`;
}

function formatMovieCount(count) {
    const value =
        toNonNegativeNumber(count);

    return `${value.toLocaleString()} ` +
        `${value === 1
            ? 'movie'
            : 'movies'}`;
}

function normalizeActor(actor) {
    return {
        label: String(
            actor?.label || ''
        ).trim(),
        count: toNonNegativeNumber(
            actor?.count
        )
    };
}

export function createCastViewModel(
    analytics,
    totalMovies,
    limit = 10
) {
    const taggedMovies =
        toNonNegativeNumber(
            analytics?.tagged_movies
        );

    const reportedUntaggedMovies =
        toNonNegativeNumber(
            analytics?.untagged_movies
        );

    const total = Math.max(
        toNonNegativeNumber(
            totalMovies
        ),
        taggedMovies +
            reportedUntaggedMovies
    );

    const untaggedMovies = Math.max(
        reportedUntaggedMovies,
        total - taggedMovies
    );

    const castAssignments =
        toNonNegativeNumber(
            analytics?.cast_assignments
        );

    const actors = Array.isArray(
        analytics?.top_actors
    )
        ? analytics.top_actors
            .map(normalizeActor)
            .filter(
                actor => actor.label
            )
        : [];

    actors.sort(
        (left, right) =>
            right.count -
                left.count ||
            left.label.localeCompare(
                right.label
            )
    );

    const maximumCount = Math.max(
        ...actors.map(
            actor => actor.count
        ),
        1
    );

    const displayLimit = Math.max(
        1,
        Number.parseInt(
            limit,
            10
        ) || 10
    );

    const uniqueActors = Math.max(
        toNonNegativeNumber(
            analytics?.unique_actors
        ),
        actors.length
    );

    const reportedAverage =
        toNonNegativeNumber(
            analytics?.average_cast_size
        );

    const averageCastSize =
        reportedAverage > 0
            ? reportedAverage
            : taggedMovies > 0
                ? castAssignments /
                    taggedMovies
                : 0;

    const normalizedTopActor =
        analytics?.top_actor
            ? normalizeActor(
                analytics.top_actor
            )
            : null;

    const topActor =
        normalizedTopActor?.label
            ? normalizedTopActor
            : actors[0] || null;

    return {
        taggedMovies,
        untaggedMovies,
        totalMovies: total,
        castAssignments,
        uniqueActors,
        averageCastSize,
        averageCastSizeLabel:
            averageCastSize.toLocaleString(
                undefined,
                {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1
                }
            ),
        coverageLabel:
            formatPercentage(
                total > 0
                    ? (
                        taggedMovies /
                        total
                    ) * 100
                    : 0
            ),
        topActor,
        actors: actors
            .slice(
                0,
                displayLimit
            )
            .map(actor => ({
                ...actor,
                relativeWidth:
                    (
                        actor.count /
                        maximumCount
                    ) * 100,
                shareLabel:
                    formatPercentage(
                        taggedMovies > 0
                            ? (
                                actor.count /
                                taggedMovies
                            ) * 100
                            : 0
                    )
            }))
    };
}

function setText(id, value) {
    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function appendEmptyState(
    container,
    message
) {
    const empty =
        document.createElement('p');

    empty.className =
        'stats-chart-empty';
    empty.textContent = message;

    container.appendChild(empty);
}

function renderActorList(
    container,
    model
) {
    container.innerHTML = '';

    if (model.actors.length === 0) {
        appendEmptyState(
            container,
            'No cast data available.'
        );
        return;
    }

    model.actors.forEach(actor => {
        const row =
            document.createElement(
                'div'
            );

        row.className =
            'stats-origin-row';

        row.setAttribute(
            'aria-label',
            `${actor.label}: ` +
            `${formatMovieCount(
                actor.count
            )}, ` +
            `${actor.shareLabel} ` +
            'of movies with cast data'
        );

        const label =
            document.createElement(
                'strong'
            );

        label.textContent =
            actor.label;
        label.title =
            actor.label;

        const track =
            document.createElement(
                'span'
            );

        track.className =
            'stats-origin-track';

        const bar =
            document.createElement(
                'span'
            );

        bar.className =
            'stats-origin-bar';

        bar.style.width =
            `${actor.relativeWidth}%`;

        bar.hidden =
            actor.count === 0;

        track.appendChild(bar);

        const value =
            document.createElement(
                'span'
            );

        value.className =
            'stats-origin-value';

        value.textContent =
            `${actor.count.toLocaleString()} ` +
            `• ${actor.shareLabel}`;

        row.append(
            label,
            track,
            value
        );

        container.appendChild(row);
    });
}

function distributionSummary(model) {
    if (model.uniqueActors === 0) {
        return 'No cast data';
    }

    return model.uniqueActors >
        model.actors.length
        ? `Top ${
            model.actors.length
        } of ${
            model.uniqueActors
                .toLocaleString()
        } actors`
        : `${
            model.uniqueActors
                .toLocaleString()
        } ${
            model.uniqueActors === 1
                ? 'actor'
                : 'actors'
        }`;
}

export function renderCastAnalytics(
    analytics,
    totalMovies
) {
    const distribution =
        document.getElementById(
            'cast-distribution'
        );

    if (!distribution) {
        return false;
    }

    const model =
        createCastViewModel(
            analytics,
            totalMovies
        );

    setText(
        'top-actor',
        model.topActor?.label || '–'
    );

    setText(
        'top-actor-detail',
        model.topActor
            ? formatMovieCount(
                model.topActor.count
            )
            : 'No cast data'
    );

    setText(
        'cast-coverage',
        model.coverageLabel
    );

    setText(
        'cast-coverage-detail',
        `${
            model.taggedMovies
                .toLocaleString()
        } credited • ` +
        `${
            model.untaggedMovies
                .toLocaleString()
        } missing`
    );

    setText(
        'unique-actors',
        model.uniqueActors
            .toLocaleString()
    );

    setText(
        'unique-actors-detail',
        model.castAssignments > 0
            ? `${
                model.castAssignments
                    .toLocaleString()
            } cast ${
                model.castAssignments === 1
                    ? 'credit'
                    : 'credits'
            }`
            : 'No cast credits'
    );

    setText(
        'average-cast-size',
        model.averageCastSizeLabel
    );

    setText(
        'average-cast-size-detail',
        model.taggedMovies > 0
            ? 'Actors per credited movie'
            : 'No cast data'
    );

    setText(
        'cast-distribution-summary',
        distributionSummary(model)
    );

    renderActorList(
        distribution,
        model
    );

    return true;
}
