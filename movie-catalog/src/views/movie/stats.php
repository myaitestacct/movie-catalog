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

        <section class="stats-section stats-release-section" aria-labelledby="release-years-heading">
            <div class="stats-section-header">
                <h3 id="release-years-heading">Release-Year Analytics</h3>
                <p>Explore collection coverage by year and decade.</p>
            </div>

            <div class="stats-release-insights" aria-live="polite">
                <article class="stats-release-insight">
                    <span id="peak-release-year">–</span>
                    <small>Most Represented Year</small>
                    <p id="peak-release-year-detail">No dated movies</p>
                </article>

                <article class="stats-release-insight">
                    <span id="busiest-release-decade">–</span>
                    <small>Largest Decade</small>
                    <p id="busiest-release-decade-detail">No dated movies</p>
                </article>

                <article class="stats-release-insight">
                    <span id="release-year-coverage">–</span>
                    <small>Dated Coverage</small>
                    <p id="release-year-coverage-detail">No release-year data</p>
                </article>
            </div>

            <div class="stats-release-grid">
                <article class="stats-release-chart" aria-labelledby="decade-distribution-heading">
                    <header>
                        <h4 id="decade-distribution-heading">Decade Distribution</h4>
                        <p>Movies grouped by release decade.</p>
                    </header>
                    <div id="decade-distribution" class="stats-decade-list">
                        <p class="stats-chart-empty">Loading decade data…</p>
                    </div>
                </article>

                <article class="stats-release-chart" aria-labelledby="release-timeline-heading">
                    <header>
                        <h4 id="release-timeline-heading">Collection Timeline</h4>
                        <p>Movie counts for each release year.</p>
                    </header>
                    <div class="stats-timeline-scroll">
                        <div id="release-year-timeline" class="stats-timeline">
                            <p class="stats-chart-empty">Loading timeline…</p>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="stats-section stats-genre-section" aria-labelledby="genre-analytics-heading">
            <div class="stats-section-header">
                <h3 id="genre-analytics-heading">Genre Analytics</h3>
                <p>See which genres shape the collection.</p>
            </div>

            <div class="stats-genre-insights" aria-live="polite">
                <article class="stats-genre-insight">
                    <span id="top-genre">–</span>
                    <small>Top Genre</small>
                    <p id="top-genre-detail">No genre data</p>
                </article>

                <article class="stats-genre-insight">
                    <span id="genre-coverage">–</span>
                    <small>Tagged Coverage</small>
                    <p id="genre-coverage-detail">No genre data</p>
                </article>

                <article class="stats-genre-insight">
                    <span id="average-genres-per-movie">–</span>
                    <small>Genres per Tagged Movie</small>
                    <p id="genre-assignment-detail">No genre assignments</p>
                </article>
            </div>

            <article class="stats-genre-chart" aria-labelledby="genre-distribution-heading">
                <header>
                    <div>
                        <h4 id="genre-distribution-heading">Genre Distribution</h4>
                        <p>Share of tagged movies assigned to each leading genre.</p>
                    </div>
                    <small id="genre-distribution-summary">Loading genres…</small>
                </header>
                <div id="genre-distribution" class="stats-genre-list">
                    <p class="stats-chart-empty">Loading genre data…</p>
                </div>
            </article>
        </section>

        <section class="stats-section stats-rating-runtime-section" aria-labelledby="rating-runtime-heading">
            <div class="stats-section-header">
                <h3 id="rating-runtime-heading">Rating &amp; Runtime Analytics</h3>
                <p>Understand quality bands and movie-length patterns.</p>
            </div>

            <div class="stats-rating-runtime-insights" aria-live="polite">
                <article class="stats-rating-runtime-insight">
                    <span id="top-rating-band">–</span>
                    <small>Most Common Rating Band</small>
                    <p id="top-rating-band-detail">No rating data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="common-runtime-band">–</span>
                    <small>Most Common Runtime</small>
                    <p id="common-runtime-band-detail">No runtime data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="rated-movie-coverage">–</span>
                    <small>Rated Coverage</small>
                    <p id="rated-movie-coverage-detail">No rating data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="runtime-coverage">–</span>
                    <small>Runtime Coverage</small>
                    <p id="runtime-coverage-detail">No runtime data</p>
                </article>
            </div>

            <div class="stats-rating-runtime-grid">
                <article class="stats-band-chart" aria-labelledby="rating-band-heading">
                    <header>
                        <h4 id="rating-band-heading">Rating Bands</h4>
                        <p>Distribution across rated movies.</p>
                    </header>
                    <div id="rating-band-distribution" class="stats-band-list">
                        <p class="stats-chart-empty">Loading rating data…</p>
                    </div>
                </article>

                <article class="stats-band-chart" aria-labelledby="runtime-band-heading">
                    <header>
                        <h4 id="runtime-band-heading">Runtime Ranges</h4>
                        <p>Distribution across movies with runtime data.</p>
                    </header>
                    <div id="runtime-band-distribution" class="stats-band-list">
                        <p class="stats-chart-empty">Loading runtime data…</p>
                    </div>
                </article>
            </div>
        </section>

        <section class="stats-section stats-certification-section" aria-labelledby="certification-analytics-heading">
            <div class="stats-section-header">
                <h3 id="certification-analytics-heading">Certification Analytics</h3>
                <p>Review audience classifications and certification coverage.</p>
            </div>

            <div class="stats-genre-insights" aria-live="polite">
                <article class="stats-genre-insight">
                    <span id="top-certification">–</span>
                    <small>Most Common Certification</small>
                    <p id="top-certification-detail">No certification data</p>
                </article>

                <article class="stats-genre-insight">
                    <span id="certification-coverage">–</span>
                    <small>Certification Coverage</small>
                    <p id="certification-coverage-detail">No certification data</p>
                </article>

                <article class="stats-genre-insight">
                    <span id="unique-certifications">–</span>
                    <small>Unique Certifications</small>
                    <p id="unique-certifications-detail">No certification assignments</p>
                </article>
            </div>

            <article class="stats-genre-chart" aria-labelledby="certification-distribution-heading">
                <header>
                    <div>
                        <h4 id="certification-distribution-heading">Certification Distribution</h4>
                        <p>Share of certified movies for every represented classification.</p>
                    </div>
                    <small id="certification-distribution-summary">Loading certifications…</small>
                </header>
                <div id="certification-distribution" class="stats-genre-list">
                    <p class="stats-chart-empty">Loading certification data…</p>
                </div>
            </article>
        </section>

        <section class="stats-section stats-director-section" aria-labelledby="director-analytics-heading">
            <div class="stats-section-header">
                <h3 id="director-analytics-heading">Director Analytics</h3>
                <p>See which filmmakers are most represented across the library.</p>
            </div>

            <div class="stats-origin-insights" aria-live="polite">
                <article class="stats-origin-insight">
                    <span id="top-director">–</span>
                    <small>Most Represented Director</small>
                    <p id="top-director-detail">No director data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="director-coverage">–</span>
                    <small>Director Coverage</small>
                    <p id="director-coverage-detail">No director data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="unique-directors">–</span>
                    <small>Unique Directors</small>
                    <p id="unique-directors-detail">No director credits</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="average-directors">–</span>
                    <small>Average Directors</small>
                    <p id="average-directors-detail">No director data</p>
                </article>
            </div>

            <article class="stats-origin-chart" aria-labelledby="director-distribution-heading">
                <header>
                    <div>
                        <h4 id="director-distribution-heading">Leading Directors</h4>
                        <p>Share of credited movies for each leading director.</p>
                    </div>
                    <small id="director-distribution-summary">Loading directors…</small>
                </header>
                <div id="director-distribution" class="stats-origin-list">
                    <p class="stats-chart-empty">Loading director data…</p>
                </div>
            </article>
        </section>

        <section class="stats-section stats-origin-section" aria-labelledby="origin-analytics-heading">
            <div class="stats-section-header">
                <h3 id="origin-analytics-heading">Language &amp; Country Analytics</h3>
                <p>Explore the languages and countries represented in the library.</p>
            </div>

            <div class="stats-origin-insights" aria-live="polite">
                <article class="stats-origin-insight">
                    <span id="top-language">–</span>
                    <small>Top Language</small>
                    <p id="top-language-detail">No language data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="top-country">–</span>
                    <small>Top Country</small>
                    <p id="top-country-detail">No country data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="language-coverage">–</span>
                    <small>Language Coverage</small>
                    <p id="language-coverage-detail">No language data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="country-coverage">–</span>
                    <small>Country Coverage</small>
                    <p id="country-coverage-detail">No country data</p>
                </article>
            </div>

            <div class="stats-origin-grid">
                <article class="stats-origin-chart" aria-labelledby="language-distribution-heading">
                    <header>
                        <div>
                            <h4 id="language-distribution-heading">Language Distribution</h4>
                            <p>Share of tagged movies for each leading language.</p>
                        </div>
                        <small id="language-distribution-summary">Loading languages…</small>
                    </header>
                    <div id="language-distribution" class="stats-origin-list">
                        <p class="stats-chart-empty">Loading language data…</p>
                    </div>
                </article>

                <article class="stats-origin-chart" aria-labelledby="country-distribution-heading">
                    <header>
                        <div>
                            <h4 id="country-distribution-heading">Country Distribution</h4>
                            <p>Share of tagged movies for each leading country.</p>
                        </div>
                        <small id="country-distribution-summary">Loading countries…</small>
                    </header>
                    <div id="country-distribution" class="stats-origin-list">
                        <p class="stats-chart-empty">Loading country data…</p>
                    </div>
                </article>
            </div>
        </section>

        <section class="stats-section stats-technical-section" aria-labelledby="technical-format-heading">
            <div class="stats-section-header">
                <h3 id="technical-format-heading">Technical Format Analytics</h3>
                <p>Explore resolution and audio-format coverage across the library.</p>
            </div>

            <div class="stats-origin-insights" aria-live="polite">
                <article class="stats-origin-insight">
                    <span id="top-resolution">–</span>
                    <small>Top Resolution</small>
                    <p id="top-resolution-detail">No resolution data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="top-audio-format">–</span>
                    <small>Top Audio Format</small>
                    <p id="top-audio-format-detail">No audio-format data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="resolution-coverage">–</span>
                    <small>Resolution Coverage</small>
                    <p id="resolution-coverage-detail">No resolution data</p>
                </article>

                <article class="stats-origin-insight">
                    <span id="audio-format-coverage">–</span>
                    <small>Audio-Format Coverage</small>
                    <p id="audio-format-coverage-detail">No audio-format data</p>
                </article>
            </div>

            <div class="stats-origin-grid">
                <article class="stats-origin-chart" aria-labelledby="resolution-distribution-heading">
                    <header>
                        <div>
                            <h4 id="resolution-distribution-heading">Resolution Distribution</h4>
                            <p>Share of tagged movies for each leading resolution.</p>
                        </div>
                        <small id="resolution-distribution-summary">Loading resolutions…</small>
                    </header>
                    <div id="resolution-distribution" class="stats-origin-list">
                        <p class="stats-chart-empty">Loading resolution data…</p>
                    </div>
                </article>

                <article class="stats-origin-chart" aria-labelledby="audio-format-distribution-heading">
                    <header>
                        <div>
                            <h4 id="audio-format-distribution-heading">Audio-Format Distribution</h4>
                            <p>Share of tagged movies for each leading audio format.</p>
                        </div>
                        <small id="audio-format-distribution-summary">Loading audio formats…</small>
                    </header>
                    <div id="audio-format-distribution" class="stats-origin-list">
                        <p class="stats-chart-empty">Loading audio-format data…</p>
                    </div>
                </article>
            </div>
        </section>

        <section class="stats-section stats-storage-section" aria-labelledby="storage-analytics-heading">
            <div class="stats-section-header">
                <h3 id="storage-analytics-heading">Storage Analytics</h3>
                <p>Understand file-size coverage and how the library uses disk space.</p>
            </div>

            <div class="stats-rating-runtime-insights" aria-live="polite">
                <article class="stats-rating-runtime-insight">
                    <span id="storage-size-coverage">–</span>
                    <small>File-Size Coverage</small>
                    <p id="storage-size-coverage-detail">No file-size data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="average-storage-size">–</span>
                    <small>Average Movie Size</small>
                    <p id="average-storage-size-detail">No file-size data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="median-storage-size">–</span>
                    <small>Median Movie Size</small>
                    <p id="median-storage-size-detail">No file-size data</p>
                </article>

                <article class="stats-rating-runtime-insight">
                    <span id="largest-storage-movie">–</span>
                    <small>Largest Movie</small>
                    <p id="largest-storage-movie-detail">No file-size data</p>
                </article>
            </div>

            <article class="stats-origin-chart" aria-labelledby="storage-distribution-heading">
                <header>
                    <div>
                        <h4 id="storage-distribution-heading">Movie File-Size Distribution</h4>
                        <p>Movies grouped into practical storage-size ranges.</p>
                    </div>
                    <small id="storage-distribution-summary">Loading file-size data…</small>
                </header>
                <div id="storage-size-distribution" class="stats-band-list">
                    <p class="stats-chart-empty">Loading file-size data…</p>
                </div>
            </article>
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
