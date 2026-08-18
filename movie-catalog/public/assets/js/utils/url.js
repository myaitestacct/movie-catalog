export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value ?? ''));

    return ['http:', 'https:'].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function configureExternalLink(link, value) {
  if (!link) return false;

  const url = safeExternalUrl(value);

  if (!url) {
    link.removeAttribute('href');
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.setAttribute('aria-disabled', 'true');
    return false;
  }

  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.removeAttribute('aria-disabled');
  return true;
}
