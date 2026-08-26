// table.js
import { state, ALWAYS_VISIBLE } from '../core/state.js';
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

function createGroupHeader(type, count, exactTitle, columns, fuzzy) {
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
  icon.textContent = type === 'exact' ? '✅' : (fuzzy ? '🔍' : '📄');

  const titleSpan = document.createElement('span');
  titleSpan.className = 'group-header-title';
  if (type === 'exact') {
    titleSpan.textContent = `Exact Matches (${count}) for "${exactTitle}"`;
  } else {
    titleSpan.textContent = fuzzy
      ? `Fuzzy / Contains Matches (${count})`
      : `Other Matches (${count})`;
  }

  const badge = document.createElement('span');
  badge.className = `group-header-badge ${type}-badge`;
  badge.textContent = type === 'exact' ? 'EXACT' : (fuzzy ? 'FUZZY' : 'OTHER');

  wrapper.append(icon, titleSpan, badge);
  td.appendChild(wrapper);
  tr.appendChild(td);
  return tr;
}

function renderSearchGroupInfo(infoBanner, exactCount, fuzzyCount, exactTitle, fuzzy) {
  const exactMessage = document.createElement('span');
  exactMessage.className = 'info-exact';
  exactMessage.textContent =
    `✅ ${exactCount} exact match${exactCount === 1 ? '' : 'es'} for "${exactTitle}"`;

  const separator = document.createElement('span');
  separator.className = 'info-sep';
  separator.textContent = '|';

  const fuzzyMessage = document.createElement('span');
  fuzzyMessage.className = 'info-fuzzy';
  fuzzyMessage.textContent =
    `🔍 ${fuzzyCount} ${fuzzy ? 'fuzzy/contains' : 'other'} match${fuzzyCount === 1 ? '' : 'es'}`;

  const hint = document.createElement('span');
  hint.className = 'info-hint';
  hint.textContent = '– exact matches are highlighted green and shown first';

  infoBanner.className = 'search-group-info';
  infoBanner.replaceChildren(
    exactMessage,
    separator,
    fuzzyMessage,
    hint
  );
}

function renderMovieRow(movie, rows, columns, termsByColumn, fuzzy) {
  const tr = document.createElement('tr');
  tr.dataset.num = movie.NUM;

  if (movie.FILE?.toUpperCase() === 'MISSING') tr.classList.add('missing-file');
  if (movie.FILE?.includes('-Get.Better.Copy')) tr.classList.add('better-copy');

  tr.addEventListener('mouseenter', () => tr.classList.add('row-hover'));
  tr.addEventListener('mouseleave', () => tr.classList.remove('row-hover'));

  columns.forEach(col => {
    const td = document.createElement('td');
    const visible = state.columnVisibility[col] ?? ALWAYS_VISIBLE.includes(col);
    td.style.display = visible ? '' : 'none';
    const searchTerms = termsByColumn[col] || [];
    let value = movie[col] ?? '';
    const textValue = String(value);

    if (col === 'NUM') {
      const span = document.createElement('span');
      span.className = 'num-value';
      if (shouldHighlight(textValue, searchTerms, 'OR', fuzzy)) {
        span.innerHTML = highlightMatch(textValue, searchTerms, fuzzy);
      } else {
        span.textContent = textValue;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn icon-btn';
      btn.innerHTML = '📋';
      btn.title = 'Copy Num';
      btn.onclick = e => {
        e.stopPropagation();
        copyToClipboard(textValue + '__', btn);
      };

      td.append(span, btn);
    } else if (col === 'FORMATTEDTITLE') {
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'movie-title-link';

      if (shouldHighlight(value, searchTerms, 'OR', fuzzy)) {
        a.innerHTML = highlightMatch(value, searchTerms, fuzzy);
      } else {
        a.textContent = value;
      }

      a.onclick = e => {
        e.preventDefault();
        const index = rows.indexOf(movie);
        const rect = tr.getBoundingClientRect();
        const modalContent = document.querySelector('.movie-modal-content');

        if (modalContent) {
          modalContent.style.transformOrigin =
            `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
        }

        Modal.setMovies(rows);
        Modal.show(movie, index);
      };

      td.appendChild(a);
    } else if (col === 'RATING') {
      if (!value) {
        td.textContent = '';
      } else {
        const a = document.createElement('a');
        const hasExternalRating = configureExternalLink(a, movie.URL);
        a.className = 'rating-badge';
        a.title = hasExternalRating
          ? 'Open external rating'
          : 'External rating link unavailable';

        if (shouldHighlight(textValue, searchTerms, 'OR', fuzzy)) {
          a.innerHTML = highlightMatch(textValue, searchTerms, fuzzy);
        } else {
          a.textContent = textValue;
        }

        a.onclick = e => e.stopPropagation();
        td.appendChild(a);
      }
    } else if (col === 'FILEPATH') {
      const span = document.createElement('span');
      span.className = 'file-name';

      const fileName = movie.FILE ?? '';
      if (shouldHighlight(fileName, searchTerms, 'OR', fuzzy)) {
        span.innerHTML = highlightMatch(fileName, searchTerms, fuzzy);
      } else {
        span.textContent = fileName;
      }

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn icon-btn';
      btn.innerHTML = '📋';
      btn.title = 'Copy File Name';
      btn.onclick = e => {
        e.stopPropagation();
        copyToClipboard(fileName ?? '', btn);
      };

      td.append(span, btn);
    } else {
      if (shouldHighlight(value, searchTerms, 'OR', fuzzy)) {
        td.innerHTML = highlightMatch(value, searchTerms, fuzzy);
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
  const rawTitleSearch = state.search.FORMATTEDTITLE || '';
  const { title: exactTitle } = parseTitleSearch(rawTitleSearch);

  let exactRows = [];
  let fuzzyRows = [];
  let useGroupedRendering = false;

  if (exactTitle && rows.length > 1) {
    rows.forEach(movie => {
      if (isExactTitleMatch(movie, exactTitle)) {
        exactRows.push(movie);
      } else {
        fuzzyRows.push(movie);
      }
    });

    if (exactRows.length > 0 && fuzzyRows.length > 0) {
      useGroupedRendering = true;
    }
  }

  const infoBanner = document.getElementById('search-group-info');

  if (infoBanner) {
    if (useGroupedRendering) {
      renderSearchGroupInfo(
        infoBanner,
        exactRows.length,
        fuzzyRows.length,
        exactTitle,
        fuzzy
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
        fuzzy
      )
    );

    exactRows.forEach(movie => {
      const tr = renderMovieRow(movie, rows, columns, termsByColumn, fuzzy);
      tr.classList.add('exact-match');
      tr.dataset.matchType = 'exact';
      tbody.appendChild(tr);
    });

    tbody.appendChild(
      createGroupHeader(
        'fuzzy',
        fuzzyRows.length,
        exactTitle,
        columns,
        fuzzy
      )
    );

    fuzzyRows.forEach(movie => {
      const tr = renderMovieRow(movie, rows, columns, termsByColumn, fuzzy);
      tr.classList.add('fuzzy-match');
      tr.dataset.matchType = 'fuzzy';
      tbody.appendChild(tr);
    });
  } else {
    rows.forEach(movie => {
      const tr = renderMovieRow(movie, rows, columns, termsByColumn, fuzzy);

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
