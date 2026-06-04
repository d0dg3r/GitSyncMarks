import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

let encryptWithPassword, decryptWithPassword, PASSWORD_ENC_PREFIX;

before(async () => {
  const mod = await import('../lib/crypto.js');
  encryptWithPassword = mod.encryptWithPassword;
  decryptWithPassword = mod.decryptWithPassword;
  PASSWORD_ENC_PREFIX = mod.PASSWORD_ENC_PREFIX;
});

describe('encryptWithPassword / decryptWithPassword', () => {
  it('round-trips plaintext with the correct password', async () => {
    const plaintext = JSON.stringify({ token: 'ghp_secret', profiles: { a: 1 } });
    const encrypted = await encryptWithPassword(plaintext, 'hunter2');
    assert.notEqual(encrypted, plaintext);
    const decrypted = await decryptWithPassword(encrypted, 'hunter2');
    assert.equal(decrypted, plaintext);
  });

  it('produces the documented header and four lines', async () => {
    const encrypted = await encryptWithPassword('data', 'pw');
    const lines = encrypted.split('\n');
    assert.equal(lines.length, 4);
    assert.equal(lines[0], PASSWORD_ENC_PREFIX);
  });

  it('uses a fresh salt/iv so identical inputs differ', async () => {
    const a = await encryptWithPassword('same', 'pw');
    const b = await encryptWithPassword('same', 'pw');
    assert.notEqual(a, b);
  });

  it('throws on a wrong password', async () => {
    const encrypted = await encryptWithPassword('top secret', 'right');
    await assert.rejects(() => decryptWithPassword(encrypted, 'wrong'), /Decryption failed/);
  });

  it('throws when the password is empty', async () => {
    await assert.rejects(() => encryptWithPassword('x', ''), /Password is required/);
    await assert.rejects(() => decryptWithPassword('x', ''), /Password is required/);
  });

  it('throws on an invalid encrypted format', async () => {
    await assert.rejects(() => decryptWithPassword('not-our-format', 'pw'), /Invalid encrypted format/);
  });

  it('round-trips unicode content', async () => {
    const plaintext = 'Lesezeichen — 日本語 — emoji 🔖';
    const encrypted = await encryptWithPassword(plaintext, 'pä$$wörd');
    assert.equal(await decryptWithPassword(encrypted, 'pä$$wörd'), plaintext);
  });
});
