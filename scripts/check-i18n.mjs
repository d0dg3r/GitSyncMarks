#!/usr/bin/env node
/**
 * i18n key check.
 *
 * Collects every message key the UI code uses (getMessage('…'), data-i18n attributes,
 * dataset.i18n = '…') and checks it against _locales/<lang>/messages.json.
 *  - A key used in code but missing from `en` is an error (the user sees the raw key).
 *  - A key missing from another locale is reported as a count; it falls back to English.
 * Dynamic keys (template strings) cannot be checked statically and are skipped.
 *
 * Usage: node scripts/check-i18n.mjs            (exit 1 on errors)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const localesDir = join(root, '_locales');

const SOURCE_DIRS = ['', 'lib', 'options'];
const SOURCE_EXT = /\.(js|mjs|html)$/;
const SKIP_DIRS = new Set(['node_modules', 'build', 'e2e', 'test', 'scripts', 'tmp', 'store-assets', 'docs']);

/** Patterns that carry a literal message key. */
const KEY_PATTERNS = [
  /getMessage\(\s*['"]([A-Za-z0-9_]+)['"]/g,
  /data-i18n[a-z-]*="([A-Za-z0-9_]+)"/g,
  /dataset\.i18n\s*=\s*['"]([A-Za-z0-9_]+)['"]/g,
];

function listSourceFiles() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    const abs = join(root, dir);
    for (const name of readdirSync(abs)) {
      if (SKIP_DIRS.has(name)) continue;
      const path = join(abs, name);
      if (statSync(path).isFile() && SOURCE_EXT.test(name)) files.push(path);
    }
  }
  return files;
}

/** Drops comment lines (JSDoc examples such as data-i18n="key" must not count as usage). */
function stripCommentLines(text) {
  return text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
}

function collectUsedKeys() {
  const used = new Map(); // key → first file that uses it
  for (const file of listSourceFiles()) {
    const text = stripCommentLines(readFileSync(file, 'utf8'));
    for (const pattern of KEY_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        if (!used.has(match[1])) used.set(match[1], relative(root, file));
      }
    }
  }
  return used;
}

function loadLocales() {
  const locales = new Map();
  for (const lang of readdirSync(localesDir)) {
    const file = join(localesDir, lang, 'messages.json');
    locales.set(lang, new Set(Object.keys(JSON.parse(readFileSync(file, 'utf8')))));
  }
  return locales;
}

const used = collectUsedKeys();
const locales = loadLocales();
const en = locales.get('en');

const errors = [];
for (const [key, file] of used) {
  if (!en.has(key)) errors.push(`${key}  (used in ${file}, missing from _locales/en)`);
}

const gaps = [];
for (const [lang, keys] of locales) {
  if (lang === 'en') continue;
  const missing = [...used.keys()].filter((key) => en.has(key) && !keys.has(key));
  if (missing.length) gaps.push(`${lang}: ${missing.length} key(s) fall back to English`);
}

console.log(`[i18n] ${used.size} key(s) used in code, ${locales.size} locale(s)`);
for (const gap of gaps) console.log(`[i18n] warning: ${gap}`);
if (errors.length) {
  console.error('[i18n] errors:');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('[i18n] ok: every key used in code exists in en');
