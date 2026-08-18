// pagination.js
import { state } from '../core/state.js';

export function renderPagination(
  container,
  totalPages,
  totalResults = 0,
  pageSize = state.limit,
  onPageChange
) {
  if (!container) return;

  state.totalPages = totalPages;
  container.innerHTML = '';

  if (totalResults === 0) {
    const info = document.createElement('span');
    info.className = 'info';
    info.textContent = 'No results found';
    container.appendChild(info);
    return;
  }

  const effectivePageSize = Math.max(1, Number(pageSize) || state.limit);
  const start = (state.page - 1) * effectivePageSize + 1;
  const end = Math.min(start + effectivePageSize - 1, totalResults);

  const info = document.createElement('span');
  info.className = 'info';
  info.textContent =
    `Showing ${start}-${end} of ${totalResults} results`;

  container.appendChild(info);

  container.appendChild(
    createBtn('<<', 1, state.page === 1, onPageChange)
  );

  container.appendChild(
    createBtn('<', state.page - 1, state.page === 1, onPageChange)
  );

  const rangeStart = Math.max(1, state.page - 3);
  const rangeEnd = Math.min(totalPages, state.page + 3);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    container.appendChild(
      createBtn(i, i, i === state.page, onPageChange, true)
    );
  }

  container.appendChild(
    createBtn('>', state.page + 1, state.page === totalPages, onPageChange)
  );

  container.appendChild(
    createBtn('>>', totalPages, state.page === totalPages, onPageChange)
  );

  const select = document.createElement('select');

  for (let i = 1; i <= totalPages; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    if (i === state.page) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', e => {
    state.page = parseInt(e.target.value, 10);
    onPageChange?.();
  });

  container.appendChild(select);
}

function createBtn(label, page, disabled, onPageChange, isNumber = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = label;
  btn.disabled = disabled;

  if (isNumber && page === state.page)
    btn.classList.add('active');

  btn.addEventListener('click', () => {
    if (disabled) return;

    state.page = Math.max(
      1,
      Math.min(state.totalPages, page)
    );

    onPageChange?.();
  });

  return btn;
}
