# Privacy Policy for GitSyncMarks

**Last updated:** February 8, 2026

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
