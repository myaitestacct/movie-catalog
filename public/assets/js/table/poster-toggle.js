// poster-toggle.js
// Mini-poster (row thumbnail) visibility for the movie table.
//
// Why this is not a column toggle:
//  - the thumbnails live inside the always-visible Title cell, so there is no
//    POSTER column to hide and nothing to add to state.columnVisibility;
//  - the toolbar chip therefore carries `data-ui` instead of `data-col`, and
//    columns.js never binds it (it only owns buttons with a data-col). The
//    bulk "Hide All"/"Show All" button *does* cover the thumbnails: it drives
//    them through the handle returned below, and reports back through
//    `onChange` so its own label stays correct when this chip is clicked
//    on its own;
//  - hiding is done with one class on <html> so it also applies to rows that
//    are rendered later (pagination, search, sort) without any extra work.
//
// Robustness notes:
//  - the button is looked up by id *or* by its data-ui contract, so moving the
//    chip around the toolbar cannot silently orphan it;
//  - the handler is assigned with `onclick` instead of addEventListener, and
//    the state is kept in this closure instead of being read back from the
//    class list. Either one alone is enough to keep a second initialization
//    from attaching a second handler, which would flip the class twice per
//    click and make the button look completely dead.

export const MINI_POSTER_STORAGE_KEY = 'movieCatalogMiniPoster';
export const HIDE_MINI_POSTERS_CLASS = 'hide-mini-posters';

// id is canonical; data-ui keeps working if the chip is ever moved or renamed.
export const MINI_POSTER_BUTTON_SELECTOR =
  '#toggle-mini-poster, [data-ui="miniPoster"]';

function readStoredVisibility(storage) {
  try {
    const saved = storage?.getItem(MINI_POSTER_STORAGE_KEY);

    if (saved === 'show' || saved === 'hide') {
      return saved === 'show';
    }
  } catch {
    /* storage unavailable — fall back to the default */
  }

  // Posters are part of the default table layout.
  return true;
}

function writeStoredVisibility(storage, visible) {
  try {
    storage?.setItem(
      MINI_POSTER_STORAGE_KEY,
      visible ? 'show' : 'hide'
    );
  } catch {
    /* storage unavailable — keep the in-memory value */
  }
}

/**
 * Wire the "Poster" toolbar chip to the mini-poster visibility class.
 *
 * @param {Document|Element} root element the chip is looked up in
 * @param {Storage} storage preference store (localStorage in the browser)
 * @param {(visible: boolean) => void} [onChange] called after the visibility
 *   changes through a click or through the returned handle, so other toolbar
 *   controls can re-sync. Not called for the initial application of the stored
 *   preference, which happens before the rest of the toolbar exists.
 * @returns {{visible: boolean, show: Function, hide: Function, toggle: Function}|null}
 */
export function initMiniPosterToggle(
  root = document,
  storage = globalThis.localStorage,
  onChange = null
) {
  const button =
    root?.querySelector?.(MINI_POSTER_BUTTON_SELECTOR) ?? null;

  const html =
    root?.documentElement ??
    root?.ownerDocument?.documentElement ??
    null;

  if (!button && !html) return null;

  let visible = readStoredVisibility(storage);

  function syncButton() {
    if (!button) return;

    button.classList.toggle('active', visible);
    button.setAttribute('aria-pressed', String(visible));
  }

  function apply(notify = false) {
    // Ancestor class => also covers rows rendered after this call.
    html?.classList.toggle(HIDE_MINI_POSTERS_CLASS, !visible);

    syncButton();
    writeStoredVisibility(storage, visible);

    if (notify) {
      onChange?.(visible);
    }
  }

  apply();

  if (button) {
    button.onclick = () => {
      visible = !visible;
      apply(true);
    };
  }

  return Object.freeze({
    get visible() {
      return visible;
    },

    show() {
      visible = true;
      apply(true);
    },

    hide() {
      visible = false;
      apply(true);
    },

    toggle() {
      visible = !visible;
      apply(true);
    }
  });
}
