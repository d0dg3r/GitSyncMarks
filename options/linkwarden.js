/**
 * Options Page – Linkwarden Tab
 * Manages Linkwarden integration settings, tag picker, connection test,
 * and debug log export.
 */

import { getMessage, applyI18n } from '../lib/i18n.js';
import { updateLinkwardenCollectionsFolder } from '../lib/linkwarden-sync.js';
import { LinkwardenAPI } from '../lib/linkwarden-api.js';
import { decryptToken } from '../lib/crypto.js';
import { isDebugLogEnabled, setDebugLogEnabled } from '../lib/debug-log.js';

// ---- Module-level state ----
let lwOptionsSelectedTags = [];
let lwOptionsAllTags = [];

export function getLwOptionsSelectedTags() { return lwOptionsSelectedTags; }
export function setLwOptionsSelectedTags(tags) { lwOptionsSelectedTags = tags; }
export function setLwOptionsAllTags(tags) { lwOptionsAllTags = tags; }

// ---- Callbacks injected by initLinkwarden ----
let _saveSettings = null;
let _downloadFile = null;

// ---- DOM element lookups ----
const linkwardenEnabledInput = document.getElementById('linkwarden-enabled');
const linkwardenSubtabBar = document.getElementById('linkwarden-subtab-bar');
const linkwardenSettingsGroup = document.getElementById('linkwarden-settings');
const linkwardenUrlInput = document.getElementById('linkwarden-url');
const linkwardenTokenInput = document.getElementById('linkwarden-token');
const toggleLinkwardenTokenBtn = document.getElementById('toggle-linkwarden-token');
const linkwardenDefaultCollectionSelect = document.getElementById('linkwarden-default-collection');
const lwOptionsTagChips = document.getElementById('lw-options-tag-chips');
const lwOptionsTagInput = document.getElementById('lw-options-tag-input');
const lwOptionsTagCloud = document.getElementById('lw-options-tag-cloud');
const linkwardenDefaultScreenshotInput = document.getElementById('linkwarden-default-screenshot');
const linkwardenSyncEnabledInput = document.getElementById('linkwarden-sync-enabled');
const linkwardenSyncOptions = document.getElementById('linkwarden-sync-options');
const linkwardenSyncParentSelect = document.getElementById('linkwarden-sync-parent');
const linkwardenSyncPushToGitInput = document.getElementById('linkwarden-sync-push-to-git');
const linkwardenSyncEnabledGroup = document.getElementById('linkwarden-sync-enabled-group');
const linkwardenSyncDisabledMsg = document.getElementById('linkwarden-sync-disabled-msg');
const linkwardenSyncRefreshBtn = document.getElementById('linkwarden-sync-refresh-btn');
const linkwardenSyncSpinner = document.getElementById('linkwarden-sync-spinner');
const linkwardenSyncResult = document.getElementById('linkwarden-sync-result');
const linkwardenTestBtn = document.getElementById('linkwarden-test-btn');
const linkwardenTestSpinner = document.getElementById('linkwarden-test-spinner');
const linkwardenTestResult = document.getElementById('linkwarden-test-result');
const debugLogEnabledInput = document.getElementById('debug-log-enabled');
const debugLogExportBtn = document.getElementById('debug-log-export-btn');
const debugLogResult = document.getElementById('debug-log-result');

// ---- Tag picker functions ----

function lwOptionsAddTag(name) {
  const n = name.trim();
  if (!n || lwOptionsSelectedTags.includes(n)) return;
  lwOptionsSelectedTags.push(n);
  renderLwOptionsTagChips();
  renderLwOptionsTagCloud();
  lwOptionsTagInput.value = '';
  _saveSettings();
}

function lwOptionsRemoveTag(name) {
  lwOptionsSelectedTags = lwOptionsSelectedTags.filter(t => t !== name);
  renderLwOptionsTagChips();
  renderLwOptionsTagCloud();
  _saveSettings();
}

export function renderLwOptionsTagChips() {
  lwOptionsTagChips.innerHTML = '';
  for (const tag of lwOptionsSelectedTags) {
    const chip = document.createElement('span');
    chip.className = 'lw-options-tag-chip';
    chip.textContent = tag;
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'lw-options-tag-chip-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => lwOptionsRemoveTag(tag));
    chip.appendChild(removeBtn);
    lwOptionsTagChips.appendChild(chip);
  }
}

export function renderLwOptionsTagCloud(filter = '') {
  lwOptionsTagCloud.innerHTML = '';
  const q = filter.toLowerCase().trim();
  const available = lwOptionsAllTags
    .filter(t => !lwOptionsSelectedTags.includes(t.name))
    .filter(t => !q || t.name.toLowerCase().includes(q));
  for (const tag of available) {
    const pill = document.createElement('span');
    pill.className = 'lw-options-tag-cloud-item';
    pill.textContent = tag.name;
    pill.addEventListener('click', () => lwOptionsAddTag(tag.name));
    lwOptionsTagCloud.appendChild(pill);
  }
  if (q && !lwOptionsAllTags.some(t => t.name.toLowerCase() === q) && !lwOptionsSelectedTags.some(t => t.toLowerCase() === q)) {
    const createPill = document.createElement('span');
    createPill.className = 'lw-options-tag-cloud-item lw-options-tag-cloud-new';
    createPill.textContent = `+ "${filter.trim()}"`;
    createPill.addEventListener('click', () => lwOptionsAddTag(filter.trim()));
    lwOptionsTagCloud.appendChild(createPill);
  }
}

// ---- Connection test ----

async function performLinkwardenTest(url, token) {
  linkwardenTestBtn.disabled = true;
  linkwardenTestSpinner.style.display = 'inline-block';
  linkwardenTestResult.textContent = '';

  try {
    const api = new LinkwardenAPI(url, token);
    const collections = await api.getCollections();

    if (collections && collections.response && Array.isArray(collections.response)) {
      const currentSelection = linkwardenDefaultCollectionSelect.value;
      linkwardenDefaultCollectionSelect.innerHTML = '<option value="" data-i18n="options_none">None</option>';
      applyI18n();
      collections.response.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id.toString() === currentSelection) opt.selected = true;
        linkwardenDefaultCollectionSelect.appendChild(opt);
      });
    }

    linkwardenTestResult.textContent = 'Connection successful!';
    linkwardenTestResult.className = 'validation-result success';

    try {
      const tagsRes = await api.getTags();
      if (tagsRes?.response) {
        lwOptionsAllTags = tagsRes.response.map(t => ({ id: t.id, name: t.name }));
        renderLwOptionsTagCloud();
      }
    } catch { /* tags optional */ }
  } catch (err) {
    linkwardenTestResult.textContent = `Connection failed: ${err.message}`;
    linkwardenTestResult.className = 'validation-result error';
  } finally {
    linkwardenTestBtn.disabled = false;
    linkwardenTestSpinner.style.display = 'none';
  }
}

// ---- Initialization ----

export function initLinkwarden({ saveSettings, downloadFile }) {
  _saveSettings = saveSettings;
  _downloadFile = downloadFile;

  linkwardenEnabledInput.addEventListener('change', () => {
    linkwardenSettingsGroup.style.display = linkwardenEnabledInput.checked ? 'block' : 'none';
    linkwardenSubtabBar.style.display = linkwardenEnabledInput.checked ? 'flex' : 'none';
    linkwardenSyncEnabledGroup.style.display = linkwardenEnabledInput.checked ? 'block' : 'none';
    linkwardenSyncDisabledMsg.style.display = linkwardenEnabledInput.checked ? 'none' : 'block';
    _saveSettings();
  });

  linkwardenUrlInput.addEventListener('change', _saveSettings);
  linkwardenTokenInput.addEventListener('change', _saveSettings);
  linkwardenDefaultCollectionSelect.addEventListener('change', _saveSettings);

  lwOptionsTagInput.addEventListener('input', () => renderLwOptionsTagCloud(lwOptionsTagInput.value));
  lwOptionsTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (lwOptionsTagInput.value.trim()) {
        e.preventDefault();
        lwOptionsAddTag(lwOptionsTagInput.value);
      }
    } else if (e.key === 'Backspace' && !lwOptionsTagInput.value && lwOptionsSelectedTags.length > 0) {
      lwOptionsRemoveTag(lwOptionsSelectedTags[lwOptionsSelectedTags.length - 1]);
    }
  });

  document.getElementById('lw-options-tags-wrap').addEventListener('click', (e) => {
    if (e.target === e.currentTarget || e.target === lwOptionsTagChips) {
      lwOptionsTagInput.focus();
    }
  });

  linkwardenDefaultScreenshotInput.addEventListener('change', _saveSettings);

  linkwardenSyncEnabledInput.addEventListener('change', () => {
    linkwardenSyncOptions.style.display = linkwardenSyncEnabledInput.checked ? 'block' : 'none';
    _saveSettings();
  });
  linkwardenSyncParentSelect.addEventListener('change', _saveSettings);
  linkwardenSyncPushToGitInput.addEventListener('change', _saveSettings);

  linkwardenSyncRefreshBtn.addEventListener('click', async () => {
    await _saveSettings();
    const url = linkwardenUrlInput.value.trim();
    const tokenEnc = linkwardenTokenInput.value.trim();

    if (!url || !tokenEnc) {
      linkwardenSyncResult.textContent = getMessage('options_pleaseEnterLinkwardenConfig') || 'Linkwarden URL and Token are required';
      linkwardenSyncResult.className = 'validation-result error';
      return;
    }

    try {
      linkwardenSyncRefreshBtn.disabled = true;
      linkwardenSyncSpinner.style.display = 'inline-block';
      linkwardenSyncResult.textContent = '';

      const token = await decryptToken(tokenEnc);
      const parent = linkwardenSyncParentSelect.value || 'other';

      const result = await updateLinkwardenCollectionsFolder(url, token, parent);

      linkwardenSyncResult.textContent = getMessage('options_linkwardenSyncSuccess', [result.collections.toString(), result.links.toString()]) || `Synced ${result.collections} collections and ${result.links} links.`;
      linkwardenSyncResult.className = 'validation-result success';
    } catch (err) {
      linkwardenSyncResult.textContent = getMessage('options_error', [err.message]);
      linkwardenSyncResult.className = 'validation-result error';
    } finally {
      linkwardenSyncRefreshBtn.disabled = false;
      linkwardenSyncSpinner.style.display = 'none';
    }
  });

  toggleLinkwardenTokenBtn.addEventListener('click', () => {
    const isPassword = linkwardenTokenInput.type === 'password';
    linkwardenTokenInput.type = isPassword ? 'text' : 'password';
    toggleLinkwardenTokenBtn.querySelector('.icon-eye').textContent = isPassword ? '👁️‍🗨️' : '👁';
  });

  linkwardenTestBtn.addEventListener('click', () => {
    const url = linkwardenUrlInput.value.trim();
    const token = linkwardenTokenInput.value.trim();

    if (!url || !token) {
      linkwardenTestResult.textContent = 'URL and Token are required';
      linkwardenTestResult.className = 'validation-result error';
      return;
    }

    let origin;
    try {
      origin = new URL(url).origin + '/*';
    } catch (e) {
      linkwardenTestResult.textContent = 'Invalid URL format';
      linkwardenTestResult.className = 'validation-result error';
      return;
    }

    chrome.permissions.request({ origins: [origin] }, (granted) => {
      if (granted) {
        performLinkwardenTest(url, token);
      } else {
        const lastErr = chrome.runtime.lastError || (typeof browser !== 'undefined' ? browser.runtime.lastError : null);
        const errorMsg = lastErr ? lastErr.message : 'Host permission denied. Please check your browser address bar/popup blocker.';
        linkwardenTestBtn.disabled = false;
        linkwardenTestSpinner.style.display = 'none';
        linkwardenTestResult.textContent = errorMsg;
        linkwardenTestResult.className = 'validation-result error';
      }
    });
  });

  debugLogEnabledInput.addEventListener('change', async () => {
    await setDebugLogEnabled(debugLogEnabledInput.checked);
  });

  debugLogExportBtn.addEventListener('click', async () => {
    let content = '';
    try {
      const res = await chrome.runtime.sendMessage({ action: 'getDebugLogExport' });
      content = res?.content ?? '';
    } catch {
      content = '';
    }
    if (!content) {
      debugLogResult.textContent = getMessage('options_debugLogExportEmpty');
      debugLogResult.className = 'validation-result';
      setTimeout(() => { debugLogResult.textContent = ''; }, 3000);
      return;
    }
    const date = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    _downloadFile(`gitsyncmarks-debug-${date}.txt`, content, 'text/plain;charset=utf-8');
    debugLogResult.textContent = getMessage('options_exportSuccess');
    debugLogResult.className = 'validation-result success';
    setTimeout(() => { debugLogResult.textContent = ''; }, 3000);
  });
}
