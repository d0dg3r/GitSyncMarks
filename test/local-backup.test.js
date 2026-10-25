import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// In-memory stand-in for chrome.storage.local.
let store = {};
globalThis.chrome = {
  storage: {
    local: {
      get: async (defaults) => ({ ...defaults, ...store }),
      set: async (obj) => { Object.assign(store, obj); },
    },
  },
};

const { saveLocalBackup, getLatestLocalBackupInfo, getLocalBackup, MAX_LOCAL_BACKUPS } =
  await import('../lib/local-backup.js');

describe('local backups', () => {
  beforeEach(() => { store = {}; });

  it('returns null when no backup was taken', async () => {
    assert.equal(await getLatestLocalBackupInfo(), null);
    assert.equal(await getLocalBackup(0), null);
  });

  it('stores the newest snapshot first and reports its metadata', async () => {
    await saveLocalBackup({ 'bm/toolbar/a.json': '{}' }, 'before-pull');
    await saveLocalBackup({ 'bm/toolbar/a.json': '{}', 'bm/toolbar/b.json': '{}' }, 'before-merge');
    const info = await getLatestLocalBackupInfo();
    assert.equal(info.reason, 'before-merge');
    assert.equal(info.fileCount, 2);
    assert.equal((await getLocalBackup(1)).reason, 'before-pull');
  });

  it('reads the newest metadata without the snapshot contents', async () => {
    await saveLocalBackup({ 'bm/toolbar/a.json': '{}' }, 'before-pull');
    assert.deepEqual(store.localBackupsInfo.map((i) => i.reason), ['before-pull']);
    delete store.localBackups; // metadata must be enough for the status
    const info = await getLatestLocalBackupInfo();
    assert.equal(info.reason, 'before-pull');
    assert.equal(info.fileCount, 1);
  });

  it('keeps only the most recent snapshots', async () => {
    for (let i = 0; i < MAX_LOCAL_BACKUPS + 2; i += 1) {
      await saveLocalBackup({ 'bm/x': String(i) }, `r${i}`);
    }
    assert.equal(store.localBackups.length, MAX_LOCAL_BACKUPS);
    assert.equal((await getLocalBackup(0)).reason, `r${MAX_LOCAL_BACKUPS + 1}`);
  });
});
