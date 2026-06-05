/**
 * Profile bookmark transfer – copy bookmarks between profiles (migration / partial copy).
 */

import { createGitProvider } from './git-provider.js';
import { buildRepoFolderPrefixPattern, getProviderCaps } from './git-provider-common.js';
import { bookmarkTreeToFileMap } from './bookmark-serializer.js';
import { fetchRemoteFileMap } from './remote-fetch.js';
import {
  getProfiles,
  getActiveProfileId,
  getProfileSettings,
  getSyncState,
  setSyncState,
} from './profile-manager.js';
import {
  isGeneratedOrSettingsPath,
  hasBookmarkPayloadFiles,
} from './sync-settings.js';
import { contentEquals, pushForProfile } from './sync-core.js';
import { getMessage } from './i18n.js';

/** @typedef {'browser'|'remote'|'cache'|'empty'} ProfileFileMapSource */

const AUTO_FOLDER_PATH_RE = new RegExp(`/(?:${buildRepoFolderPrefixPattern()})[^/]*\\/|\\/Linkwarden\\/`);

/**
 * Normalize repo base path (no trailing slash).
 * @param {string} basePath
 * @returns {string}
 */
export function normalizeBasePath(basePath) {
  return String(basePath || 'bookmarks').replace(/\/+$/, '');
}

/**
 * Rewrite file map keys from one base path to another.
 * @param {Object<string, string>} fileMap
 * @param {string} fromBasePath
 * @param {string} toBasePath
 * @returns {Object<string, string>}
 */
export function rewriteFileMapPaths(fileMap, fromBasePath, toBasePath) {
  const from = normalizeBasePath(fromBasePath);
  const to = normalizeBasePath(toBasePath);
  if (from === to) return { ...fileMap };

  const prefix = `${from}/`;
  const out = {};
  for (const [path, content] of Object.entries(fileMap)) {
    if (path === from || path.startsWith(prefix)) {
      const suffix = path === from ? '' : path.slice(prefix.length);
      const newPath = suffix ? `${to}/${suffix}` : to;
      out[newPath] = content;
    } else {
      out[path] = content;
    }
  }
  return out;
}

/**
 * Remove generated, settings.enc, and auto-managed folder paths from a file map.
 * @param {Object<string, string>} fileMap
 * @returns {Object<string, string>}
 */
export function filterGeneratedAndAuto(fileMap) {
  const out = {};
  for (const [path, content] of Object.entries(fileMap)) {
    if (isGeneratedOrSettingsPath(path)) continue;
    if (AUTO_FOLDER_PATH_RE.test(path)) continue;
    out[path] = content;
  }
  return out;
}

/**
 * Keep only paths under basePath/folderPrefix (folderPrefix relative to base, e.g. "toolbar/work").
 * @param {Object<string, string>} fileMap
 * @param {string} basePath
 * @param {string|null|undefined} folderPrefix
 * @returns {Object<string, string>}
 */
export function filterFileMapByFolderPrefix(fileMap, basePath, folderPrefix) {
  if (!folderPrefix || !String(folderPrefix).trim()) return { ...fileMap };
  const base = normalizeBasePath(basePath);
  const rel = String(folderPrefix).replace(/^\/+|\/+$/g, '');
  const root = rel ? `${base}/${rel}` : base;
  const rootPrefix = `${root}/`;
  const out = {};
  for (const [path, content] of Object.entries(fileMap)) {
    if (path === root || path.startsWith(rootPrefix)) {
      out[path] = content;
    }
  }
  return out;
}

/**
 * @param {Object<string, string>} targetMap
 * @param {Object<string, string>} sourceMap
 * @returns {{ merged: Object<string, string>, conflicts: string[] }}
 */
export function mergeFileMapsIntoTarget(targetMap, sourceMap) {
  const merged = { ...targetMap };
  const conflicts = [];
  for (const [path, content] of Object.entries(sourceMap)) {
    if (path in merged && !contentEquals(merged[path], content)) {
      conflicts.push(path);
      continue;
    }
    merged[path] = content;
  }
  return { merged, conflicts };
}

/**
 * Detect sibling folders where a slug collision produced a `-2`, `-3`, … suffix
 * (e.g. `bucher` and `bucher-2` under the same parent).
 * @param {Object<string, string>} fileMap
 * @param {string} basePath
 * @returns {string[]} Human-readable pairs like `bookmarks/toolbar/bucher + bucher-2`
 */
export function findDuplicateSlugFolderPairs(fileMap, basePath) {
  const base = normalizeBasePath(basePath);
  const prefix = `${base}/`;
  /** @type {Map<string, Set<string>>} */
  const childNamesByParent = new Map();

  for (const path of Object.keys(fileMap)) {
    if (!path.startsWith(prefix)) continue;
    const rel = path.slice(prefix.length);
    const parts = rel.split('/').filter(Boolean);
    if (parts.length < 2) continue;

    for (let depth = 1; depth < parts.length; depth += 1) {
      const parent = depth === 1 ? base : `${base}/${parts.slice(0, depth - 1).join('/')}`;
      const childName = parts[depth - 1];
      if (!childNamesByParent.has(parent)) childNamesByParent.set(parent, new Set());
      childNamesByParent.get(parent).add(childName);
    }
  }

  const pairs = [];
  for (const [parent, names] of childNamesByParent) {
    const relParent = parent === base ? '' : parent.slice(base.length + 1);
    for (const name of names) {
      const match = name.match(/^(.+)-(\d+)$/);
      if (!match) continue;
      const stem = match[1];
      if (!names.has(stem)) continue;
      const label = relParent ? `${relParent}/${stem} + ${name}` : `${stem} + ${name}`;
      pairs.push(label);
    }
  }

  return [...new Set(pairs)].sort();
}

/**
 * Load bookmark file map for a profile (browser if active, else remote, else cache).
 * @param {string} profileId
 * @param {{ preferRemote?: boolean }} [opts]
 * @returns {Promise<{ fileMap: Object<string, string>, source: ProfileFileMapSource, basePath: string, commitSha?: string|null, shaMap?: Object<string, string> }>}
 */
export async function loadProfileFileMap(profileId, opts = {}) {
  const { preferRemote = true } = opts;
  const profiles = await getProfiles();
  const profile = profiles[profileId];
  if (!profile) {
    throw new Error(getMessage('transfer_profileNotFound'));
  }

  const basePath = normalizeBasePath(profile.filePath);
  const activeId = await getActiveProfileId();

  if (profileId === activeId) {
    const tree = await chrome.bookmarks.getTree();
    const fileMap = bookmarkTreeToFileMap(tree, basePath);
    return { fileMap, source: 'browser', basePath };
  }

  const settings = await getProfileSettings(profileId);
  const caps = getProviderCaps(settings?.gitProvider || 'github');
  const serverUrl = settings?.serverUrl || caps.defaultServerUrl || '';
  const configured = !!(
    settings?.githubToken &&
    settings.repoOwner &&
    settings.repoName &&
    (!caps.requireServerUrl || serverUrl)
  );

  if (preferRemote && configured) {
    try {
      const api = createGitProvider({
        provider: settings.gitProvider || 'github',
        token: settings.githubToken,
        owner: settings.repoOwner,
        repo: settings.repoName,
        branch: settings.branch || 'main',
        serverUrl: settings.serverUrl || '',
      });
      const remote = await fetchRemoteFileMap(api, basePath, null);
      if (remote && Object.keys(remote.fileMap).length > 0) {
        return {
          fileMap: remote.fileMap,
          source: 'remote',
          basePath,
          commitSha: remote.commitSha || null,
          shaMap: remote.shaMap || {},
        };
      }
    } catch (err) {
      console.warn('[GitSyncMarks] loadProfileFileMap remote fetch failed:', err);
    }
  }

  const state = await getSyncState(profileId);
  if (state.lastSyncFiles && Object.keys(state.lastSyncFiles).length > 0) {
    const fileMap = {};
    const shaMap = {};
    for (const [path, info] of Object.entries(state.lastSyncFiles)) {
      fileMap[path] = info.content;
      shaMap[path] = info.sha || null;
    }
    return {
      fileMap,
      source: 'cache',
      basePath,
      commitSha: state.lastCommitSha || null,
      shaMap,
    };
  }

  return { fileMap: {}, source: 'empty', basePath };
}

/**
 * Preview a transfer without writing.
 * @param {object} params
 * @param {(progress: { phase: string, current?: number, total?: number }) => void} [onProgress]
 * @returns {Promise<object>}
 */
export async function previewTransfer(params, onProgress) {
  const {
    sourceId,
    targetId,
    mode = 'replace',
    folderPrefix = null,
  } = params;

  const profiles = await getProfiles();
  if (!profiles[sourceId] || !profiles[targetId]) {
    throw new Error(getMessage('transfer_profileNotFound'));
  }
  if (sourceId === targetId) {
    throw new Error(getMessage('transfer_sameProfile'));
  }

  onProgress?.({ phase: 'loading', current: 0, total: 2 });

  const source = await loadProfileFileMap(sourceId);
  onProgress?.({ phase: 'loading', current: 1, total: 2 });
  let payload = filterGeneratedAndAuto(source.fileMap);
  payload = filterFileMapByFolderPrefix(payload, source.basePath, folderPrefix);

  const targetProfile = profiles[targetId];
  const targetBase = normalizeBasePath(targetProfile.filePath);
  payload = rewriteFileMapPaths(payload, source.basePath, targetBase);

  let targetExistingCount = 0;
  let remoteOnlyCount = 0;
  let conflicts = [];
  let finalMap = payload;
  const targetLoad = await loadProfileFileMap(targetId);
  const targetMap = filterGeneratedAndAuto(targetLoad.fileMap);
  targetExistingCount = Object.keys(targetMap).length;

  onProgress?.({ phase: 'loading', current: 2, total: 2 });

  if (mode === 'merge') {
    const { merged, conflicts: mergeConflicts } = mergeFileMapsIntoTarget(targetMap, payload);
    finalMap = merged;
    conflicts = mergeConflicts;
  } else {
    for (const path of Object.keys(targetMap)) {
      if (!(path in finalMap)) remoteOnlyCount++;
    }
  }

  return {
    source: source.source,
    sourceFileCount: Object.keys(payload).length,
    targetExistingCount,
    remoteOnlyCount,
    resultFileCount: Object.keys(finalMap).length,
    hasBookmarkPayload: hasBookmarkPayloadFiles(finalMap),
    targetHasExistingData: targetExistingCount > 0,
    duplicateFolderPairs: findDuplicateSlugFolderPairs(finalMap, targetBase),
    conflicts,
    mode,
  };
}

/**
 * Transfer bookmarks from one profile to another.
 * @param {object} params
 * @param {string} params.sourceId
 * @param {string} params.targetId
 * @param {'replace'|'merge'} [params.mode]
 * @param {boolean} [params.push]
 * @param {string|null} [params.folderPrefix]
 * @param {boolean} [params.applyToBrowser]
 * @param {(progress: { phase: string, current?: number, total?: number }) => void} [onProgress]
 * @returns {Promise<{ success: boolean, message: string, fileCount?: number, commitSha?: string|null, conflicts?: string[] }>}
 */
export async function transferBookmarks(params, onProgress) {
  const {
    sourceId,
    targetId,
    mode = 'replace',
    push = true,
    folderPrefix = null,
    applyToBrowser = false,
  } = params;

  const profiles = await getProfiles();
  if (!profiles[sourceId] || !profiles[targetId]) {
    return { success: false, message: getMessage('transfer_profileNotFound') };
  }
  if (sourceId === targetId) {
    return { success: false, message: getMessage('transfer_sameProfile') };
  }

  const preview = await previewTransfer({ sourceId, targetId, mode, folderPrefix }, onProgress);
  if (preview.conflicts.length > 0) {
    return {
      success: false,
      message: getMessage('transfer_mergeConflicts', [String(preview.conflicts.length)]),
      conflicts: preview.conflicts,
    };
  }

  const source = await loadProfileFileMap(sourceId);
  let payload = filterGeneratedAndAuto(source.fileMap);
  payload = filterFileMapByFolderPrefix(payload, source.basePath, folderPrefix);

  const targetProfile = profiles[targetId];
  const targetBase = normalizeBasePath(targetProfile.filePath);
  payload = rewriteFileMapPaths(payload, source.basePath, targetBase);

  let finalMap = payload;
  if (mode === 'merge') {
    const targetLoad = await loadProfileFileMap(targetId);
    const targetMap = filterGeneratedAndAuto(targetLoad.fileMap);
    finalMap = mergeFileMapsIntoTarget(targetMap, payload).merged;
  }

  if (!hasBookmarkPayloadFiles(finalMap)) {
    return { success: false, message: getMessage('transfer_noBookmarks') };
  }

  let commitSha = null;
  if (push) {
    const pushResult = await pushForProfile(targetId, finalMap, {
      replaceRemote: mode === 'replace',
      message: getMessage('transfer_commitMessage', [profiles[sourceId].name || sourceId]),
      onProgress,
    });
    if (!pushResult.success) {
      return pushResult;
    }
    commitSha = pushResult.commitSha || null;
  } else {
    const syncFiles = {};
    for (const [path, content] of Object.entries(finalMap)) {
      syncFiles[path] = { sha: null, content };
    }
    await setSyncState(targetId, {
      lastSyncFiles: syncFiles,
      lastCommitSha: null,
      hasConflict: false,
      lastError: null,
      lastSyncTime: new Date().toISOString(),
    });
  }

  if (applyToBrowser && (await getActiveProfileId()) === targetId) {
    onProgress?.({ phase: 'applying', current: 0, total: 0 });
    const { fileMapToBookmarkTree } = await import('./bookmark-serializer.js');
    const { replaceLocalBookmarks } = await import('./bookmark-replace.js');
    const roleMap = fileMapToBookmarkTree(finalMap, targetBase);
    await replaceLocalBookmarks(roleMap, {
      githubReposEnabled: targetProfile.githubReposEnabled || false,
      githubReposParent: targetProfile.githubReposParent || 'other',
      githubReposUsername: targetProfile.githubReposUsername || '',
    });
  }

  return {
    success: true,
    message: getMessage('transfer_success', [String(Object.keys(finalMap).length)]),
    fileCount: Object.keys(finalMap).length,
    commitSha,
  };
}
