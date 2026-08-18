// modal.utils.js

export function splitPath(filepath) {
    let path = '';
    let file = '';

    if (!filepath) return { path, file };

    const index = Math.max(
        filepath.lastIndexOf('/'),
        filepath.lastIndexOf('\\')
    );

    if (index !== -1) {
        path = filepath.slice(0, index);
        file = filepath.slice(index + 1);
    } else {
        file = filepath;
    }

    return { path, file };
}

export function createEl(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;

    if (text !== undefined && text !== null) {
        element.textContent = text;
    }

    return element;
}

export function setMultilineText(element, text) {
    if (!element) return;

    element.textContent = '';
    if (!text) return;

    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
        element.appendChild(document.createTextNode(line));

        if (index < lines.length - 1) {
            element.appendChild(document.createElement('br'));
        }
    });
}

export function appendKV(parent, label, id) {
    if (!parent) return;

    const key = createEl('div', 'k', label);
    const value = createEl('div', 'v');
    value.id = id;

    parent.append(key, value);
}

export function fillFields(root, map) {
    if (!root || !map) return;

    Object.entries(map).forEach(([id, value]) => {
        const element = root.querySelector(`#${id}`);

        if (element) {
            element.textContent = value ?? '';
        }
    });
}

export function setPoster(image, pictureName, basePath, fallback) {
    if (!image) return;

    if (!pictureName) {
        image.onerror = null;
        image.src = fallback;
        return;
    }

    image.onerror = () => {
        // Clear the handler first so a missing fallback cannot recurse.
        image.onerror = null;
        image.src = fallback;
    };

    image.src = `${basePath}/${encodeURIComponent(pictureName)}`;
}
