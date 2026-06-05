/**
 * Shared helpers for Git provider selection in options UI.
 */

import { getProviderCaps, needsRuntimeHostPermission, SUPPORTED_PROVIDER_IDS } from './git-provider-common.js';
import { getMessage } from './i18n.js';

/**
 * Resolve the i18n label key for a provider id.
 * @param {string} providerId
 * @returns {string}
 */
export function providerLabelKey(providerId) {
  return `options_gitProvider_${providerId}`;
}

/**
 * Resolve token placeholder i18n key with Gitea-family fallback.
 * @param {string} providerId
 * @returns {string}
 */
export function providerTokenPlaceholderKey(providerId) {
  const key = `options_tokenPlaceholder_${providerId}`;
  const msg = getMessage(key);
  if (msg && msg !== key) return key;
  if (['gitea', 'forgejo', 'codeberg', 'gogs'].includes(providerId)) {
    return 'options_tokenPlaceholder_gitea';
  }
  if (providerId === 'gitlab') {
    return 'options_tokenPlaceholder_gitlab';
  }
  return 'options_tokenPlaceholder_github';
}

/**
 * Resolve token hint HTML i18n key with Gitea-family fallback.
 * @param {string} providerId
 * @returns {string}
 */
export function providerTokenHintKey(providerId) {
  const key = `options_tokenHintHtml_${providerId}`;
  const msg = getMessage(key);
  if (msg && msg !== key) return key;
  if (['gitea', 'forgejo', 'codeberg', 'gogs'].includes(providerId)) {
    return 'options_tokenHintHtml_gitea';
  }
  if (providerId === 'gitlab') {
    return 'options_tokenHintHtml_gitlab';
  }
  return 'options_tokenHint';
}

/**
 * Resolve owner placeholder i18n key.
 * @param {string} providerId
 * @returns {string}
 */
export function providerOwnerPlaceholderKey(providerId) {
  if (providerId === 'gitlab') return 'options_ownerPlaceholder_gitlab';
  if (['gitea', 'forgejo', 'codeberg', 'gogs'].includes(providerId)) {
    return 'options_ownerPlaceholder_gitea';
  }
  return 'options_ownerPlaceholder';
}

/**
 * Populate a provider <select> from SUPPORTED_PROVIDER_IDS.
 * @param {HTMLSelectElement|null|undefined} select
 * @param {string} [selectedId]
 */
export function renderProviderOptions(select, selectedId = 'github') {
  if (!select) return;
  const current = selectedId || select.value || 'github';
  select.innerHTML = '';
  for (const id of SUPPORTED_PROVIDER_IDS) {
    const option = document.createElement('option');
    option.value = id;
    const labelKey = providerLabelKey(id);
    option.textContent = getMessage(labelKey);
    option.setAttribute('data-i18n', labelKey);
    if (id === current) option.selected = true;
    select.appendChild(option);
  }
}

/**
 * Whether the server URL field should be visible for a provider.
 * @param {string} providerId
 * @param {{ gheEnabled?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldShowServerUrlField(providerId, opts = {}) {
  const caps = getProviderCaps(providerId);
  if (caps.selfHosted === 'fixed') return false;
  if (caps.selfHosted === 'required') return true;
  if (providerId === 'github') return !!opts.gheEnabled;
  return true;
}

/**
 * @param {string} providerId
 * @returns {string}
 */
export function serverUrlPlaceholderKey(providerId) {
  if (providerId === 'gitlab') return 'options_serverUrlPlaceholder_gitlab';
  if (['gitea', 'forgejo', 'gogs'].includes(providerId)) return 'options_serverUrlHint';
  if (providerId === 'github') return 'options_serverUrlPlaceholder_github';
  return 'options_serverUrlHint';
}

/**
 * Apply provider-specific form visibility and hints.
 * @param {Object} els
 * @param {string} providerId
 * @param {{ gheEnabled?: boolean }} [opts]
 */
export function applyProviderFormUi(els, providerId, opts = {}) {
  const caps = getProviderCaps(providerId);
  const showServerUrl = shouldShowServerUrlField(providerId, opts);

  if (els.gheDisclosureGroup) {
    els.gheDisclosureGroup.classList.toggle('hidden', providerId !== 'github');
  }

  if (els.serverUrlGroup) {
    els.serverUrlGroup.classList.toggle('hidden', !showServerUrl);
  }
  if (els.serverUrlInput) {
    els.serverUrlInput.required = caps.requireServerUrl;
    if (caps.defaultServerUrl && !els.serverUrlInput.value) {
      els.serverUrlInput.value = caps.defaultServerUrl;
    }
    const placeholderKey = serverUrlPlaceholderKey(providerId);
    const placeholder = getMessage(placeholderKey);
    if (placeholder && placeholder !== placeholderKey) {
      els.serverUrlInput.placeholder = placeholder;
    }
  }

  if (els.tokenHintEl) {
    els.tokenHintEl.innerHTML = getMessage(providerTokenHintKey(providerId));
  }
  if (els.tokenInput) {
    els.tokenInput.placeholder = getMessage(providerTokenPlaceholderKey(providerId));
  }
  if (els.ownerInput) {
    els.ownerInput.placeholder = getMessage(providerOwnerPlaceholderKey(providerId));
  }
  if (els.ownerHintEl) {
    const hintKey = `options_ownerHint_${providerId}`;
    const hint = getMessage(hintKey);
    if (hint && hint !== hintKey) {
      els.ownerHintEl.textContent = hint;
      els.ownerHintEl.classList.remove('hidden');
    } else {
      els.ownerHintEl.textContent = '';
      els.ownerHintEl.classList.add('hidden');
    }
  }
}

/**
 * @param {string} gitProvider
 * @param {string} serverUrl
 * @returns {boolean}
 */
export function providerNeedsHostPermission(gitProvider, serverUrl) {
  return needsRuntimeHostPermission(gitProvider, serverUrl);
}

/**
 * Mirror row: show server URL when provider needs it.
 * @param {string} providerId
 * @returns {boolean}
 */
export function mirrorShowsServerUrl(providerId) {
  return shouldShowServerUrlField(providerId, { gheEnabled: true });
}
