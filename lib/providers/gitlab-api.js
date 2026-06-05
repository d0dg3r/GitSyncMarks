/**
 * GitLab REST API adapter (gitlab.com and self-managed).
 */

import { getMessage } from '../i18n.js';
import {
  GIT_PROVIDERS,
  GitProviderError,
  resolveApiBase,
  resolveWebBaseUrl,
} from '../git-provider-common.js';
import { GitHubError } from './github-api.js';

/**
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

/**
 * @param {string} base64
 * @returns {string}
 */
function decodeBase64(base64) {
  const cleaned = String(base64 || '').replace(/\n/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * @param {string} path
 * @returns {string}
 */
function encodeFilePath(path) {
  return encodeURIComponent(path);
}

/**
 * Parse GitLab Link header for rel="next".
 * @param {string|null} linkHeader
 * @returns {string|null}
 */
function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/i);
    if (match) return match[1];
  }
  return null;
}

export class GitLabAPI {
  /**
   * @param {import('../git-provider.js').GitProviderOptions} options
   */
  constructor(options) {
    this.providerId = options.provider || GIT_PROVIDERS.GITLAB;
    this.token = options.token || '';
    this.owner = options.owner || '';
    this.repo = options.repo || '';
    this.branch = options.branch || 'main';
    this.serverUrl = options.serverUrl || '';
    /** @type {{ commitSha: string, treeSha: string }|null} */
    this._lastCommit = null;
  }

  /** @returns {string} */
  _apiBase() {
    return resolveApiBase(this.providerId, this.serverUrl);
  }

  /** @returns {string} */
  webBaseUrl() {
    return resolveWebBaseUrl(this.providerId, this.serverUrl);
  }

  /** @returns {string} */
  _projectPath() {
    return encodeURIComponent(`${this.owner}/${this.repo}`);
  }

  /** @returns {Record<string, string>} */
  _headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  async _fetch(url, options = {}) {
    let response;
    try {
      response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: this._headers(),
      });
    } catch (err) {
      throw new GitHubError(getMessage('api_networkError'), 0, err instanceof Error ? err : null);
    }

    if (response.status === 401) {
      throw new GitHubError(getMessage('api_invalidToken'), 401);
    }
    if (response.status === 403) {
      throw new GitHubError(getMessage('api_accessDenied'), 403);
    }
    if (response.status === 409) {
      throw new GitHubError(getMessage('api_conflict'), 409);
    }
    return response;
  }

  /**
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
      let scopes = [];
      let ambiguous = true;
      try {
        const scopeResponse = await this._fetch(`${this._apiBase()}/personal_access_tokens/self`);
        if (scopeResponse.ok) {
          const scopeData = await scopeResponse.json();
          const raw = scopeData.scopes || scopeData.scope || [];
          scopes = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
          ambiguous = false;
        }
      } catch {
        /* older GitLab without /personal_access_tokens/self */
      }
      return {
        valid: true,
        username: data.username || data.name || null,
        scopes,
        ambiguous,
      };
    } catch {
      return { valid: false, username: null, scopes: [] };
    }
  }

  /**
   * @returns {Promise<{login: string}>}
   */
  async getAuthenticatedUser() {
    const response = await this._fetch(`${this._apiBase()}/user`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new GitHubError(err.message || `GitLab API error: ${response.status}`, response.status);
    }
    const data = await response.json();
    return { login: data.username || data.name || '' };
  }

  /**
   * @param {{ perPage?: number }} [options]
   * @returns {Promise<Array<{full_name: string, html_url: string, private: boolean}>>}
   */
  async listUserRepos({ perPage = 100 } = {}) {
    const all = [];
    let url = `${this._apiBase()}/projects?membership=true&simple=true&per_page=${perPage}&pagination=keyset&order_by=id&sort=asc`;
    while (url) {
      const response = await this._fetch(url);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new GitHubError(err.message || `GitLab API error: ${response.status}`, response.status);
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) break;
      for (const project of data) {
        all.push({
          full_name: project.path_with_namespace || '',
          html_url: project.web_url || '',
          private: project.visibility === 'private',
        });
      }
      url = parseNextLink(response.headers.get('Link'));
    }
    return all;
  }

  /**
   * @returns {Promise<boolean>}
   */
  async checkRepo() {
    try {
      const response = await this._fetch(`${this._apiBase()}/projects/${this._projectPath()}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Resolve namespace_id for project creation.
   * @returns {Promise<number|null>}
   */
  async _resolveNamespaceId() {
    const owner = String(this.owner || '').trim();
    if (!owner) {
      const userResponse = await this._fetch(`${this._apiBase()}/user`);
      if (!userResponse.ok) return null;
      const user = await userResponse.json();
      return typeof user.id === 'number' ? user.id : null;
    }

    const userResponse = await this._fetch(`${this._apiBase()}/user`);
    if (userResponse.ok) {
      const user = await userResponse.json();
      if (user.username === owner) {
        return typeof user.id === 'number' ? user.id : null;
      }
    }

    const groupResponse = await this._fetch(
      `${this._apiBase()}/groups/${encodeURIComponent(owner)}`
    );
    if (groupResponse.ok) {
      const group = await groupResponse.json();
      return typeof group.id === 'number' ? group.id : null;
    }
    return null;
  }

  /**
   * @param {{name: string, private?: boolean, description?: string}} params
   * @returns {Promise<{name: string, fullName: string, private: boolean}>}
   */
  async createRepository(params) {
    const repoName = String(params.name || '').trim();
    if (!repoName) {
      throw new GitHubError('Repository name is required', 400);
    }
    if (!/^[a-zA-Z0-9._-]{1,255}$/.test(repoName)) {
      throw new GitHubError(
        'Repository name must use only letters, numbers, hyphens, underscores, and periods.',
        400
      );
    }

    const namespaceId = await this._resolveNamespaceId();
    const body = {
      name: repoName,
      path: repoName,
      visibility: params.private === false ? 'public' : 'private',
      initialize_with_readme: true,
      default_branch: this.branch,
      description: params.description || 'Repository created by GitSyncMarks onboarding wizard',
    };
    if (namespaceId) {
      body.namespace_id = namespaceId;
    }

    const response = await this._fetch(`${this._apiBase()}/projects`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = err.message || `HTTP ${response.status}`;
      if (response.status === 400 && /exists|taken/i.test(detail)) {
        const exists = await this.checkRepo();
        if (exists) {
          return {
            name: this.repo,
            fullName: `${this.owner}/${this.repo}`,
            private: true,
          };
        }
      }
      throw new GitHubError(`Repository creation failed (${response.status}): ${detail}`, response.status);
    }

    const data = await response.json();
    return {
      name: data.path || data.name,
      fullName: data.path_with_namespace || `${this.owner}/${data.path || repoName}`,
      private: data.visibility === 'private',
    };
  }

  /**
   * @param {string} [path]
   * @returns {Promise<Array<{name: string, path: string, type: string}>>}
   */
  async listContents(path = '') {
    const params = new URLSearchParams({ ref: this.branch, per_page: '100' });
    if (path) params.set('path', path);
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/tree?${params}`;
    const response = await this._fetch(url);
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new GitHubError('Failed to list contents', response.status);
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((item) => item.type === 'tree')
      .map((item) => ({
        name: item.name,
        path: item.path,
        type: 'dir',
      }));
  }

  /**
   * @param {string} path
   * @returns {Promise<{content: string, sha: string}|null>}
   */
  async getFile(path) {
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/files/${encodeFilePath(path)}?ref=${encodeURIComponent(this.branch)}`;
    const response = await this._fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }
    const data = await response.json();
    return {
      content: decodeBase64(data.content),
      sha: data.last_commit_id || data.blob_id || '',
    };
  }

  /**
   * @param {string} path
   * @param {string} content
   * @param {string} message
   * @param {string|null} [sha]
   * @returns {Promise<{sha: string, commitSha: string, treeSha: string|null}>}
   */
  async createOrUpdateFile(path, content, message, sha = null) {
    const encodedPath = encodeFilePath(path);
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/files/${encodedPath}`;
    const body = {
      branch: this.branch,
      content: encodeBase64(content),
      encoding: 'base64',
      commit_message: message,
    };
    if (sha) {
      body.last_commit_id = sha;
    }
    const method = sha ? 'PUT' : 'POST';
    const response = await this._fetch(url, {
      method,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new GitHubError(
        getMessage('api_errorWriting', [errorData.message || response.status]),
        response.status
      );
    }
    const data = await response.json();
    const commitSha = data.id || data.commit_id || '';
    if (!commitSha) {
      throw new GitHubError(
        getMessage('api_errorWriting', ['missing commit SHA in response']),
        422
      );
    }
    this._lastCommit = { commitSha, treeSha: commitSha };
    return {
      sha: data.blob_id || sha || '',
      commitSha,
      treeSha: commitSha,
    };
  }

  /**
   * @returns {Promise<string>}
   */
  async getLatestCommitSha() {
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/branches/${encodeURIComponent(this.branch)}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), response.status);
    }
    const data = await response.json();
    const sha = data.commit?.id || '';
    if (!sha) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), 404);
    }
    return sha;
  }

  /**
   * @param {string} commitSha
   * @returns {Promise<{sha: string, treeSha: string}>}
   */
  async getCommit(commitSha) {
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/commits/${commitSha}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get commit ${commitSha}`, response.status);
    }
    const data = await response.json();
    const sha = data.id || commitSha;
    return { sha, treeSha: sha };
  }

  /**
   * GitLab does not expose separate tree SHAs; use commit SHA as cache key.
   * @param {string} commitSha
   * @returns {Promise<string>}
   */
  async getCommitTreeSha(commitSha) {
    if (this._lastCommit?.commitSha === commitSha && this._lastCommit?.treeSha) {
      return this._lastCommit.treeSha;
    }
    return commitSha;
  }

  /**
   * @param {string} ref
   * @returns {Promise<{ treeSha: string, tree: Array<{path: string, type: string, sha: string}>, truncated: boolean }|null>}
   */
  async getRecursiveTreeForCommit(ref) {
    const tree = [];
    let url = `${this._apiBase()}/projects/${this._projectPath()}/repository/tree?ref=${encodeURIComponent(ref)}&recursive=true&per_page=100&pagination=keyset`;
    while (url) {
      const response = await this._fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data)) break;
      for (const entry of data) {
        if (!entry.path) continue;
        tree.push({
          path: entry.path,
          type: entry.type === 'tree' ? 'tree' : 'blob',
          sha: String(entry.id || ''),
        });
      }
      url = parseNextLink(response.headers.get('Link'));
    }
    return {
      treeSha: ref,
      tree,
      truncated: false,
    };
  }

  /**
   * @param {string} treeSha
   * @returns {Promise<{tree: Array<{path: string, type: string, sha: string}>, truncated: boolean}>}
   */
  async getTree(treeSha) {
    const result = await this.getRecursiveTreeForCommit(treeSha);
    if (!result) {
      throw new GitHubError(`Failed to get tree ${treeSha}`, 404);
    }
    return { tree: result.tree, truncated: result.truncated };
  }

  /**
   * @param {string} blobSha
   * @returns {Promise<string>}
   */
  async getBlob(blobSha) {
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/blobs/${blobSha}/raw`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get blob ${blobSha}`, response.status);
    }
    return response.text();
  }

  /**
   * @param {{ path?: string, perPage?: number }} [options]
   * @returns {Promise<Array<{sha: string, message: string, date: string, author: string}>>}
   */
  async listCommits({ path, perPage = 20 } = {}) {
    const params = new URLSearchParams({
      ref_name: this.branch,
      per_page: String(perPage),
    });
    if (path) params.set('path', path);
    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/commits?${params}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(getMessage('api_listCommitsFailed', [response.status]), response.status);
    }
    const data = await response.json();
    return (Array.isArray(data) ? data : []).map((c) => ({
      sha: c.id || '',
      message: String(c.title || c.message || '').split('\n')[0],
      date: c.committed_date || c.created_at || '',
      author: c.author_name || c.author?.name || '',
    }));
  }

  /**
   * @param {string} message
   * @param {Object<string, string|null>} fileChanges
   * @param {(current: number) => void} [onProgress]
   * @returns {Promise<string>}
   */
  async atomicCommit(message, fileChanges, onProgress) {
    const entries = Object.entries(fileChanges);
    const total = entries.length;
    onProgress?.(0);

    if (entries.length === 0) {
      try {
        return await this.getLatestCommitSha();
      } catch {
        return null;
      }
    }

    let existingPaths = new Set();
    try {
      const latestSha = await this.getLatestCommitSha();
      const tree = await this.getRecursiveTreeForCommit(latestSha);
      if (tree?.tree) {
        existingPaths = new Set(
          tree.tree.filter((e) => e.type === 'blob').map((e) => e.path)
        );
      }
    } catch (err) {
      if (!(err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409))) {
        throw err;
      }
    }

    const actions = [];
    for (const [path, content] of entries.sort(([a], [b]) => a.localeCompare(b))) {
      if (content === null) {
        if (existingPaths.has(path)) {
          actions.push({ action: 'delete', file_path: path });
        }
        continue;
      }
      actions.push({
        action: existingPaths.has(path) ? 'update' : 'create',
        file_path: path,
        content: encodeBase64(content),
        encoding: 'base64',
      });
    }

    if (actions.length === 0) {
      onProgress?.(total);
      try {
        return await this.getLatestCommitSha();
      } catch {
        return null;
      }
    }

    const url = `${this._apiBase()}/projects/${this._projectPath()}/repository/commits`;
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        branch: this.branch,
        commit_message: message,
        actions,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new GitHubError(err.message || `GitLab commit failed (${response.status})`, response.status);
    }

    const data = await response.json();
    const commitSha = data.id || '';
    if (!commitSha) {
      throw new GitHubError('GitLab commit response missing commit id', 422);
    }
    this._lastCommit = { commitSha, treeSha: commitSha };
    onProgress?.(total);
    return commitSha;
  }
}

export { GitProviderError };
