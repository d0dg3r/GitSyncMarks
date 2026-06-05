# Git Provider Abstraction

GitSyncMarks syncs bookmarks through a provider-agnostic client interface. Each profile selects a Git provider and stores provider-specific connection settings.

## Providers

| Provider | ID | API base | Auth header |
|---|---|---|---|
| GitHub | `github` | `https://api.github.com` (default) or `{serverUrl}/api/v3` | `Authorization: Bearer {token}` |
| Gitea / Forgejo | `gitea` | `{serverUrl}/api/v1` | `Authorization: token {token}` |

Per-profile settings (`chrome.storage.sync.profiles[id]`):

- `gitProvider` — `github` (default) or `gitea`
- `serverUrl` — required for Gitea; optional for GitHub Enterprise
- `owner`, `repo`, `branch`, `filePath` — repository target (unchanged)
- Encrypted token in `chrome.storage.local.profileTokens[id]`

Factory entry point: `createGitProvider()` in [lib/git-provider.js](../lib/git-provider.js). Sync code uses `createApi()` in [lib/sync-settings.js](../lib/sync-settings.js).

## Provider contract

Both adapters implement:

- Token / user: `validateToken`, `getAuthenticatedUser`, `listUserRepos`
- Repository: `checkRepo`, `createRepository`, `listContents`, `getFile`, `createOrUpdateFile`
- Git data reads: `getLatestCommitSha`, `getCommit`, `getCommitTreeSha`, `getTree`, `getBlob`, `listCommits`
- Writes: `atomicCommit(message, fileChanges)`
- UI: `webBaseUrl()`, `providerId`

Errors use `GitProviderError` (`GitHubError` extends it for backward compatibility).

## Gitea write path

GitHub `atomicCommit` uses layered `POST /git/trees` with inline content. Gitea uses the **Contents API** (`POST` for new files, `PUT` for updates), one commit per changed file. This avoids the batch Change Files endpoint (`POST /repos/{owner}/{repo}/contents`), which often returns misleading 401 responses on empty repositories or older Forgejo builds.

Implementation: [lib/providers/gitea-api.js](../lib/providers/gitea-api.js). [lib/sync-core.js](../lib/sync-core.js) adds a secondary Contents-API fallback for Gitea when a write still fails.

For Gitea profiles, [`lib/remote-fetch.js`](../lib/remote-fetch.js) `buildRemoteMaps()` reads bookmarks via the Contents API first (same path as writes). Git tree endpoints are not used for pull/sync on Gitea. Ref cascade: commit SHA, branch name, then `refs/heads/{branch}`. Debug logs record each Contents attempt.

Reads (recursive tree + blobs) use the same paths as GitHub-compatible Gitea endpoints, so [lib/remote-fetch.js](../lib/remote-fetch.js) is unchanged.

## Host permissions

- GitHub: `https://api.github.com/*` in manifest `host_permissions`
- Gitea: self-hosted origin granted at runtime via `chrome.permissions.request()` when saving a Gitea server URL ([lib/host-permissions.js](../lib/host-permissions.js)). Chrome uses existing `optional_host_permissions` (`<all_urls>`); Firefox uses `https://*/*`.

## Commit links

Popup and history UIs build commit URLs with `buildCommitUrl()` using `webBaseUrl()`:

- GitHub: `https://github.com/{owner}/{repo}/commit/{sha}`
- Gitea: `{serverUrl}/{owner}/{repo}/commit/{sha}`

## Git repos bookmark folder

[lib/github-repos.js](../lib/github-repos.js) lists the authenticated user's repositories for both providers. Folder name prefix:

- GitHub: `GitHubRepos ({login})`
- Gitea: `GiteaRepos ({login})`

## Verified target

Develop and test against Gitea / Forgejo **≥ 1.19**. Writes use the Contents API; large first syncs create one commit per file.
