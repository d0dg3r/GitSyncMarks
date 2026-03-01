# GitSyncMarks — Data Formats and Data Flow

## Overview

GitSyncMarks stores each bookmark as an individual JSON file in a Git repository. The directory structure mirrors the bookmark folder hierarchy. Synchronization uses the GitHub Git Data API for atomic multi-file commits.

## Data Flow: Push

```mermaid
flowchart LR
    subgraph Browser
        BM["chrome.bookmarks\n.getTree()"]
    end

    subgraph Serialization
        FM["bookmarkTreeToFileMap()"]
        MD["fileMapToMarkdown()"]
    end

    subgraph GitDataAPI["GitHub Git Data API"]
        Blobs["POST /git/blobs"]
        Tree["POST /git/trees"]
        Commit["POST /git/commits"]
        Ref["PATCH /git/refs"]
    end

    subgraph Repo["GitHub Repository"]
        Files["bookmarks/toolbar/*.json\nbookmarks/other/*.json\nbookmarks/README.md\nbookmarks/bookmarks.html\nbookmarks/feed.xml\nbookmarks/dashy-conf.yml\nbookmarks/settings.enc\nbookmarks/settings-{id}.enc"]
    end

    BM --> FM
    FM --> MD
    FM --> Blobs
    MD --> Blobs
    Blobs --> Tree
    Tree --> Commit
    Commit --> Ref
    Ref --> Files
```

## Data Flow: Pull

```mermaid
flowchart RL
    subgraph Repo["GitHub Repository"]
        Files["Per-file bookmarks"]
    end

    subgraph GitDataAPI["GitHub Git Data API"]
        TreeGet["GET /git/trees\n(recursive)"]
        BlobGet["GET /git/blobs"]
    end

    subgraph Conversion
        FMT["fileMapToBookmarkTree()"]
    end

    subgraph Browser
        BM["replaceLocalBookmarks()\nchrome.bookmarks API"]
    end

    Files --> TreeGet
    TreeGet --> BlobGet
    BlobGet --> FMT
    FMT --> BM
```

## Data Flow: Context Menu

```mermaid
flowchart LR
    subgraph UserAction["User Right-Click"]
        RClick["contextMenus.onClicked"]
    end

    subgraph AddBookmark["Add to Toolbar / Other"]
        GetRoot["getRootFolderIdForRole()"]
        Create["chrome.bookmarks.create()"]
        OnCreated["onCreated listener"]
        AutoSync["debouncedSync()"]
    end

    subgraph SyncNow["Sync Now"]
        SyncFn["sync()"]
    end

    subgraph FaviconActions["Favicon Actions"]
        GetFav["getFaviconUrl(tab)"]
        CopyFav["scripting.executeScript()\nnavigator.clipboard.writeText()"]
        DownloadFav["chrome.downloads.download()"]
    end

    subgraph ProfileSwitch["Switch Profile"]
        GetProfiles["getProfiles()"]
        DoSwitch["switchProfile(targetId)"]
        Replace["replaceLocalBookmarks()"]
        RefreshMenu["refreshProfileMenuItems()"]
    end

    RClick -->|"Add to Toolbar/Other"| GetRoot
    GetRoot --> Create
    Create --> OnCreated
    OnCreated --> AutoSync

    RClick -->|"Sync Now"| SyncFn

    RClick -->|"Copy Favicon URL"| GetFav
    RClick -->|"Download Favicon"| GetFav
    GetFav -->|"copy"| CopyFav
    GetFav -->|"download"| DownloadFav

    RClick -->|"Switch Profile"| GetProfiles
    GetProfiles --> DoSwitch
    DoSwitch --> Replace
    DoSwitch --> RefreshMenu
```

- **Add to Toolbar / Other Bookmarks**: Resolves the target folder via `getRootFolderIdForRole()`, creates the bookmark with `chrome.bookmarks.create()`. The existing `onCreated` listener in `background.js` fires `debouncedSync()` automatically.
- **Sync Now**: Calls `sync()` directly (same as popup sync button).
- **Copy Favicon URL**: Resolves favicon via `getFaviconUrl(tab)` — uses `tab.favIconUrl` if available, falls back to Google's favicon service (`https://www.google.com/s2/favicons?domain={domain}&sz=64`). Then uses `chrome.scripting.executeScript()` to run `navigator.clipboard.writeText()` in the active tab context (clipboard API is not available in service workers).
- **Download Favicon**: Same favicon resolution as Copy. Uses `chrome.downloads.download()` with `saveAs: true`; filename is `favicon_{hostname}.png`.
- **Switch Profile**: Reads all profiles via `getProfiles()`, calls `switchProfile(targetId)` which saves current bookmarks, pushes to GitHub, loads target bookmarks via `replaceLocalBookmarks()`, then refreshes the context menu radio items.

## File Formats

### Bookmark File (e.g. `github_a1b2.json`)

Each bookmark is a minimal JSON file:

```json
{
  "title": "GitHub",
  "url": "https://github.com"
}
```

Filename format: `{slug-from-title}_{4-char-hash-from-url}.json`

The hash (FNV-1a of the URL, base-36) ensures uniqueness. The slug makes files human-readable.

### `_order.json` — Folder Ordering

Each folder contains an `_order.json` that defines the order of its children:

```json
[
  "github_a1b2.json",
  "stackoverflow_c3d4.json",
  {"dir": "dev-tools", "title": "Dev Tools"}
]
```

Entries are either:
- **String**: A bookmark filename
- **Object**: A subfolder with `dir` (directory name) and `title` (original display name)

Files not listed in `_order.json` (e.g., manually created) are picked up automatically and appended at the end.

**Orphan subfolders**: Subfolders that exist in the file map (with their own `_order.json`) but are not listed in the parent's `_order.json` are also included. All generators (README.md, bookmarks.html, feed.xml, dashy-conf.yml) and the tree builder scan for such orphans and append them. This handles manually created folders, corrupted `_order.json`, or migration from older formats.

### `_index.json` — Metadata

```json
{
  "version": 2
}
```

### `README.md` — Human-Readable Overview

Auto-generated on every push. Shows all bookmarks as Markdown with folder headings. Includes subfolders recursively; orphan subfolders (present in file map but not in parent `_order.json`) are included. Not used for sync — purely informational.

```markdown
# Bookmarks

> Last synced: 2026-02-09T15:30:00.000Z

## Bookmarks Bar

- [GitHub](https://github.com)
- [Stack Overflow](https://stackoverflow.com)

### Dev Tools

- [MDN Web Docs](https://developer.mozilla.org)

## Other Bookmarks
```

### `bookmarks.html` — Netscape Format for Browser Import

Auto-generated on push when mode is Auto (default). Uses the Netscape Bookmark File format (`<!DOCTYPE NETSCAPE-Bookmark-file-1>`) which Chrome, Firefox, Edge, and Safari can import directly. Includes all subfolders recursively, including orphans. Not used for sync — purely for importing bookmarks without the extension.

### `feed.xml` — RSS 2.0 Feed

Auto-generated on push when mode is Auto (default). Each bookmark becomes an `<item>` with title, link, and category (folder path). Includes bookmarks from all subfolders recursively, including orphans. Subscribable via any RSS reader (Feedly, Thunderbird, etc.); useful for automations (Slack, IFTTT, n8n) or embedding on websites. Works as a live feed via `raw.githubusercontent.com` or GitHub Pages.

### `dashy-conf.yml` — Dashy Dashboard Config

Auto-generated on push when mode is Auto. Produces YAML sections with bookmark links for the [Dashy](https://github.com/Lissy93/dashy) dashboard. Each bookmark folder (including orphan subfolders) becomes a section with items. Not used for sync — purely for Dashy integration.

### `profiles/<alias>/settings.enc` — Encrypted Settings

Optional. When "Sync settings to Git" is enabled, the extension writes an encrypted copy of all settings (profiles, tokens, sync preferences) to the repo. Uses the same `gitsyncmarks-enc:v1` format as the manual encrypted export (PBKDF2 + AES-256-GCM). The password is stored locally per device in `chrome.storage.local` and never synced.

**Individual mode** (current): Each device writes to `profiles/<alias>/settings.enc` where `<alias>` is the slugified client name (e.g. `base-chrome`). Other devices can list and import individual device configs via the UI.

**Legacy**: `settings.enc` or `settings-{id}.enc` at the base path are still supported and migrated to `profiles/` on first sync.

Excluded from three-way merge (`DIFF_IGNORE_SUFFIXES` + `SETTINGS_ENC_PATTERN`).

### Complete Repository Structure

```
bookmarks/
  _index.json
  README.md
  bookmarks.html
  feed.xml
  dashy-conf.yml
  profiles/                 (when settings sync enabled)
    base-chrome/
      settings.enc          (per-device, client name = base-chrome)
  toolbar/
    _order.json
    github_a1b2.json
    stackoverflow_c3d4.json
    dev-tools/
      _order.json
      mdn-web-docs_e5f6.json
  other/
    _order.json
    ...
```

Legacy: `settings.enc` or `settings-*.enc` at the base path are still supported and migrated to `profiles/` on first sync.

Root folders are mapped by role:
| Role | Chrome | Firefox |
|---|---|---|
| `toolbar` | Bookmarks Bar (ID: `1`) | Bookmarks Toolbar (`toolbar_____`) |
| `other` | Other Bookmarks (ID: `2`) | Bookmarks Menu (`menu________`) |

On Firefox, the `other` role uses the Bookmarks Menu root (`menu________`); on Chrome it uses Other Bookmarks. Only toolbar and other are synced; menu and mobile are no longer used.

### GitHub Repos Folder (Optional)

When enabled (`githubReposEnabled`), a folder "GitHubRepos (username)" is created under the configured root (toolbar or other). It contains bookmarks to all user repos (public and private). Updated manually via "Update GitHub Repos"; changes are synced through the normal bookmark sync. On pull, if the folder is not in Git, it is preserved locally.

## Local Storage

### `chrome.storage.sync` — User Settings

Per-profile keys (repo config, githubRepos) live in `profiles[id]`; others are global.

| Key | Type | Default | Description |
|---|---|---|---|
| `repoOwner` | `string` | `""` | Repository owner |
| `repoName` | `string` | `""` | Repository name |
| `branch` | `string` | `"main"` | Git branch |
| `filePath` | `string` | `"bookmarks"` | Base path in repo |
| `githubReposEnabled` | `boolean` | `false` | Show GitHub Repos folder |
| `githubReposParent` | `string` | `"other"` | Folder position: `toolbar` or `other` |
| `githubReposUsername` | `string` | `""` | GitHub username (set on first refresh, for folder name) |
| `autoSync` | `boolean` | `true` | Auto-sync enabled |
| `syncInterval` | `number` | `15` | Sync interval (minutes) |
| `language` | `string` | `"auto"` | UI language |
| `generateReadmeMd` | `string` | `"auto"` | Generate README.md: `"off"`, `"manual"`, or `"auto"` |
| `generateBookmarksHtml` | `string` | `"auto"` | Generate bookmarks.html: `"off"`, `"manual"`, or `"auto"` |
| `generateFeedXml` | `string` | `"auto"` | Generate feed.xml (RSS 2.0): `"off"`, `"manual"`, or `"auto"` |
| `generateDashyYml` | `string` | `"off"` | Generate dashy-conf.yml: `"off"`, `"manual"`, or `"auto"` |
| `syncSettingsToGit` | `boolean` | `false` | Sync encrypted settings to Git repo |
| `settingsSyncMode` | `string` | `"global"` | Settings sync mode: `"global"` (shared) or `"individual"` (per device) |

### `chrome.storage.local` — Sync State + Token

| Key | Type | Description |
|---|---|---|
| `githubToken` | `string` | Encrypted PAT (`enc:v1:<iv>:<ciphertext>`) |
| `deviceId` | `string` | UUID for this device |
| `lastSyncFiles` | `object` | `{ [path]: { sha, content } }` — snapshot at last sync |
| `lastCommitSha` | `string` | Git commit SHA at last sync |
| `lastSyncTime` | `string` | ISO 8601 timestamp of last sync |
| `hasConflict` | `boolean` | Whether a conflict was detected |
| `settingsSyncPassword` | `string` | Password for settings.enc encryption (device-local, never synced) |

The `lastSyncFiles` object is the **base state** for three-way merge. It maps each file path to its blob SHA (for remote change detection) and content (for local change detection).

## GitHub Git Data API Interaction

All sync operations use the **Git Data API** for atomic multi-file commits:

### Reading the Remote State

```
GET /repos/{owner}/{repo}/git/ref/heads/{branch}     → commitSha
GET /repos/{owner}/{repo}/git/commits/{commitSha}     → treeSha
GET /repos/{owner}/{repo}/git/trees/{treeSha}?recursive=1  → all files + SHAs
GET /repos/{owner}/{repo}/git/blobs/{blobSha}         → file content (base64)
```

### Writing (Atomic Multi-File Commit)

```
POST /repos/{owner}/{repo}/git/blobs                  → create file blob
POST /repos/{owner}/{repo}/git/trees                  → create new tree (incremental)
POST /repos/{owner}/{repo}/git/commits                → create commit
PATCH /repos/{owner}/{repo}/git/refs/heads/{branch}   → update branch
```

For empty repos (no branch yet), `POST /git/refs` creates the initial branch.

### Efficiency

A typical sync with few changes:
- 3 API calls to read (ref + commit + tree)
- N calls to fetch changed blob contents
- M calls to create new blobs
- 3 calls to write (tree + commit + ref update)

Total: ~6 + N + M calls, regardless of total bookmark count.

## Token Encryption

The GitHub PAT is encrypted at rest using AES-256-GCM:

1. Non-extractable `CryptoKey` generated once and stored in IndexedDB
2. Encrypted as `"enc:v1:<base64-iv>:<base64-ciphertext>"` in `chrome.storage.local`
3. Decrypted transparently on load; legacy plain-text tokens handled gracefully
4. Token never stored in `chrome.storage.sync`
