// sidebar.js
/**
 * Sidebar display modes and persistence logic.
 *
 * Supported modes:
 * - 'full': Full sidebar with icons and text labels (~240px wide).
 * - 'partial': Compact rail with icons only (~64px wide).
 * - 'hidden': Completely collapsed / off-canvas (0px wide) to claim full real estate.
 */

export const SIDEBAR_STORAGE_KEY = 'movieCatalogSidebarMode';

export const SIDEBAR_MODES = Object.freeze({
  FULL: 'full',
  PARTIAL: 'partial',
  HIDDEN: 'hidden'
});

const MODE_CYCLE = [
  SIDEBAR_MODES.FULL,
  SIDEBAR_MODES.PARTIAL,
  SIDEBAR_MODES.HIDDEN
];

export function readStoredSidebarMode(storage = globalThis.localStorage) {
  try {
    const saved = storage?.getItem(SIDEBAR_STORAGE_KEY);
    if (saved && Object.values(SIDEBAR_MODES).includes(saved)) {
      return saved;
    }
  } catch {
    /* storage unavailable */
  }
  return SIDEBAR_MODES.FULL;
}

export function writeStoredSidebarMode(storage = globalThis.localStorage, mode) {
  try {
    storage?.setItem(SIDEBAR_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Initialize the left sidebar controls and floating edge toggle.
 *
 * @param {Document|Element} root
 * @param {Storage} storage
 * @param {(mode: string) => void} [onChange]
 * @returns {{getMode: () => string, setMode: (mode: string) => void, cycleMode: () => void}|null}
 */
export function initSidebar(
  root = document,
  storage = globalThis.localStorage,
  onChange = null
) {
  const sidebar = root?.getElementById?.('app-sidebar');
  const edgeToggle = root?.getElementById?.('sidebar-edge-toggle');
  const headerExpandBtn = root?.getElementById?.('sidebar-header-expand-btn');
  const modeButtons = root?.querySelectorAll?.('[data-sidebar-mode]') || [];
  const html = root?.documentElement ?? null;

  if (!sidebar && !edgeToggle && !html) return null;

  let currentMode = readStoredSidebarMode(storage);

  function applyMode(mode, notify = true) {
    if (!Object.values(SIDEBAR_MODES).includes(mode)) return;
    currentMode = mode;

    if (html) {
      html.classList.remove(
        'sidebar-mode-full',
        'sidebar-mode-partial',
        'sidebar-mode-hidden'
      );
      html.classList.add(`sidebar-mode-${mode}`);
    }

    if (sidebar) {
      sidebar.classList.remove(
        'sidebar-full',
        'sidebar-partial',
        'sidebar-hidden',
        'sidebar-mode-full',
        'sidebar-mode-partial',
        'sidebar-mode-hidden'
      );
      sidebar.classList.add(`sidebar-${mode}`);
      sidebar.classList.add(`sidebar-mode-${mode}`);
      sidebar.setAttribute('aria-hidden', String(mode === SIDEBAR_MODES.HIDDEN));
    }

    if (edgeToggle) {
      edgeToggle.setAttribute('data-mode', mode);
      edgeToggle.setAttribute('aria-expanded', String(mode !== SIDEBAR_MODES.HIDDEN));

      let nextModeLabel = '';
      let edgeIconClass = '';
      if (mode === SIDEBAR_MODES.FULL) {
        nextModeLabel = 'Collapse sidebar to icons';
        edgeIconClass = 'fa-solid fa-chevron-left';
      } else if (mode === SIDEBAR_MODES.PARTIAL) {
        nextModeLabel = 'Hide sidebar';
        edgeIconClass = 'fa-solid fa-angles-left';
      } else {
        nextModeLabel = 'Expand sidebar';
        edgeIconClass = 'fa-solid fa-chevron-right';
      }

      edgeToggle.title = nextModeLabel;
      edgeToggle.setAttribute('aria-label', nextModeLabel);

      const icon = edgeToggle.querySelector('i');
      if (icon) {
        icon.className = edgeIconClass;
      }
    }

    modeButtons.forEach(btn => {
      const active = btn.dataset.sidebarMode === mode;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    writeStoredSidebarMode(storage, mode);

    if (notify && typeof onChange === 'function') {
      onChange(mode);
    }
  }

  function cycleNextMode() {
    const currentIndex = MODE_CYCLE.indexOf(currentMode);
    const nextIndex = (currentIndex + 1) % MODE_CYCLE.length;
    applyMode(MODE_CYCLE[nextIndex]);
  }

  if (edgeToggle) {
    edgeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      cycleNextMode();
    });
  }

  if (headerExpandBtn) {
    headerExpandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      applyMode(SIDEBAR_MODES.FULL);
    });
  }

  modeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetMode = btn.dataset.sidebarMode;
      if (targetMode) applyMode(targetMode);
    });
  });

  // Apply initial mode
  applyMode(currentMode, false);

  return Object.freeze({
    getMode: () => currentMode,
    setMode: mode => applyMode(mode),
    cycleMode: () => cycleNextMode()
  });
}
