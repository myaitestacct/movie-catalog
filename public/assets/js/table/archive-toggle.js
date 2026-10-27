// archive-toggle.js
//
// Hidden archive collection switch. The default view always serves the
// `movies` table; Ctrl+Shift+K flips the whole catalog to the `paripakva`
// table and back. There is deliberately no visible button for it: the only
// on-screen affordance is the indicator chip that appears while the archive
// view is active. On a fresh page load the flag is always false, so the
// main `movies` table remains the default view.
import { state } from '../core/state.js';

export const ARCHIVE_SHORTCUT = 'Ctrl+Shift+K';
export const ARCHIVE_SOURCE_LABEL = 'Paripakva';
export const DEFAULT_SOURCE_LABEL = 'Movies';

export const ARCHIVE_INDICATOR_ID = 'archive-indicator';
export const ARCHIVE_VIEW_BODY_CLASS = 'archive-view';

const TOAST_CLASS = 'archive-toast';
const TOAST_VISIBLE_CLASS = 'is-visible';
const TOAST_DURATION_MS = 2400;

export function isArchiveView() {
  return state.archive === true;
}

export function archiveLabel(archive = state.archive) {
  return archive
    ? ARCHIVE_SOURCE_LABEL
    : DEFAULT_SOURCE_LABEL;
}

/**
 * Match the Ctrl+Shift+K chord (without Alt/Meta modifiers). Kept pure so
 * the keyboard contract can be asserted without a browser.
 */
export function isArchiveShortcut(event) {
  return Boolean(
    event &&
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.key?.toLowerCase() === 'k'
  );
}

/**
 * Flip the source table and restart paging at the first page. Returns the
 * new archive state. The query signature (see state.js) includes the flag,
 * so a load started against the previous source is superseded automatically.
 */
export function toggleArchiveView() {
  state.archive = !state.archive;
  state.page = 1;
  return state.archive;
}

/**
 * Mirror the active source onto the page: the legend-bar indicator chip and
 * a body class that styles archive-only cues (e.g. row source badges).
 */
export function syncArchiveIndicator(doc = document) {
  const active = isArchiveView();

  doc.body?.classList.toggle(ARCHIVE_VIEW_BODY_CLASS, active);

  const indicator = doc.getElementById(ARCHIVE_INDICATOR_ID);

  if (indicator) {
    indicator.hidden = !active;
  }

  return active;
}

let toastTimer = null;

/**
 * Show a transient confirmation naming the collection now in view. The
 * element is created lazily and reused, like the global error container.
 */
export function announceArchiveChange(
  active,
  { doc = document, setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}
) {
  let toast = doc.body.querySelector(`.${TOAST_CLASS}`);

  if (!toast) {
    toast = doc.createElement('div');
    toast.className = TOAST_CLASS;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    doc.body.appendChild(toast);
  }

  toast.textContent =
    `${archiveLabel(active)} collection — ` +
    `press ${ARCHIVE_SHORTCUT} to switch back`;

  // Force the entrance transition even when the same element is reused.
  toast.classList.remove(TOAST_VISIBLE_CLASS);
  void toast.offsetWidth;
  toast.classList.add(TOAST_VISIBLE_CLASS);

  clearTimeoutFn(toastTimer);
  toastTimer = setTimeoutFn(() => {
    toast.classList.remove(TOAST_VISIBLE_CLASS);
  }, TOAST_DURATION_MS);
}
