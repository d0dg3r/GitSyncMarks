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

  it('getWhatsNewContent returns bullets for 3.0.4', () => {
    const c = getWhatsNewContent('3.0.4');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.some((b) => b.includes('Onboarding wizard')));
  });

  it('getWhatsNewContent returns bullets for 3.0.3', () => {
    const c = getWhatsNewContent('3.0.3');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.length >= 1);
    assert.ok(c.bullets.some((b) => b.includes('Multi-provider')));
  });

  it('getWhatsNewContent returns bullets for 2.8.0', () => {
    const c = getWhatsNewContent('2.8.0');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.length >= 1);
  });

  it('getWhatsNewContent returns bullets for 2.7.3', () => {
    const c = getWhatsNewContent('2.7.3');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.length >= 1);
  });

  it('getWhatsNewContent returns bullets for 2.7.2', () => {
    const c = getWhatsNewContent('2.7.2');
    assert.ok(c);
    assert.ok(Array.isArray(c.bullets));
    assert.ok(c.bullets.length >= 1);
  });

  it('getWhatsNewContent returns null for unknown version', () => {
    assert.strictEqual(getWhatsNewContent('0.0.0'), null);
  });

  it('shouldDisplayWhatsNew matches pending to manifest and content', () => {
    assert.strictEqual(shouldDisplayWhatsNew('2.7.0', '2.7.0'), true);
    assert.strictEqual(shouldDisplayWhatsNew('3.0.3', '3.0.3'), true);
    assert.strictEqual(shouldDisplayWhatsNew('2.8.0', '2.8.0'), true);
    assert.strictEqual(shouldDisplayWhatsNew('2.7.3', '2.7.3'), true);
    assert.strictEqual(shouldDisplayWhatsNew('2.7.2', '2.7.2'), true);
    assert.strictEqual(shouldDisplayWhatsNew('2.7.0', '2.6.0'), false);
    assert.strictEqual(shouldDisplayWhatsNew(null, '2.7.0'), false);
    assert.strictEqual(shouldDisplayWhatsNew('', '2.7.0'), false);
  });
});
