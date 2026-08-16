// modal.utils.js

// -------------------------
// Utility: split full path into directory + file
// -------------------------
export function splitPath(filepath) {
    let path = '', file = '';
    if (!filepath) return { path, file };

    const i = Math.max(
        filepath.lastIndexOf('/'),
        filepath.lastIndexOf('\\')
    );

    if (i !== -1) {
        path = filepath.slice(0, i);
        file = filepath.slice(i + 1);
    } else {
        file = filepath;
    }

    return { path, file };
}

// -------------------------
// Utility: copy text to clipboard (with tooltip)
// -------------------------
export function copyText(text, btn) {
    if (!text || !btn) return;

    navigator.clipboard.writeText(text).then(() => {
        const tooltip = document.createElement('div');
        tooltip.className = 'copy-tooltip';
        tooltip.textContent = 'Copied!';
        document.body.appendChild(tooltip);

        const rect = btn.getBoundingClientRect();
        tooltip.style.top = rect.top - 30 + 'px';
        tooltip.style.left =
            rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';

        setTimeout(() => tooltip.remove(), 1200);
    });
}

// ----------------------------------------------
// Utility: copy text to clipboard (with tooltip)
// ----------------------------------------------
export function makeCopyField(container) {
    if (!container) return;
    const span = container.querySelector('span');
    const btn = container.querySelector('button');
    if (!span || !btn) return;

    btn.onclick = e => {
        e.stopPropagation();
        copyToClipboard(span.textContent, btn);
    };
}

// -------------------------
// Utility: create DOM element
// -------------------------
export function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) {
        el.textContent = text;
    }
    return el;
}

// -------------------------
// Utility: multiline text with <br>
// -------------------------
export function setMultilineText(el, text) {
    if (!el) return;

    el.textContent = '';
    if (!text) return;

    const lines = text.split(/\r?\n/);
    lines.forEach((line, i) => {
        el.appendChild(document.createTextNode(line));
        if (i < lines.length - 1) {
            el.appendChild(document.createElement('br'));
        }
    });
}

// -------------------------
// Utility: append key/value pair (SAFE)
// -------------------------
export function appendKV(parent, label, id) {
    if (!parent) return;

    const key = createEl('div', 'k', label);
    const value = createEl('div', 'v');
    value.id = id;

    parent.append(key, value);
}
// -------------------------
// Utility: populate modal fields by id map
// -------------------------
export function fillFields(root, map) {
    if (!root || !map) return;

    Object.entries(map).forEach(([id, value]) => {
        const el = root.querySelector('#' + id);
        if (!el) return;

        // If it's a copy field → use bindCopy
        if (el.querySelector('.copy-text')) {
            bindCopy(el, value, value);
        } else {
            el.textContent = value || '';
        }
    });
}

// -------------------------
// Utility: set poster src with fallback
// -------------------------
export function setPoster(imgEl, pictureName, basePath, fallback) {
    if (!imgEl) return;

    imgEl.src = pictureName
        ? `${basePath}/${encodeURIComponent(pictureName)}`
        : fallback;

    imgEl.onerror = () => {
        imgEl.src = fallback;
    };
}

// -------------------------
// Utility: bind file name + copy button
// -------------------------
export function bindCopy(container, displayText, copyTextValue) {
    if (!container) return;

    const textEl = container.querySelector('.copy-text');
    const btn = container.querySelector('.copy-btn');

    if (textEl) textEl.textContent = displayText || '';

    if (btn) {
        btn.onclick = e => copyText(copyTextValue ?? displayText, e.target);
    }
}