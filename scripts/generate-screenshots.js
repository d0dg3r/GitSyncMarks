#!/usr/bin/env node
/**
 * Generate store screenshots for Chrome Web Store and Firefox AMO.
 * Requires: npm run build:chrome first (build/chrome/ must exist).
 * Uses Playwright to launch Chromium with the extension loaded.
 *
 * Each screenshot shows light and dark mode side by side (1280x800 total).
 * Output: store-assets/{en,de,fr,es,pt_BR,it,ja,zh_CN,ko,ru,tr,pl}/chrome-*.png and firefox-*.png (Firefox copied from Chrome)
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

const LANGUAGES = [
  { code: 'en' }, { code: 'de' }, { code: 'fr' }, { code: 'es' },
  { code: 'pt_BR' }, { code: 'it' }, { code: 'ja' }, { code: 'zh_CN' },
  { code: 'ko' }, { code: 'ru' }, { code: 'tr' }, { code: 'pl' },
];

const OPTIONS_TABS = [
  { id: 'github', subtab: 'github-connection', file: '1-connection' },
  { id: 'github', subtab: 'github-sync', file: '2-sync' },
  { id: 'menu', subtab: 'menu-items', file: '3-menu' },
  { id: 'linkwarden', subtab: 'linkwarden-general', file: '4-linkwarden' },
  { id: 'files', subtab: 'files-history', file: '5-history', injectHistory: true },
];

const FIREFOX_FILES = ['1-connection', '2-sync', '3-menu', '4-linkwarden', '5-history', '6-search', '7-popup', '8-linkwarden-save', '9-wizard-welcome', '10-wizard-token', '11-wizard-repo'];

const WIZARD_STEPS_FOR_SCREENSHOTS = [
  { step: 0, file: '9-wizard-welcome' },
  { step: 1, file: '10-wizard-token' },
  { step: 5, file: '11-wizard-repo' },
];

const HISTORY_DEMO_HTML = `
<div class="history-list-header">
  <span class="history-col-head history-col-date">Date</span>
  <span class="history-col-head history-col-commit">Commit</span>
  <span class="history-col-head history-col-client">Client</span>
  <span class="history-col-head history-col-actions"><span class="sr-only">Actions</span></span>
</div>
<div class="history-item-wrap" style="border-bottom:1px solid var(--color-border-secondary)">
  <div class="history-item">
    <span class="history-date">3/28/2026, 2:14:30 PM</span>
    <code class="history-sha">a3f8c12</code>
    <span class="history-msg" title="Bookmark sync from 3a9b2ca8 — push (3 changes)">3a9b2ca8</span>
    <span class="history-current" title="current">
      <span class="history-current-icon"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 12 2 2 4-4"/></svg></span>
      <span class="history-current-label">current</span>
    </span>
  </div>
</div>
<div class="history-item-wrap" style="border-bottom:1px solid var(--color-border-secondary)">
  <div class="history-item">
    <span class="history-date">3/28/2026, 10:05:12 AM</span>
    <code class="history-sha">e7b4d09</code>
    <span class="history-msg" title="Bookmark sync from f1c92e45 — merge (1 change)">f1c92e45</span>
    <div class="history-item-actions">
      <button type="button" class="btn btn-secondary btn-sm history-icon-btn"><span class="history-btn-icon-inner"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span></button>
      <button type="button" class="btn btn-primary btn-sm history-icon-btn"><span class="history-btn-icon-inner"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span></button>
    </div>
  </div>
</div>
<div class="history-item-wrap">
  <div class="history-item">
    <span class="history-date">3/27/2026, 5:42:08 PM</span>
    <code class="history-sha">1d9fe3a</code>
    <span class="history-msg" title="Bookmark sync from 3a9b2ca8 — push (7 changes)">3a9b2ca8</span>
    <div class="history-item-actions">
      <button type="button" class="btn btn-secondary btn-sm history-icon-btn"><span class="history-btn-icon-inner"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span></button>
      <button type="button" class="btn btn-primary btn-sm history-icon-btn"><span class="history-btn-icon-inner"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></span></button>
    </div>
  </div>
</div>
`;

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

/** Popup composite (crop): rect centered, linke Hälften light|dark zusammensetzen. */
async function compositePopupLightDarkCrop(lightBuffer, darkBuffer, outPath, cropLeft = 0) {
  const halfWidth = VIEWPORT.width / 2;

  const [lightLeft, darkLeft] = await Promise.all([
    sharp(lightBuffer).extract({ left: cropLeft, top: 0, width: halfWidth, height: VIEWPORT.height }).toBuffer(),
    sharp(darkBuffer).extract({ left: cropLeft, top: 0, width: halfWidth, height: VIEWPORT.height }).toBuffer(),
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

  const OLD_FILES = [
    'github', 'synchronization', 'backup', 'automation', 'help', 'about', 'popup',
    '1-github', '2-synchronization', '3-backup', '4-automation', '5-help', '6-about', '7-popup',
    '2-connection', '3-sync', '4-files', '5-export-import', '6-popup', '7-wizard-welcome', '8-wizard-token', '9-wizard-repo',
    '1-connection', '3-menu', '4-linkwarden', '5-search', '6-popup', '7-linkwarden-save', '8-wizard-welcome', '9-wizard-token', '10-wizard-repo'
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
    const wizard = page.locator('#onboarding-wizard-screen');
    if (await wizard.isVisible()) {
      await page.locator('#onboarding-wizard-skip-btn').click();
      await page.waitForTimeout(500);
    }
    await page.locator('#language-select option[value="' + code + '"]').waitFor({ state: 'attached', timeout: 10000 });

    await page.locator('#language-select').selectOption(code);
    await page.waitForTimeout(600);

    for (const { id, subtab, file, injectHistory } of OPTIONS_TABS) {
      const tabBtn = page.locator(`.tab-btn[data-tab="${id}"]`);
      await tabBtn.waitFor({ state: 'attached', timeout: 5000 });
      await tabBtn.click({ force: true });
      await page.waitForTimeout(300);

      if (id === 'linkwarden') {
        const lwCb = page.locator('#linkwarden-enabled');
        if (!(await lwCb.isChecked())) {
          await lwCb.evaluate(node => node.click());
          await page.waitForTimeout(300);
        }
      }

      if (subtab) {
        const subTabBtn = page.locator(`.sub-tab-btn[data-subtab="${subtab}"]`);
        await subTabBtn.waitFor({ state: 'attached', timeout: 5000 });
        await subTabBtn.click({ force: true });
        await page.waitForTimeout(300);
      }

      if (injectHistory) {
        await page.evaluate((html) => {
          const list = document.getElementById('history-list');
          if (list) { list.style.display = ''; list.innerHTML = html; }
        }, HISTORY_DEMO_HTML);
        await page.waitForTimeout(200);
      }

      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      await page.waitForTimeout(200);
      const lightBuf = await page.screenshot();

      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.waitForTimeout(200);
      const darkBuf = await page.screenshot();

      const outPath = path.join(langDir, `chrome-${file}.png`);
      await compositeLightDark(lightBuf, darkBuf, outPath);
      console.log('  ', `${code}/chrome-${file}.png (light | dark)`);
    }
    await page.close();

    console.log(`\nChrome (${code.toUpperCase()}) search:`);
    const searchUrl = `chrome-extension://${extensionId}/search.html`;
    const searchPage = await context.newPage();
    await searchPage.addInitScript(() => {
      document.documentElement.style.cssText = 'display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f7;';
      document.body.style.cssText = 'margin:0;width:100%;';
    });
    await searchPage.goto(searchUrl);
    await searchPage.setViewportSize(VIEWPORT);
    await searchPage.waitForLoadState('networkidle');
    await searchPage.waitForTimeout(code === 'en' ? 300 : 500);

    // Inject fake results for the screenshot
    await searchPage.evaluate(() => {
      document.getElementById('search-input').value = 'git';
      document.getElementById('search-clear-btn').classList.remove('hidden');
      document.getElementById('search-status').textContent = '2 results found';
      document.getElementById('search-status').className = 'search-status success';
      document.getElementById('search-results').innerHTML = `
        <li class="search-result-item">
          <div class="search-result-info">
            <div class="search-result-title"><mark>Git</mark>Hub</div>
            <div class="search-result-url">https://<mark>git</mark>hub.com</div>
          </div>
          <button type="button" class="search-open-btn">Open</button>
        </li>
        <li class="search-result-item">
          <div class="search-result-info">
            <div class="search-result-title"><mark>Git</mark>SyncMarks</div>
            <div class="search-result-url">https://<mark>git</mark>syncmarks.com</div>
          </div>
          <button type="button" class="search-open-btn">Open</button>
        </li>
      `;
    });

    await searchPage.evaluate(() => document.documentElement.classList.remove('dark'));
    await searchPage.waitForTimeout(150);
    const searchLightBuf = await searchPage.screenshot();

    await searchPage.evaluate(() => document.documentElement.classList.add('dark'));
    await searchPage.waitForTimeout(150);
    const searchDarkBuf = await searchPage.screenshot();

    const centerLeft = Math.floor((VIEWPORT.width - (VIEWPORT.width / 2)) / 2); // 320

    const searchPath = path.join(langDir, 'chrome-6-search.png');
    await compositePopupLightDarkCrop(searchLightBuf, searchDarkBuf, searchPath, centerLeft);
    console.log('  ', `${code}/chrome-6-search.png (light | dark)`);
    await searchPage.close();

    console.log(`\nChrome (${code.toUpperCase()}) popup:`);
    const popupPage = await context.newPage();
    await popupPage.addInitScript(() => {
      // Force demo mode and clean state for screenshots
      document.documentElement.style.cssText = 'background:#f5f5f7;';
      document.body.style.cssText = 'width:360px;margin:0;';
      
      // Override any error states and ensure "Synced" is shown
      const style = document.createElement('style');
      style.textContent = '.status-error { background: transparent !important; padding: 0 !important; }';
      document.head.appendChild(style);
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

    const popupPath = path.join(langDir, 'chrome-7-popup.png');
    await compositePopupLightDarkCrop(popupLightBuf, popupDarkBuf, popupPath, 0); // Left-aligned crop
    console.log('  ', `${code}/chrome-7-popup.png (light | dark)`);
    await popupPage.close();

    console.log(`\nChrome (${code.toUpperCase()}) linkwarden save:`);
    const lwSaveUrl = `chrome-extension://${extensionId}/linkwarden-save.html?demo=1`;
    const lwSavePage = await context.newPage();
    await lwSavePage.addInitScript(() => {
      document.documentElement.style.cssText = 'display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f7;';
      document.body.style.cssText = 'width:480px;margin:0;flex-shrink:0;';
    });
    await lwSavePage.goto(lwSaveUrl);
    await lwSavePage.setViewportSize(VIEWPORT);
    await lwSavePage.waitForLoadState('networkidle');
    await lwSavePage.waitForTimeout(code === 'en' ? 300 : 500);

    // Mock some data if needed
    await lwSavePage.evaluate(() => {
      document.getElementById('lw-url').value = 'https://github.com/d0dg3r/GitSyncMarks';
      document.getElementById('lw-title').value = 'd0dg3r/GitSyncMarks';
      document.getElementById('lw-description').value = 'Synchronize your bookmarks using a GitHub repository.';
      document.getElementById('lw-collection').innerHTML = '<option value="">Unorganized</option><option value="1" selected>Tools</option>';
      document.getElementById('lw-tag-chips').innerHTML = '<div class="lw-tag-chip">github <button class="lw-tag-chip-remove">×</button></div><div class="lw-tag-chip">bookmarks <button class="lw-tag-chip-remove">×</button></div>';
      document.getElementById('lw-screenshot').checked = true;
    });

    await lwSavePage.evaluate(() => document.documentElement.classList.remove('dark'));
    await lwSavePage.waitForTimeout(150);
    const lwSaveLightBuf = await lwSavePage.screenshot();

    await lwSavePage.evaluate(() => document.documentElement.classList.add('dark'));
    await lwSavePage.waitForTimeout(150);
    const lwSaveDarkBuf = await lwSavePage.screenshot();

    const lwSavePath = path.join(langDir, 'chrome-8-linkwarden-save.png');
    await compositePopupLightDarkCrop(lwSaveLightBuf, lwSaveDarkBuf, lwSavePath, centerLeft);
    console.log('  ', `${code}/chrome-8-linkwarden-save.png (light | dark)`);
    await lwSavePage.close();

    console.log(`\nChrome (${code.toUpperCase()}) wizard:`);
    for (const { step, file } of WIZARD_STEPS_FOR_SCREENSHOTS) {
      const wizardPage = await context.newPage();
      await wizardPage.goto(optionsUrl + '?screenshot=wizard&step=' + step);
      await wizardPage.setViewportSize(VIEWPORT);
      await wizardPage.waitForLoadState('networkidle');
      await wizardPage.locator('#onboarding-wizard-screen').waitFor({ state: 'visible', timeout: 5000 });
      await wizardPage.locator('#language-select option[value="' + code + '"]').waitFor({ state: 'attached', timeout: 10000 });
      await wizardPage.locator('#language-select').selectOption(code);
      await wizardPage.waitForTimeout(600);

      await wizardPage.evaluate(() => document.documentElement.classList.remove('dark'));
      await wizardPage.waitForTimeout(200);
      const lightBuf = await wizardPage.screenshot();

      await wizardPage.evaluate(() => document.documentElement.classList.add('dark'));
      await wizardPage.waitForTimeout(200);
      const darkBuf = await wizardPage.screenshot();

      const outPath = path.join(langDir, `chrome-${file}.png`);
      await compositeLightDark(lightBuf, darkBuf, outPath);
      console.log('  ', `${code}/chrome-${file}.png (light | dark)`);
      await wizardPage.close();
    }
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
  console.log('\nDone. Screenshots in store-assets/{en,de,fr,es,pt_BR,it,ja,zh_CN,ko,ru,tr,pl}/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
