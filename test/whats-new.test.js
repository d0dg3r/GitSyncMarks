import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  getWhatsNewContent,
  shouldDisplayWhatsNew,
} from '../lib/whats-new.js';

describe('whats-new', () => {
  it('getWhatsNewContent returns bullets for 2.7.0', () => {
    const c = getWhatsNewContent('2.7.0');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.length >= 3);
  });

  it('getWhatsNewContent returns null for unknown version', () => {
    assert.strictEqual(getWhatsNewContent('0.0.0'), null);
  });

  it('shouldDisplayWhatsNew matches pending to manifest and content', () => {
    assert.strictEqual(shouldDisplayWhatsNew('2.7.0', '2.7.0'), true);
    assert.strictEqual(shouldDisplayWhatsNew('2.7.0', '2.6.0'), false);
    assert.strictEqual(shouldDisplayWhatsNew(null, '2.7.0'), false);
    assert.strictEqual(shouldDisplayWhatsNew('', '2.7.0'), false);
  });
});
