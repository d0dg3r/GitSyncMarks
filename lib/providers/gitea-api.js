/**
 * Gitea / Forgejo REST API adapter.
 * Uses GitHub-compatible read endpoints and the Contents API for writes.
 */

import { getMessage } from '../i18n.js';
import { GitHubAPI, GitHubError } from './github-api.js';
import { GIT_PROVIDERS, resolveApiBase, resolveWebBaseUrl } from '../git-provider-common.js';

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

function decodeBase64Content(base64) {
  const cleaned = String(base64 || '').replace(/\n/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/** @param {Record<string, unknown>|null|undefined} meta */
function pickSha(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const obj = /** @type {{ sha?: string, id?: string, SHA?: string }} */ (meta);
  return obj.sha || obj.id || obj.SHA || '';
}

/** @param {Record<string, unknown>|null|undefined} data */
function pickTreeShaFromCommitPayload(data) {
  if (!data || typeof data !== 'object') return '';
  const obj = /** @type {{ tree?: unknown, commit?: { tree?: unknown }, tree_sha?: string }} */ (data);
  const direct =
    pickSha(/** @type {Record<string, unknown>|null|undefined} */ (obj.tree)) ||
    pickSha(/** @type {Record<string, unknown>|null|undefined} */ (obj.commit?.tree)) ||
    (typeof obj.tree_sha === 'string' ? obj.tree_sha : '');
  if (direct) return direct;

  const treeMeta = obj.commit?.tree ?? obj.tree;
  if (treeMeta && typeof treeMeta === 'object') {
    const url = /** @type {{ url?: string }} */ (treeMeta).url;
    const fromUrl = extractShaFromGitTreeUrl(url);
    if (fromUrl) return fromUrl;
  }
  return '';
}

/** @param {string|undefined|null} url */
function extractShaFromGitTreeUrl(url) {
  if (typeof url !== 'string') return '';
  const match = url.match(/\/git\/trees\/([0-9a-f]{7,64})/i);
  return match ? match[1] : '';
}

export { pickSha, pickTreeShaFromCommitPayload, extractShaFromGitTreeUrl };

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
   * @returns {Promise<boolean>}
   */
  async _isEmptyRepo() {
    try {
      await this.getLatestCommitSha();
      return false;
    } catch (err) {
      if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
        return true;
      }
      throw err;
    }
  }

  /**
   * Encode a repository content path for use in URL segments.
   * @param {string} path
   * @returns {string}
   */
  _encodeContentPath(path) {
    return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  }

  /**
   * Get a file from the repository (path segments URL-encoded for Gitea).
   * @param {string} path
   * @returns {Promise<{content: string, sha: string}|null>}
   */
  async getFile(path) {
    const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents/${this._encodeContentPath(path)}?ref=${encodeURIComponent(this.branch)}`;
    const response = await this._fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }

    const data = await response.json();
    return {
      content: decodeBase64Content(data.content),
      sha: pickSha(data),
    };
  }

  /**
   * @returns {Promise<string>}
   */
  async getLatestCommitSha() {
    const refUrl = `${this._apiBase()}/repos/${this.owner}/${this.repo}/git/ref/heads/${encodeURIComponent(this.branch)}`;
    const refResponse = await this._fetch(refUrl);
    if (refResponse.ok) {
      const refData = await refResponse.json();
      const sha = pickSha(refData.object) || pickSha(refData);
      if (sha) return sha;
    }

    const branchUrl = `${this._apiBase()}/repos/${this.owner}/${this.repo}/branches/${encodeURIComponent(this.branch)}`;
    const branchResponse = await this._fetch(branchUrl);
    if (!branchResponse.ok) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), branchResponse.status);
    }
    const branchData = await branchResponse.json();
    const sha = pickSha(branchData.commit);
    if (!sha) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), 404);
    }
    return sha;
  }

  /**
   * @param {string} url
   * @returns {Promise<Record<string, unknown>|null>}
   */
  async _fetchJsonOk(url) {
    const response = await this._fetch(url);
    if (!response.ok) return null;
    return response.json();
  }

  /**
   * Fetch a recursive tree listing for a commit (or branch ref) in one call.
   * Gitea resolves commit SHAs and branch names via GET /git/trees/{ref}?recursive=1.
   * @param {string} commitSha
   * @returns {Promise<{ treeSha: string, tree: Array<{path: string, type: string, sha: string}>, truncated: boolean }|null>}
   */
  async getRecursiveTreeForCommit(commitSha) {
    const refs = [
      commitSha,
      this.branch,
      `refs/heads/${this.branch}`,
    ];
    for (const ref of refs) {
      const data = await this._fetchJsonOk(
        `${this._apiBase()}/repos/${this.owner}/${this.repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
      );
      if (data && Array.isArray(data.tree)) {
        return {
          treeSha: pickSha(data) || '',
          tree: data.tree,
          truncated: data.truncated === true,
        };
      }
    }
    return null;
  }

  /**
   * @param {string} shaOrRef
   * @returns {Promise<string>}
   */
  async _treeShaFromGitTreesEndpoint(shaOrRef) {
    const encoded = encodeURIComponent(shaOrRef);
    const data = await this._fetchJsonOk(
      `${this._apiBase()}/repos/${this.owner}/${this.repo}/git/trees/${encoded}?recursive=0`
    );
    return data ? pickSha(data) : '';
  }

  /**
   * Resolve a commit's tree SHA using several Gitea/Forgejo API shapes.
   * @param {string} commitSha
   * @returns {Promise<string>}
   */
  async getCommitTreeSha(commitSha) {
    if (this._lastCommit?.commitSha === commitSha && this._lastCommit?.treeSha) {
      return this._lastCommit.treeSha;
    }

    const recursive = await this.getRecursiveTreeForCommit(commitSha);
    if (recursive?.treeSha) return recursive.treeSha;

    const gitCommit = await this._fetchJsonOk(
      `${this._apiBase()}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`
    );
    if (gitCommit) {
      const fromGitCommit = pickTreeShaFromCommitPayload(gitCommit);
      if (fromGitCommit) return fromGitCommit;
    }

    const repoCommit = await this._fetchJsonOk(
      `${this._apiBase()}/repos/${this.owner}/${this.repo}/commits/${commitSha}`
    );
    if (repoCommit) {
      const fromRepoCommit = pickTreeShaFromCommitPayload(repoCommit);
      if (fromRepoCommit) return fromRepoCommit;
    }

    const commitList = await this._fetchJsonOk(
      `${this._apiBase()}/repos/${this.owner}/${this.repo}/commits?sha=${encodeURIComponent(commitSha)}&limit=1`
    );
    if (Array.isArray(commitList) && commitList[0]) {
      const fromList = pickTreeShaFromCommitPayload(commitList[0]);
      if (fromList) return fromList;
    }

    const fromCommitTree = await this._treeShaFromGitTreesEndpoint(commitSha);
    if (fromCommitTree) return fromCommitTree;

    try {
      const headSha = await this.getLatestCommitSha();
      if (headSha === commitSha) {
        const fromBranch = await this._treeShaFromGitTreesEndpoint(this.branch);
        if (fromBranch) return fromBranch;
      }
    } catch {
      /* branch lookup optional */
    }

    if (recursive?.tree?.length) {
      const fromBranch = await this._treeShaFromGitTreesEndpoint(this.branch);
      if (fromBranch) return fromBranch;
    }

    throw new GitHubError(`Commit ${commitSha} has no tree SHA`, 422);
  }

  /**
   * @param {string} commitSha
   * @returns {Promise<{sha: string, treeSha: string}>}
   */
  async getCommit(commitSha) {
    // Legacy callers only — remote reads use fetchFileMapViaContents / buildRemoteMaps.
    const data = await this._fetchJsonOk(
      `${this._apiBase()}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`
    );
    const sha = (data && pickSha(data)) || commitSha;
    const treeSha = pickTreeShaFromCommitPayload(data || {}) || '';
    if (treeSha) return { sha, treeSha };
    try {
      const resolved = await this.getCommitTreeSha(commitSha);
      return { sha, treeSha: resolved };
    } catch {
      return { sha, treeSha: '' };
    }
  }

  /**
   * Create or update a single file via Gitea Contents API (POST create, PUT update).
   * @param {string} path
   * @param {string} content
   * @param {string} message
   * @param {string|null} [sha]
   * @returns {Promise<{sha: string, commitSha: string, treeSha: string|null}>}
   */
  async createOrUpdateFile(path, content, message, sha = null) {
    const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents/${this._encodeContentPath(path)}`;
    const body = {
      message,
      content: encodeBase64(content),
      branch: this.branch,
    };
    if (sha) {
      body.sha = sha;
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
    const commitSha = pickSha(data.commit) || data.commit_sha || '';
    const contentSha = data.content?.sha ? pickSha(data.content) : pickSha(data);
    const treeSha = pickTreeShaFromCommitPayload(data) || null;
    if (!commitSha) {
      throw new GitHubError(
        getMessage('api_errorWriting', ['missing commit SHA in response']),
        422
      );
    }
    this._lastCommit = { commitSha, treeSha };
    return {
      sha: contentSha,
      commitSha,
      treeSha,
    };
  }

  /**
   * Build path → blob SHA map from the latest remote tree.
   * @returns {Promise<{ pathToSha: Record<string, string>, latestCommitSha: string|null }>}
   */
  async _getPathShaMap() {
    try {
      const latestCommitSha = await this.getLatestCommitSha();
      const recursive = await this.getRecursiveTreeForCommit(latestCommitSha);
      if (recursive?.tree?.length) {
        const pathToSha = {};
        for (const entry of recursive.tree) {
          if (entry.type === 'blob' && entry.path) {
            pathToSha[entry.path] = entry.sha;
          }
        }
        return { pathToSha, latestCommitSha };
      }
      // Tree metadata unavailable — per-file SHA resolved via Contents API during commit.
      return { pathToSha: {}, latestCommitSha };
    } catch (err) {
      if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
        return { pathToSha: {}, latestCommitSha: null };
      }
      throw err;
    }
  }

  /**
   * Commit file changes via the Contents API (one commit per file).
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

    // Contents API (POST/PUT per file) is reliable across Gitea/Forgejo versions.
    // The batch Change Files endpoint often returns 401/404 on empty or older instances.
    const { pathToSha } = await this._isEmptyRepo()
      ? { pathToSha: {} }
      : await this._getPathShaMap();
    return this._atomicCommitSequential(message, fileChanges, pathToSha);
  }

  /**
   * Resolve the Contents-API SHA for an existing path (prefer live file metadata over tree map).
   * @param {string} path
   * @param {Record<string, string>} pathToSha
   * @returns {Promise<string|null>}
   */
  async _resolveContentSha(path, pathToSha) {
    try {
      const existing = await this.getFile(path);
      if (existing?.sha) return existing.sha;
    } catch {
      /* fall back to tree map */
    }
    return pathToSha[path] || null;
  }

  /** @param {string} message @param {Object<string, string|null>} fileChanges @param {Record<string, string>} pathToSha @returns {Promise<string>} */
  async _atomicCommitSequential(message, fileChanges, pathToSha) {
    let lastCommitSha = null;
    for (const [path, content] of Object.entries(fileChanges)) {
      if (content === null) {
        const sha = await this._resolveContentSha(path, pathToSha);
        if (!sha) continue;
        const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents/${this._encodeContentPath(path)}`;
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
        const deleteCommitSha = pickSha(data?.commit);
        if (deleteCommitSha) {
          lastCommitSha = deleteCommitSha;
          this._lastCommit = {
            commitSha: deleteCommitSha,
            treeSha: pickTreeShaFromCommitPayload(data) || null,
          };
        }
        delete pathToSha[path];
        continue;
      }

      const existingSha = await this._resolveContentSha(path, pathToSha);
      const result = await this.createOrUpdateFile(path, content, message, existingSha);
      lastCommitSha = result.commitSha;
      pathToSha[path] = result.sha;
    }
    if (!lastCommitSha) {
      lastCommitSha = await this.getLatestCommitSha();
    }
    return lastCommitSha;
  }

  /**
   * List contents entries at a path for a specific ref (commit SHA or branch).
   * @param {string} path
   * @param {string} ref
   * @returns {Promise<Array<{ path: string, type: string, sha?: string, content?: string }>>}
   */
  async _listContentsEntries(path, ref) {
    const suffix = path ? `/${this._encodeContentPath(path)}` : '';
    const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents${suffix}?ref=${encodeURIComponent(ref || this.branch)}`;
    const response = await this._fetch(url);
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }

  /**
   * @param {string} path
   * @param {string} ref
   * @returns {Promise<{ content: string, sha: string }|null>}
   */
  async _getFileAtRef(path, ref) {
    const url = `${this._apiBase()}/repos/${this.owner}/${this.repo}/contents/${this._encodeContentPath(path)}?ref=${encodeURIComponent(ref || this.branch)}`;
    const response = await this._fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }
    const data = await response.json();
    if (Array.isArray(data) || !data) return null;
    return {
      content: decodeBase64Content(data.content),
      sha: pickSha(data),
    };
  }

  /**
   * @param {string} dirPath
   * @param {string} ref
   * @param {Record<string, string>} shaMap
   * @param {Record<string, string>} fileMap
   */
  async _walkContentsForFileMap(dirPath, ref, shaMap, fileMap) {
    const entries = await this._listContentsEntries(dirPath, ref);
    for (const entry of entries) {
      const path = String(entry.path || '');
      if (!path) continue;
      const type = String(entry.type || '');
      if (type === 'file') {
        let content = '';
        let sha = pickSha(entry);
        if (typeof entry.content === 'string' && entry.content) {
          content = decodeBase64Content(entry.content);
        } else {
          const file = await this._getFileAtRef(path, ref);
          if (!file) continue;
          content = file.content;
          sha = file.sha || sha;
        }
        if (sha) shaMap[path] = sha;
        fileMap[path] = content;
      } else if (type === 'dir') {
        await this._walkContentsForFileMap(path, ref, shaMap, fileMap);
      }
    }
  }

  /**
   * Ref candidates for Contents API reads (commit SHA first, then branch refs).
   * @param {string} ref
   * @returns {string[]}
   */
  _resolveContentsRefs(ref) {
    const primary = String(ref || this.branch || 'main').trim();
    const refs = [primary];
    if (this.branch && primary !== this.branch) {
      refs.push(this.branch);
    }
    const branchRef = `refs/heads/${this.branch || 'main'}`;
    if (!refs.includes(branchRef)) {
      refs.push(branchRef);
    }
    return [...new Set(refs.filter(Boolean))];
  }

  /**
   * @param {string} basePath
   * @param {string} ref
   * @returns {Promise<{ shaMap: Record<string, string>, fileMap: Record<string, string> }>}
   */
  async _fetchFileMapViaContentsAtRef(basePath, ref) {
    const base = basePath.replace(/\/+$/, '');
    const shaMap = {};
    const fileMap = {};
    await this._walkContentsForFileMap(base, ref, shaMap, fileMap);
    return { shaMap, fileMap };
  }

  /**
   * Fetch bookmark files via Contents API when git/trees metadata is unavailable.
   * Tries commit SHA, branch name, and refs/heads/{branch}.
   * @param {string} basePath
   * @param {string} ref
   * @returns {Promise<{ shaMap: Record<string, string>, fileMap: Record<string, string> }>}
   */
  async fetchFileMapViaContents(basePath, ref) {
    const refs = this._resolveContentsRefs(ref);
    let lastErr = null;

    for (const candidate of refs) {
      try {
        const result = await this._fetchFileMapViaContentsAtRef(basePath, candidate);
        if (Object.keys(result.fileMap).length > 0 || Object.keys(result.shaMap).length > 0) {
          return result;
        }
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (lastErr) {
      throw lastErr instanceof GitHubError
        ? lastErr
        : new GitHubError(lastErr.message, 422);
    }
    return { shaMap: {}, fileMap: {} };
  }
}
