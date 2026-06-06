/**
 * Setup wizard first-sync mode selection and push safety helpers.
 * @see https://github.com/d0dg3r/GitSyncMarks/issues/146
 */

import { countBookmarkPayloadFiles } from './sync-settings.js';

/** @typedef {'sync'|'pull'|'push'|'initialize'|'skip'} WizardSyncMode */

/**
 * @param {chrome.bookmarks.BookmarkTreeNode[]} nodes
 * @returns {number}
 */
export function countBookmarksInTree(nodes) {
  const countNodes = (list) => list.reduce((n, node) =>
    n + (node.url ? 1 : 0) + (node.children ? countNodes(node.children) : 0), 0);
  return countNodes(nodes || []);
}

/**
 * @returns {Promise<number>}
 */
export async function countLocalBookmarks() {
  try {
    const tree = await chrome.bookmarks.getTree();
    return countBookmarksInTree(tree);
  } catch {
    return 0;
  }
}

/**
 * @param {object|null|undefined} fileMap
 * @returns {number}
 */
export function countRemoteBookmarks(fileMap) {
  if (!fileMap) return 0;
  return countBookmarkPayloadFiles(fileMap);
}

/**
 * @param {string|null|undefined} pathStatus
 * @param {number} remoteCount
 * @returns {boolean}
 */
export function remoteHasBookmarkPayload(pathStatus, remoteCount) {
  return pathStatus === 'hasBookmarks' || remoteCount > 0;
}

/**
 * @param {string|null|undefined} pathStatus
 * @param {number} localCount
 * @param {number} remoteCount
 * @returns {{ modes: WizardSyncMode[], defaultMode: WizardSyncMode, warningKey: string }}
 */
export function buildWizardSyncOptions(pathStatus, localCount, remoteCount) {
  const remoteHas = remoteHasBookmarkPayload(pathStatus, remoteCount);
  const localHas = localCount > 0;

  if (remoteHas) {
    if (localHas) {
      return {
        modes: ['sync', 'pull', 'push'],
        defaultMode: 'sync',
        warningKey: 'options_onboardingWizardSyncWarn_both',
      };
    }
    return {
      modes: ['pull', 'sync', 'push'],
      defaultMode: 'pull',
      warningKey: 'options_onboardingWizardSyncWarn_remoteOnly',
    };
  }

  if (localHas) {
    return {
      modes: ['push', 'skip'],
      defaultMode: 'push',
      warningKey: 'options_onboardingWizardSyncWarn_localOnly',
    };
  }

  return {
    modes: ['initialize', 'skip'],
    defaultMode: 'initialize',
    warningKey: 'options_onboardingWizardSyncWarn_emptyBoth',
  };
}

/**
 * @param {WizardSyncMode} mode
 * @returns {string}
 */
export function wizardSyncModeLabelKey(mode) {
  return `options_onboardingWizardSyncMode_${mode}`;
}

/**
 * @param {WizardSyncMode} mode
 * @param {number} localCount
 * @param {number} remoteCount
 * @returns {string}
 */
export function wizardSyncConfirmKey(mode, localCount, remoteCount) {
  if (mode === 'skip') return 'options_onboardingWizardSyncConfirm_skip';
  if (mode === 'pull') {
    return localCount > 0
      ? 'options_onboardingWizardSyncConfirm_pullOverwriteLocal'
      : 'options_onboardingWizardSyncConfirm_pull';
  }
  if (mode === 'sync') return 'options_onboardingWizardSyncConfirm_sync';
  if (mode === 'initialize') return 'options_onboardingWizardSyncConfirm_initialize';
  if (mode === 'push') {
    return remoteCount > 0
      ? 'options_onboardingWizardSyncConfirm_pushDanger'
      : 'options_onboardingWizardSyncConfirm_push';
  }
  return 'options_onboardingWizardSyncConfirm_sync';
}

/**
 * Re-check remote before push; returns fresh counts for confirm text.
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} basePath
 * @param {(api: object, basePath: string) => Promise<{ status: string, fileMap?: object }>} checkPathSetupFn
 * @returns {Promise<{ status: string, remoteCount: number }>}
 */
export async function fetchRemoteBookmarkState(api, basePath, checkPathSetupFn) {
  const pathCheck = await checkPathSetupFn(api, basePath);
  const remoteCount = countRemoteBookmarks(pathCheck.fileMap);
  return { status: pathCheck.status, remoteCount };
}
