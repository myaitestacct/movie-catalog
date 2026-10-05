<div class="app-layout">
    <!-- Left adaptable sidebar holding toolbar controls -->
    <aside
        id="app-sidebar"
        class="app-sidebar"
        aria-label="Filter and display controls"
    >
        <!-- Floating edge toggle button situated on the sidebar right border -->
        <button
            type="button"
            id="sidebar-edge-toggle"
            class="sidebar-edge-toggle"
            aria-label="Toggle sidebar"
            title="Toggle sidebar mode"
            aria-controls="app-sidebar"
            aria-expanded="true"
        >
            <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        </button>

        <div class="sidebar-inner">
            <!-- Sidebar Header with Mode Switcher (Full, Partial/Icons, Hide) -->
            <div class="sidebar-header">
                <span class="sidebar-header-title">
                    <i class="fa-solid fa-sliders" aria-hidden="true"></i>
                    <span class="sidebar-label">Controls</span>
                </span>

                <div
                    class="sidebar-mode-selector"
                    role="group"
                    aria-label="Sidebar display mode"
                >
                    <button
                        type="button"
                        class="mode-btn"
                        data-sidebar-mode="full"
                        title="Full sidebar (icons and text)"
                        aria-label="Full sidebar"
                    >
                        <i class="fa-solid fa-bars" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        class="mode-btn"
                        data-sidebar-mode="partial"
                        title="Partial sidebar (icons only)"
                        aria-label="Partial sidebar"
                    >
                        <i class="fa-solid fa-grip-vertical" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        class="mode-btn"
                        data-sidebar-mode="hidden"
                        title="Hide sidebar"
                        aria-label="Hide sidebar"
                    >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>
                </div>
            </div>

            <!-- Scrollable container for control tool groups -->
            <div class="sidebar-content">
                <div class="column-toggles">
                    <!-- View toggle -->
                    <div class="sidebar-section">
                        <span class="sidebar-section-title sidebar-label">View</span>
                        <div class="view-toggle" role="group" aria-label="View mode">
                            <button
                                type="button"
                                id="view-table"
                                class="active"
                                aria-pressed="true"
                                aria-label="Table view"
                                title="Table view"
                            >
                                <i class="fa-solid fa-table-list" aria-hidden="true"></i>
                                <span class="sidebar-label">Table</span>
                            </button>

                            <button
                                type="button"
                                id="view-grid"
                                aria-pressed="false"
                                aria-label="Grid view"
                                title="Grid view"
                            >
                                <i class="fa-solid fa-table-cells-large" aria-hidden="true"></i>
                                <span class="sidebar-label">Grid</span>
                            </button>
                        </div>
                    </div>

                    <!-- Search logic & modes -->
                    <div class="sidebar-section">
                        <span class="sidebar-section-title sidebar-label">Search Logic</span>
                        <div class="tool-group title-mode-group">
                            <label
                                class="title-search-mode"
                                for="title-search-mode"
                                title="Title search mode: Exact, Contains, or Fuzzy"
                            >
                                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                                <span class="sidebar-label">Title:</span>

                                <select
                                    id="title-search-mode"
                                    aria-label="Title search mode"
                                >
                                    <option value="EXACT">
                                        Exact
                                    </option>
                                    <option value="CONTAINS">
                                        Contains
                                    </option>
                                    <option value="FUZZY">
                                        Fuzzy
                                    </option>
                                </select>
                            </label>
                        </div>

                        <div class="tool-group">
                            <button
                                type="button"
                                id="search-mode"
                                class="search-mode"
                                title="Toggle AND / OR filter matching"
                                aria-label="Filter matching mode"
                            >
                                <i class="fa-solid fa-filter" aria-hidden="true"></i>
                                <span class="search-mode-text">AND</span>
                            </button>
                        </div>
                    </div>

                    <!-- Optional columns -->
                    <div class="sidebar-section">
                        <span class="sidebar-section-title sidebar-label">Columns</span>
                        <div
                            class="tool-group columns-group"
                            role="group"
                            aria-label="Optional columns"
                        >
                            <button
                                type="button"
                                class="toggle-col"
                                data-col="LANGUAGES"
                                title="Toggle Language column"
                            >
                                <i class="fa-solid fa-language" aria-hidden="true"></i>
                                <span class="sidebar-label">Language</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="LENGTH"
                                title="Toggle Length column"
                            >
                                <i class="fa-solid fa-clock" aria-hidden="true"></i>
                                <span class="sidebar-label">Length</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="CERTIFICATION"
                                title="Toggle Certification column"
                            >
                                <i class="fa-solid fa-ribbon" aria-hidden="true"></i>
                                <span class="sidebar-label">Cert</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="CATEGORY"
                                title="Toggle Genre column"
                            >
                                <i class="fa-solid fa-tags" aria-hidden="true"></i>
                                <span class="sidebar-label">Genre</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="RESOLUTION"
                                title="Toggle Resolution column"
                            >
                                <i class="fa-solid fa-expand" aria-hidden="true"></i>
                                <span class="sidebar-label">Resolution</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="AUDIOFORMAT"
                                title="Toggle Audio column"
                            >
                                <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
                                <span class="sidebar-label">Audio</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="FILEPATH"
                                title="Toggle File column"
                            >
                                <i class="fa-solid fa-file-video" aria-hidden="true"></i>
                                <span class="sidebar-label">File</span>
                            </button>

                            <button
                                type="button"
                                class="toggle-col"
                                data-col="PATH"
                                title="Toggle Path column"
                            >
                                <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
                                <span class="sidebar-label">Path</span>
                            </button>
                        </div>
                    </div>

                    <!-- Visual / Display options -->
                    <div class="sidebar-section">
                        <span class="sidebar-section-title sidebar-label">Display &amp; Theme</span>
                        <div class="tool-group display-options-group">
                            <button
                                type="button"
                                id="toggle-mini-poster"
                                class="toggle-col active"
                                data-ui="miniPoster"
                                aria-pressed="true"
                                title="Toggle mini poster thumbnail in table rows"
                            >
                                <i class="fa-solid fa-image" aria-hidden="true"></i>
                                <span class="sidebar-label">Poster</span>
                            </button>

                            <button
                                type="button"
                                id="theme-toggle"
                                aria-pressed="false"
                                aria-label="Switch to dark theme"
                                title="Switch to dark theme"
                            >
                                <i class="fa-solid fa-moon" aria-hidden="true"></i>
                                <span class="sidebar-label">Theme</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </aside>

    <!-- Main Content Area -->
    <main class="main-viewport">
        <!-- Top legend & Analytics bar (retained at the top with reclaimed height) -->
        <header class="table-legend-bar" aria-label="Library Status and Analytics">
            <!-- First row: Status legend chips, keyboard shortcuts, library summary, and Analytics toggle -->
            <div class="table-legend">
                <span class="legend-chip">
                    <span
                        class="legend-swatch missing"
                        aria-hidden="true"
                    ></span>
                    Missing file
                </span>

                <span class="legend-chip">
                    <span
                        class="legend-swatch better-copy"
                        aria-hidden="true"
                    ></span>
                    Better copy available
                </span>

                <span class="legend-chip">
                    <kbd>/</kbd> search &middot;
                    <kbd>&uarr;</kbd><kbd>&darr;</kbd> browse &middot;
                    <kbd>Enter</kbd> open
                </span>

                <span
                    class="app-summary"
                    role="status"
                    aria-label="Library summary"
                >
                    <span class="app-summary-chip" id="summary-movies-chip">
                        <i class="fa-solid fa-film" aria-hidden="true"></i>
                        <b id="summary-movies">&ndash;</b>
                        <small>titles</small>
                    </span>
                    <span class="app-summary-chip" id="summary-size-chip" hidden>
                        <i class="fa-solid fa-database" aria-hidden="true"></i>
                        <b id="summary-size">&ndash;</b>
                        <small>stored</small>
                    </span>
                    <span class="app-summary-chip" id="summary-health-chip" hidden>
                        <i class="fa-solid fa-heart-pulse" aria-hidden="true"></i>
                        <b id="summary-health">&ndash;</b>
                        <small>health</small>
                    </span>
                </span>

                <button
                    type="button"
                    id="stats-toggle"
                    class="stats-ribbon"
                    aria-controls="stats-panel"
                    aria-expanded="false"
                    aria-label="Analytics"
                >
                    <i class="fa-solid fa-chart-pie" aria-hidden="true"></i>
                    <span class="stats-ribbon-label">Analytics</span>
                </button>
            </div>

            <!-- Second row: Search details (active filter pills, clear controls, match counts) -->
            <div class="search-details-bar" aria-label="Active search and filter details">
                <div
                    id="filter-pills"
                    aria-live="polite"
                ></div>

                <div
                    id="search-group-info"
                    class="search-group-info hidden"
                ></div>
            </div>
        </header>

        <div class="content-area">
            <div class="table-wrapper">
                <table id="movies">
                    <thead>
                    <tr>
                        <th data-col="NUM">
                            No
                        </th>

                        <th data-col="FORMATTEDTITLE">
                            Title
                        </th>

                        <th data-col="YEAR">
                            Year
                        </th>

                        <th data-col="RATING">
                            Rating
                        </th>

                        <th data-col="FILESIZE">
                            Size
                        </th>

                        <th
                            data-col="CERTIFICATION"
                            style="display:none;"
                        >
                            Cert
                        </th>

                        <th
                            data-col="LENGTH"
                            style="display:none;"
                        >
                            Length
                        </th>

                        <th
                            data-col="LANGUAGES"
                            style="display:none;"
                        >
                            Language
                        </th>

                        <th
                            data-col="CATEGORY"
                            style="display:none;"
                        >
                            Genre
                        </th>

                        <th
                            data-col="RESOLUTION"
                            style="display:none;"
                        >
                            Resolution
                        </th>

                        <th
                            data-col="AUDIOFORMAT"
                            style="display:none;"
                        >
                            Audio
                        </th>

                        <th
                            data-col="FILEPATH"
                            style="display:none;"
                        >
                            File
                        </th>

                        <th
                            data-col="PATH"
                            style="display:none;"
                        >
                            Path
                        </th>
                    </tr>

                    <tr id="search-row"></tr>
                    </thead>

                    <tbody></tbody>
                </table>
            </div>

            <div class="grid-wrapper hidden" id="grid-wrapper">
                <div class="movie-grid" id="grid-view" aria-label="Movie grid"></div>
            </div>
        </div>

        <div
            class="pagination"
            id="pagination"
        ></div>
    </main>
</div>
