# Git Provider Abstraction

GitSyncMarks syncs bookmarks through a provider-agnostic client interface. Each profile selects a Git provider and stores provider-specific connection settings.

## Capability map

Provider behavior is defined in `PROVIDER_CAPS` in [lib/git-provider-common.js](../lib/git-provider-common.js). UI, host permissions, read/write paths, and folder prefixes read from this table instead of hard-coded `=== 'gitea'` branches.

| Provider | ID | Adapter | API base | Auth | Self-hosted | Write strategy | Repo folder prefix |
|---|---|---|---|---|---|---|---|
| GitHub | `github` | `github` | `https://api.github.com` or `{serverUrl}/api/v3` | `Bearer` | optional (GHE) | `tree` | `GitHubRepos` |
| Gitea | `gitea` | `gitea` | `{serverUrl}/api/v1` | `token` | required | `contents` | `GiteaRepos` |
| Forgejo | `forgejo` | `gitea` | `{serverUrl}/api/v1` | `token` | required | `contents` | `ForgejoRepos` |
| Codeberg | `codeberg` | `gitea` | `https://codeberg.org/api/v1` (default) | `token` | fixed | `contents` | `CodebergRepos` |
| Gogs | `gogs` | `gitea` | `{serverUrl}/api/v1` | `token` | required | `contents` | `GogsRepos` |
| GitLab | `gitlab` | `gitlab` | `https://gitlab.com/api/v4` or `{serverUrl}/api/v4` | `Bearer` | optional | `gitlab_commits` | `GitLabRepos` |

Per-profile settings (`chrome.storage.sync.profiles[id]`):

- `gitProvider` — one of the IDs above (`github` default)
- `serverUrl` — required for self-hosted Gitea-family providers; optional for GitHub Enterprise and GitLab.com; preset for Codeberg
- `owner`, `repo`, `branch`, `filePath` — repository target (`owner` may contain slashes for GitLab subgroups)
- Encrypted token in `chrome.storage.local.profileTokens[id]`

Factory entry point: `createGitProvider()` in [lib/git-provider.js](../lib/git-provider.js). Sync code uses `createApi()` in [lib/sync-settings.js](../lib/sync-settings.js).

## Provider contract

All adapters implement:

- Token / user: `validateToken`, `getAuthenticatedUser`, `listUserRepos`
- Repository: `checkRepo`, `createRepository`, `listContents`, `getFile`, `createOrUpdateFile`
- Git data reads: `getLatestCommitSha`, `getCommit`, `getCommitTreeSha`, `getTree`, `getBlob`, `listCommits`
- Writes: `atomicCommit(message, fileChanges)`
- UI: `webBaseUrl()`, `providerId`

Errors use `GitProviderError` (`GitHubError` extends it for backward compatibility).

## Gitea-family write path (Gitea, Forgejo, Codeberg, Gogs)

Primary path: **git data API** — batched `POST /git/blobs`, layered `POST /git/trees` with **blob SHA references** (not inline `content`; that returns HTTP 404 on Codeberg), then `POST /git/commits` and ref update (**one commit** per push). Fallback: **Contents API** sequential (`POST`/`PUT`/`DELETE` per file, one commit per file) when git-data writes fail (empty repos, older instances).

Implementation: [lib/providers/gitea-api.js](../lib/providers/gitea-api.js) (shared adapter; `providerId` preserved for branding and URLs). [lib/sync-core.js](../lib/sync-core.js) adds a secondary per-file Contents fallback when `writeStrategy === 'contents'` and `atomicCommit` still throws.

For Gitea-family profiles, [`lib/remote-fetch.js`](../lib/remote-fetch.js) `buildRemoteMaps()` tries **git tree + batched blob GETs** first (`getRecursiveTreeForCommit`, concurrency 5). On failure, truncated tree, or empty listing under `basePath`, it falls back to the Contents API (`fetchFileMapViaContents` with ref cascade: commit SHA → branch → `refs/heads/{branch}`). Benchmark: [GITEA-PERFORMANCE.md](GITEA-PERFORMANCE.md).

### Gitea-family token validation

Connection test calls `GET /api/v1/user` when possible. Codeberg and Gitea ≥1.22 often issue **repository-scoped** tokens (`read:repository` / `write:repository`) that return **403** on `/user` without `read:user`. `GiteaAPI.validateToken()` treats that 403 as ambiguous-valid and continues with `checkRepo()` / path checks. `GiteaAPI._fetch()` does not throw on 401/403 (unlike `GitHubAPI._fetch`).

## GitLab write path

GitLab uses a **single atomic commit** via `POST /projects/{id}/repository/commits` with an `actions[]` array (`create`, `update`, `delete`). No per-file Contents-API fallback.

Implementation: [lib/providers/gitlab-api.js](../lib/providers/gitlab-api.js).

Subgroup projects: `owner` is the namespace path (`group` or `group/subgroup`), `repo` is the project name. API URLs use URL-encoded `owner/repo` as the project path. Commit links use `/-/commit/` infix.

GitLab does not expose separate tree SHAs; `getCommitTreeSha()` returns the commit SHA as a stable cache key.

Remote reads use the standard tree + blob path in [lib/remote-fetch.js](../lib/remote-fetch.js) (same as GitHub).

## Host permissions

- GitHub: `https://api.github.com/*` in manifest `host_permissions`
- GitLab.com: `https://gitlab.com/*` in manifest `host_permissions`
- Codeberg: `https://codeberg.org/*` in manifest `host_permissions`
- Self-hosted Gitea, Forgejo, Gogs, GitLab, GitHub Enterprise: runtime origin via `chrome.permissions.request()` when saving a server URL ([lib/host-permissions.js](../lib/host-permissions.js), [lib/connection-settings.js](../lib/connection-settings.js)). Chrome uses `optional_host_permissions` (`<all_urls>`); Firefox uses `https://*/*`.

Mirror destinations request host permission before push ([lib/mirror-push.js](../lib/mirror-push.js)).

## Commit links

Popup and history UIs build commit URLs with `buildCommitUrl()` using `commitUrlInfix` from the capability map:

- GitHub / Gitea-family: `{webBase}/{owner}/{repo}/commit/{sha}`
- GitLab: `{webBase}/{owner}/{repo}/-/commit/{sha}`

## Git repos bookmark folder

[lib/github-repos.js](../lib/github-repos.js) lists the authenticated user's repositories. Folder name prefix comes from `repoFolderPrefix` in the capability map (e.g. `CodebergRepos ({login})`).

## Verified targets

- Gitea / Forgejo **≥ 1.19**; Gogs with compatible `/api/v1`
- Codeberg (Forgejo host at `codeberg.org`)
- GitLab.com and self-managed GitLab **≥ 14** (PAT with `api` scope)
