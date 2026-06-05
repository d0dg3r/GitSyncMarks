import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { GitLabAPI } from '../lib/providers/gitlab-api.js';

/** @type {typeof globalThis.fetch|null} */
let originalFetch = null;

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('GitLabAPI', () => {
  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('validateToken returns valid on 200 user', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/user')) {
        return jsonResponse({ username: 'alice' });
      }
      if (String(url).endsWith('/personal_access_tokens/self')) {
        return jsonResponse({ scopes: ['api'] });
      }
      return jsonResponse({}, 404);
    };
    const api = new GitLabAPI({ token: 't', owner: 'o', repo: 'r' });
    const result = await api.validateToken();
    assert.equal(result.valid, true);
    assert.equal(result.username, 'alice');
    assert.deepEqual(result.scopes, ['api']);
  });

  it('validateToken returns invalid on 401', async () => {
    globalThis.fetch = async () => jsonResponse({}, 401);
    const api = new GitLabAPI({ token: 'bad', owner: 'o', repo: 'r' });
    const result = await api.validateToken();
    assert.equal(result.valid, false);
  });

  it('getFile returns null on 404', async () => {
    globalThis.fetch = async () => jsonResponse({ message: '404' }, 404);
    const api = new GitLabAPI({ token: 't', owner: 'u', repo: 'r' });
    const file = await api.getFile('bookmarks/a.json');
    assert.equal(file, null);
  });

  it('getFile decodes content on 200', async () => {
    globalThis.fetch = async (url) => {
      assert.match(String(url), /repository\/files/);
      return jsonResponse({
        content: Buffer.from('{"title":"x"}').toString('base64'),
        blob_id: 'blob1',
        last_commit_id: 'commit1',
      });
    };
    const api = new GitLabAPI({ token: 't', owner: 'u', repo: 'r' });
    const file = await api.getFile('bookmarks/a.json');
    assert.equal(file.content, '{"title":"x"}');
    assert.equal(file.sha, 'commit1');
  });

  it('getRecursiveTreeForCommit follows Link pagination', async () => {
    let calls = 0;
    globalThis.fetch = async (url) => {
      calls += 1;
      if (calls === 1) {
        return jsonResponse(
          [{ id: '1', path: 'a.json', type: 'blob' }],
          200,
          { Link: '<https://gitlab.com/api/v4/projects/x/repository/tree?page=2>; rel="next"' }
        );
      }
      return jsonResponse([{ id: '2', path: 'b.json', type: 'blob' }]);
    };
    const api = new GitLabAPI({ token: 't', owner: 'g', repo: 'p' });
    const tree = await api.getRecursiveTreeForCommit('main');
    assert.equal(tree.tree.length, 2);
    assert.equal(calls, 2);
  });

  it('createOrUpdateFile uses POST for new files and PUT for updates', async () => {
    const methods = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method || 'GET');
      return jsonResponse({ id: 'commit-sha', blob_id: 'blob-sha' });
    };
    const api = new GitLabAPI({ token: 't', owner: 'u', repo: 'r' });
    await api.createOrUpdateFile('new.json', '{}', 'msg', null);
    await api.createOrUpdateFile('old.json', '{}', 'msg', 'prev-commit');
    assert.deepEqual(methods, ['POST', 'PUT']);
  });

  it('atomicCommit sends single POST with actions array', async () => {
    const bodies = [];
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes('/repository/branches/')) {
        return jsonResponse({ commit: { id: 'head1234567890' } });
      }
      if (u.includes('/repository/tree')) {
        return jsonResponse([{ id: '1', path: 'existing.json', type: 'blob' }]);
      }
      if (u.includes('/repository/commits') && init?.method === 'POST') {
        bodies.push(JSON.parse(String(init.body)));
        return jsonResponse({ id: 'newcommit123' });
      }
      return jsonResponse({}, 404);
    };
    const api = new GitLabAPI({ token: 't', owner: 'u', repo: 'r', branch: 'main' });
    const sha = await api.atomicCommit('sync', {
      'new.json': '{"a":1}',
      'existing.json': '{"b":2}',
      'gone.json': null,
    });
    assert.equal(sha, 'newcommit123');
    assert.equal(bodies.length, 1);
    assert.equal(bodies[0].actions.length, 2);
    const byPath = Object.fromEntries(bodies[0].actions.map((a) => [a.file_path, a.action]));
    assert.equal(byPath['new.json'], 'create');
    assert.equal(byPath['existing.json'], 'update');
  });

  it('_projectPath URL-encodes subgroup owner', () => {
    const api = new GitLabAPI({ token: 't', owner: 'group/sub', repo: 'project' });
    assert.equal(api._projectPath(), encodeURIComponent('group/sub/project'));
  });
});
