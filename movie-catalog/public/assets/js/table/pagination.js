// pagination.js
import { state } from '../core/state.js';

export const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const PAGE_SIZE_STORAGE_KEY = 'movieCatalogPageSize';

export function loadStoredPageSize() {
  try {
    const stored = parseInt(
      localStorage.getItem(PAGE_SIZE_STORAGE_KEY),
      10
    );

    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

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
  info.setAttribute?.('role', 'status');
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

  container.appendChild(
    createPageSizeSelect(effectivePageSize, onPageChange)
  );
}

function createPageSizeSelect(currentSize, onPageChange) {
  const select = document.createElement('select');
  select.className = 'page-size';
  select.setAttribute?.('aria-label', 'Results per page');
  select.title = 'Results per page';

  PAGE_SIZE_OPTIONS.forEach(size => {
    const opt = document.createElement('option');
    opt.value = String(size);
    opt.textContent = `${size} / page`;
    if (size === currentSize) opt.selected = true;
    select.appendChild(opt);
  });

  select.addEventListener('change', e => {
    state.limit = parseInt(e.target.value, 10);
    state.page = 1;

    try {
      localStorage.setItem(
        PAGE_SIZE_STORAGE_KEY,
        String(state.limit)
      );
    } catch {
      /* storage unavailable — keep in-memory value */
    }

    onPageChange?.();
  });

  return select;
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
