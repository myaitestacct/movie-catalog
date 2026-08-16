<!-- Stats ribbon button (always visible) -->
<button id="stats-toggle" class="stats-ribbon">
    📊 Stats
</button>

<!-- Pull-down stats panel (hidden by default) -->
<div id="stats-panel" class="stats-panel hidden">
    <div class="stats-panel-inner">
        <h2>📊 Movie Statistics</h2>

        <div class="stats-cards">
            <div class="stat-card">
                <i class="fa-solid fa-film"></i>
                <div>
                    <span id="total-movies">–</span>
                    <small>Movies</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-database"></i>
                <div>
                    <span id="total-size">–</span>
                    <small>Total Size</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-calendar"></i>
                <div>
                    <span id="total-years">–</span>
                    <small>Unique Years</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-tags"></i>
                <div>
                    <span id="total-genres">–</span>
                    <small>Unique Genres</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-exclamation-triangle"></i>
                <div>
                    <span id="missing-files">–</span>
                    <small>Missing Files</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                <div>
                    <span id="needs-better-copy-count">–</span>
                    <small>Needs Better Copy</small>
                </div>
            </div>

            <div class="stat-card">
                <i class="fa-solid fa-clone"></i>
                <div>
                    <span id="duplicate-count">–</span>
                    <small>Duplicate Movies</small>
                </div>
            </div>
        </div>
    </div>
</div>
