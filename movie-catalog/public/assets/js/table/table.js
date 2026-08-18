// table.js
import { state, ALWAYS_VISIBLE } from '../core/state.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { configureExternalLink } from '../utils/url.js';
import {
  collectColumnSearchTerms,
  highlightMatch,
  shouldHighlight
} from '../utils/highlighttext.js';
import { Modal } from '../modal/modal.js';

/**
 * Render the movie table
 * @param {HTMLTableElement} table 
 * @param {Array} rows - array of movie objects
 * @param {Array} columns - array of column keys
 */
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

  rows.forEach(movie => {
    const tr = document.createElement('tr');
    tr.dataset.num = movie.NUM;

    // Row highlighting
    if (movie.FILE?.toUpperCase() === 'MISSING') tr.classList.add('missing-file');
    if (movie.FILE?.includes('-Get.Better.Copy')) tr.classList.add('better-copy');

    // Hover effect
    tr.addEventListener('mouseenter', () => tr.classList.add('row-hover'));
    tr.addEventListener('mouseleave', () => tr.classList.remove('row-hover'));

    columns.forEach(col => {
      const td = document.createElement('td');
      const visible = state.columnVisibility[col] ?? ALWAYS_VISIBLE.includes(col);
      td.style.display = visible ? '' : 'none';

      const searchTerms = termsByColumn[col] || [];
      let value = movie[col] ?? '';
      const textValue = String(value);

      /* ==========================
         NUM → value + copy
      ========================== */
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
      }

      /* ==========================
         Title → modal
      ========================== */
        else if (col === 'FORMATTEDTITLE') {
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'movie-title-link'; // <-- add this!

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
        }

    /* ==========================
       RATING → external link badge
    ========================== */
    else if (col === 'RATING') {
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

        // prevent row / modal click side-effects
        a.onclick = e => e.stopPropagation();

        td.appendChild(a);
      }
    }

      /* ==========================
         FILEPATH → filename + copy
      ========================== */
      else if (col === 'FILEPATH') {
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
      }

      /* ==========================
         Default columns
      ========================== */
      else {
        if (shouldHighlight(value, searchTerms, 'OR', fuzzy)) {
          td.innerHTML = highlightMatch(value, searchTerms, fuzzy);
        } else {
          td.textContent = value;
        }
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}
