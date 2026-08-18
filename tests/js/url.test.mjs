import test from 'node:test';
import assert from 'node:assert/strict';

import {
  configureExternalLink,
  safeExternalUrl
} from '../../movie-catalog/public/assets/js/utils/url.js';

class MockLink {
  constructor() {
    this.attributes = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
    delete this[name];
  }
}

test('only absolute HTTP and HTTPS links are accepted', () => {
  assert.equal(
    safeExternalUrl('https://www.imdb.com/title/tt0078748/'),
    'https://www.imdb.com/title/tt0078748/'
  );
  assert.equal(
    safeExternalUrl('http://www.imdb.com/title/tt0078748/'),
    'http://www.imdb.com/title/tt0078748/'
  );

  for (const value of [
    'javascript:alert(1)',
    'data:text/html,<h1>bad</h1>',
    '/relative/path',
    '',
    null
  ]) {
    assert.equal(safeExternalUrl(value), null);
  }
});

test('valid external links receive safe browser attributes', () => {
  const link = new MockLink();

  assert.equal(
    configureExternalLink(
      link,
      'https://www.imdb.com/title/tt0078748/'
    ),
    true
  );
  assert.equal(
    link.href,
    'https://www.imdb.com/title/tt0078748/'
  );
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noopener noreferrer');
  assert.equal(link.attributes.has('aria-disabled'), false);
});

test('invalid external links are disabled and old attributes removed', () => {
  const link = new MockLink();
  link.href = 'https://old.example/';
  link.target = '_blank';
  link.rel = 'opener';

  assert.equal(
    configureExternalLink(link, 'javascript:alert(1)'),
    false
  );
  assert.equal('href' in link, false);
  assert.equal('target' in link, false);
  assert.equal('rel' in link, false);
  assert.equal(link.attributes.get('aria-disabled'), 'true');
});
