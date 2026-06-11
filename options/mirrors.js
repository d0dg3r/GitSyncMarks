/**
 * Options – push mirror destinations UI
 */

import { getMessage } from '../lib/i18n.js';
import { clearElement } from '../lib/dom-utils.js';
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

/**
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/**
 * @param {string} labelText
 * @param {HTMLElement} control
 * @returns {HTMLDivElement}
 */
function formGroup(labelText, control) {
  const group = el('div', 'form-group');
  group.appendChild(el('label', '', labelText));
  group.appendChild(control);
  return group;
}

/**
 * @param {object} m
 * @param {number} index
 * @returns {HTMLSelectElement}
 */
function buildMirrorProviderSelect(m, index) {
  const select = el('select', 'mirror-provider');
  select.dataset.index = String(index);
  for (const id of SUPPORTED_PROVIDER_IDS) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = getMessage(providerLabelKey(id));
    if ((m.gitProvider || 'github') === id) option.selected = true;
    select.appendChild(option);
  }
  return select;
}

/**
 * @param {object} m
 * @param {number} index
 * @returns {HTMLDivElement}
 */
function buildMirrorRow(m, index) {
  const row = el('div', 'mirror-row card mirror-row-card');
  row.dataset.index = String(index);

  const header = el('div', 'mirror-row-header');
  header.appendChild(el('strong', '', `${getMessage('options_mirrorsTitle')} #${index + 1}`));
  const removeBtn = el('button', 'btn btn-secondary btn-sm mirror-remove-btn', getMessage('options_mirrorsRemove'));
  removeBtn.type = 'button';
  removeBtn.dataset.index = String(index);
  header.appendChild(removeBtn);
  row.appendChild(header);

  const labelInput = el('input', 'mirror-label');
  labelInput.type = 'text';
  labelInput.dataset.index = String(index);
  labelInput.value = m.label || '';
  row.appendChild(formGroup(getMessage('options_mirrorsLabel'), labelInput));

  row.appendChild(formGroup(getMessage('options_gitProvider'), buildMirrorProviderSelect(m, index)));

  const showServer = mirrorShowsServerUrl(m.gitProvider || 'github');
  const serverGroup = el('div', `form-group mirror-server-group${showServer ? '' : ' hidden'}`);
  serverGroup.appendChild(el('label', '', getMessage('options_serverUrl')));
  const serverInput = el('input', 'mirror-server');
  serverInput.type = 'url';
  serverInput.dataset.index = String(index);
  serverInput.value = m.serverUrl || '';
  serverInput.placeholder = 'https://gitea.example.com';
  serverGroup.appendChild(serverInput);
  row.appendChild(serverGroup);

  const tokenInput = el('input', 'mirror-token');
  tokenInput.type = 'password';
  tokenInput.dataset.index = String(index);
  tokenInput.placeholder = m.hasStoredToken ? '••••••••' : '';
  tokenInput.autocomplete = 'off';
  row.appendChild(formGroup(getMessage('options_patLabel'), tokenInput));

  const ownerInput = el('input', 'mirror-owner');
  ownerInput.type = 'text';
  ownerInput.dataset.index = String(index);
  ownerInput.value = m.owner || '';
  row.appendChild(formGroup(getMessage('options_repoOwner'), ownerInput));

  const repoInput = el('input', 'mirror-repo');
  repoInput.type = 'text';
  repoInput.dataset.index = String(index);
  repoInput.value = m.repo || '';
  row.appendChild(formGroup(getMessage('options_repoName'), repoInput));

  const branchInput = el('input', 'mirror-branch');
  branchInput.type = 'text';
  branchInput.dataset.index = String(index);
  branchInput.value = m.branch || 'main';
  row.appendChild(formGroup(getMessage('options_branch'), branchInput));

  for (const [cls, key, checked] of [
    ['mirror-paused', 'options_mirrorsPaused', m.paused],
    ['mirror-push-generated', 'options_mirrorsPushGenerated', m.pushGenerated],
    ['mirror-push-settings', 'options_mirrorsPushSettings', m.pushSettings],
  ]) {
    const label = el('label', 'mirror-option-toggle');
    const checkbox = el('input', cls);
    checkbox.type = 'checkbox';
    checkbox.dataset.index = String(index);
    if (checked) checkbox.checked = true;
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(' ' + getMessage(key)));
    row.appendChild(label);
  }

  const testBtn = el('button', 'btn btn-secondary btn-sm mirror-test-btn', getMessage('options_mirrorsTest'));
  testBtn.type = 'button';
  testBtn.dataset.index = String(index);
  row.appendChild(testBtn);

  const testResult = el('span', 'mirror-test-result');
  testResult.dataset.index = String(index);
  row.appendChild(testResult);

  return row;
}

function readRowsFromDom() {
  mirrorRows = mirrorRows.map((row, index) => {
    const elRow = mirrorsList?.querySelector(`.mirror-row[data-index="${index}"]`);
    if (!elRow) return row;
    const tokenInput = elRow.querySelector('.mirror-token');
    const newToken = tokenInput?.value?.trim() || '';
    return {
      ...row,
      label: elRow.querySelector('.mirror-label')?.value?.trim() || '',
      gitProvider: normalizeGitProvider(elRow.querySelector('.mirror-provider')?.value),
      serverUrl: elRow.querySelector('.mirror-server')?.value?.trim() || '',
      owner: elRow.querySelector('.mirror-owner')?.value?.trim() || '',
      repo: elRow.querySelector('.mirror-repo')?.value?.trim() || '',
      branch: elRow.querySelector('.mirror-branch')?.value?.trim() || 'main',
      paused: elRow.querySelector('.mirror-paused')?.checked || false,
      pushGenerated: elRow.querySelector('.mirror-push-generated')?.checked || false,
      pushSettings: elRow.querySelector('.mirror-push-settings')?.checked || false,
      token: newToken,
      hasStoredToken: row.hasStoredToken || !!newToken,
    };
  });
}

function renderMirrors() {
  if (!mirrorsList) return;
  clearElement(mirrorsList);
  for (let i = 0; i < mirrorRows.length; i++) {
    mirrorsList.appendChild(buildMirrorRow(mirrorRows[i], i));
  }
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
