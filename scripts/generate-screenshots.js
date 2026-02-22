#!/usr/bin/env node
/**
 * Generate store screenshots for Chrome Web Store and Firefox AMO.
 * Requires: npm run build:chrome first (build/chrome/ must exist).
 * Uses Playwright to launch Chromium with the extension loaded.
 *
 * Each screenshot shows light and dark mode side by side (1280x800 total).
 * Output: store-assets/{en,de,fr,es}/chrome-*.png and firefox-*.png (Firefox copied from Chrome)
 *
 * Usage: node scripts/generate-screenshots.js
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const EXTENSION_PATH = path.join(ROOT, 'build', 'chrome');
const STORE_ASSETS = path.join(ROOT, 'store-assets');
const VIEWPORT = { width: 1280, height: 800 };

const LANGUAGES = [{ code: 'en' }, { code: 'de' }, { code: 'fr' }, { code: 'es' }];

const OPTIONS_TABS = [
  { id: 'github', subtab: null, file: '1-github' },
  { id: 'github', subtab: 'github-connection', file: '2-connection' },
  { id: 'sync', subtab: null, file: '3-sync' },
  { id: 'files', subtab: null, file: '4-files' },
  { id: 'files', subtab: 'files-export-import', file: '5-export-import' },
];

const FIREFOX_FILES = ['1-github', '2-connection', '3-sync', '4-files', '5-export-import', '6-popup'];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

/** Composite light and dark screenshots side by side (640x800 each -> 1280x800). Default resize for full-width content. */
async function compositeLightDark(lightBuffer, darkBuffer, outPath) {
  const halfWidth = VIEWPORT.width / 2;
  const [lightResized, darkResized] = await Promise.all([
    sharp(lightBuffer).resize(halfWidth, VIEWPORT.height).toBuffer(),
    sharp(darkBuffer).resize(halfWidth, VIEWPORT.height).toBuffer(),
  ]);
  await sharp({
    create: { width: VIEWPORT.width, height: VIEWPORT.height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: lightResized, left: 0, top: 0 },
      { input: darkResized, left: halfWidth, top: 0 },
    ])
    .png()
    .toFile(outPath);
}

/** Popup composite (crop): rechte Hälfte wegschneiden (leer), linke Hälften light|dark zusammensetzen. */
async function compositePopupLightDarkCrop(lightBuffer, darkBuffer, outPath) {
  const halfWidth = VIEWPORT.width / 2;
  const [lightLeft, darkLeft] = await Promise.all([
    sharp(lightBuffer).extract({ left: 0, top: 0, width: halfWidth, height: VIEWPORT.height }).toBuffer(),
    sharp(darkBuffer).extract({ left: 0, top: 0, width: halfWidth, height: VIEWPORT.height }).toBuffer(),
  ]);
  await sharp({
    create: { width: VIEWPORT.width, height: VIEWPORT.height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: lightLeft, left: 0, top: 0 },
      { input: darkLeft, left: halfWidth, top: 0 },
    ])
    .png()
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(EXTENSION_PATH)) {
    console.error(
      `Extension not found at ${EXTENSION_PATH}. Run "npm run build:chrome" first.`
    );
    process.exit(1);
  }

  await ensureDir(STORE_ASSETS);

  // Remove old screenshot files from previous layouts
  const OLD_FILES = [
    'github', 'synchronization', 'backup', 'automation', 'help', 'about', 'popup',
    '1-github', '2-synchronization', '3-backup', '4-automation', '5-help', '6-about', '7-popup',
  ];
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

    for (const { id, subtab, file } of OPTIONS_TABS) {
      const tabBtn = page.locator(`.tab-btn[data-tab="${id}"]`);
      await tabBtn.click();
      await page.waitForTimeout(300);

      if (subtab) {
        const subTabBtn = page.locator(`.sub-tab-btn[data-subtab="${subtab}"]`);
        await subTabBtn.click();
        await page.waitForTimeout(300);
      }

      await page.evaluate(async (theme) => {
        await chrome.storage.sync.set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, 'light');
      await page.waitForTimeout(200);
      const lightBuf = await page.screenshot();

      await page.evaluate(async (theme) => {
        await chrome.storage.sync.set({ theme });
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }, 'dark');
      await page.waitForTimeout(200);
      const darkBuf = await page.screenshot();

      const outPath = path.join(langDir, `chrome-${file}.png`);
      await compositeLightDark(lightBuf, darkBuf, outPath);
      console.log('  ', `${code}/chrome-${file}.png (light | dark)`);
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

    await popupPage.evaluate(() => document.documentElement.classList.remove('dark'));
    await popupPage.waitForTimeout(150);
    const popupLightBuf = await popupPage.screenshot();

    await popupPage.evaluate(() => document.documentElement.classList.add('dark'));
    await popupPage.waitForTimeout(150);
    const popupDarkBuf = await popupPage.screenshot();

    const popupPath = path.join(langDir, 'chrome-6-popup.png');
    await compositePopupLightDarkCrop(popupLightBuf, popupDarkBuf, popupPath);
    console.log('  ', `${code}/chrome-6-popup.png (light | dark)`);
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
