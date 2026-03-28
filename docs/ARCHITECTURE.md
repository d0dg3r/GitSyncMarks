# GitSyncMarks — Architecture Overview

## High-Level Architecture

GitSyncMarks is a browser extension (Manifest V3, Chrome + Firefox) that bidirectionally synchronizes bookmarks with a GitHub repository. It stores each bookmark as an individual JSON file and uses a three-way merge algorithm for conflict-free synchronization.

```mermaid
flowchart TB
    subgraph Browser["Browser (Chrome / Firefox)"]
        BM["Bookmarks API"]
        Storage["chrome.storage"]
        Alarms["chrome.alarms"]
    end

    subgraph Extension["GitSyncMarks Extension"]
        BG["background.js"]
        Popup["popup.html / popup.js"]
        Options["options.html / options.js"]
        subgraph Lib["lib/"]
            SE["sync-engine.js"]
            GH["github-api.js"]
            GR["github-repos.js"]
            BS["bookmark-serializer.js"]
            PM["profile-manager.js"]
            OB["onboarding.js"]
            RF["remote-fetch.js"]
            I18N["i18n.js"]
            Theme["theme.js"]
            UiDensity["ui-density.js"]
            Crypto["crypto.js"]
            CM["context-menu.js"]
            LW["linkwarden-api.js"]
            Polyfill["browser-polyfill.js"]
        end
    end

    subgraph Remote["GitHub"]
        GitAPI["Git Data API"]
        Repo["Repository\n(per-file bookmarks)"]
    end

    Popup -- "sendMessage()" --> BG
    Options -- "sendMessage()" --> BG
    BG -- "import" --> CM
    BG -- "import" --> SE
    SE -- "import" --> GH
    SE -- "import" --> BS
    BG --> BM
    BG --> Storage
    BG --> Alarms
    SE --> Storage
    GH -- "fetch()" --> GitAPI
    GitAPI --> Repo
```

## Component Descriptions

### `manifest.json` / `manifest.firefox.json`

Extension metadata. Two manifests for browser-specific differences:

| Field | Chrome | Firefox |
|---|---|---|
| Background | `service_worker: "background.js"` | `scripts: ["background.js"]` |
| Browser-specific | — | `browser_specific_settings.gecko` |

Shared: Manifest V3, permissions (`bookmarks`, `storage`, `alarms`, `notifications`, `contextMenus`, `activeTab`, `scripting`, `downloads`), host permissions (`api.github.com`).

### `background.js` — Background Script

The central coordinator:

- **Bookmark event listeners** — `onCreated`, `onRemoved`, `onChanged`, `onMoved` trigger debounced auto-sync
- **Context menu** — `contextMenus.onClicked` listener (top-level for SW persistence); `setupContextMenus()` called from `onInstalled`
- **Periodic sync alarm** — `chrome.alarms` for periodic three-way merge sync
- **Message handler** — Receives `sync`, `push`, `pull`, `generateFilesNow`, `getStatus`, `switchProfile`, `settingsChanged`, `setSettingsSyncPassword`, `clearSettingsSyncPassword`, `listDeviceConfigs`, `importDeviceConfig`, `getDebugLog` from popup/options
- **Badge & Error Visibility** — Uses a centralized `updateSyncStatusBadge` helper to set an orange `!` badge and a descriptive tooltip (via `chrome.action.setTitle`) on sync failure, ensuring it clears reliably on success across all triggers.
- **Migration** — Checks for and migrates legacy `bookmarks.json` format on startup

### `popup.html` / `popup.js` — Popup UI

Toolbar popup with header (icon, title, profile dropdown when 2+ profiles), status area (status line, last change, commit link), conflict box, action buttons (Sync Now, Push, Pull), and compact footer (Settings, GitHub, Report Issue).

### `options.html` / `options.js` — Settings Page

Full-page settings (opens in tab) with five tabs. `options.js` is the entry point that imports and orchestrates focused sub-modules in `options/`.

1. **GitHub** (sub-tabs: Profile, Connection, Repos) — Profile selector (multiple profiles with separate repos); token, repository, connection test, onboarding (create folder or pull when path empty/has bookmarks); GitHub Repos folder (optional, position toolbar/other)
2. **Sync** — Sync profile, auto-sync, sync on start/focus, notifications; Debug Log
3. **Files** (sub-tabs: Generated, Settings, Export/Import, Git Add) — Generated files (README.md, bookmarks.html, feed.xml, dashy-conf.yml) with Off/Manual/Auto mode; settings sync to Git (client name + Create in one row; Refresh, profile list, Import & Apply, Sync current to selected in one row; buttons disabled until client name set; password saved after Import/Sync/Create); compact export/import (bookmarks, Dashy, settings plain/encrypted via dropdown); automation guide for adding bookmarks via Git, CLI, or GitHub Actions
4. **Help** — Quick links (Vote on backlog, Documentation, Discussions, Report Issue) as pill buttons; collapsible feature sections (Getting Started with Start setup wizard button, Profiles, GitHub Repos, Popup, Sync, Files, Notifications, Conflicts, Keyboard Shortcuts)
5. **About** — Version, links, license, mobile app

Sub-modules (`options/`):

- **`wizard.js`** — Onboarding wizard flow (token validation, repo setup, environment check, first sync)
- **`profiles.js`** — Profile switching, add/rename/delete with confirmation dialogs
- **`linkwarden.js`** — Linkwarden tab: connection test, tag picker, sync, debug log export
- **`history.js`** — Sync history listing (four-column header + rows: date, SHA, client id, actions; checkmark + “current” for `lastCommitSha`), diff preview, bookmark restore, undo
- **`context-menu-config.js`** — Context menu item ordering, toggling, category submenu configuration
- **`settings.js`** — Settings sync to Git, file export/import, generated files toggles, automation clipboard

### `lib/sync-engine.js` — Sync Engine (barrel)

Barrel module re-exporting from focused sub-modules:

- **`lib/sync-settings.js`** — Storage keys (`STORAGE_KEYS`, `SYNC_PRESETS`), settings accessors (`getSettings`, `isConfigured`, `createApi`, `getDeviceId`), local bookmark access (`getLocalFileMap`), file map filtering (`filterForDiff`, `addGeneratedFiles`), and encrypted settings sync (`buildEncryptedSettings`, `applyEncryptedSettings`, profile CRUD)
- **`lib/sync-core.js`** — Core sync operations (`push`, `pull`, `sync`), three-way merge (`computeDiff`, `mergeDiffs`, `mergeOrderJson`), sync state management (`saveSyncState`, `getSyncStatus`, `isSyncInProgress`), debounced auto-sync (`debouncedSync`, `bootstrapFirstSync`), and Linkwarden mirroring
- **`lib/sync-history.js`** — Commit history listing (`listSyncHistory`), bookmark restore (`restoreFromCommit`), undo support (`getPreviousCommitSha`), and diff preview (`getCommitDiffPreview`)
- **`lib/sync-commit-message.js`** — Parses standard GitSyncMarks commit subjects to extract the device/client id (`extractClientIdFromCommitMessage`) for Sync History display
- **`lib/sync-migration.js`** — Legacy single-file format migration (`migrateFromLegacyFormat`)

State is stored as `LAST_SYNC_FILES` (path → {sha, content}) and `LAST_COMMIT_SHA`.

### `lib/github-api.js` — GitHub API Wrapper

Wraps both the **Contents API** (legacy, used for migration/validation) and the **Git Data API** (for atomic multi-file commits):

| Method | API | Description |
|---|---|---|
| `validateToken()` | REST | Check PAT validity |
| `checkRepo()` | REST | Verify repository access |
| `listContents(path)` | Contents | List directories at a given path (for folder browser) |
| `getFile()` / `createOrUpdateFile()` | Contents | Single-file operations (legacy) |
| `getLatestCommitSha()` | Git Data | Get current branch HEAD |
| `getCommit()` / `getTree()` / `getBlob()` | Git Data | Read commit, tree, file content |
| `createBlob()` / `createTree()` / `createCommit()` | Git Data | Build new commit |
| `updateRef()` / `createRef()` | Git Data | Update or create branch |
| `atomicCommit(message, fileChanges)` | Git Data | All-in-one: atomic multi-file commit |
| `listCommits({ path, perPage })` | REST | List recent commits, optionally filtered by path |

### `lib/bookmark-serializer.js` — Serializer

Converts between browser bookmark trees and the per-file format. All generators (Markdown, Netscape HTML, RSS, Dashy YAML) and the tree builder include **orphan subfolders**: folders present in the file map with their own `_order.json` but not listed in the parent's `_order.json`. This handles manually created folders, corrupted `_order.json`, or migration from older formats.

| Function | Description |
|---|---|
| `bookmarkTreeToFileMap(tree, basePath)` | Browser tree → file map (path → content) |
| `fileMapToBookmarkTree(files, basePath)` | File map → bookmark tree (role → children) |
| `fileMapToMarkdown(files, basePath)` | File map → human-readable Markdown |
| `fileMapToNetscapeHtml(files, basePath)` | File map → Netscape bookmarks HTML (browser import) |
| `fileMapToRssFeed(files, basePath)` | File map → RSS 2.0 XML feed |
| `fileMapToDashyYaml(files, basePath)` | File map → Dashy dashboard YAML config |
| `generateFilename(title, url)` | Deterministic filename: `{slug}_{hash}.json` |
| `detectRootFolderRole(node)` | Detect toolbar/other from browser IDs |
| `gitTreeToShaMap(entries, basePath)` | Git tree → SHA map for remote change detection |
| `serializeToJson()` / `deserializeFromJson()` | Legacy format (for import/export) |

### `lib/crypto.js` — Encryption

AES-256-GCM encryption for the GitHub PAT at rest (non-extractable CryptoKey in IndexedDB, token in `chrome.storage.local`). Also provides password-based encryption (`encryptWithPassword` / `decryptWithPassword` using PBKDF2 + AES-256-GCM) for settings export (.enc files) and settings sync to Git.

### `lib/linkwarden-api.js` — Linkwarden API

Minimal wrapper for the Linkwarden REST API:
- `saveLink(data)`: Create a new link in a collection with tags.
- `uploadScreenshot(linkId, blob)`: Upload a PNG screenshot to an existing link.

### `lib/i18n.js` — Internationalization

Custom runtime i18n with manual language selection. Loads `_locales/{lang}/messages.json`, translates DOM via `data-i18n` attributes. Plain `data-i18n` sets `textContent` on each match except `<select>` elements (so `<option data-i18n>` still translates; `<select data-i18n>` is not used). English fallback.

### `lib/theme.js` — Theme

Light, dark, or auto (system) theme. Single cycle button in options header switches A → Dark → Light → A. Stores preference in `chrome.storage.sync`, applies `html.dark` class when dark mode is active. Used by options page and popup.

### `lib/ui-density.js` — UI Density

Three density levels (compact / medium / large). Stores the choice in `chrome.storage.sync` (`uiDensity` key) and sets `data-ui-density` on `<html>`. CSS tokens in `ui-density.css` respond to the attribute; `initUiDensity()` is called early in every entry point (options, popup, search, linkwarden-save). A segmented S / M / L selector in the options header controls the setting.

### `ui-density.css` — Density Tokens

Root-level CSS custom properties for typography, spacing, padding, and control sizing across three density levels. Loaded before all page-specific stylesheets. Page CSS references these tokens instead of hard-coded values.

### `lib/whats-new.js` / `lib/whats-new-ui.js` — Post-update release notes

On `chrome.runtime.onInstalled` with `reason === 'update'`, [background.js](../background.js) writes `showWhatsNewForVersion` (manifest version string) to `chrome.storage.local`. [popup.js](../popup.js) and [options.js](../options.js) call `mountWhatsNewIfPending()` from `whats-new-ui.js`, which shows a dismissible overlay (styled by [whats-new.css](../whats-new.css)) when the pending version matches the manifest and `whats-new.js` has copy for that version. If `.popup` is present, the overlay gets `whats-new-overlay--popup` for a compact, no-scroll layout; the options page uses the default larger panel. Closing the overlay removes the storage key. New installs do not set the flag, so onboarding stays first. Options defers the overlay until the onboarding wizard is hidden (MutationObserver on `#onboarding-wizard-screen` style).

### `lib/profile-manager.js` — Profile Manager

Multiple bookmark profiles (Work/Personal) with separate GitHub repo config:

| Function | Description |
|---|---|
| `getProfiles()` / `getActiveProfileId()` | List profiles, get current active profile |
| `addProfile()` / `deleteProfile()` / `saveProfile()` | CRUD for profiles |
| `switchProfile(targetId)` | Save current bookmarks, push to current repo, pull target profile, replace local bookmarks |
| `migrateToProfiles()` | Migrate legacy single-config to profiles format |

State stored in `chrome.storage.sync` (profiles, activeProfileId) and `chrome.storage.local` (per-profile tokens, sync state).

### `lib/onboarding.js` — Onboarding

First-time and new-profile setup when configuring GitHub:

| Function | Description |
|---|---|
| `checkPathSetup(api, basePath)` | Check if path exists and has bookmarks (unreachable / empty / hasBookmarks) |
| `createMinimalBookmarkStructure(basePath)` | Build `_index.json` and role folders with `_order.json` |
| `initializeRemoteFolder(api, basePath)` | Create minimal structure via `atomicCommit` |

### `lib/github-repos.js` — GitHub Repos Folder

Fetches the authenticated user's repos via GitHub REST API and maintains a "GitHubRepos (username)" folder:

| Function | Description |
|---|---|
| `fetchCurrentUser(token)` | GET /user → `{ login }` for folder name |
| `fetchUserRepos(token)` | GET /user/repos (paginated) → `{ full_name, html_url, private }` |
| `updateGitHubReposFolder(token, parentRole, username?, onUsername?)` | Find/create folder, diff existing bookmarks with API list, add/remove/update; optional callback to persist username on first run |

### `lib/remote-fetch.js` — Remote File Map

| Function | Description |
|---|---|
| `fetchRemoteFileMap(api, basePath, baseFiles)` | Fetch bookmark files from GitHub via Git Data API; returns `{ shaMap, fileMap, commitSha }` or `null` for empty repo |
| `fetchRemoteFileMapAtCommit(api, basePath, commitSha, options?)` | Fetch file map at a specific commit SHA (history restore/preview); batched `getBlob` (concurrency 5); optional short-lived in-memory cache per owner/repo/path/commit |

### `lib/context-menu.js` — Context Menu (barrel)

Barrel module re-exporting from focused sub-modules:

- **`lib/context-menu-constants.js`** — Menu IDs (`MENU_IDS`), categories (`CATEGORIES`), ID prefixes, popup dimensions, and other shared constants
- **`lib/context-menu-setup.js`** — Static menu creation (`setupContextMenus`), called from `chrome.runtime.onInstalled`
- **`lib/context-menu-dynamic.js`** — Dynamic menu management: profile submenus, quick folders, folder tree, open-all-from-folder items; concurrency protection (`isRefreshing`/`refreshPending`) and debounced rebuild (`refreshContextMenuDynamicItemsDebounced`, 500ms delay, 5s max-wait)
- **`lib/context-menu-handlers.js`** — Click event dispatch (`handleContextMenuClick`) and all action handlers (add bookmark, sync, Linkwarden save, search, favicon, profile switch)

| Menu Item | Context | Action |
|---|---|---|
| Add to Toolbar | page, link | Creates bookmark in toolbar root via `chrome.bookmarks.create()` |
| Add to Other Bookmarks | page, link | Creates bookmark in other root |
| Save to Linkwarden | page, link | Saves URL to Linkwarden instance; supports auto-screenshots via `captureVisibleTab` |
| Sync Now | page, link | Calls `sync()` from sync-engine.js directly |
| Search Bookmarks | page, link | Opens dedicated search popup window |
| Copy Favicon URL | page | Copies `tab.favIconUrl` to clipboard via `chrome.scripting.executeScript()` |
| Download Favicon | page | Downloads favicon via `chrome.downloads.download()` |
| Switch Profile | page, link | Submenu with radio items for each profile; active profile checked |

`setupContextMenus()` is called from `onInstalled`; `handleContextMenuClick()` is wired to a top-level `contextMenus.onClicked` listener for MV3 service worker persistence.

### `lib/browser-polyfill.js` — Browser Detection

Minimal shim: `isFirefox`, `isChrome`, `getBrowserName()`.

## File Structure

```
GitSyncMarks/
├── manifest.json                 # Chrome manifest
├── manifest.firefox.json         # Firefox manifest
├── background.js                 # Background script
├── popup.html / popup.js / popup.css
├── whats-new.css                 # Shared overlay styles (popup + options)
├── options.html / options.js / options.css
├── options/                      # Options page sub-modules
│   ├── wizard.js                 # Onboarding wizard flow
│   ├── profiles.js               # Profile management UI
│   ├── linkwarden.js             # Linkwarden tab UI
│   ├── history.js                # Sync history & restore
│   ├── context-menu-config.js    # Context menu configuration
│   └── settings.js               # Settings sync, export/import, file generation
├── lib/
│   ├── sync-engine.js            # Barrel: re-exports sync sub-modules
│   ├── sync-settings.js          # Storage keys, settings, encrypted settings sync
│   ├── sync-core.js              # Push/pull/sync, three-way merge, auto-sync
│   ├── sync-history.js           # Commit history, restore, diff preview
│   ├── sync-commit-message.js    # Parse commit subject → client id (history UI)
│   ├── sync-migration.js         # Legacy format migration
│   ├── github-api.js             # GitHub REST + Git Data API
│   ├── bookmark-serializer.js    # Per-file bookmark conversion
│   ├── bookmark-replace.js       # Replace local bookmarks
│   ├── github-repos.js           # GitHub Repos folder
│   ├── profile-manager.js        # Multiple profiles, switchProfile
│   ├── onboarding.js             # checkPathSetup, initializeRemoteFolder
│   ├── remote-fetch.js           # fetchRemoteFileMap
│   ├── crypto.js                 # Token encryption (AES-256-GCM)
│   ├── context-menu.js           # Barrel: re-exports context menu sub-modules
│   ├── context-menu-constants.js # Menu IDs, categories, prefixes
│   ├── context-menu-setup.js     # Static menu creation (onInstalled)
│   ├── context-menu-dynamic.js   # Dynamic profile/folder menus
│   ├── context-menu-handlers.js  # Click event dispatch & actions
│   ├── linkwarden-api.js         # Linkwarden REST API wrapper
│   ├── debug-log.js              # Debug log for sync diagnostics
│   ├── i18n.js                   # Internationalization
│   ├── theme.js                  # Light/dark/auto theme
│   ├── ui-density.js             # Compact/medium/large density
│   ├── whats-new.js              # Per-version bullets, storage helpers
│   ├── whats-new-ui.js           # Dismissible overlay DOM
│   └── browser-polyfill.js       # Browser detection
├── _locales/                     # 12 languages
│   ├── en/messages.json
│   ├── de/messages.json
│   └── .../messages.json
├── icons/
├── scripts/
│   ├── build.sh                  # Build Chrome + Firefox packages
│   ├── generate-screenshots.js   # Auto-generate store screenshots
│   ├── fetch-app-content.sh      # Fetch App README, assets
│   ├── build-docs.js             # Markdown → HTML for docs/
│   └── build-index.js            # Build index.html
├── package.json                  # npm scripts for building
├── .github/workflows/
│   ├── test-e2e.yml              # E2E tests (manual trigger only)
│   ├── release.yml               # Build ZIPs, create release on tag
│   ├── screenshots.yml           # Generate store screenshots
│   └── add-bookmark.yml          # Automation: add bookmark via dispatch
├── docs/                         # Architecture documentation
├── website/                      # GitHub Pages site
├── store-assets/                 # Store listings & screenshots (12 languages)
├── LICENSE
├── PRIVACY.md
└── README.md
```

## Technology Stack

| Layer | Technology |
|---|---|
| Extension Framework | Manifest V3 (Chrome + Firefox) |
| Background | Service Worker (Chrome) / Background Script (Firefox) |
| Browser APIs | `chrome.bookmarks`, `chrome.storage`, `chrome.alarms`, `chrome.contextMenus`, `chrome.scripting`, `chrome.downloads` |
| Remote Storage | GitHub Git Data API (atomic multi-file commits) |
| Authentication | Bearer Auth (Classic PAT `repo`, Fine-grained PAT `Contents: R/W`, or GitHub App) |
| Sync Algorithm | Three-way merge (base vs local vs remote, per-file diff) |
| i18n | Custom runtime system + Chrome `_locales/` |
| Build | Shell script (`build.sh`), separate Chrome/Firefox packages |
| CI/CD | GitHub Actions |
| JavaScript | Vanilla ES modules (no bundler) |
