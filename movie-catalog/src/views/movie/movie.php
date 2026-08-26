<div class="column-toggles">
    <button type="button" id="theme-toggle">🌙</button>
    <button type="button" id="search-mode" class="search-mode">AND</button>

    <label class="title-search-mode" for="title-search-mode">
        <span>Title:</span>
        <select id="title-search-mode" aria-label="Title search mode">
            <option value="EXACT">Exact</option>
            <option value="CONTAINS">Contains</option>
            <option value="FUZZY">Fuzzy</option>
        </select>
    </label>

    <button type="button" class="toggle-col" data-col="LANGUAGES">
        <i class="fa-solid fa-language"></i>
        Language
    </button>

    <button type="button" class="toggle-col" data-col="LENGTH">
        <i class="fa-solid fa-clock"></i>
        Length
    </button>

    <button type="button" class="toggle-col" data-col="CERTIFICATION">
        <i class="fa-solid fa-ribbon"></i>
        Cert
    </button>

    <button type="button" class="toggle-col" data-col="CATEGORY">
        <i class="fa-solid fa-tags"></i>
        Genre
    </button>

    <button type="button" class="toggle-col" data-col="RESOLUTION">
        <i class="fa-solid fa-expand"></i>
        Resolution
    </button>

    <button type="button" class="toggle-col" data-col="AUDIOFORMAT">
        <i class="fa-solid fa-volume-high"></i>
        Audio
    </button>

    <button type="button" class="toggle-col" data-col="FILEPATH">
        <i class="fa-solid fa-file-video"></i>
        File
    </button>

    <button type="button" class="toggle-col" data-col="PATH">
        <i class="fa-solid fa-folder-open"></i>
        Path
    </button>
</div>

<div id="search-group-info" class="search-group-info hidden"></div>

<div class="table-wrapper">
    <table id="movies">
        <thead>
        <tr>
          <th data-col="NUM">No</th>
          <th data-col="FORMATTEDTITLE">Title</th>
          <th data-col="YEAR">Year</th>
          <th data-col="RATING">Rating</th>
          <th data-col="FILESIZE">Size</th>
          <th data-col="CERTIFICATION" style="display:none;">Cert</th>
          <th data-col="LENGTH" style="display:none;">Length</th>
          <th data-col="LANGUAGES" style="display:none;">Language</th>
          <th data-col="CATEGORY" style="display:none;">Genre</th>
          <th data-col="RESOLUTION" style="display:none;">Resolution</th>
          <th data-col="AUDIOFORMAT" style="display:none;">Audio</th>
          <th data-col="FILEPATH" style="display:none;">File</th>
          <th data-col="PATH" style="display:none;">Path</th>
        </tr>

        <tr id="search-row"></tr>
        </thead>

        <tbody></tbody>
    </table>
</div>

<div class="pagination" id="pagination"></div>
