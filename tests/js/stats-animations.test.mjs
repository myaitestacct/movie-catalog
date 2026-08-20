import test from 'node:test';
import assert from 'node:assert/strict';

import {
  animateBytes,
  animateMetric,
  animateNumber
} from '../../movie-catalog/public/assets/js/stats/stats-animations.js';

const originalMatchMedia = globalThis.matchMedia;

test.beforeEach(() => {
  globalThis.matchMedia = () => ({ matches: true });
});

test.after(() => {
  if (originalMatchMedia === undefined) {
    delete globalThis.matchMedia;
  } else {
    globalThis.matchMedia = originalMatchMedia;
  }
});

test('metric animation formats decimals and suffixes', () => {
  const element = { textContent: '' };

  animateMetric(element, 8.27, {
    decimals: 1,
    suffix: '/10'
  });

  assert.equal(element.textContent, '8.3/10');
});

test('number animation formats collection counts', () => {
  const element = { textContent: '' };

  animateNumber(element, 1234);

  assert.equal(element.textContent, (1234).toLocaleString());
});

test('byte animation retains the shared byte formatter', () => {
  const element = { textContent: '' };

  animateBytes(element, 1024);

  assert.equal(element.textContent, '1.00 KB');
});

test('reduced-motion rendering does not request an animation frame', () => {
  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => {
    throw new Error('requestAnimationFrame should not be called');
  };

  try {
    const element = { textContent: '' };
    animateMetric(element, 92, { suffix: '/100' });
    assert.equal(element.textContent, '92/100');
  } finally {
    if (originalRequestAnimationFrame === undefined) {
      delete globalThis.requestAnimationFrame;
    } else {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    }
  }
});
