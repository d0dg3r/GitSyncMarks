/**
 * GitHub REST API Wrapper.
 * Includes both the Contents API (for simple operations) and the
 * Git Data API (for atomic multi-file commits via trees/blobs).
 */

import { getMessage } from './i18n.js';
import { chunkAtomicCommitTreeBatches } from './github-tree-batch.js';

const API_BASE = 'https://api.github.com';

/**
 * Build a user-friendly error detail from GitHub's create-repo error response.
 * @param {{message?: string, errors?: Array<{resource?: string, code?: string, field?: string, message?: string}>}} err
 * @param {number} status
 * @returns {string}
 */
function buildCreateRepoErrorDetail(err, status) {
  const msg = err?.message || '';
  const errors = Array.isArray(err?.errors) ? err.errors : [];
  const parts = [];
  if (msg && msg !== 'Validation Failed') parts.push(msg);
  for (const e of errors) {
    const m = e?.message || e?.code || '';
    if (m && !parts.includes(m)) parts.push(m);
  }
  const detail = parts.length ? parts.join('. ') : (status === 422 ? 'Validation failed. Check repository name (letters, numbers, hyphens, underscores, periods only) and that it does not already exist.' : 'Failed to create repository');
  return detail;
}

export class GitHubAPI {
  /**
   * @param {string} token - GitHub Personal Access Token
   * @param {string} owner - Repository owner (user or org)
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name (default: 'main')
   */
  constructor(token, owner, repo, branch = 'main') {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Build standard headers for GitHub API requests.
   * @returns {Headers}
   */
  _headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make a fetch request with error handling and rate limit tracking.
   * @param {string} url
   * @param {RequestInit} options
   * @returns {Promise<Response>}
   */
  async _fetch(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: this._headers(),
    });

    try {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      if (remaining !== null && parseInt(remaining, 10) <= 50) {
        const resetDate = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'unknown';
        import('./debug-log.js').then(({ log }) => {
          log(`[GitHub API] Warning: Only ${remaining} requests remaining. Resets at ${resetDate}`);
        });
      }
    } catch (e) {
      // Ignore header parsing errors
    }

    if (response.status === 401) {
      throw new GitHubError(getMessage('api_invalidToken'), 401);
    }
    if (response.status === 429) {
      throw new GitHubError(getMessage('api_rateLimitExceeded'), 429);
    }
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      if (data.message && data.message.includes('rate limit')) {
        throw new GitHubError(getMessage('api_rateLimitExceeded'), 403);
      }
      throw new GitHubError(getMessage('api_accessDenied'), 403);
    }
    if (response.status === 409) {
      throw new GitHubError(getMessage('api_conflict'), 409);
    }

    return response;
  }

  /**
   * Validate the token by making a request to the authenticated user endpoint.
   * @returns {Promise<{valid: boolean, username: string|null, scopes: string[]}>}
   */
  async validateToken() {
    try {
      // /user endpoint is available for PATs. For Installation Access Tokens (Apps), 
      // this might 403, but the token itself might still be valid for the repo.
      const response = await this._fetch(`${API_BASE}/user`);
      if (!response.ok) {
        // If /user is not accessible, we return valid: true but with empty username/scopes
        // to let the repo check decide if the token works.
        if (response.status === 403 || response.status === 401) {
          return { valid: response.status === 403, username: null, scopes: [], ambiguous: true };
        }
        return { valid: false, username: null, scopes: [] };
      }
      const data = await response.json();
      const rawScopes = response.headers.get('x-oauth-scopes');
      const scopes = (rawScopes || '').split(',').map(s => s.trim()).filter(Boolean);
      
      return {
        valid: true,
        username: data.login,
        scopes,
        // Fine-grained tokens and Apps do not return the x-oauth-scopes header.
        ambiguous: rawScopes === null, 
      };
    } catch (err) {
      return { valid: false, username: null, scopes: [] };
    }
  }

  /**
   * Check if the configured repository exists and is accessible.
   * @returns {Promise<boolean>}
   */
  async checkRepo() {
    try {
      const response = await this._fetch(`${API_BASE}/repos/${this.owner}/${this.repo}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Create a repository for the authenticated user.
   * @param {{name: string, private?: boolean, description?: string}} params
   * @returns {Promise<{name: string, fullName: string, private: boolean}>}
   */
  async createRepository(params) {
    const repoName = String(params.name || '').trim();
    if (!repoName) {
      throw new GitHubError('Repository name is required', 400);
    }
    // GitHub: letters, numbers, hyphens, underscores, periods; 1–100 chars
    if (!/^[a-zA-Z0-9._-]{1,100}$/.test(repoName)) {
      throw new GitHubError(
        'Repository name must use only letters, numbers, hyphens, underscores, and periods (1–100 characters).',
        400
      );
    }

    const response = await this._fetch(`${API_BASE}/user/repos`, {
      method: 'POST',
      body: JSON.stringify({
        name: repoName,
        private: params.private !== false,
        auto_init: false,
        description: params.description || 'Repository created by GitSyncMarks onboarding wizard',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const detail = buildCreateRepoErrorDetail(err, response.status);
      const isAlreadyExists =
        /already exists|name has already been taken/i.test(detail) ||
        (Array.isArray(err.errors) && err.errors.some((e) => /already exists|already been taken/i.test(String(e.message || e.code || ''))));

      if (response.status === 422 && isAlreadyExists) {
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
      name: data.name,
      fullName: data.full_name,
      private: data.private === true,
    };
  }

  /**
   * List directories at a given path using the Contents API.
   * @param {string} path - Directory path (empty string for root)
   * @returns {Promise<Array<{name: string, path: string, type: string}>>} directories only
   */
  async listContents(path = '') {
    const urlPath = path ? `/${path}` : '';
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/contents${urlPath}?ref=${this.branch}`;
    const response = await this._fetch(url);
    if (response.status === 404) return [];
    if (!response.ok) {
      throw new GitHubError(`Failed to list contents`, response.status);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.filter(item => item.type === 'dir') : [];
  }

  /**
   * Get a file from the repository.
   * @param {string} path - File path within the repo
   * @returns {Promise<{content: string, sha: string}|null>} null if file doesn't exist
   */
  async getFile(path) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}?ref=${this.branch}`;
    const response = await this._fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new GitHubError(getMessage('api_errorReading', [response.status]), response.status);
    }

    const data = await response.json();
    const content = decodeBase64(data.content);

    return {
      content,
      sha: data.sha,
    };
  }

  /**
   * Create or update a file in the repository.
   * @param {string} path - File path within the repo
   * @param {string} content - File content (will be base64-encoded)
   * @param {string} message - Commit message
   * @param {string|null} sha - SHA of the existing file (null for new files)
   * @returns {Promise<{sha: string, commitSha: string}>}
   */
  async createOrUpdateFile(path, content, message, sha = null) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${path}`;

    const body = {
      message,
      content: encodeBase64(content),
      branch: this.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await this._fetch(url, {
      method: 'PUT',
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
    return {
      sha: data.content.sha,
      commitSha: data.commit.sha,
    };
  }

  /**
   * Get the SHA of the latest commit on the configured branch.
   * @returns {Promise<string>}
   */
  async getLatestCommitSha() {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/ref/heads/${this.branch}`;
    const response = await this._fetch(url);

    if (!response.ok) {
      throw new GitHubError(getMessage('api_branchNotFound', [this.branch]), response.status);
    }

    const data = await response.json();
    return data.object.sha;
  }

  // ---- Git Data API (atomic multi-file commits) ----

  /**
   * Get the commit object for a given SHA.
   * @param {string} commitSha
   * @returns {Promise<{sha: string, treeSha: string}>}
   */
  async getCommit(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits/${commitSha}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get commit ${commitSha}`, response.status);
    }
    const data = await response.json();
    return { sha: data.sha, treeSha: data.tree.sha };
  }

  /**
   * Get a tree (directory listing) recursively.
   * @param {string} treeSha - SHA of the tree
   * @returns {Promise<Array<{path: string, mode: string, type: string, sha: string, size?: number}>>}
   */
  async getTree(treeSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees/${treeSha}?recursive=1`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get tree ${treeSha}`, response.status);
    }
    const data = await response.json();
    return data.tree || [];
  }

  /**
   * Get a blob (file content) by SHA.
   * @param {string} blobSha
   * @returns {Promise<string>} Decoded UTF-8 content
   */
  async getBlob(blobSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/blobs/${blobSha}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(`Failed to get blob ${blobSha}`, response.status);
    }
    const data = await response.json();
    return decodeBase64(data.content);
  }

  /**
   * Create a new blob (file) in the repository.
   * @param {string} content - UTF-8 file content
   * @returns {Promise<string>} SHA of the created blob
   */
  async createBlob(content) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/blobs`;
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({ content, encoding: 'utf-8' }),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create blob', response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Create a new tree. Uses base_tree for incremental changes.
   * Each item can add/modify (mode + type + sha) or delete (sha = null) a file.
   *
   * @param {string|null} baseTreeSha - Base tree SHA for incremental update (null for full tree)
   * @param {Array<{path: string, mode: string, type: string, sha?: string|null, content?: string}>} items
   *   Use `content` for new data (GitHub creates the blob) or `sha` for an existing blob; `sha: null` deletes.
   * @returns {Promise<string>} SHA of the new tree
   */
  async createTree(baseTreeSha, items) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/trees`;
    const body = { tree: items };
    if (baseTreeSha) {
      body.base_tree = baseTreeSha;
    }
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new GitHubError(`Failed to create tree: ${err.message || response.status}`, response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Apply tree batches on top of base_tree (or null for a fresh tree). Each batch is one POST /git/trees.
   *
   * @param {string|null} baseTreeSha
   * @param {Array<Array<{path: string, mode: string, type: string, sha?: null, content?: string}>>} batches
   * @returns {Promise<string>} Final tree SHA
   */
  async buildLayeredTree(baseTreeSha, batches) {
    let sha = baseTreeSha;
    for (const batch of batches) {
      sha = await this.createTree(sha, batch);
    }
    return /** @type {string} */ (sha);
  }

  /**
   * Create a new commit.
   * @param {string} message - Commit message
   * @param {string} treeSha - SHA of the tree for this commit
   * @param {string|null} parentSha - SHA of the parent commit (null for initial commit)
   * @returns {Promise<string>} SHA of the new commit
   */
  async createCommit(message, treeSha, parentSha = null) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/commits`;
    const body = {
      message,
      tree: treeSha,
      parents: parentSha ? [parentSha] : [],
    };
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create commit', response.status);
    }
    const data = await response.json();
    return data.sha;
  }

  /**
   * Update an existing branch ref to point to a new commit.
   * @param {string} commitSha - SHA of the new commit
   * @returns {Promise<void>}
   */
  async updateRef(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/refs/heads/${this.branch}`;
    const response = await this._fetch(url, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitSha }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const msg = errBody?.message ? `Failed to update ref: ${errBody.message}` : 'Failed to update ref';
      throw new GitHubError(msg, response.status);
    }
  }

  /**
   * Create a new branch ref (for initial commit on an empty repo).
   * @param {string} commitSha - SHA of the commit to point to
   * @returns {Promise<void>}
   */
  async createRef(commitSha) {
    const url = `${API_BASE}/repos/${this.owner}/${this.repo}/git/refs`;
    const response = await this._fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${this.branch}`,
        sha: commitSha,
      }),
    });
    if (!response.ok) {
      throw new GitHubError('Failed to create ref', response.status);
    }
  }

  /**
   * List recent commits on the configured branch, optionally filtered by path.
   * @param {{ path?: string, perPage?: number }} [options]
   * @returns {Promise<Array<{sha: string, message: string, date: string, author: string}>>}
   */
  async listCommits({ path, perPage = 20 } = {}) {
    let url = `${API_BASE}/repos/${this.owner}/${this.repo}/commits?sha=${this.branch}&per_page=${perPage}`;
    if (path) url += `&path=${encodeURIComponent(path)}`;
    const response = await this._fetch(url);
    if (!response.ok) {
      throw new GitHubError(getMessage('api_listCommitsFailed', [response.status]), response.status);
    }
    const data = await response.json();
    return data.map(c => ({
      sha: c.sha,
      message: (c.commit?.message || '').split('\n')[0],
      date: c.commit?.committer?.date || c.commit?.author?.date || '',
      author: c.commit?.author?.name || c.author?.login || '',
    }));
  }

  /**
   * Perform an atomic multi-file commit using the Git Data API.
   * Builds trees with inline `content` on upload entries (GitHub creates blobs server-side), in layered
   * batches to respect payload limits — avoids thousands of POST /git/blobs and secondary rate limits (#51).
   * Handles empty repos (no existing branch/commit) by creating the initial commit.
   *
   * @param {string} message - Commit message
   * @param {Object<string, string|null>} fileChanges - Map of path -> content (null = delete)
   * @returns {Promise<string>} SHA of the new commit
   */
  async atomicCommit(message, fileChanges) {
    const commitOnExistingBranch = async (baseTreeSha, parentSha) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const newTreeSha = await this.buildLayeredTree(baseTreeSha, batches);
        const newCommitSha = await this.createCommit(message, newTreeSha, parentSha);
        try {
          await this.updateRef(newCommitSha);
          return newCommitSha;
        } catch (err) {
          const isRefUpdateConflict =
            err instanceof GitHubError &&
            (err.statusCode === 409 || err.statusCode === 422);
          const hasFastForwardHint =
            /fast.?forward|non-fast-forward|ref.*update/i.test(err.message) ||
            err.message?.includes('fast forward');
          // GitHub may return 409 with a generic conflict message during rapid consecutive updates.
          // Treat this as retryable and rebase on latest remote tip.
          const isNonFastForward =
            isRefUpdateConflict && (err.statusCode === 409 || hasFastForwardHint);

          if (!isNonFastForward || attempt >= 2) throw err;

          // Rebase on latest remote and retry
          const freshCommit = await this.getCommit(await this.getLatestCommitSha());
          baseTreeSha = freshCommit.treeSha;
          parentSha = freshCommit.sha;
        }
      }
      throw new GitHubError('Failed to update ref after retries', 409);
    };

    // 1. Try to get current commit and tree (may not exist for empty repos)
    let currentCommitSha = null;
    let currentTreeSha = null;
    let isEmptyRepo = false;

    try {
      currentCommitSha = await this.getLatestCommitSha();
      const commit = await this.getCommit(currentCommitSha);
      currentTreeSha = commit.treeSha;
    } catch (err) {
      if (err instanceof GitHubError && (err.statusCode === 404 || err.statusCode === 409)) {
        // Empty repo — no branch/commit exists yet
        isEmptyRepo = true;
      } else {
        throw err;
      }
    }

    // 2. Layered trees: deletions (sha null) + uploads (inline content → GitHub creates blobs).
    const deletions = [];
    const uploads = []; // { path, content }

    for (const [path, content] of Object.entries(fileChanges)) {
      if (content === null) {
        if (!isEmptyRepo) deletions.push(path);
      } else {
        uploads.push({ path, content });
      }
    }

    if (deletions.length === 0 && uploads.length === 0) {
      return currentCommitSha; // Nothing to commit
    }

    const batches = chunkAtomicCommitTreeBatches(deletions, uploads);

    // 3–5. Create tree layer(s), commit, and update ref (with retry on non-fast-forward)
    if (isEmptyRepo) {
      for (let attempt = 0; attempt < 4; attempt++) {
        const newTreeSha = await this.buildLayeredTree(null, batches);
        const newCommitSha = await this.createCommit(message, newTreeSha, null);
        try {
          await this.createRef(newCommitSha);
          return newCommitSha;
        } catch (err) {
          const isRefCreateConflict =
            err instanceof GitHubError &&
            (err.statusCode === 409 || err.statusCode === 422);
          if (!isRefCreateConflict) throw err;

          // Branch may have appeared between read/write calls (eventual consistency or parallel writer).
          // If we can read the latest branch tip, continue with normal fast-forward-safe update flow.
          try {
            const latestSha = await this.getLatestCommitSha();
            const freshCommit = await this.getCommit(latestSha);
            return await commitOnExistingBranch(freshCommit.treeSha, freshCommit.sha);
          } catch (readErr) {
            const branchStillUnavailable =
              readErr instanceof GitHubError &&
              (readErr.statusCode === 404 || readErr.statusCode === 409);
            if (!branchStillUnavailable || attempt >= 3) throw err;
          }
        }
      }
      throw new GitHubError('Failed to create initial branch ref after retries', 409);
    } else {
      return await commitOnExistingBranch(currentTreeSha, currentCommitSha);
    }
  }
}

/**
 * Custom error class for GitHub API errors.
 * Captures status code and original stacktrace.
 */
export class GitHubError extends Error {
  constructor(message, statusCode, originalError = null) {
    if (originalError && originalError.stack) {
      super(`${message}\nCaused by: ${originalError.stack}`);
    } else {
      super(message);
    }
    this.name = 'GitHubError';
    this.statusCode = statusCode;
    // Maintain V8 stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GitHubError);
    }
  }
}

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

/**
 * Decode a base64 string (handles Unicode).
 * GitHub returns content with newlines in the base64, so we strip them.
 * @param {string} base64
 * @returns {string}
 */
function decodeBase64(base64) {
  const cleaned = base64.replace(/\n/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}
