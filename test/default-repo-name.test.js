import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_REPO_NAME } from '../lib/connection-settings.js';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('DEFAULT_REPO_NAME', () => {
  it('exports my-bookmarks as the default repository name', () => {
    assert.equal(DEFAULT_REPO_NAME, 'my-bookmarks');
  });

  it('prefills Connection and wizard repo inputs in options.html', () => {
    const html = fs.readFileSync(path.join(ROOT, 'options.html'), 'utf8');
    for (const id of ['repo', 'onboarding-wizard-repo']) {
      const match = html.match(new RegExp(`<input[^>]*\\bid="${id}"[^>]*>`));
      assert.ok(match, `missing input #${id}`);
      assert.match(
        match[0],
        new RegExp(`\\bvalue="${DEFAULT_REPO_NAME}"`),
        `#${id} must have a real default value, not only a placeholder (#267)`
      );
    }
  });
});
