#!/usr/bin/env node
/**
 * Apply 3.0 missing locale keys and neutral-copy updates to all non-EN locales.
 * Run: node scripts/apply-3.0-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', '_locales');
const PATCHES_DIR = path.join(__dirname, 'locale-patches');

const LOCALES = ['de', 'fr', 'es', 'pt_BR', 'it', 'ja', 'zh_CN', 'ko', 'ru', 'tr', 'pl'];

for (const locale of LOCALES) {
  const patchPath = path.join(PATCHES_DIR, `${locale}.json`);
  if (!fs.existsSync(patchPath)) {
    console.error(`Missing patch file: ${patchPath}`);
    process.exit(1);
  }

  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
  const messagesPath = path.join(LOCALES_DIR, locale, 'messages.json');
  const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

  let added = 0;
  let updated = 0;
  for (const [key, message] of Object.entries(patch)) {
    if (messages[key]) {
      messages[key].message = message;
      updated++;
    } else {
      messages[key] = { message };
      added++;
    }
  }

  const sorted = Object.fromEntries(
    Object.keys(messages).sort().map((k) => [k, messages[k]])
  );
  fs.writeFileSync(messagesPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
  console.log(`${locale}: +${added} new, ~${updated} updated`);
}

const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en', 'messages.json'), 'utf8'));
for (const locale of LOCALES) {
  const messages = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, 'messages.json'), 'utf8'));
  const missing = Object.keys(en).filter((k) => !messages[k]);
  if (missing.length) {
    console.error(`${locale} still missing ${missing.length} keys:`, missing.slice(0, 5).join(', '), '...');
    process.exit(1);
  }
}
console.log('All locales complete.');
