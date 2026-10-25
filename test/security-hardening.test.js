import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let decryptWithPassword, isPasswordEncrypted;
let normalizeServerUrl, isPrivateHost;
let redactSecrets;
let stripExportTokens;

before(async () => {
  ({ decryptWithPassword, isPasswordEncrypted } = await import('../lib/crypto.js'));
  ({ normalizeServerUrl, isPrivateHost } = await import('../lib/git-provider-common.js'));
  ({ redactSecrets } = await import('../lib/debug-log.js'));
  ({ stripExportTokens } = await import('../lib/settings-export.js'));
});

/** Builds a blob in the legacy v1 format (fixed 100k iterations, no iteration line). */
async function encryptV1(plaintext, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, material, 256);
  const key = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const b64 = (buf) => Buffer.from(new Uint8Array(buf)).toString('base64');
  return ['gitsyncmarks-enc:v1', b64(salt), b64(iv), b64(ciphertext)].join('\n');
}

describe('password-encrypted format', () => {
  it('still decrypts the legacy v1 format', async () => {
    const blob = await encryptV1('{"profiles":{}}', 'old-password');
    assert.equal(isPasswordEncrypted(blob), true);
    assert.equal(await decryptWithPassword(blob, 'old-password'), '{"profiles":{}}');
  });

  it('rejects an out-of-range iteration count from a file', async () => {
    const blob = ['gitsyncmarks-enc:v2', '5', 'AAAAAAAAAAAAAAAAAAAAAA==', 'AAAAAAAAAAAAAA==', 'AAAA'].join('\n');
    await assert.rejects(() => decryptWithPassword(blob, 'pw'), /Invalid encrypted format/);
  });

  it('recognises v1, v2 and rejects plain text', () => {
    assert.equal(isPasswordEncrypted('gitsyncmarks-enc:v1\nx'), true);
    assert.equal(isPasswordEncrypted('gitsyncmarks-enc:v2\n600000'), true);
    assert.equal(isPasswordEncrypted('{"bookmarks":[]}'), false);
  });
});

describe('server URL scheme', () => {
  it('upgrades http:// to https:// for a public host', () => {
    assert.equal(normalizeServerUrl('http://git.example.com/api/v4'), 'https://git.example.com');
  });

  it('keeps http:// for private and LAN hosts', () => {
    assert.equal(normalizeServerUrl('http://forgejo.lan:3000'), 'http://forgejo.lan:3000');
    assert.equal(normalizeServerUrl('http://192.168.1.20:3000'), 'http://192.168.1.20:3000');
    assert.equal(normalizeServerUrl('http://localhost:3000'), 'http://localhost:3000');
  });

  it('leaves https:// untouched', () => {
    assert.equal(normalizeServerUrl('https://gitlab.com'), 'https://gitlab.com');
  });

  it('isPrivateHost matches loopback, RFC 1918 and LAN names only', () => {
    assert.equal(isPrivateHost('10.20.1.5'), true);
    assert.equal(isPrivateHost('172.20.0.1'), true);
    assert.equal(isPrivateHost('172.32.0.1'), false);
    assert.equal(isPrivateHost('github.com'), false);
  });
});

describe('debug log redaction', () => {
  it('masks GitHub, GitLab and bearer tokens', () => {
    const text = redactSecrets('auth ghp_abcdefghijklmnopqrstuvwx and glpat-abcdefghijklmnopqrst');
    assert.ok(!text.includes('ghp_abcdef'));
    assert.ok(!text.includes('glpat-abcdef'));
    assert.match(text, /\[redacted\]/);
    assert.ok(!redactSecrets('Bearer abc.def.ghi').includes('abc.def'));
  });

  it('keeps the key of key=value pairs and masks the value', () => {
    assert.equal(redactSecrets('token=supersecret value ok'), 'token=[redacted] value ok');
    assert.equal(redactSecrets('{"password":"hunter2"}'), '{"password":"[redacted]"}');
  });

  it('leaves ordinary text alone', () => {
    assert.equal(redactSecrets('sync() done [12.3ms]'), 'sync() done [12.3ms]');
  });
});

describe('stripExportTokens', () => {
  it('removes primary and mirror tokens and keeps the rest of the profile', () => {
    const out = stripExportTokens({
      profiles: {
        p1: { name: 'Work', owner: 'me', repo: 'marks', token: 'ghp_x', mirrorTokens: { m1: 'y' } },
      },
      otherKey: 1,
    });
    assert.deepEqual(out.profiles.p1, { name: 'Work', owner: 'me', repo: 'marks' });
    assert.equal(out.otherKey, 1);
  });
});
