/**
 * Gitea / Forgejo REST API adapter.
 * Uses GitHub-compatible read endpoints and the Gitea Change Files API for multi-file commits.
 */

import { getMessage } from '../i18n.js';
import { GitHubAPI, GitHubError } from './github-api.js';
import { GIT_PROVIDERS, resolveApiBase, resolveWebBaseUrl } from '../git-provider-common.js';

const CHANGE_FILES_BATCH_SIZE = 50;

/**
 * Encode a string to base64 (handles Unicode).
 * @param {string} str
 * @returns {string}
 */
function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export class GiteaAPI extends GitHubAPI {
  /**
   * @param {import('../git-provider.js').GitProviderOptions} options
   */
  constructor(options) {
    super(options);
    this.providerId = GIT_PROVIDERS.GITEA;
  }

  /** @returns {string} */
  _apiBase() {
    return resolveApiBase(GIT_PROVIDERS.GITEA, this.serverUrl);
  }

  /** @returns {string} */
  webBaseUrl() {
    return resolveWebBaseUrl(GIT_PROVIDERS.GITEA, this.serverUrl);
  }

  _headers() {
    return {
      Authorization: `token ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate token via /user. Gitea does not expose GitHub-style OAuth scopes.
   * @returns {Promise<{valid: boolean, username: string|null, scopes: string[], ambiguous?: boolean}>}
   */
  async validateToken() {
    try {
      const response = await this._fetch(`${this._apiBase()}/user`);
      if (!response.ok) {
        if (response.status === 401) {
          return { valid: false, username: null, scopes: [] };
        }
        return { valid: response.status !== 403, username: null, scopes: [], ambiguous: true };
      }
      const data = await response.json();
      return {
        valid: true,
        username: data.login || data.username || null,
        scopes: [],
        ambiguous: true,
      };
    } catch {
      return { valid: false, username: null, scopes: [] };
    }
  }

  /**
   * Build path → blob SHA map from the latest remote tree.
   * @returns {Promise<{ pathToSha: Record<string, string>, latestCommitSha: string|null }>}
   */
  async _getPathShaMap() {
    try {
      const latestCommitSha = await this.getLatestCommitSha();
      const commit = await this.getCommit(latestCommitSha);
      const { tree } = await this.getTree(commit.treeSha);
      const pathToSha = {};
      for (const entry of tree) {
        if (entry.type === 'blob' && entry.path) {
          pathToSha[entry.path] = entry.sha;
        }
      }
      return { pathToSha, latestCommitSha };
    } catch (err) {
      if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
        return { pathToSha: {}, latestCommitSha: null };
      }
      throw err;
    }
  }

  /**
   * Convert fileChanges into Gitea Change Files API entries.
   * @param {Record<string, string|null>} fileChanges
   * @param {Record<string, string>} pathToSha
   * @returns {Array<{operation: string, path: string, content?: string, sha?: string}>}
   */
  _buildChangeFileEntries(fileChanges, pathToSha) {
    const files = [];
    for (const [path, content] of Object.entries(fileChanges)) {
      if (content === null) {
        const sha = pathToSha[path];
        if (sha) {
          files.push({ operation: 'delete', path, sha });
        }
        continue;
      }
      const existingSha = pathToSha[path];
      if (existingSha) {
        files.push({
          operation: 'update',
          path,
          content: encodeBase64(content),
          sha: existingSha,
        });
      } else {
        files.push({
          operation: 'create',
          path,
          content: encodeBase64(content),
        });
      }
    }
    return files;
  }

  /**
   * Perform a multi-file commit using Gitea's Change Files API.
   * Falls back to sequential Contents API calls when batch endpoint is unavailable.
   *
   * @param {string} message
   * @param {Object<string, string|null>} fileChanges
   * @returns {Promise<string>}
   */
  async atomicCommit(message, fileChanges) {
    const entries = Object.entries(fileChanges);
    if (entries.length === 0) {
      try {
        return await this.getLatestCommitSha();
      } catch {
        return null;
      }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const { pathToSha, latestCommitSha } = await this._getPathShaMap();
      const files = this._buildChangeFileEntries(fileChanges, pathToSha);
      if (files.length === 0) {
        return latestCommitSha;
      }

      try {
        const commitSha = await this._changeFilesBatch(message, files);
        this._lastCommit = { commitSha, treeSha: null };
        return commitSha;
      } catch (err) {
        if (err instanceof GitHubError && err.statusCode === 404 && attempt === 0) {
          return await this._atomicCommitSequential(message, fileChanges, pathToSha);
        }
        const retryable =
          err instanceof GitHubError &&
          (err.statusCode === 409 || err.statusCode === 422) &&
          attempt < 2;
        if (!retryable) throw err;
      }
    }

    throw new GitHubError('Failed to commit changes after retries', 409);
  }

  /**
   * @param {string} message
   * @param {Array<{operation: string, path: string, content?: string, sha?: string}>} files
   * @returns {Promise<string>}
   */
  async _changeFilesBatch(message, files) {
    const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents`;
    let lastCommitSha = null;

    for (let i = 0; i < files.length; i += CHANGE_FILES_BATCH_SIZE) {
      const batch = files.slice(i, i + CHANGE_FILES_BATCH_SIZE);
      const response = await this._fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          message,
          branch: this.branch,
          files: batch,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const detail = err.message || response.status;
        throw new GitHubError(`Failed to change files: ${detail}`, response.status);
      }

      const data = await response.json();
      lastCommitSha =
        data?.commit?.sha ||
        data?.content?.commit?.sha ||
        data?.commit_sha ||
        lastCommitSha;
    }

    if (!lastCommitSha) {
      lastCommitSha = await this.getLatestCommitSha();
    }
    return lastCommitSha;
  }

  /**
   * Sequential fallback using Contents API (one file per commit).
   * @param {string} message
   * @param {Object<string, string|null>} fileChanges
   * @param {Record<string, string>} pathToSha
   * @returns {Promise<string>}
   */
  async _atomicCommitSequential(message, fileChanges, pathToSha) {
    let lastCommitSha = null;
    for (const [path, content] of Object.entries(fileChanges)) {
      if (content === null) {
        const sha = pathToSha[path];
        if (!sha) continue;
        const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}`;
        const response = await this._fetch(url, {
          method: 'DELETE',
          body: JSON.stringify({
            message,
            branch: this.branch,
            sha,
          }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new GitHubError(err.message || `Failed to delete ${path}`, response.status);
        }
        const data = await response.json();
        lastCommitSha = data?.commit?.sha || lastCommitSha;
        delete pathToSha[path];
        continue;
      }

      const result = await this.createOrUpdateFile(path, content, message, pathToSha[path] || null);
      lastCommitSha = result.commitSha;
      pathToSha[path] = result.sha;
    }
    if (!lastCommitSha) {
      lastCommitSha = await this.getLatestCommitSha();
    }
    return lastCommitSha;
  }
}
