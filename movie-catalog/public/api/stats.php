<button
    type="button"
    id="stats-toggle"
    class="stats-ribbon"
    aria-controls="stats-panel"
    aria-expanded="false"
>
    📊 Analytics
</button>

<div
    id="stats-panel"
    class="stats-panel hidden"
    aria-hidden="true"
>
    <div class="stats-panel-inner">
        <header class="stats-dashboard-header">
            <div>
                <h2>📊 Collection Analytics</h2>
                <p>A live summary of your movie library and its overall health.</p>
            </div>
            <button type="button" class="stats-close" aria-label="Close analytics panel">&times;</button>
        </header>

        <section class="stats-section" aria-labelledby="overview-heading">
            <h3 id="overview-heading">Overview</h3>

            <div class="stats-cards stats-overview-cards">
                <article class="stat-card stat-card-featured">
                    <i class="fa-solid fa-film" aria-hidden="true"></i>
                    <div>
                        <span id="total-movies">–</span>
                        <small>Movies</small>
                    </div>
                </article>

                <article class="stat-card stat-card-featured">
                    <i class="fa-solid fa-database" aria-hidden="true"></i>
                    <div>
                        <span id="total-size">–</span>
                        <small>Total Size</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-star" aria-hidden="true"></i>
                    <div>
                        <span id="average-rating">–</span>
                        <small>Average Rating</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-stopwatch" aria-hidden="true"></i>
                    <div>
                        <span id="average-runtime">–</span>
                        <small>Average Runtime</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-calendar-days" aria-hidden="true"></i>
                    <div>
                        <span id="year-range">–</span>
                        <small>Release-Year Span</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-calendar" aria-hidden="true"></i>
                    <div>
                        <span id="total-years">–</span>
                        <small>Unique Years</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-tags" aria-hidden="true"></i>
                    <div>
                        <span id="total-genres">–</span>
                        <small>Unique Genres</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-language" aria-hidden="true"></i>
                    <div>
                        <span id="total-languages">–</span>
                        <small>Languages</small>
                    </div>
                </article>

                <article class="stat-card">
                    <i class="fa-solid fa-earth-americas" aria-hidden="true"></i>
                    <div>
                        <span id="total-countries">–</span>
                        <small>Countries</small>
                    </div>
                </article>
            </div>
        </section>

        <section class="stats-section" aria-labelledby="health-heading">
            <div class="stats-section-header">
                <h3 id="health-heading">Library Health</h3>
                <p>Higher scores indicate fewer file, copy, poster, and metadata issues.</p>
            </div>

            <div class="stats-cards stats-health-cards">
                <article id="health-score-card" class="stat-card stat-card-health">
                    <i class="fa-solid fa-heart-pulse" aria-hidden="true"></i>
                    <div>
                        <span id="health-score">–</span>
                        <small>Health Score</small>
                    </div>
                </article>

                <button
                    type="button"
                    id="missing-files-card"
                    class="stat-card stat-card-action"
                    title="Show movies with missing files"
                >
                    <i class="fa-solid fa-exclamation-triangle" aria-hidden="true"></i>
                    <span class="stat-card-copy">
                        <span id="missing-files">–</span>
                        <small>Missing Files</small>
                    </span>
                </button>

                <button
                    type="button"
                    id="missing-posters-card"
                    class="stat-card stat-card-action"
                    title="Show movies with missing posters"
                >
                    <i class="fa-solid fa-image" aria-hidden="true"></i>
                    <span class="stat-card-copy">
                        <span id="missing-posters">–</span>
                        <small>Missing Posters</small>
                    </span>
                </button>

                <button
                    type="button"
                    id="incomplete-metadata-card"
                    class="stat-card stat-card-action"
                    title="Show movies with incomplete metadata"
                >
                    <i class="fa-solid fa-list-check" aria-hidden="true"></i>
                    <span class="stat-card-copy">
                        <span id="incomplete-metadata">–</span>
                        <small>Incomplete Metadata</small>
                    </span>
                </button>

                <button
                    type="button"
                    id="better-copy-card"
                    class="stat-card stat-card-action"
                    title="Show movies marked as needing a better copy"
                >
                    <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                    <span class="stat-card-copy">
                        <span id="needs-better-copy-count">–</span>
                        <small>Needs Better Copy</small>
                    </span>
                </button>

                <button
                    type="button"
                    id="duplicate-card"
                    class="stat-card stat-card-action"
                    title="Show movies that belong to duplicate title groups"
                    disabled
                >
                    <i class="fa-solid fa-clone" aria-hidden="true"></i>
                    <span class="stat-card-copy">
                        <span id="duplicate-count">–</span>
                        <small>Duplicate Movies</small>
                    </span>
                </button>
            </div>
        </section>
    </div>
</div>
