/**
 * Options – push mirror destinations UI
 */

import { getMessage } from '../lib/i18n.js';
import { normalizeGitProvider } from '../lib/connection-settings.js';
import { getProviderCaps, SUPPORTED_PROVIDER_IDS } from '../lib/git-provider-common.js';
import { mirrorShowsServerUrl, providerLabelKey } from '../lib/provider-ui.js';
import { encryptToken } from '../lib/crypto.js';
import {
  getActiveProfileId,
  getProfileSettings,
  saveProfile,
  setEncryptedProfileToken,
} from '../lib/profile-manager.js';

const mirrorsList = document.getElementById('mirrors-list');
const mirrorsAddBtn = document.getElementById('mirrors-add-btn');

/** @type {object[]} */
let mirrorRows = [];

function emptyMirror() {
  return {
    id: crypto.randomUUID().slice(0, 8),
    label: '',
    gitProvider: 'github',
    serverUrl: '',
    owner: '',
    repo: '',
    branch: 'main',
    pushGenerated: false,
    pushSettings: false,
    paused: false,
    token: '',
    hasStoredToken: false,
  };
}

function mirrorProviderSelectHtml(m, index) {
  const options = SUPPORTED_PROVIDER_IDS
    .map((id) => {
      const key = providerLabelKey(id);
      const label = getMessage(key);
      const selected = (m.gitProvider || 'github') === id ? 'selected' : '';
      return `<option value="${id}" ${selected}>${label}</option>`;
    })
    .join('');
  return `<select class="mirror-provider" data-index="${index}">${options}</select>`;
}

function mirrorRowHtml(m, index) {
  const showServer = mirrorShowsServerUrl(m.gitProvider || 'github');
  return `
    <div class="mirror-row card mirror-row-card" data-index="${index}">
      <div class="mirror-row-header">
        <strong>${getMessage('options_mirrorsTitle')} #${index + 1}</strong>
        <button type="button" class="btn btn-secondary btn-sm mirror-remove-btn" data-index="${index}">${getMessage('options_mirrorsRemove')}</button>
      </div>
      <div class="form-group">
        <label>${getMessage('options_mirrorsLabel')}</label>
        <input type="text" class="mirror-label" data-index="${index}" value="${escapeAttr(m.label)}">
      </div>
      <div class="form-group">
        <label>${getMessage('options_gitProvider')}</label>
        ${mirrorProviderSelectHtml(m, index)}
      </div>
      <div class="form-group mirror-server-group ${showServer ? '' : 'hidden'}">
        <label>${getMessage('options_serverUrl')}</label>
        <input type="url" class="mirror-server" data-index="${index}" value="${escapeAttr(m.serverUrl)}" placeholder="https://gitea.example.com">
      </div>
      <div class="form-group">
        <label>${getMessage('options_patLabel')}</label>
        <input type="password" class="mirror-token" data-index="${index}" placeholder="${m.hasStoredToken ? '••••••••' : ''}" autocomplete="off">
      </div>
      <div class="form-group">
        <label>${getMessage('options_repoOwner')}</label>
        <input type="text" class="mirror-owner" data-index="${index}" value="${escapeAttr(m.owner)}">
      </div>
      <div class="form-group">
        <label>${getMessage('options_repoName')}</label>
        <input type="text" class="mirror-repo" data-index="${index}" value="${escapeAttr(m.repo)}">
      </div>
      <div class="form-group">
        <label>${getMessage('options_branch')}</label>
        <input type="text" class="mirror-branch" data-index="${index}" value="${escapeAttr(m.branch || 'main')}">
      </div>
      <label class="mirror-option-toggle"><input type="checkbox" class="mirror-paused" data-index="${index}" ${m.paused ? 'checked' : ''}> ${getMessage('options_mirrorsPaused')}</label>
      <label class="mirror-option-toggle"><input type="checkbox" class="mirror-push-generated" data-index="${index}" ${m.pushGenerated ? 'checked' : ''}> ${getMessage('options_mirrorsPushGenerated')}</label>
      <label class="mirror-option-toggle"><input type="checkbox" class="mirror-push-settings" data-index="${index}" ${m.pushSettings ? 'checked' : ''}> ${getMessage('options_mirrorsPushSettings')}</label>
      <button type="button" class="btn btn-secondary btn-sm mirror-test-btn" data-index="${index}">${getMessage('options_mirrorsTest')}</button>
      <span class="mirror-test-result" data-index="${index}"></span>
    </div>`;
}

function escapeAttr(s) {
  return String(s || '').replace(/"/g, '&quot;');
}

function readRowsFromDom() {
  mirrorRows = mirrorRows.map((row, index) => {
    const el = mirrorsList?.querySelector(`.mirror-row[data-index="${index}"]`);
    if (!el) return row;
    const tokenInput = el.querySelector('.mirror-token');
    const newToken = tokenInput?.value?.trim() || '';
    return {
      ...row,
      label: el.querySelector('.mirror-label')?.value?.trim() || '',
      gitProvider: normalizeGitProvider(el.querySelector('.mirror-provider')?.value),
      serverUrl: el.querySelector('.mirror-server')?.value?.trim() || '',
      owner: el.querySelector('.mirror-owner')?.value?.trim() || '',
      repo: el.querySelector('.mirror-repo')?.value?.trim() || '',
      branch: el.querySelector('.mirror-branch')?.value?.trim() || 'main',
      paused: el.querySelector('.mirror-paused')?.checked || false,
      pushGenerated: el.querySelector('.mirror-push-generated')?.checked || false,
      pushSettings: el.querySelector('.mirror-push-settings')?.checked || false,
      token: newToken,
      hasStoredToken: row.hasStoredToken || !!newToken,
    };
  });
}

function renderMirrors() {
  if (!mirrorsList) return;
  mirrorsList.innerHTML = mirrorRows.map((m, i) => mirrorRowHtml(m, i)).join('');
  mirrorsList.querySelectorAll('.mirror-remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      readRowsFromDom();
      mirrorRows.splice(Number(btn.dataset.index), 1);
      renderMirrors();
    });
  });
  mirrorsList.querySelectorAll('.mirror-provider').forEach((sel) => {
    sel.addEventListener('change', () => {
      const row = mirrorsList.querySelector(`.mirror-row[data-index="${sel.dataset.index}"]`);
      const serverGroup = row?.querySelector('.mirror-server-group');
      const provider = normalizeGitProvider(sel.value);
      if (serverGroup) {
        serverGroup.classList.toggle('hidden', !mirrorShowsServerUrl(provider));
      }
      const caps = getProviderCaps(provider);
      const serverInput = row?.querySelector('.mirror-server');
      if (serverInput && caps.defaultServerUrl && !serverInput.value) {
        serverInput.value = caps.defaultServerUrl;
      }
    });
  });
  mirrorsList.querySelectorAll('.mirror-test-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      readRowsFromDom();
      const index = Number(btn.dataset.index);
      const m = mirrorRows[index];
      const resultEl = mirrorsList.querySelector(`.mirror-test-result[data-index="${index}"]`);
      resultEl.textContent = '…';
      try {
        const mirror = collectMirrorConfig(m);
        const res = await chrome.runtime.sendMessage({
          action: 'testMirror',
          profileId: await getActiveProfileId(),
          mirror,
          token: m.token || undefined,
        });
        resultEl.textContent = res?.ok ? 'OK' : (res?.message || 'Failed');
        resultEl.className = 'mirror-test-result ' + (res?.ok ? 'success' : 'error');
      } catch (err) {
        resultEl.textContent = err.message;
      }
    });
  });
}

function collectMirrorConfig(m) {
  const caps = getProviderCaps(m.gitProvider);
  return {
    id: m.id,
    label: m.label,
    gitProvider: m.gitProvider,
    serverUrl: m.serverUrl || caps.defaultServerUrl || '',
    owner: m.owner,
    repo: m.repo,
    branch: m.branch || 'main',
    pushGenerated: m.pushGenerated,
    pushSettings: m.pushSettings,
    paused: m.paused,
  };
}

export async function loadMirrorsFromProfile() {
  const settings = await getProfileSettings(null);
  mirrorRows = (settings?.mirrors || []).map((m) => ({
    ...emptyMirror(),
    ...m,
    token: '',
    hasStoredToken: true,
  }));
  renderMirrors();
}

export async function saveMirrorsForActiveProfile() {
  readRowsFromDom();
  const activeId = await getActiveProfileId();
  const mirrors = mirrorRows.map(collectMirrorConfig);
  await saveProfile(activeId, { mirrors });
  for (const m of mirrorRows) {
    if (m.token) {
      await setEncryptedProfileToken(activeId, await encryptToken(m.token), m.id);
    }
  }
}

export function getMirrorRowsForSave() {
  readRowsFromDom();
  return mirrorRows;
}

export function initMirrors() {
  if (!mirrorsList) return;
  mirrorsAddBtn?.addEventListener('click', () => {
    readRowsFromDom();
    mirrorRows.push(emptyMirror());
    renderMirrors();
  });
}
