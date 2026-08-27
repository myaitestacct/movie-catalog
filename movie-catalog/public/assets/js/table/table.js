// table.js
import {
  state,
  ALWAYS_VISIBLE,
  TITLE_SEARCH_MODES
} from '../core/state.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { configureExternalLink } from '../utils/url.js';
import {
  collectColumnSearchTerms,
  highlightMatch,
  shouldHighlight,
  parseTitleSearch
} from '../utils/highlighttext.js';
import { Modal } from '../modal/modal.js';

function isExactTitleMatch(movie, exactTitle) {
  if (!exactTitle) return false;

  const movieTitle = (movie.FORMATTEDTITLE ?? '').toString().trim();

  if (!movieTitle) return false;

  return movieTitle.toLowerCase() === exactTitle.toLowerCase();
}

function createGroupHeader(type, count, exactTitle, columns, titleSearchMode) {
  const fuzzy = titleSearchMode === 'FUZZY';
  const tr = document.createElement('tr');
  tr.className = `group-header ${type}-header`;
  tr.dataset.testid = `${type}-header`;

  const td = document.createElement('td');
  td.colSpan = columns.length;
  td.style.display = '';

  const wrapper = document.createElement('div');
  wrapper.className = `group-header-wrapper ${type}-wrapper`;

  const icon = document.createElement('span');
  icon.className = 'group-header-icon';
  icon.textContent = type === 'exact'
    ? '✅'
    : (fuzzy ? '🔍' : '📄');

  const titleSpan = document.createElement('span');
  titleSpan.className = 'group-header-title';

  if (type === 'exact') {
    titleSpan.textContent =
      `Exact Matches (${count}) for "${exactTitle}"`;
  } else {
    titleSpan.textContent = titleSearchMode === 'FUZZY'
      ? `Fuzzy Matches (${count})`
      : titleSearchMode === 'CONTAINS'
        ? `Contains Matches (${count})`
        : `Other Matches (${count})`;
  }

  const badge = document.createElement('span');
  badge.className = `group-header-badge ${type}-badge`;
  //badge.textContent =
    //type === 'exact' ? ' EXACT' : (fuzzy ? ' FUZZY' : ' OTHER');

  wrapper.append(icon, titleSpan, badge);
  td.appendChild(wrapper);
  tr.appendChild(td);

  return tr;
}

function renderSearchGroupInfo(
  infoBanner,
  exactCount,
  otherCount,
  exactTitle,
  titleSearchMode
) {
  const exactMessage = document.createElement('span');
  exactMessage.className = 'info-exact';
  exactMessage.textContent =
    `✅ ${exactCount} exact match${exactCount === 1 ? '' : 'es'} for "${exactTitle}"`;

  const separator = document.createElement('span');
  separator.className = 'info-sep';
  separator.textContent = '|';

  const otherMessage = document.createElement('span');
  otherMessage.className = 'info-fuzzy';

  const modeLabel = titleSearchMode === 'FUZZY'
    ? 'fuzzy'
    : titleSearchMode === 'CONTAINS'
      ? 'contains'
      : 'other';

  if (otherCount > 0) {
    otherMessage.textContent =
      `🔍 ${otherCount} ${modeLabel} match${otherCount === 1 ? '' : 'es'}`;
  } else {
    otherMessage.textContent = '. No additional matches';
  }

  const hint = document.createElement('span');
  hint.className = 'info-hint';
  hint.textContent = '– exact matches are shown first';

  const noMatchMessage = document.createElement('span');
  noMatchMessage.className = 'info-empty';
  noMatchMessage.textContent =
    `No matches for "${exactTitle}"`;

  infoBanner.className = 'search-group-info';

  const messages = [];

  if (exactCount > 0) {
    messages.push(exactMessage);
  }

  if (otherCount > 0) {
    if (messages.length > 0) {
      messages.push(separator);
    }

    messages.push(otherMessage, hint);
  } else if (exactCount > 0) {
    messages.push(otherMessage);
  }

  if (messages.length === 0) {
    messages.push(noMatchMessage);
  }

  infoBanner.replaceChildren(...messages);
}

function renderMovieRow(
  movie,
  rows,
  columns,
  termsByColumn,
  fuzzy,
  titleSearchMode
) {
  const tr = document.createElement('tr');
  tr.dataset.num = movie.NUM;

  if (movie.FILE?.toUpperCase() === 'MISSING') {
    tr.classList.add('missing-file');
  }

  if (movie.FILE?.includes('-Get.Better.Copy')) {
    tr.classList.add('better-copy');
  }

  tr.addEventListener('mouseenter', () => {
    tr.classList.add('row-hover');
  });

  tr.addEventListener('mouseleave', () => {
    tr.classList.remove('row-hover');
  });

  columns.forEach(col => {
    const highlightFuzzy = col === 'FORMATTEDTITLE'
      ? titleSearchMode === 'FUZZY'
      : fuzzy;

    const td = document.createElement('td');
    const visible =
      state.columnVisibility[col] ?? ALWAYS_VISIBLE.includes(col);

    td.style.display = visible ? '' : 'none';

    const searchTerms = termsByColumn[col] || [];
    const value = movie[col] ?? '';
    const textValue = String(value);

    if (col === 'NUM') {
      const span = document.createElement('span');
      span.className = 'num-value';

      if (shouldHighlight(
        textValue,
        searchTerms,
        'OR',
        highlightFuzzy
      )) {
        span.innerHTML = highlightMatch(
          textValue,
          searchTerms,
          highlightFuzzy
        );
      } else {
        span.textContent = textValue;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn icon-btn';
      btn.innerHTML = '📋';
      btn.title = 'Copy Num';

      btn.onclick = event => {
        event.stopPropagation();
        copyToClipboard(textValue + '__', btn);
      };

      td.append(span, btn);
    } else if (col === 'FORMATTEDTITLE') {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'movie-title-link';

      if (shouldHighlight(
        value,
        searchTerms,
        'OR',
        highlightFuzzy
      )) {
        link.innerHTML = highlightMatch(
          value,
          searchTerms,
          highlightFuzzy
        );
      } else {
        link.textContent = value;
      }

      link.onclick = event => {
        event.preventDefault();

        const index = rows.indexOf(movie);
        const rect = tr.getBoundingClientRect();
        const modalContent =
          document.querySelector('.movie-modal-content');

        if (modalContent) {
          modalContent.style.transformOrigin =
            `${rect.left + rect.width / 2}px ` +
            `${rect.top + rect.height / 2}px`;
        }

        Modal.setMovies(rows);
        Modal.show(movie, index);
      };

      td.appendChild(link);
    } else if (col === 'RATING') {
      if (!value) {
        td.textContent = '';
      } else {
        const link = document.createElement('a');
        const hasExternalRating =
          configureExternalLink(link, movie.URL);

        link.className = 'rating-badge';
        link.title = hasExternalRating
          ? 'Open external rating'
          : 'External rating link unavailable';

        if (shouldHighlight(
          textValue,
          searchTerms,
          'OR',
          highlightFuzzy
        )) {
          link.innerHTML = highlightMatch(
            textValue,
            searchTerms,
            highlightFuzzy
          );
        } else {
          link.textContent = textValue;
        }

        link.onclick = event => {
          event.stopPropagation();
        };

        td.appendChild(link);
      }
    } else if (col === 'FILEPATH') {
      const span = document.createElement('span');
      span.className = 'file-name';

      const fileName = movie.FILE ?? '';

      if (shouldHighlight(
        fileName,
        searchTerms,
        'OR',
        highlightFuzzy
      )) {
        span.innerHTML = highlightMatch(
          fileName,
          searchTerms,
          highlightFuzzy
        );
      } else {
        span.textContent = fileName;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn icon-btn';
      btn.innerHTML = '📋';
      btn.title = 'Copy File Name';

      btn.onclick = event => {
        event.stopPropagation();
        copyToClipboard(fileName ?? '', btn);
      };

      td.append(span, btn);
    } else {
      if (shouldHighlight(
        value,
        searchTerms,
        'OR',
        highlightFuzzy
      )) {
        td.innerHTML = highlightMatch(
          value,
          searchTerms,
          highlightFuzzy
        );
      } else {
        td.textContent = value;
      }
    }

    tr.appendChild(td);
  });

  return tr;
}

export function renderTable(table, rows, columns) {
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';

  const termsByColumn = Object.fromEntries(
    columns.map(column => [
      column,
      collectColumnSearchTerms(state.search, column)
    ])
  );

  const fuzzy = !!state.fuzzy;
  const titleSearchMode = TITLE_SEARCH_MODES.includes(
    state.titleSearchMode
  )
    ? state.titleSearchMode
    : (fuzzy ? 'FUZZY' : 'CONTAINS');

  const rawTitleSearch = state.search.FORMATTEDTITLE || '';
  const { title: exactTitle } =
    parseTitleSearch(rawTitleSearch);

  let exactRows = [];
  let fuzzyRows = [];
  let useGroupedRendering = false;

  if (exactTitle) {
    rows.forEach(movie => {
      if (isExactTitleMatch(movie, exactTitle)) {
        exactRows.push(movie);
      } else {
        fuzzyRows.push(movie);
      }
    });

    // Keep an exact result visibly identified even when the fuzzy search
    // produces no additional rows, such as a long, specific title.
    useGroupedRendering = exactRows.length > 0;
  }

  const infoBanner =
    document.getElementById('search-group-info');

  if (infoBanner) {
    if (exactTitle) {
      renderSearchGroupInfo(
        infoBanner,
        exactRows.length,
        fuzzyRows.length,
        exactTitle,
        titleSearchMode
      );
    } else {
      infoBanner.className = 'search-group-info hidden';
      infoBanner.replaceChildren();
    }
  }

  if (useGroupedRendering) {
    tbody.appendChild(
      createGroupHeader(
        'exact',
        exactRows.length,
        exactTitle,
        columns,
        titleSearchMode
      )
    );

    exactRows.forEach(movie => {
      const tr = renderMovieRow(
        movie,
        rows,
        columns,
        termsByColumn,
        fuzzy,
        titleSearchMode
      );

      tr.classList.add('exact-match');
      tr.dataset.matchType = 'exact';
      tbody.appendChild(tr);
    });

    if (fuzzyRows.length > 0) {
      tbody.appendChild(
        createGroupHeader(
          'fuzzy',
          fuzzyRows.length,
          exactTitle,
          columns,
          titleSearchMode
        )
      );

      fuzzyRows.forEach(movie => {
        const tr = renderMovieRow(
          movie,
          rows,
          columns,
          termsByColumn,
          fuzzy,
          titleSearchMode
        );

        tr.classList.add('fuzzy-match');
        tr.dataset.matchType = 'fuzzy';
        tbody.appendChild(tr);
      });
    }
  } else {
    rows.forEach(movie => {
      const tr = renderMovieRow(
        movie,
        rows,
        columns,
        termsByColumn,
        fuzzy,
        titleSearchMode
      );

      if (exactTitle) {
        if (isExactTitleMatch(movie, exactTitle)) {
          tr.classList.add('exact-match');
          tr.dataset.matchType = 'exact';
        } else if (rawTitleSearch) {
          tr.classList.add('fuzzy-match');
          tr.dataset.matchType = 'fuzzy';
        }
      }

      tbody.appendChild(tr);
    });
  }
}
