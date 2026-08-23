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

describe('no dynamic import in service worker graph', () => {
  it('background.js has no import()', () => {
    const src = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
    assert.equal(/(?<!\/\/.*)\bimport\s*\(/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  });

  it('lib/**/*.js has no import()', () => {
    const libDir = path.join(ROOT, 'lib');
    const files = listJsFiles(libDir);
    const offenders = [];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      if (/\bimport\s*\(/.test(src)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    assert.deepEqual(offenders, []);
  });
});
