import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackupPath,
  formatBackupTimestamp,
  isBitwardenEncryptedExport,
  isPlaintextBitwardenJson,
  looksLikeBitwardenCsv,
  normalizeBackupPath,
  validateBitwardenExportContent,
  prepareBackupPayload,
  isBitwardenBackupPath,
  unwrapGitEncryptionLayer,
} from '../lib/bitwarden-backup.js';
import { encryptWithPassword, decryptWithPassword } from '../lib/crypto.js';

const ENCRYPTED_FIXTURE = JSON.stringify({
  encrypted: true,
  passwordProtected: true,
  salt: 'abc',
  kdfIterations: 100000,
  kdfType: 0,
  encKeyValidation_DO_NOT_EDIT: 'validation-token',
  data: 'ciphertext-here',
});

const PLAINTEXT_FIXTURE = JSON.stringify({
  encrypted: false,
  items: [
    {
      type: 1,
      name: 'Example',
      login: { username: 'user', password: 'secret-password', uris: [] },
    },
  ],
});

describe('bitwarden backup helpers', () => {
  it('normalizes backup path', () => {
    assert.equal(normalizeBackupPath('/backups/bitwarden/'), 'backups/bitwarden');
    assert.equal(normalizeBackupPath(''), 'backups/bitwarden');
  });

  it('builds timestamped backup paths', () => {
    const date = new Date('2026-06-06T14:30:00.000Z');
    assert.equal(
      buildBackupPath('backups/bitwarden', date, 'bitwarden'),
      'backups/bitwarden/vault-2026-06-06T14-30-00-000Z.enc.json'
    );
    assert.equal(
      buildBackupPath('backups/bitwarden', date, 'gitsyncmarks'),
      'backups/bitwarden/vault-2026-06-06T14-30-00-000Z.gitsyncmarks.enc'
    );
  });

  it('formatBackupTimestamp replaces colons', () => {
    const ts = formatBackupTimestamp(new Date('2026-01-02T03:04:05.006Z'));
    assert.match(ts, /^2026-01-02T03-04-05/);
  });

  it('detects encrypted vs plaintext exports', () => {
    assert.equal(isBitwardenEncryptedExport(JSON.parse(ENCRYPTED_FIXTURE)), true);
    assert.equal(isPlaintextBitwardenJson(JSON.parse(PLAINTEXT_FIXTURE)), true);
    assert.equal(isBitwardenEncryptedExport(JSON.parse(PLAINTEXT_FIXTURE)), false);
  });

  it('detects CSV exports', () => {
    assert.equal(looksLikeBitwardenCsv('folder,collections,type,name\n'), true);
    assert.equal(looksLikeBitwardenCsv(ENCRYPTED_FIXTURE), false);
  });

  it('validates encrypted export and rejects plaintext', () => {
    assert.deepEqual(validateBitwardenExportContent(ENCRYPTED_FIXTURE), { ok: true });
    const bad = validateBitwardenExportContent(PLAINTEXT_FIXTURE);
    assert.equal(bad.ok, false);
    assert.equal(bad.code, 'PLAINTEXT_JSON');
  });

  it('re-encrypt roundtrip via prepareBackupPayload', async () => {
    const { content, mode } = await prepareBackupPayload(ENCRYPTED_FIXTURE, true, 'wrap-secret');
    assert.equal(mode, 'gitsyncmarks');
    assert.ok(content.startsWith('gitsyncmarks-enc:v1'));
    const plain = await decryptWithPassword(content, 'wrap-secret');
    assert.equal(plain, ENCRYPTED_FIXTURE);
  });

  it('unwrapGitEncryptionLayer decrypts with correct password', async () => {
    const { content } = await prepareBackupPayload(ENCRYPTED_FIXTURE, true, 'wrap-secret');
    const result = await unwrapGitEncryptionLayer(content, 'wrap-secret');
    assert.equal(result.ok, true);
    assert.equal(result.content, ENCRYPTED_FIXTURE);
    assert.equal(result.wrapped, false);
  });

  it('unwrapGitEncryptionLayer rejects wrong password', async () => {
    const { content } = await prepareBackupPayload(ENCRYPTED_FIXTURE, true, 'wrap-secret');
    const result = await unwrapGitEncryptionLayer(content, 'wrong-secret');
    assert.equal(result.ok, false);
    assert.match(result.message, /Wrong password/);
  });

  it('matches backup paths under configured prefix', () => {
    assert.equal(isBitwardenBackupPath('backups/bitwarden/vault.enc.json'), true);
    assert.equal(isBitwardenBackupPath('bookmarks/toolbar/foo.json'), false);
  });
});
