function getErrorContainer() {
  let container = document.getElementById('api-error-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'api-error-container';
    container.className = 'api-error-container';
    document.body.appendChild(container);
  }

  return container;
}

export function clearError(scope = 'global') {
  const banner = document.querySelector(
    `.api-error[data-error-scope="${CSS.escape(scope)}"]`
  );

  banner?.remove();
}

export function showError(
  message,
  { scope = 'global', retry = null } = {}
) {
  clearError(scope);

  const banner = document.createElement('div');
  banner.className = 'api-error';
  banner.dataset.errorScope = scope;
  banner.setAttribute('role', 'alert');

  const icon = document.createElement('span');
  icon.className = 'api-error-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⚠️';

  const text = document.createElement('span');
  text.className = 'api-error-message';
  text.textContent = String(message || 'The request could not be completed');

  banner.append(icon, text);

  if (typeof retry === 'function') {
    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'api-error-retry';
    retryButton.textContent = 'Retry';
    retryButton.onclick = () => {
      retryButton.disabled = true;
      Promise.resolve()
        .then(() => retry())
        .catch(() => {
          retryButton.disabled = false;
        });
    };
    banner.appendChild(retryButton);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'api-error-close';
  closeButton.setAttribute('aria-label', 'Dismiss error');
  closeButton.textContent = '×';
  closeButton.onclick = () => clearError(scope);
  banner.appendChild(closeButton);

  getErrorContainer().appendChild(banner);
}
