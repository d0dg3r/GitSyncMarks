/**
 * In-memory GitHub Git Data API, enough for the GitSyncMarks GitHub adapter.
 * Install with `globalThis.fetch = fake.fetch`. Blobs, trees and commits are kept in maps;
 * the branch is one pointer. Unknown routes answer 404 so a missing endpoint fails loudly.
 */

import { createHash } from 'node:crypto';

const sha1 = (text) => createHash('sha1').update(text).digest('hex');
const gitBlobSha = (content) => sha1(`blob ${Buffer.byteLength(content)}\0${content}`);

export function createFakeGitHub({ owner = 'alice', repo = 'marks', branch = 'main' } = {}) {
  const blobs = new Map(); // sha → content
  const trees = new Map(); // sha → Map<path, {sha}>
  const commits = new Map(); // sha → {sha, treeSha}
  let head = null; // commit sha of the branch, null while the repo is empty
  let counter = 0;
  const unknown = [];
  const requests = []; // "METHOD /path" of every request, in order
  const failures = new Map(); // "METHOD /path-prefix" → HTTP status to answer once

  const json = (status, body) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const treeOf = (sha) => trees.get(sha) || new Map();

  function createTree(baseTreeSha, items) {
    const entries = new Map(baseTreeSha ? treeOf(baseTreeSha) : []);
    for (const item of items) {
      if (item.sha === null) {
        entries.delete(item.path);
        continue;
      }
      let blobSha = item.sha;
      if (item.content !== undefined) {
        blobSha = gitBlobSha(item.content);
        blobs.set(blobSha, item.content);
      }
      entries.set(item.path, { sha: blobSha });
    }
    const sha = sha1(`tree-${++counter}-${JSON.stringify([...entries.keys()])}`);
    trees.set(sha, entries);
    return sha;
  }

  async function handle(method, path, body) {
    const base = `/repos/${owner}/${repo}`;
    requests.push(`${method} ${path}`);
    for (const [key, status] of failures) {
      const [failMethod, failPrefix] = key.split(' ');
      if (method === failMethod && path.startsWith(base + failPrefix)) {
        failures.delete(key);
        return json(status, { message: `fake GitHub: forced ${status}` });
      }
    }
    if (method === 'GET' && path === '/user') return json(200, { login: owner });
    if (method === 'GET' && path === base) return json(200, { name: repo, default_branch: branch });
    if (method === 'GET' && path === `${base}/git/ref/heads/${branch}`) {
      return head ? json(200, { object: { sha: head } }) : json(404, { message: 'Not Found' });
    }
    if (method === 'GET' && path.startsWith(`${base}/git/commits/`)) {
      const commit = commits.get(path.slice(`${base}/git/commits/`.length));
      return commit ? json(200, { sha: commit.sha, tree: { sha: commit.treeSha } }) : json(404, { message: 'Not Found' });
    }
    if (method === 'GET' && path.startsWith(`${base}/git/trees/`)) {
      const treeSha = path.slice(`${base}/git/trees/`.length).split('?')[0];
      const entries = [...treeOf(treeSha)].map(([p, e]) => ({ path: p, mode: '100644', type: 'blob', sha: e.sha }));
      return json(200, { sha: treeSha, tree: entries, truncated: false });
    }
    if (method === 'GET' && path.startsWith(`${base}/git/blobs/`)) {
      const content = blobs.get(path.slice(`${base}/git/blobs/`.length));
      return content === undefined
        ? json(404, { message: 'Not Found' })
        : json(200, { content: Buffer.from(content).toString('base64'), encoding: 'base64' });
    }
    if (method === 'POST' && path === `${base}/git/blobs`) {
      const sha = gitBlobSha(body.content);
      blobs.set(sha, body.content);
      return json(201, { sha });
    }
    if (method === 'POST' && path === `${base}/git/trees`) {
      return json(201, { sha: createTree(body.base_tree || null, body.tree || []) });
    }
    if (method === 'POST' && path === `${base}/git/commits`) {
      const sha = sha1(`commit-${++counter}-${body.message}`);
      commits.set(sha, { sha, treeSha: body.tree, parents: body.parents });
      return json(201, { sha });
    }
    if (method === 'POST' && path === `${base}/git/refs`) {
      head = body.sha;
      return json(201, { ref: body.ref, object: { sha: body.sha } });
    }
    if (method === 'PATCH' && path === `${base}/git/refs/heads/${branch}`) {
      head = body.sha;
      return json(200, { object: { sha: body.sha } });
    }
    unknown.push(`${method} ${path}`);
    return json(404, { message: `fake GitHub: no route for ${method} ${path}` });
  }

  return {
    /** Fetch replacement: only api.github.com is served, everything else fails. */
    async fetch(url, init = {}) {
      const parsed = new URL(String(url));
      if (parsed.hostname !== 'api.github.com') throw new TypeError(`unexpected host ${parsed.hostname}`);
      const body = init.body ? JSON.parse(init.body) : null;
      return handle((init.method || 'GET').toUpperCase(), parsed.pathname + parsed.search, body);
    },
    /** Test helper: the file map of the branch head, as {path: content}. */
    files() {
      if (!head) return {};
      const treeSha = commits.get(head).treeSha;
      return Object.fromEntries([...treeOf(treeSha)].map(([p, e]) => [p, blobs.get(e.sha)]));
    },
    /** Requests the fake could not serve; should stay empty. */
    unknownRoutes: unknown,
    /** Every request as "METHOD /path", in order. */
    requests,
    /** Path of a blob in the branch head (for checking which files were downloaded). */
    pathOfBlob(sha) {
      if (!head) return null;
      for (const [path, entry] of treeOf(commits.get(head).treeSha)) {
        if (entry.sha === sha) return path;
      }
      return null;
    },
    /** Answer the next request matching method and repo-relative path prefix with `status`. */
    failNext(method, pathPrefix, status) {
      failures.set(`${method} ${pathPrefix}`, status);
    },
  };
}
