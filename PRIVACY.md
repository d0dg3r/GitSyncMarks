# Privacy Policy for GitSyncMarks

**Last updated:** June 6, 2026

## Overview

GitSyncMarks is an open-source browser extension (Chrome and Firefox) that syncs your browser bookmarks with a Git repository (GitHub, GitLab, Codeberg, Gitea, Forgejo, Gogs, or self-hosted instances). This privacy policy explains what GitSyncMarks accesses, how it is used, and what is **not** collected.

## Data Collected and Used

### Bookmarks

- GitSyncMarks reads your browser bookmarks using the Chrome Bookmarks API.
- Your bookmarks are serialized and sent **directly** to your own Git repository via the configured provider's REST API.
- Bookmarks are stored as individual JSON files (one per bookmark) in a repository **you own and control**.

### Git Personal Access Token

- You provide a Personal Access Token (PAT) to authenticate with your Git provider's API.
- The token is encrypted and stored locally in your browser using `chrome.storage.local` (AES-256-GCM encryption at rest).
- The token is sent **only** to your configured Git host (`api.github.com`, `gitlab.com`, `codeberg.org`, or a self-hosted origin you approve at runtime).
- The token is **never** sent to any other server or third party.

### Settings and Sync State

- Extension settings (repository name, branch, sync interval, etc.) are stored locally in your browser using `chrome.storage.sync`.
- Sync state (last sync timestamp, device ID, file SHAs) is stored locally using `chrome.storage.local`.
- A random device ID (UUID) is generated once and stored locally to identify the syncing device.
- **Local backups**: before a pull or merge replaces your bookmarks, the previous bookmark files are kept in `chrome.storage.local` on your device (the last three). They never leave the device, and you can restore them from the popup.
- **Token expiry**: for GitHub fine-grained tokens, the expiry date is read from the API response and stored locally, so the popup can warn you before the token stops working.
- **Diagnostics**: "Copy diagnostics" copies a plain-text summary to your clipboard, for example for a bug report. It contains no token and no repository or mirror names. Nothing is sent anywhere by the extension.

### Bitwarden / Vaultwarden backup (optional)

- If you use **Files → Bitwarden Backup**, you upload an export file you created in Bitwarden or Vaultwarden yourself.
- GitSyncMarks validates that the file looks like a **password-protected encrypted JSON** export and may optionally wrap it with an additional password (`gitsyncmarks-enc:v2`) before pushing to **your** Git repository.
- The extension **does not** connect to Bitwarden or Vaultwarden servers, **does not** store your Bitwarden master password, and **does not** decrypt vault contents. Only ciphertext is stored in Git.
- An optional Git backup password is kept in `chrome.storage.local` on your device only, per profile (`bitwardenBackupPassword:{profileId}`), encrypted with a key that stays in the browser's IndexedDB.

### Settings sync and exports

- The settings sync password (`settingsSyncPassword`) is encrypted on your device in the same way and is never synced.
- Settings files written to your repository (`settings.enc`) and password-protected exports use the `gitsyncmarks-enc:v2` format: PBKDF2-SHA256 with 600,000 iterations, and the iteration count is stored in the file. Files written by older versions (v1) can still be read.
- The plain-JSON settings export contains **no** tokens. To move tokens to another device, use the password-encrypted export.

## Data NOT Collected

- **No analytics or tracking**: GitSyncMarks does not use any analytics, telemetry, or tracking tools.
- **No external servers**: GitSyncMarks does not communicate with any server other than the Git provider APIs you configure (e.g. `api.github.com`, `gitlab.com`, `codeberg.org`, or self-hosted origins granted at runtime). There is no backend, no proxy, and no intermediary server.
- **No personal information**: GitSyncMarks does not collect your name, email, IP address, or any other personal information.
- **No data sharing**: Your data is never shared with, sold to, or disclosed to any third party.
- **No remote code**: GitSyncMarks does not load or execute any remote code.

## Data Storage

All data is stored locally in your browser or in your own GitHub repository. GitSyncMarks has no server-side component and no database.

## Data Deletion

- Uninstalling the extension removes all locally stored data (settings, sync state, device ID).
- Bookmarks stored in your GitHub repository remain there until you delete them manually.

## Permissions Used

| Permission | Reason |
|------------|--------|
| `bookmarks` | Read and write bookmarks for synchronization |
| `storage` | Store extension settings and sync state locally |
| `alarms` | Schedule periodic sync checks |
| `notifications` | Show sync success or failure notifications (user-configurable) |
| `host_permissions (api.github.com, gitlab.com, codeberg.org)` | Communicate with GitHub, GitLab.com, and Codeberg APIs to read/write bookmark files |
| Runtime host permission (self-hosted) | Optional grant when you enter a custom server URL for Gitea, Forgejo, Gogs, GitLab, or GitHub Enterprise |

## Open Source

GitSyncMarks is fully open source. You can review the complete source code at:
https://github.com/d0dg3r/GitSyncMarks

## Contact

If you have any questions about this privacy policy, please open an issue on the GitHub repository:
https://github.com/d0dg3r/GitSyncMarks/issues

## Changes to This Policy

Any changes to this privacy policy will be reflected in this document and committed to the repository with a clear changelog.
