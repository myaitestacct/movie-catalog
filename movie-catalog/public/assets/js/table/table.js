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

function createExactFuzzySeparator(columns, exactCount, fuzzyCount, fuzzy) {
  const tr = document.createElement('tr');
  tr.className = 'exact-fuzzy-separator';
  const td = document.createElement('td');
  td.colSpan = columns.length;
  td.style.display = '';
  const content = document.createElement('div');
  content.className = 'separator-content';
  const icon = document.createElement('span');
  icon.className = 'separator-icon';
  icon.textContent = fuzzy ? '🔍' : '—';
  const text = document.createElement('span');
  text.className = 'separator-text';
  text.textContent = fuzzy
    ? `Exact matches (${exactCount}) • Fuzzy / Contains matches (${fuzzyCount})`
    : `Exact matches (${exactCount}) • Other matches (${fuzzyCount})`;
  const lineLeft = document.createElement('span');
  lineLeft.className = 'separator-line';
  const lineRight = document.createElement('span');
  lineRight.className = 'separator-line';
  content.append(lineLeft, icon, text, lineRight);
  td.appendChild(content);
  tr.appendChild(td);
  return tr;
}

export function renderTable(table, rows, columns) {
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  const termsByColumn = Object.fromEntries(
    columns.map(column => [column, collectColumnSearchTerms(state.search, column)])
  );
  const fuzzy = !!state.fuzzy;

  const rawTitleSearch = state.search.FORMATTEDTITLE || '';
  const { title: exactTitle } = parseTitleSearch(rawTitleSearch);
  let exactCount = 0, fuzzyCount = 0, separatorInserted = false;

  if (exactTitle) {
    rows.forEach(movie => {
      if (isExactTitleMatch(movie, exactTitle)) exactCount++;
      else fuzzyCount++;
    });
  }

  rows.forEach((movie, rowIndex) => {
    const isExact = exactTitle ? isExactTitleMatch(movie, exactTitle) : false;
    if (exactTitle && exactCount>0 && fuzzyCount>0 && !separatorInserted) {
      const prevIsExact = rowIndex>0 ? isExactTitleMatch(rows[rowIndex-1], exactTitle) : false;
      if (!isExact && (prevIsExact || rowIndex===exactCount)) {
        tbody.appendChild(createExactFuzzySeparator(columns, exactCount, fuzzyCount, fuzzy));
        separatorInserted = true;
      }
    }

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
        span.innerHTML = shouldHighlight(textValue, searchTerms, 'OR', fuzzy)
          ? highlightMatch(textValue, searchTerms, fuzzy) : (()=>{ span.textContent=textValue; return span.textContent; })();
        if (!shouldHighlight(textValue, searchTerms, 'OR', fuzzy)) span.textContent=textValue;
        else span.innerHTML=highlightMatch(textValue, searchTerms, fuzzy);
        const btn = document.createElement('button');
        btn.type='button'; btn.className='copy-btn icon-btn'; btn.innerHTML='📋'; btn.title='Copy Num';
        btn.onclick=e=>{ e.stopPropagation(); copyToClipboard(textValue+'__', btn); };
        td.append(span, btn);
      }
      else if (col === 'FORMATTEDTITLE') {
        const a = document.createElement('a');
        a.href='#'; a.className='movie-title-link';
        a.innerHTML = shouldHighlight(value, searchTerms, 'OR', fuzzy) ? highlightMatch(value, searchTerms, fuzzy) : '';
        if (!shouldHighlight(value, searchTerms, 'OR', fuzzy)) a.textContent=value;
        a.onclick=e=>{
          e.preventDefault();
          const index=rows.indexOf(movie);
          const rect=tr.getBoundingClientRect();
          const modalContent=document.querySelector('.movie-modal-content');
          if(modalContent) modalContent.style.transformOrigin=`${rect.left+rect.width/2}px ${rect.top+rect.height/2}px`;
          Modal.setMovies(rows); Modal.show(movie, index);
        };
        td.appendChild(a);
      }
      else if (col === 'RATING') {
        if (!value) td.textContent='';
        else {
          const a=document.createElement('a');
          const hasExternalRating=configureExternalLink(a, movie.URL);
          a.className='rating-badge'; a.title=hasExternalRating?'Open external rating':'External rating link unavailable';
          a.innerHTML=shouldHighlight(textValue, searchTerms, 'OR', fuzzy)?highlightMatch(textValue, searchTerms, fuzzy):'';
          if(!shouldHighlight(textValue, searchTerms, 'OR', fuzzy)) a.textContent=textValue;
          a.onclick=e=>e.stopPropagation();
          td.appendChild(a);
        }
      }
      else if (col === 'FILEPATH') {
        const span=document.createElement('span'); span.className='file-name';
        const fileName=movie.FILE??'';
        span.innerHTML=shouldHighlight(fileName, searchTerms, 'OR', fuzzy)?highlightMatch(fileName, searchTerms, fuzzy):'';
        if(!shouldHighlight(fileName, searchTerms, 'OR', fuzzy)) span.textContent=fileName;
        const btn=document.createElement('button'); btn.type='button'; btn.className='copy-btn icon-btn'; btn.innerHTML='📋'; btn.title='Copy File Name';
        btn.onclick=e=>{ e.stopPropagation(); copyToClipboard(fileName??'', btn); };
        td.append(span, btn);
      }
      else {
        if (shouldHighlight(value, searchTerms, 'OR', fuzzy)) td.innerHTML=highlightMatch(value, searchTerms, fuzzy);
        else td.textContent=value;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}
