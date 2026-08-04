/**
 * Settings export helpers — build profile payloads with tokens and
 * detect configured profiles that would export without a primary PAT.
 */

import { getProfileToken } from './profile-manager.js';

/**
 * @param {object} profile
 * @returns {boolean}
 */
export function isProfileConfigured(profile) {
  return !!(profile?.owner && profile?.repo);
}

/**
 * Profiles that have owner+repo but no primary token in an export payload.
 * @param {Record<string, object>} exportedProfiles
 * @returns {string[]} profile names (or ids)
 */
export function listConfiguredProfilesMissingToken(exportedProfiles) {
  const missing = [];
  for (const [id, profile] of Object.entries(exportedProfiles || {})) {
    if (!isProfileConfigured(profile)) continue;
    if (String(profile.token || '').trim()) continue;
    missing.push(profile.name || id);
  }
  return missing;
}

/**
 * Build export map for all profiles: primary token + optional mirrorTokens.
 * @param {Record<string, object>} profiles
 * @returns {Promise<Record<string, object>>}
 */
export async function buildExportedProfileMap(profiles) {
  const exportedProfiles = {};
  for (const [id, profile] of Object.entries(profiles || {})) {
    const token = await getProfileToken(id, 'primary');
    const mirrors = Array.isArray(profile.mirrors) ? profile.mirrors : [];
    const mirrorTokens = {};
    for (const mirror of mirrors) {
      if (!mirror?.id) continue;
      const mirrorToken = await getProfileToken(id, mirror.id);
      if (mirrorToken) mirrorTokens[mirror.id] = mirrorToken;
    }
    exportedProfiles[id] = {
      ...profile,
      token,
      ...(Object.keys(mirrorTokens).length > 0 ? { mirrorTokens } : {}),
    };
  }
  return exportedProfiles;
}

/**
 * Persist primary + mirror tokens from an imported profile payload.
 * @param {string} profileId
 * @param {object} profilePayload
 * @param {(plaintext: string) => Promise<string>} encryptTokenFn
 * @param {(id: string, encrypted: string, slot?: string) => Promise<void>} setEncryptedFn
 */
export async function restoreProfileTokensFromExport(
  profileId,
  profilePayload,
  encryptTokenFn,
  setEncryptedFn
) {
  const plainToken = profilePayload?.token || profilePayload?.githubToken || '';
  if (plainToken) {
    const encrypted = plainToken.startsWith('enc:v1:')
      ? plainToken
      : await encryptTokenFn(plainToken);
    await setEncryptedFn(profileId, encrypted, 'primary');
  }

  const mirrorTokens = profilePayload?.mirrorTokens;
  if (!mirrorTokens || typeof mirrorTokens !== 'object') return;

  for (const [mirrorId, mirrorPlain] of Object.entries(mirrorTokens)) {
    if (!mirrorId || !mirrorPlain) continue;
    const encrypted = String(mirrorPlain).startsWith('enc:v1:')
      ? String(mirrorPlain)
      : await encryptTokenFn(String(mirrorPlain));
    await setEncryptedFn(profileId, encrypted, mirrorId);
  }
}
