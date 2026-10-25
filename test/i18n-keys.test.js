import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const EN = JSON.parse(readFileSync(join(ROOT, '_locales/en/messages.json'), 'utf8'));

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'build', 'tmp', '_site', 'test'].includes(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (['.js', '.html'].includes(extname(name)) && name !== 'i18n.js') acc.push(full);
  }
  return acc;
}

function extractUsedKeys(source) {
  const keys = new Set();
  const getMessage = source.matchAll(/getMessage\(\s*['"]([a-zA-Z0-9_]+)['"]/g);
  for (const m of getMessage) keys.add(m[1]);
  const dataI18n = source.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria-label)?=["']([a-zA-Z0-9_]+)["']/g);
  for (const m of dataI18n) keys.add(m[1]);
  const dataset = source.matchAll(/dataset\.i18n\s*=\s*['"]([a-zA-Z0-9_]+)['"]/g);
  for (const m of dataset) keys.add(m[1]);
  return keys;
}

describe('i18n key coverage', () => {
  it('every literal getMessage / data-i18n key exists in en', () => {
    const files = walk(ROOT);
    const missing = [];
    const used = new Set();
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const key of extractUsedKeys(src)) {
        used.add(key);
        if (!(key in EN)) missing.push(`${key} (${file.replace(ROOT + '/', '')})`);
      }
    }
    assert.deepEqual(missing, []);
    const unused = Object.keys(EN).filter((k) => !used.has(k) && !k.startsWith('ext') && !k.includes('${'));
    if (unused.length) {
      console.log(`i18n unused keys (info): ${unused.length}`);
    }
  });
});
