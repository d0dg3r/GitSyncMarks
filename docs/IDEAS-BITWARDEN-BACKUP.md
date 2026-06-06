# Bitwarden / Vaultwarden Backup to Git

**Status:** Shipped in v3.0.0-beta.6 (Phase 1 — manual upload)  
**Created:** June 2026

---

## Scope

Users export a **password-protected encrypted JSON** vault from Bitwarden or Vaultwarden (web app, mobile, desktop, or CLI) and store it in their Git repository as a versioned backup. GitSyncMarks validates the file, optionally wraps it with an additional `gitsyncmarks-enc:v1` layer, commits via the configured Git provider, and lists, downloads, or deletes backups from the remote.

**Out of scope (Phase 1):** Bitwarden API login, automatic vault export, vault import, decryption of vault contents, ZIP exports with attachments.

---

## User workflow

1. In Bitwarden: Settings → Export vault → **JSON (Encrypted)** → **Password protected**.
2. In GitSyncMarks: Files → **Bitwarden Backup** → choose file → **Upload & push** (optional additional Git encryption).
3. Alternatively: `bw export --format encrypted_json --password '…'` and `git add backups/bitwarden/`.

---

## Repository layout

```
backups/bitwarden/
  vault-2026-06-06T14-30-00-000Z.enc.json          # Bitwarden encryption only
  vault-2026-06-06T15-00-00-000Z.gitsyncmarks.enc  # + GitSyncMarks wrap
```

Default path: `backups/bitwarden` (repo root, configurable per profile in `chrome.storage.sync` as `bitwardenBackupPath`).

---

## Security model

| Layer | Decrypted by |
|-------|----------------|
| Bitwarden password-protected JSON | User in Bitwarden on import |
| GitSyncMarks `gitsyncmarks-enc:v1` (optional) | User with local Git backup password on download |

Plaintext JSON/CSV uploads are rejected. Maximum upload size: 25 MB.

Local secrets: `bitwardenBackupPassword:{profileId}` in `chrome.storage.local` (never synced to Git; one password per profile on this device).

---

## Implementation

| Module | Role |
|--------|------|
| `lib/bitwarden-backup.js` | Validation, path builder, push/list/download/delete |
| `lib/sync-diff.js` | Excludes `backups/bitwarden/` from bookmark diff |
| `options/bitwarden-backup.js` | Options UI |
| `background.js` | Message actions: `pushBitwardenBackup`, `listBitwardenBackups`, `downloadBitwardenBackup`, `deleteBitwardenBackup`, `setBitwardenBackupPassword` |

Bookmark sync and three-way merge ignore backup paths (same pattern as `settings.enc`).

---

## Vaultwarden

Self-hosted Vaultwarden uses the same export formats and CLI (`bw`) against the instance URL. GitSyncMarks does not call the Vaultwarden API.
