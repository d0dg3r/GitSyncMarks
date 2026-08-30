import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

function listJsFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listJsFiles(full, acc);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

/** Strip comments and string literals so copy mentioning import() does not false-positive. */
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

function hasDynamicImport(src) {
  return /\bimport\s*\(/.test(stripNoise(src));
}

describe('no dynamic import in service worker graph', () => {
  it('background.js has no import()', () => {
    const src = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
    assert.equal(hasDynamicImport(src), false);
  });

  it('lib/**/*.js has no import()', () => {
    const libDir = path.join(ROOT, 'lib');
    const files = listJsFiles(libDir);
    const offenders = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      if (hasDynamicImport(src)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(offenders, []);
  });
});
