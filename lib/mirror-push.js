/**
 * Push mirror destinations – one-way copy of bookmark files to secondary Git remotes.
 */

import { createGitProvider } from './git-provider.js';
import { getProviderCaps, needsRuntimeHostPermission, normalizeServerUrl } from './git-provider-common.js';
import { ensureHostPermissionForServerUrl } from './host-permissions.js';
import { GitHubError } from './github-api.js';
import {
  getProfiles,
  getSyncState,
  setSyncState,
  getProfileToken,
} from './profile-manager.js';
import { isGeneratedOrSettingsPath, SETTINGS_ENC_PATTERN } from './sync-settings.js';
import { commitBookmarkChanges } from './sync-core.js';

const MIRROR_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Filter file map for mirror push based on mirror options.
 * @param {Object<string, string>} fileMap
 * @param {{ pushGenerated?: boolean, pushSettings?: boolean }} mirror
 * @returns {Object<string, string>}
 */
export function filterFileMapForMirror(fileMap, mirror, bitwardenBackupPath) {
  const out = {};
  for (const [path, content] of Object.entries(fileMap)) {
    if (isGeneratedOrSettingsPath(path, bitwardenBackupPath)) {
      if (path.endsWith('/README.md') || path.endsWith('/bookmarks.html') ||
          path.endsWith('/feed.xml') || path.endsWith('/dashy-conf.yml') ||
          path.endsWith('/_index.json')) {
        if (!mirror.pushGenerated) continue;
      } else if (SETTINGS_ENC_PATTERN.test(path)) {
        if (!mirror.pushSettings) continue;
      } else {
        continue;
      }
    }
    out[path] = content;
  }
  return out;
}

/**
 * Push bookmark files to all configured mirror remotes for a profile.
 * @param {string} profileId
 * @param {Object<string, string>} fileMap - bookmark payload (same as primary commit)
 * @param {string} primaryCommitSha
 * @param {string} commitMessage
 */
export async function pushToMirrors(profileId, fileMap, primaryCommitSha, commitMessage) {
  const profiles = await getProfiles();
  const profile = profiles[profileId];
  if (!profile) return;

  const mirrors = Array.isArray(profile.mirrors) ? profile.mirrors : [];
  if (mirrors.length === 0) return;

  const state = await getSyncState(profileId);
  const mirrorState = { ...(state.mirrors || {}) };

  for (const mirror of mirrors) {
    if (!mirror?.id || mirror.paused) continue;

    const prev = mirrorState[mirror.id] || {};
    if (prev.lastPushedCommitSha && prev.lastPushedCommitSha === primaryCommitSha) {
      continue;
    }
    if (prev.lastError && prev.lastPushTime) {
      const last = new Date(prev.lastPushTime).getTime();
      if (Date.now() - last < MIRROR_BACKOFF_MS) {
        continue;
      }
    }

    const token = await getProfileToken(profileId, mirror.id);
    if (!token || !mirror.owner || !mirror.repo) {
      mirrorState[mirror.id] = {
        ...prev,
        lastError: 'Mirror not configured (token, owner, or repo missing)',
        lastPushTime: new Date().toISOString(),
      };
      continue;
    }

    try {
      const provider = mirror.gitProvider || 'github';
      const caps = getProviderCaps(provider);
      const serverUrl = mirror.serverUrl || caps.defaultServerUrl || '';
      if (needsRuntimeHostPermission(provider, serverUrl)) {
        const normalized = normalizeServerUrl(serverUrl);
        if (!normalized) {
          throw new Error('Server URL required for mirror destination');
        }
        const perm = await ensureHostPermissionForServerUrl(normalized);
        if (!perm.granted) {
          throw new Error('Host permission denied for mirror server URL');
        }
      }

      const api = createGitProvider({
        provider,
        token,
        owner: mirror.owner,
        repo: mirror.repo,
        branch: mirror.branch || 'main',
        serverUrl,
      });

      const payload = filterFileMapForMirror(
        fileMap,
        mirror,
        profile.bitwardenBackupPath || 'backups/bitwarden'
      );
      const fileChanges = { ...payload };

      const commitSha = await commitBookmarkChanges(
        api,
        `[mirror] ${commitMessage}`,
        fileChanges
      );

      mirrorState[mirror.id] = {
        lastPushedCommitSha: primaryCommitSha,
        lastMirrorCommitSha: commitSha || null,
        lastPushTime: new Date().toISOString(),
        lastError: null,
      };
    } catch (err) {
      mirrorState[mirror.id] = {
        ...prev,
        lastError: err instanceof Error ? err.message : String(err),
        lastPushTime: new Date().toISOString(),
      };
      console.warn(`[GitSyncMarks] Mirror push failed (${mirror.id}):`, err);
    }
  }

  await setSyncState(profileId, { mirrors: mirrorState });
}

/**
 * Test mirror connection.
 * @param {string} profileId
 * @param {object} mirror
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function testMirrorConnection(profileId, mirror, tokenOverride = null) {
  const token = tokenOverride || (await getProfileToken(profileId, mirror.id));
  if (!token) {
    return { ok: false, message: 'Token required' };
  }
  if (!mirror.owner || !mirror.repo) {
    return { ok: false, message: 'Owner and repository required' };
  }
  const provider = mirror.gitProvider || 'github';
  const caps = getProviderCaps(provider);
  const serverUrl = mirror.serverUrl || caps.defaultServerUrl || '';
  if (caps.requireServerUrl && !serverUrl) {
    return { ok: false, message: 'Server URL required for this provider' };
  }
  if (needsRuntimeHostPermission(provider, serverUrl)) {
    const normalized = normalizeServerUrl(serverUrl);
    if (!normalized) {
      return { ok: false, message: 'Server URL required for mirror destination' };
    }
    const perm = await ensureHostPermissionForServerUrl(normalized);
    if (!perm.granted) {
      return { ok: false, message: 'Host permission denied for mirror server URL' };
    }
  }
  try {
    const api = createGitProvider({
      provider,
      token,
      owner: mirror.owner,
      repo: mirror.repo,
      branch: mirror.branch || 'main',
      serverUrl,
    });
    await api.validateToken();
    return { ok: true, message: 'OK' };
  } catch (err) {
    const msg = err instanceof GitHubError || err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg };
  }
}
