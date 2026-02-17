#!/usr/bin/env node
/**
 * Generate store screenshots for Chrome Web Store and Firefox AMO.
 * Requires: npm run build:chrome first (build/chrome/ must exist).
 * Uses Playwright to launch Chromium with the extension loaded.
 *
 * Output: store-assets/{en,de,fr,es}/chrome-*.png and firefox-*.png (Firefox copied from Chrome)
 *
 * Usage: node scripts/generate-screenshots.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.join(ROOT, 'build', 'chrome');
const STORE_ASSETS = path.join(ROOT, 'store-assets');
const VIEWPORT = { width: 1280, height: 800 };

const LANGUAGES = [{ code: 'en' }, { code: 'de' }, { code: 'fr' }, { code: 'es' }];

const OPTIONS_TABS = [
  { id: 'github', file: '1-github' },
  { id: 'sync', file: '2-synchronization' },
  { id: 'backup', file: '3-backup' },
  { id: 'automation', file: '4-automation' },
  { id: 'help', file: '5-help' },
  { id: 'about', file: '6-about' },
];

const FIREFOX_FILES = ['1-github', '2-synchronization', '3-backup', '4-automation', '5-help', '6-about', '7-popup'];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function main() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error(
      `Extension not found at ${EXTENSION_PATH}. Run "npm run build:chrome" first.`
    );
    process.exit(1);
  }

  await ensureDir(STORE_ASSETS);

  // Remove old unnumbered screenshot files
  const OLD_FILES = ['github', 'synchronization', 'backup', 'automation', 'help', 'about', 'popup'];
  for (const code of LANGUAGES.map((l) => l.code)) {
    const langDir = path.join(STORE_ASSETS, code);
    if (fs.existsSync(langDir)) {
      for (const name of OLD_FILES) {
        const p = path.join(langDir, `chrome-${name}.png`);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        const fp = path.join(langDir, `firefox-${name}.png`);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    }
  }

  const userDataDir = path.join(os.tmpdir(), 'gitsyncmarks-screenshots-' + Date.now());
  const launchArgs = [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
  ];
  if (process.env.CI) {
    launchArgs.push('--no-sandbox', '--disable-dev-shm-usage');
  }
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: launchArgs,
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker', { timeout: 90000 });
  }
  const extensionId = serviceWorker.url().split('/')[2];
  console.log('Extension ID:', extensionId);

  const optionsUrl = `chrome-extension://${extensionId}/options.html`;
  const popupUrl = `chrome-extension://${extensionId}/popup.html?demo=1`;

  for (const { code } of LANGUAGES) {
    const langDir = path.join(STORE_ASSETS, code);
    await ensureDir(langDir);

    console.log(`\nChrome (${code.toUpperCase()}) options:`);
    const page = await context.newPage();
    await page.goto(optionsUrl);
    await page.setViewportSize(VIEWPORT);
    await page.waitForLoadState('networkidle');
    await page.locator('#language-select option[value="' + code + '"]').waitFor({ state: 'attached', timeout: 10000 });

    await page.locator('#language-select').selectOption(code);
    await page.waitForTimeout(600);

    for (const { id, file } of OPTIONS_TABS) {
      const tabBtn = page.locator(`.tab-btn[data-tab="${id}"]`);
      await tabBtn.click();
      await page.waitForTimeout(300);
      const outPath = path.join(langDir, `chrome-${file}.png`);
      await page.screenshot({ path: outPath });
      console.log('  ', `${code}/chrome-${file}.png`);
    }
    await page.close();

    console.log(`\nChrome (${code.toUpperCase()}) popup:`);
    const popupPage = await context.newPage();
    await popupPage.addInitScript(() => {
      document.body.style.cssText = 'display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f7;';
    });
    await popupPage.goto(popupUrl);
    await popupPage.setViewportSize(VIEWPORT);
    await popupPage.waitForLoadState('networkidle');
    await popupPage.waitForTimeout(code === 'en' ? 300 : 500);
    const popupPath = path.join(langDir, 'chrome-7-popup.png');
    await popupPage.screenshot({ path: popupPath });
    console.log('  ', `${code}/chrome-7-popup.png`);
    await popupPage.close();
  }

  // ---- Firefox: copy from Chrome (UI is identical, Playwright cannot load Firefox extension) ----
  console.log('\nFirefox (copy from Chrome):');
  for (const { code } of LANGUAGES) {
    const langDir = path.join(STORE_ASSETS, code);
    for (const file of FIREFOX_FILES) {
      const srcPath = path.join(langDir, `chrome-${file}.png`);
      const dstPath = path.join(langDir, `firefox-${file}.png`);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, dstPath);
        console.log('  ', `${code}/firefox-${file}.png`);
      }
    }
  }

  await context.close();
  console.log('\nDone. Screenshots in store-assets/en/, de/, fr/, es/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
