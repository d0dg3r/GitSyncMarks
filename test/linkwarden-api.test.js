import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

let LinkwardenAPI;
let calls;

function mockFetch(handler) {
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    const res = handler ? handler(url, options) : {};
    const status = res.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: res.statusText || 'OK',
      json: async () => res.body ?? {},
    };
  };
}

before(async () => {
  const mod = await import('../lib/linkwarden-api.js');
  LinkwardenAPI = mod.LinkwardenAPI;
});

beforeEach(() => {
  calls = [];
});

describe('LinkwardenAPI', () => {
  it('strips trailing slashes from the base URL', () => {
    const api = new LinkwardenAPI('https://lw.example.com///', 'tok');
    assert.equal(api.baseUrl, 'https://lw.example.com');
  });

  it('testConnection hits the collections endpoint with a Bearer header', async () => {
    mockFetch(() => ({ body: { response: [] } }));
    const api = new LinkwardenAPI('https://lw.example.com', 'tok123');
    assert.equal(await api.testConnection(), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://lw.example.com/api/v1/collections?limit=1');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer tok123');
  });

  it('testConnection throws a descriptive error on failure', async () => {
    mockFetch(() => ({ status: 401, statusText: 'Unauthorized', body: { error: 'Invalid token' } }));
    const api = new LinkwardenAPI('https://lw.example.com', 'bad');
    await assert.rejects(() => api.testConnection(), /Connection failed.*Invalid token/);
  });

  it('saveLink builds the expected JSON payload', async () => {
    mockFetch(() => ({ body: { response: { id: 1 } } }));
    const api = new LinkwardenAPI('https://lw.example.com', 'tok');
    await api.saveLink({
      url: 'https://example.com',
      name: 'Example',
      collectionId: '42',
      tags: ['dev', ' ops '],
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, 'POST');
    assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.url, 'https://example.com');
    assert.equal(payload.name, 'Example');
    assert.deepEqual(payload.collection, { id: 42 });
    assert.deepEqual(payload.tags, [{ name: 'dev' }, { name: 'ops' }]);
  });

  it('saveLink also accepts { name } tag objects (auto-save mirror shape)', async () => {
    mockFetch(() => ({ body: { response: { id: 1 } } }));
    const api = new LinkwardenAPI('https://lw.example.com', 'tok');
    await api.saveLink({ url: 'https://example.com', name: 'X', tags: [{ name: 'dev' }, { name: ' ops ' }] });
    const payload = JSON.parse(calls[0].options.body);
    assert.deepEqual(payload.tags, [{ name: 'dev' }, { name: 'ops' }]);
  });

  it('getLinkByUrl matches ignoring trailing slashes', async () => {
    mockFetch(() => ({
      body: { response: [
        { id: 7, url: 'https://example.com/page/' },
        { id: 8, url: 'https://other.com' },
      ] },
    }));
    const api = new LinkwardenAPI('https://lw.example.com', 'tok');
    const found = await api.getLinkByUrl('https://example.com/page');
    assert.equal(found.id, 7);
  });
});
