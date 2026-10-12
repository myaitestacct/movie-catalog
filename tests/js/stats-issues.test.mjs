import test from 'node:test';
import assert from 'node:assert/strict';

import { LIBRARY_ISSUE_CONFIG } from '../../public/assets/js/stats/stats-issues.js';

test('library issue configuration exposes all clickable health lists', () => {
  assert.deepEqual(
    Object.keys(LIBRARY_ISSUE_CONFIG),
    ['missing-files', 'missing-posters', 'incomplete-metadata']
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-files'].cardId,
    'missing-files-card'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-files'].metricId,
    'missing-files'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-posters'].countField,
    'missing_posters'
  );
  assert.equal(
    LIBRARY_ISSUE_CONFIG['incomplete-metadata'].title,
    'Incomplete Metadata'
  );
});

test('every library issue list carries a title and an empty-state message', () => {
  Object.values(LIBRARY_ISSUE_CONFIG).forEach(config => {
    assert.ok(config.title.length > 0);
    assert.ok(config.emptyMessage.length > 0);
  });

  assert.equal(
    LIBRARY_ISSUE_CONFIG['missing-files'].emptyMessage,
    'No movies with missing files were found.'
  );
});
