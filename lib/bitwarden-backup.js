/**
 * Bitwarden / Vaultwarden export backup to Git (Phase 1 — manual upload only).
 * Validates encrypted exports, pushes to a repo path, lists and downloads backups.
 * Does not decrypt vault contents or call Bitwarden APIs.
 */

import { encryptWithPassword, decryptWithPassword, PASSWORD_ENC_PREFIX } from './crypto.js';
import { commitBookmarkChanges } from './sync-core.js';
import { createApi, getSettings, isConfigured, getDeviceId } from './sync-settings.js';
import { fetchTreeEntriesForCommit } from './remote-fetch.js';
import { BITWARDEN_BACKUP_DEFAULT_PATTERN } from './sync-diff.js';

export { BITWARDEN_BACKUP_DEFAULT_PATTERN } from './sync-diff.js';

export const DEFAULT_BITWARDEN_BACKUP_PATH = 'backups/bitwarden';
export const MAX_BITWARDEN_BACKUP_BYTES = 25 * 1024 * 1024;

/**
 * Normalize backup directory (repo-root relative, no leading/trailing slashes).
 * @param {string} [path]
 * @returns {string}
 */
export function normalizeBackupPath(path) {
  const cleaned = String(path || DEFAULT_BITWARDEN_BACKUP_PATH).trim().replace(/^\/+|\/+$/g, '');
  return cleaned || DEFAULT_BITWARDEN_BACKUP_PATH;
}

/**
 * @param {string} path
 * @param {string} [backupPath]
 * @returns {boolean}
 */
export function isBitwardenBackupPath(path, backupPath = DEFAULT_BITWARDEN_BACKUP_PATH) {
  const prefix = `${normalizeBackupPath(backupPath)}/`;
  return typeof path === 'string' && path.startsWith(prefix);
}

/**
 * @param {string} [backupPath]
 * @returns {RegExp}
 */
export function buildBitwardenBackupPattern(backupPath) {
  const escaped = normalizeBackupPath(backupPath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}/`);
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
export function formatBackupTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

/**
 * @param {string} baseDir
 * @param {Date} [date]
 * @param {'bitwarden'|'gitsyncmarks'} [mode]
 * @returns {string}
 */
export function buildBackupPath(baseDir, date = new Date(), mode = 'bitwarden') {
  const dir = normalizeBackupPath(baseDir);
  const ts = formatBackupTimestamp(date);
  const suffix = mode === 'gitsyncmarks' ? '.gitsyncmarks.enc' : '.enc.json';
  return `${dir}/vault-${ts}${suffix}`;
}

/**
 * Detect plaintext Bitwarden JSON export (unencrypted items).
 * @param {unknown} parsed
 * @returns {boolean}
 */
export function isPlaintextBitwardenJson(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const obj = /** @type {Record<string, unknown>} */ (parsed);
  if (obj.encrypted === true) return false;
  const items = obj.items;
  if (!Array.isArray(items) || items.length === 0) return false;
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const login = /** @type {Record<string, unknown>} */ (item).login;
    if (login && typeof login === 'object' && typeof login.password === 'string' && login.password.length > 0) {
      return true;
    }
  }
  return items.length > 0 && obj.encrypted !== true;
}

/**
 * Detect Bitwarden password-protected encrypted JSON export structure.
 * @param {unknown} parsed
 * @returns {boolean}
 */
export function isBitwardenEncryptedExport(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  const obj = /** @type {Record<string, unknown>} */ (parsed);
  if (obj.encrypted !== true) return false;
  if (typeof obj.data === 'string' && obj.data.length > 0) return true;
  if (typeof obj.encKeyValidation_DO_NOT_EDIT === 'string') return true;
  return false;
}

/**
 * @param {string} content
 * @returns {boolean}
 */
export function looksLikeBitwardenCsv(content) {
  const trimmed = String(content || '').trim();
  if (!trimmed) return false;
  const firstLine = trimmed.split(/\r?\n/)[0].toLowerCase();
  return firstLine.includes('folder') && firstLine.includes('type') && firstLine.includes(',');
}

/**
 * Validate upload content before push.
 * @param {string} content
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function validateBitwardenExportContent(content) {
  if (typeof content !== 'string' || !content.trim()) {
    return { ok: false, code: 'EMPTY', message: 'File is empty' };
  }
  const byteLength = new TextEncoder().encode(content).length;
  if (byteLength > MAX_BITWARDEN_BACKUP_BYTES) {
    return {
      ok: false,
      code: 'TOO_LARGE',
      message: `File exceeds ${Math.floor(MAX_BITWARDEN_BACKUP_BYTES / (1024 * 1024))} MB limit`,
    };
  }
  if (looksLikeBitwardenCsv(content)) {
    return { ok: false, code: 'PLAINTEXT_CSV', message: 'Plaintext CSV exports are not allowed' };
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, code: 'INVALID_JSON', message: 'File is not valid JSON' };
  }
  if (isPlaintextBitwardenJson(parsed)) {
    return { ok: false, code: 'PLAINTEXT_JSON', message: 'Plaintext JSON exports are not allowed' };
  }
  if (!isBitwardenEncryptedExport(parsed)) {
    return {
      ok: false,
      code: 'NOT_ENCRYPTED',
      message: 'Expected a Bitwarden password-protected encrypted JSON export',
    };
  }
  return { ok: true };
}

/**
 * @param {string} content
 * @param {boolean} reEncrypt
 * @param {string} [password]
 * @returns {Promise<{ content: string, mode: 'bitwarden'|'gitsyncmarks' }>}
 */
export async function prepareBackupPayload(content, reEncrypt, password) {
  if (!reEncrypt) {
    return { content, mode: 'bitwarden' };
  }
  if (!password) {
    throw new Error('Password required for additional Git encryption');
  }
  const encrypted = await encryptWithPassword(content, password);
  return { content: encrypted, mode: 'gitsyncmarks' };
}

/**
 * @param {object} params
 * @param {string} params.content
 * @param {boolean} [params.reEncrypt]
 * @param {string} [params.password]
 * @param {string} [params.backupPath]
 * @returns {Promise<{ success: boolean, message?: string, path?: string, commitSha?: string }>}
 */
export async function pushBitwardenBackup({
  content,
  reEncrypt = false,
  password = '',
  backupPath = DEFAULT_BITWARDEN_BACKUP_PATH,
} = {}) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: 'Not configured' };
  }

  const validation = validateBitwardenExportContent(content);
  if (!validation.ok) {
    return { success: false, message: validation.message, code: validation.code };
  }

  let payload;
  try {
    payload = await prepareBackupPayload(content, reEncrypt, password);
  } catch (err) {
    return { success: false, message: err.message || 'Encryption failed' };
  }

  const path = buildBackupPath(backupPath, new Date(), payload.mode);
  const api = createApi(settings);
  const deviceId = await getDeviceId();
  const msg = `Bitwarden backup from ${deviceId.substring(0, 8)} — ${new Date().toISOString()}`;

  try {
    const commitSha = await commitBookmarkChanges(api, msg, { [path]: payload.content });
    return { success: true, message: 'Backup pushed', path, commitSha };
  } catch (err) {
    return { success: false, message: err.message || 'Push failed' };
  }
}

/**
 * @param {import('./github-api.js').GitHubAPI} api
 * @param {string} backupPath
 * @returns {Promise<Array<{ path: string, sha: string }>>}
 */
export async function listBitwardenBackupEntries(api, backupPath = DEFAULT_BITWARDEN_BACKUP_PATH) {
  const dir = normalizeBackupPath(backupPath);
  const prefix = `${dir}/`;
  const commitSha = await api.getLatestCommitSha();
  const { tree } = await fetchTreeEntriesForCommit(api, commitSha);
  const entries = [];
  for (const entry of tree) {
    if (entry.type === 'blob' && entry.path.startsWith(prefix)) {
      entries.push({ path: entry.path, sha: entry.sha });
    }
  }
  entries.sort((a, b) => b.path.localeCompare(a.path));
  return entries;
}

/**
 * @param {string} [backupPath]
 * @returns {Promise<{ success: boolean, backups?: Array<{ path: string, sha: string }>, message?: string }>}
 */
export async function listBitwardenBackups(backupPath = DEFAULT_BITWARDEN_BACKUP_PATH) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: 'Not configured' };
  }
  const resolvedPath = normalizeBackupPath(
    backupPath || settings.bitwardenBackupPath || DEFAULT_BITWARDEN_BACKUP_PATH
  );
  try {
    const api = createApi(settings);
    const backups = await listBitwardenBackupEntries(api, resolvedPath);
    return { success: true, backups, backupPath: resolvedPath };
  } catch (err) {
    return { success: false, message: err.message || 'List failed' };
  }
}

/**
 * Unwrap optional gitsyncmarks-enc:v1 layer on backup blob content.
 * @param {string} content
 * @param {string} [password]
 * @returns {Promise<{ ok: boolean, content?: string, wrapped?: boolean, message?: string }>}
 */
export async function unwrapGitEncryptionLayer(content, password = '') {
  if (!content.trim().startsWith(PASSWORD_ENC_PREFIX)) {
    return { ok: true, content, wrapped: false };
  }
  if (!password) {
    return { ok: true, content, wrapped: true, message: 'Git encryption layer present' };
  }
  try {
    const decrypted = await decryptWithPassword(content, password);
    return { ok: true, content: decrypted, wrapped: false };
  } catch (err) {
    const msg = err?.message || '';
    const wrongPassword = msg.includes('Wrong password') || msg.includes('Decryption failed');
    return {
      ok: false,
      message: wrongPassword
        ? 'Wrong password for Git encryption layer'
        : msg || 'Failed to unwrap Git encryption layer',
    };
  }
}

/**
 * @param {string} path
 * @param {string} [password] - unwrap GitSyncMarks layer only
 * @returns {Promise<{ success: boolean, content?: string, message?: string, wrapped?: boolean }>}
 */
export async function downloadBitwardenBackup(path, password = '') {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: 'Not configured' };
  }
  const backupDir = normalizeBackupPath(settings.bitwardenBackupPath || DEFAULT_BITWARDEN_BACKUP_PATH);
  if (!isBitwardenBackupPath(path, backupDir)) {
    return { success: false, message: 'Invalid backup path' };
  }
  try {
    const api = createApi(settings);
    const commitSha = await api.getLatestCommitSha();
    const { tree } = await fetchTreeEntriesForCommit(api, commitSha);
    const entry = tree.find((e) => e.type === 'blob' && e.path === path);
    if (!entry) return { success: false, message: 'File not found' };
    const raw = await api.getBlob(entry.sha);
    const unwrapped = await unwrapGitEncryptionLayer(raw, password);
    if (!unwrapped.ok) {
      return { success: false, message: unwrapped.message };
    }
    return {
      success: true,
      content: unwrapped.content,
      wrapped: !!unwrapped.wrapped,
      message: unwrapped.message,
    };
  } catch (err) {
    return { success: false, message: err.message || 'Download failed' };
  }
}

/**
 * Delete a backup blob from the remote tree (testable with injected fetch/commit).
 * @param {object} api
 * @param {string} path
 * @param {string} commitMessage
 * @param {{ fetchTree?: typeof fetchTreeEntriesForCommit, commit?: typeof commitBookmarkChanges }} [deps]
 * @returns {Promise<{ success: boolean, message?: string, path?: string, commitSha?: string }>}
 */
export async function deleteBackupBlobFromRepo(api, path, commitMessage, deps = {}) {
  const fetchTree = deps.fetchTree || fetchTreeEntriesForCommit;
  const commit = deps.commit || commitBookmarkChanges;
  const commitSha = await api.getLatestCommitSha();
  const { tree } = await fetchTree(api, commitSha);
  const entry = tree.find((e) => e.type === 'blob' && e.path === path);
  if (!entry) return { success: false, message: 'File not found' };
  const newCommitSha = await commit(api, commitMessage, { [path]: null });
  return { success: true, message: 'Backup deleted', path, commitSha: newCommitSha };
}

/**
 * @param {string} path
 * @returns {Promise<{ success: boolean, message?: string, path?: string, commitSha?: string }>}
 */
export async function deleteBitwardenBackup(path) {
  const settings = await getSettings();
  if (!isConfigured(settings)) {
    return { success: false, message: 'Not configured' };
  }
  const backupDir = normalizeBackupPath(settings.bitwardenBackupPath || DEFAULT_BITWARDEN_BACKUP_PATH);
  if (!isBitwardenBackupPath(path, backupDir)) {
    return { success: false, message: 'Invalid backup path' };
  }
  try {
    const api = createApi(settings);
    const deviceId = await getDeviceId();
    const msg = `Remove Bitwarden backup from ${deviceId.substring(0, 8)} — ${path}`;
    return await deleteBackupBlobFromRepo(api, path, msg);
  } catch (err) {
    return { success: false, message: err.message || 'Delete failed' };
  }
}
