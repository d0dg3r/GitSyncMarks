import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { messageForHttp409 } from '../lib/providers/github-api.js';

describe('messageForHttp409', () => {
  it('maps empty-repository messages to api_repoEmpty (key fallback without i18n init)', () => {
    assert.equal(messageForHttp409('Git Repository is empty.'), 'api_repoEmpty');
    assert.equal(messageForHttp409('Repository is empty'), 'api_repoEmpty');
    assert.equal(messageForHttp409('EMPTY REPO'), 'api_repoEmpty');
  });

  it('maps other 409 messages to api_conflict', () => {
    assert.equal(messageForHttp409('Something was modified in the meantime'), 'api_conflict');
    assert.equal(messageForHttp409(''), 'api_conflict');
    assert.equal(messageForHttp409(null), 'api_conflict');
    assert.equal(messageForHttp409(undefined), 'api_conflict');
  });
});
