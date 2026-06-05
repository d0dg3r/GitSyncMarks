# Changelog

All notable changes to GitSyncMarks are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.0] - 2026-06-06 (*GLaDOS*)

Multi-provider Git sync (GitHub, GitLab, Codeberg, Gitea family), profile transfer, push mirrors, and live sync progress. First published as a `3.0.0-beta.1` pre-release.

### Added
- **Multi-provider support**: Provider capability map (`lib/git-provider-common.js`). Separate UI entries for **Forgejo**, **Codeberg**, and **Gogs** (shared Gitea-family adapter). **GitLab** adapter (`lib/providers/gitlab-api.js`) for gitlab.com, self-managed instances, and subgroup project paths. Shared provider UI (`lib/provider-ui.js`). See [docs/PROVIDERS.md](docs/PROVIDERS.md).
- **Profile bookmark transfer**: Copy bookmarks between profiles (full replace or folder merge) from the Profile tab. Supports push to target repository and sync-state update (`lib/profile-transfer.js`, `pushForProfile()`).
- **Push mirror destinations**: Optional secondary Git remotes receive a push-only copy after each successful primary commit (`lib/mirror-push.js`, `mirrors[]` on profiles, per-mirror tokens).
- **Clean remote orphans**: Sync sub-tab action to preview and delete remote bookmark files not present in local bookmarks (`previewRemoteOrphans()`, `cleanRemoteOrphans()` in `lib/sync-core.js`).

### Changed
- Development builds on `develop/3.0` report version **3.0.0-dev** in the About tab (`lib/display-version.js`, `scripts/build.sh`); manifest version is **3.0.0**. Build output includes `getAppVersion()` export (fixes options page load from `build/chrome`).
- **Fast profile switch**: `switchProfile()` skips no-op commits, avoids post-commit full refetch, and loads the target profile from `lastSyncFiles` when remote HEAD matches `lastCommitSha`; otherwise delta-pulls via `fetchRemoteFileMap()` with cached blob SHAs (`lib/profile-switch-logic.js`, `lib/sync-diff.js`).
- **Transfer progress**: Profile transfer dialog shows spinner plus step text (e.g. `$1 of $2 files` during push). Progress uses a dedicated runtime port so updates are not lost to a connect/message race.
- **Sync progress**: Popup, onboarding wizard, connection-tab first push, pull, and **Generate now** show live step text (e.g. `$1 / $2 files` during push, `$1 / $2 bookmarks` during pull, generating files before commit). Uses a `syncProgress` runtime port (`lib/sync-progress.js`).
- Connection tab and onboarding wizard show provider-specific token and owner placeholders and hints (Gitea tokens are not `ghp_…` GitHub-style strings).
- Git repos bookmark folder adapts folder prefix per provider (`GitHubRepos`, `GiteaRepos`, etc.).
- Provider-neutral UI copy where all Git providers are meant (push/pull labels, connection tab title).

### Fixed
- **GitLab connection test on empty repo**: Repos with commits but no `bookmarks/` folder (e.g. README-only) no longer fail with “Git tree listing empty under base path”; connection test reports success and offers path initialization.
- **Deleted bookmark reappears after sync**: Profile switch cached local bookmarks into `lastSyncFiles` without keeping removed paths, so the three-way base no longer recorded the deletion. The next sync took path 8 (remote-only change) and pulled the bookmark back from the remote. `mergeLocalIntoSyncFiles()` now keeps removed paths in the base until a successful push; successful switch pushes use `saveSyncState()`. When the base is already stale and the user edited bookmarks locally, sync path 8 pushes remote deletes instead of pulling (`localModifiedSinceSync`, `buildStaleBasePushChanges()`).
- **Gitea replace push left orphan folders**: The Contents-API commit fallback skipped file deletions (`content === null`), so profile transfer or replace push could add new folders while old ones (e.g. `bucher` alongside `bucher-2`) remained on the remote. Fallback now commits one path at a time via `atomicCommit`, including deletes.
- **Stale “Last commit” in popup after Gitea sync**: When sync found no content changes (path 6), the stored commit SHA was not refreshed from the remote HEAD — e.g. after a profile transfer push — so the popup could show an old commit SHA while the remote had a newer commit. Sync now updates `lastCommitSha` from the fetched remote when it differs from the stored base.
- **Popup conflict buttons said “GitHub” for non-GitHub profiles**: Push/pull labels and push-success message are provider-neutral (“Remote”).
- **Transfer merge mode**: Merge hint, preview warnings, and confirm dialog when the target already has remote data (duplicate-folder risk). Preview warns when the transfer result contains slug-collision folder pairs (`bucher` + `bucher-2`). Replace push runs a post-commit orphan sweep on the target remote. Connection test used form values while background sync read persisted settings (race/mismatch). First sync now passes connection fields to `bootstrapFirstSync`. Gitea writes use the Contents API (`POST` for new files, `PUT` for updates) instead of the batch Change Files endpoint, which often returns misleading 401 errors on empty or older instances. Sync/push paths share a Gitea Contents-API fallback when a write still fails.
- **Gitea push crash (`reading 'sha'`)**: Normalize Gitea API responses (`sha` / `id` / commit tree metadata) in `getLatestCommitSha`, `getCommit`, and `createOrUpdateFile`; cache commit tree SHA after Contents API writes so post-push state save does not fail on missing `tree.sha`.
- **Gitea sync in MV3 service worker**: Replaced dynamic `import()` of `debug-log.js` with static imports (dynamic import is blocked in ServiceWorkerGlobalScope).
- **Gitea sync after successful push (`Commit … has no tree SHA`)**: Gitea remote reads (pull/sync/save-state) use the Contents API via `buildRemoteMaps()` with a ref cascade (`commitSha` → branch → `refs/heads/{branch}`), bypassing unreliable git/trees metadata on self-hosted instances.

## [2.8.0] - 2026-05-31 (*TARS*)

Reliability, performance and quality release (code-analysis Tiers 1–3). First published as a `2.8.0-beta` pre-release.

### Fixed
- **Sync aborted with "Receiving end does not exist"** ([#143](https://github.com/d0dg3r/GitSyncMarks/issues/143)): On Firefox (MV3 event page) and Chrome (MV3 service worker) the non-persistent background is terminated after ~30s of idle time. A `sync`/`push`/`pull`/`restore` that ran longer was killed mid-operation — the work was aborted (status stayed *"Not synced yet"*) and the popup's pending message rejected with **"Could not establish connection. Receiving end does not exist."**. New [`lib/keep-alive.js`](lib/keep-alive.js) periodically touches a lightweight extension API (`runtime.getPlatformInfo`) to reset the idle timer; the background ([`background.js`](background.js)) starts/stops it via a sync-activity listener ([`lib/sync-core.js`](lib/sync-core.js) `setSyncActivityListener`) for the full duration of every long operation, so syncs run to completion.
- **Large repos — truncated tree guard (data-loss prevention)**: [`lib/github-api.js`](lib/github-api.js) `getTree()` now reports GitHub's `truncated` flag, and [`lib/remote-fetch.js`](lib/remote-fetch.js) aborts the sync with a clear error instead of treating a partially-listed tree as if remote files were deleted (which could wipe remote data during cleanup).
- **Network and rate-limit handling**: `_fetch()` wraps connectivity failures into a typed `GitHubError` (`api_networkError`) and retries transient secondary rate limits with a bounded backoff driven by `Retry-After` / `x-ratelimit-reset` (`api_rateLimitExceeded`).
- **Stale-fetch guard no longer hides remote changes**: In [`lib/sync-core.js`](lib/sync-core.js) the remote-only path re-fetches a stable remote snapshot instead of silently returning **"Everything in sync"** when the branch HEAD advanced mid-fetch; if the remote keeps moving it asks the user to retry (`sync_remoteChangedRetry`).
- **Fewer false conflicts**: diffs and merge equality now compare bookmark JSON by canonical form (`contentEquals`), so cosmetic differences (key order, whitespace) no longer register as changes or conflicts. Array order (e.g. `_order.json`) stays significant.
- **Linkwarden auto-save tags**: `saveLink()` accepts both string and `{ name }` tag shapes, fixing a silent failure when auto-save mirrored bookmarks with default tags.

### Changed
- **`lib/github-repos.js`** now routes the `/user` and `/user/repos` calls through `GitHubAPI` (`getAuthenticatedUser()`, `listUserRepos()`) for shared error handling and rate-limit backoff.
- **Performance**: generated files (`README.md`, `bookmarks.html`, `feed.xml`, `dashy-conf.yml`) are only committed when their meaningful content changes (timestamps normalized); a push reuses the tree SHA produced by `atomicCommit` to skip a redundant `getCommit`; auto-sync coalesces overlapping runs so edits made during an in-flight sync are not dropped.
- **Storage**: `lastSyncFiles` no longer stores generated/settings files (smaller base state), and persisting it is quota-aware — on `QUOTA_BYTES` overflow the lightweight state is saved without the base map (next sync re-fetches; no data loss).
- **Accessibility**: settings tabs expose `tablist`/`tab`/`tabpanel` roles with arrow/Home/End keyboard navigation; the popup status area is an `aria-live` region; confirm/inline dialogs use `dialog`/`alertdialog` + `aria-modal`; the search popup adds `listbox`/`option` semantics with Up/Down/Enter selection.
- **i18n**: `applyI18n()` supports `data-i18n-aria-label`; search sync messages and header density/theme ARIA labels are localized (new `_locales/en` keys).
- **Tooling**: added `engines.node >= 20` and `.nvmrc`; release workflow gained a lint/typecheck/unit-test gate before building.

### Added
- **Unit tests**: `test/crypto.test.js`, `test/github-tree-batch.test.js`, `test/profile-manager.test.js`, `test/linkwarden-api.test.js`, plus canonical-diff/`contentEquals` and `mergeOrderJson` edge-case coverage (104 → 110 cases).

## [2.7.3] - 2026-05-15 (*Spock*)

### Fixed
- **Popup status after sync** ([#128](https://github.com/d0dg3r/GitSyncMarks/issues/128)): clear `lastError` when `sync()` completes successfully on no-change paths so a stale **“Failed to fetch”** line does not reappear after **“Everything in sync”** until the next failed request ([PR #129](https://github.com/d0dg3r/GitSyncMarks/pull/129), thanks [@katiras](https://github.com/katiras)).

### Changed
- **Developer documentation (Cursor MCP)**: Committed [`.cursor/mcp.json`](.cursor/mcp.json) ships an empty `mcpServers` object; copy-paste **reference JSON** for [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) and [Firefox DevTools MCP](https://github.com/mozilla/firefox-devtools-mcp) is in [docs/TESTING.md](docs/TESTING.md). Document **user-wide** `~/.cursor/mcp.json` (Linux/macOS) or `%USERPROFILE%\.cursor\mcp.json` (Windows) versus a **per-project** `.cursor/mcp.json`, and avoid registering the same MCP server names in both. [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) updated accordingly.

### Added
- **What's new** (`lib/whats-new.js`): [2.7.3] overlay copy (popup sync-status fix + Cursor MCP contributor note).

## [2.7.2] - 2026-04-26 (*Spock*)

### Added
- **`lib/storage-keys.js`**: single source for `STORAGE_KEYS` and `LOCAL_STORAGE_KEYS`; `lib/context-menu-defaults.js` for default context menu data and `ensureContextMenuItemDefaults()`.
- **`jsconfig.json`** + `npm run typecheck`: TypeScript `checkJs` on selected `lib` modules; `global-extension-ambient.d.ts` for the `browser` name when typechecking; `@types/chrome` as a dev dependency.
- **Unit tests**: `test/storage-keys.test.js`, `test/context-menu-defaults.test.js`.
- **ESLint** (app code only): `no-empty` and `no-useless-catch` as **errors** for `lib/`, `options/`, and root page scripts; CI runs `npm run typecheck` after lint.
- **Developer tooling**: Optional [`.cursor/mcp.json`](.cursor/mcp.json) for [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) and [Firefox DevTools MCP](https://github.com/mozilla/firefox-devtools-mcp) in Cursor; docs in [docs/TESTING.md](docs/TESTING.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (MCP is additive; Playwright E2E remains the regression suite).

### Changed
- **Options page**: `options/help-shortcuts.js` (Help tab shortcuts) and `options/factory-reset.js` (data reset) extracted from `options.js`.
- **Context menu**: `setupContextMenus` is `async` and uses `contextMenus.removeAll` via a Promise wrapper; duplicate default-menu merge logic removed in favor of `ensureContextMenuItemDefaults()`.

### Fixed
- **Context menu (MV3)**: The full static context menu (visibility and order) is rebuilt on every service worker start and on browser `runtime.onStartup`, not only on `onInstalled` or when `contextMenuItems` changes. Previously, right‑click could show an incomplete menu until a toggle in options forced `setupContextMenus()`; options UI already merged missing items for display, which did not persist a rebuild by itself. Storage `onChanged` now also reacts to `contextMenuSubmenus` and `linkwardenEnabled` so those updates stay in sync without relying only on the options message.
- **Context menu: dynamic “Cannot find menu item” / uncaught `update`**: Dynamic submenus (open-all, quick folders, folder tree, profiles) can run while static items are being rebuilt, or can target parents the user has turned off in **Menu → Visibility and order** — both caused Chrome console spam and a rejected `contextMenus.update` on `gitsyncmarks-sep-quick`. Fixes: a `staticContextMenuReady` flag until static `create` is complete, coalesced `setupContextMenus` runs, skipping dynamic work per disabled `contextMenuItems` id, and promise-safe `contextMenus.update` for the quick-folder separator.
- **Context menu — “Add to folder” tree (MV3)**: In Manifest V3, `contextMenus.create` is not synchronous; the dynamic bookmark-folder tree previously created children in the same turn as a parent, so Chrome often reported "Cannot find menu item with id" for the parent id. Dynamic `create` now goes through a shared `contextMenuCreateAsync` helper with depth-first `async/await` so every parent is registered before its submenus, separators, and "add here" entries.
- **Context menu — static tree (MV3)**: The same `contextMenuCreateAsync` helper is used for the static right-click menu. `setStaticContextMenuReady(true)` runs only after each `create` has completed, so the dynamic pass does not attach to parents that are not registered yet. `setupContextMenus()` uses one `try/catch` for `removeAll`, `storage.sync.get`, defaults merge, and all `create` calls, so a rejected read or a thrown merge does not become an unhandled promise rejection; failures leave the static ready flag `false` and are logged.
- **CodeQL / Code Scanning**: Pinned third-party actions in [`.github/workflows/release.yml`](.github/workflows/release.yml) to full commit SHAs (`actions/unpinned-tag`). Hardened [`e2e/helpers/repo-reset.js`](e2e/helpers/repo-reset.js) with `fs.mkdtempSync` for the clone directory, `execFileSync('git', …)` instead of shell `execSync`, and validation of test repo owner/name (`js/insecure-temporary-file`, `js/indirect-command-line-injection`).

## [2.7.1] - 2026-03-28 (*Spock*)

### Improved
- **Onboarding / large-repo diagnostic**: `scripts/test-onboarding-rate-limit.js` adds `--parallel-only` and `--sequential-only` (single API pass). Default two-pass mode warns when simulating very large bookmark counts. New `npm run test:onboarding-scale` entry point; `e2e/README.md` documents simulating ~5000 bookmarks against a disposable GitHub repo.
- **`npm run test:onboarding-scale` provisions the repo**: passes `--ensure-repo` — **DELETE** `GITSYNCMARKS_TEST_REPO` if it exists, then **POST /user/repos** (or org equivalent) to recreate it. Override with `--no-ensure-repo`. Classic PATs need **`delete_repo`**; see `.env.example` and `e2e/README.md`.
- **`npm run verify-test-repo`**: reads `main`’s recursive git tree via the GitHub API, prints blob count, checks required `bookmarks/` layout, optional `--min-bookmarks N` and `--verbose` (`scripts/verify-test-repo.js`, `e2e/README.md`).

### Fixed
- **`test-onboarding-rate-limit.js --reset`**: Repo reset uses a single commit whose tree is Git’s canonical empty tree (`4b825dc642cb6eb9a060e54bf8d69288fbee4904`), avoiding `422 GitRPC::BadObjectState` and failed chunked deletes on large bookmark trees.
- **Large pushes / onboarding speed & secondary rate limits**: `atomicCommit` no longer issues one `POST /git/blobs` per file. New/changed files are sent as **`content` on `POST /git/trees`** in layered batches (`lib/github-tree-batch.js`, max ~400 entries or ~28 MiB per request). GitHub creates blobs server-side, so a ~5000-file first push is ~13 tree calls plus commit/ref instead of ~5000 blob calls — much faster and far less likely to hit secondary limits. The onboarding diagnostic script’s `--parallel-only` path matches this behavior (`docs/SYNC-LOGIC.md`, `e2e/README.md`, `docs/ARCHITECTURE.md`).

## [2.7.0] - 2026-03-28 (*Spock*)

### Changed
- **CI**: CodeQL workflow uses `github/codeql-action` v4, runs JavaScript actions on Node 24 (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`), and sets `CODEQL_ACTION_FILE_COVERAGE_ON_PRS` so PR analyses keep file coverage after GitHub’s April 2026 default change. The main CI workflow sets the same Node 24 opt-in for checkout/setup-node; optional Playwright jobs run smoke and options UI tests on push/PR to `main`.
- **Extension short description (`extDescription`)**: Matches the ≤132-character Chrome Web Store summary from `store-assets/chrome-*.md` in all 12 locales; `package.json` `description` uses the English line so npm metadata stays aligned. Spanish and Polish store summaries were tightened by one word each (“Sinergia Linkwarden…”, “…i app…”) so the string stays within the 132-character store limit.
- **Firefox manifest description**: `manifest.firefox.json` uses `__MSG_extDescriptionFirefox__`; each locale adds `extDescriptionFirefox` with the AMO summary from `store-assets/firefox-*.md` (up to 250 characters), separate from the Chrome-oriented `extDescription`.

### Fixed
- **Duplicate folders (GitHub / toolbar)**: When the repo or browser had multiple sibling folders with the same display title (e.g. several “GitHubRepos (user)” or “Development” trees), serialization and `fileMapToBookmarkTree` now merge them into one logical folder so suffix paths (`development-2`, `githubrepos-user-3`, …) stop multiplying across syncs.
- **Duplicate bookmark prevention**: Hardened `_order.json` deserialization, three-way merge, and serialization to prevent doubled bookmark entries when the order file contains repeated keys — addresses intermittent "whole tree doubled" issue.
- **GitHub API rate limits on large repos**: Blob downloads for pull, history preview, and restore now run in batches of five concurrent `getBlob` calls (instead of unbounded parallelism) to avoid secondary rate-limit errors. `fetchRemoteFileMapAtCommit` also caches the result briefly when the same commit is requested again. HTTP **429** responses map to the same user-facing rate-limit message as **403** rate limits.
- **Linkwarden auto-mirroring**: `mirrorToLinkwarden` was never executing because it referenced undefined `STORAGE_KEYS` constants. Rewrote to fetch Linkwarden settings directly from storage.
- **Duplicate event listeners in options**: Eight controls had their `change` listeners registered twice, causing `saveSettings()` to fire redundantly on every change. Removed duplicate registrations.
- **Options page**: Sub-tab clicks no longer throw when the target has no `data-subtab` (Help quick links and “Customize shortcuts” reused `sub-tab-btn` without a matching `subtab-*` panel). `applyI18n()` skips `<select>` nodes for plain `data-i18n` text updates so option lists are never cleared by mistake.
- **Options page robustness**: Main tab switching guards missing `#tab-*` panels. The document-level folder-browser dismiss listener and folder UI no longer assume non-null nodes. Module-level `change`/`click` listeners use optional chaining so a missing control does not abort the rest of the options script.
- **Build**: Unpacked Chrome/Firefox packages copy the `options/` directory so modular Settings scripts load correctly.
- **push() / sync() error handling**: Removed dead `settings` reference in `push()` `catch`; hoisted `profileId` in `pull()`/`sync()` so `catch` can call `setSyncState` without `ReferenceError`.
- **Firefox — Sync History layout**: History rows use a single-row four-column grid (date, SHA, message, and an actions column with Preview + Restore or the “current” badge, right-aligned). A previous layout attempt let the actions column’s min-content width exceed the card so the Restore button could paint outside the card; card and list still use horizontal overflow containment as a safeguard.
- **Options — Sync History SVG icons**: Preview, Restore, and current-commit SVG icons are now mounted via `DOMParser` + `replaceChildren` instead of `innerHTML`, eliminating security-linter warnings.

### Improved
- **Debug log performance**: Cached the debug-log enable flag in memory with a `storage.onChanged` listener, eliminating an async storage read on every `log()` call.
- **Code deduplication**: Extracted shared `getRootFolderIdForRole` and `findOrCreateFolder` into `lib/bookmark-helpers.js` (previously duplicated in `github-repos.js` and `linkwarden-sync.js`). Consolidated repeated orphan-subfolder scanning and generated-file filter logic in the serializer and sync engine.
- **Architecture modularization**: Split large modules into focused files — `sync-engine.js`, `context-menu.js`, and `options.js` use barrel re-exports; options UI logic lives under `options/` (wizard, profiles, Linkwarden, history, settings, context-menu config). See `docs/ARCHITECTURE.md`.
- **Linkwarden screenshot delay**: Reduced the fixed 10-second screenshot upload delay to 5 seconds; now configurable via `screenshotDelayMs` constructor option.
- **Theme listener cleanup**: Replaced deprecated `MediaQueryList.removeListener` with standard `removeEventListener`.
- **CSS cleanup**: Removed dead `#tab-sync` selectors, merged duplicate `.context-menu-item-row` and `.btn-danger` rule blocks.
- **CSS architecture**: New root-level [`shared.css`](shared.css) holds the shared light/dark color palette (`--color-*`), universal reset, base `body` typography, `.btn` / `.btn-primary` / `.btn-secondary`, `@keyframes spin`, and `--focus-ring`. Extension pages load `ui-density.css` → `shared.css` → their page stylesheet to avoid duplicating theme tokens and button rules across options, popup, search, and Linkwarden save.
- **Options header**: Language dropdown uses short codes (EN, DE, …) with full names on hover; density (S/M/L) and theme (Auto / Dark / Light) use matching segmented controls and uniform control height; theme uses inline SVG icons instead of a single cycle letter.
- **Menu tab (visibility & order)**: Tighter list layout — smaller row padding, reduced gaps between rows and category headers, no extra row margin stacking with flex `gap`, slightly smaller labels/toggles/reorder buttons, and a smaller reset button top margin.
- **Sync History (Settings)**: Column headers for date, commit hash, **Client** (device id parsed from GitSyncMarks commit subjects; full subject on hover), and a screen-reader **Actions** column. One grid row per commit so values align under headers; preview/restore icons sit in the last column. The active commit shows a checkmark icon plus the “current” label.
- **What’s new (toolbar popup)**: Detects popup context (`whats-new-overlay--popup`), uses compact typography and four short bullets so the dialog usually fits without scrolling; Settings page keeps the larger panel.
- **What’s new copy**: v2.7.0 bullets now focus on user-visible improvements (Sync History, restore/diff preview, duplicate fix, UI density & theme) and no longer mention CI internals.
- **Store listings & screenshots**: All 12-language Chrome and Firefox store descriptions highlight Sync History, restore, and the duplicate fix. Screenshots regenerated with a new Sync History panel (slot 5, renumbering search through wizard to 6–11); meta checklists and README Visual Tour updated to match.

### Removed
- **Debug telemetry**: Removed `postAgentDebugLog` function and all call sites from `background.js` (hardcoded localhost POST leftover from debugging).
- **Dead code**: Removed unused `debounce` from the context-menu handler path, unused `getLanguage` import from `options.js`, and redundant `catch(err) { throw err }` in `bootstrapFirstSync`.

### Added
- **What's new after update**: After an extension update, a dismissible “What’s new” panel appears once when you open the toolbar popup or Settings (skipped on brand-new install so onboarding stays first).
- **Sync history / rollback**: Browse recent sync commits in the Backup tab and restore bookmarks from any previous version. One-click "Undo last sync" reverts to the pre-sync state without navigating commit history.
- **Diff preview**: "Preview" button on each history entry shows a structured diff (added, removed, changed bookmarks) before restoring, so users can make informed decisions. The preview opens inline under that commit; Added and Removed are shown side by side with collapsed sections by default. Each row also offers **Restore** using a two-click confirmation on the same button (label switches to “Click again to confirm”) instead of a browser dialog.
- **Unit tests**: Expanded `test/` directory with `serializer.test.js` (slugify, shortHash, generateFilename, contentHash, bookmarkTreeToFileMap, fileMapToBookmarkTree, fileMapToMarkdown, fileMapToNetscapeHtml) and `sync-diff.test.js` (computeDiff, mergeDiffs), plus additional suites (`sync-commit-message`, `merge-order`, `dedupe`, `whats-new`). Total 65 tests covering serialization, deserialization, export, diff, merge, and related helpers.
- **UI Density**: Three-level density setting (Compact / Medium / Large) via S / M / L selector in the options header. Applies to all extension surfaces (options, popup, search, Linkwarden save). Stored in `chrome.storage.sync` and synced across devices. CSS tokens in `ui-density.css` control typography, spacing, and control sizes globally.

## [2.6.2] - 2026-03-08 (*Link*)

### Fixed
- **Context Menu stability**: Implemented a rebuilding lockout and debouncing mechanism (`refreshContextMenuDynamicItemsDebounced`) to prevent "duplicate id" errors during high-frequency bookmark events.
- **Context Menu reliability**: Fixed unhandled promise rejections in context menu action handlers by adding proper error boundaries and debug logging.

### Improved
- **Enhanced Sync Visibility**: Replaced the red `!` badge with an orange one and added a descriptive tooltip on hover (e.g., "Sync Error: [message]") to avoid confusion with browser permission warnings ("Wants access to this site").

## [2.6.1] - 2026-03-07 (*Link*)

### Fixed
- **Firefox Linkwarden permissions**: Resolved "Host permission denied" error in Firefox Manifest V3 by fixing lost user gesture context during permission requests and adding missing host patterns to `manifest.firefox.json`.
- **Website Banner**: Updated website promo banner and meta tags to use the Linkwarden-branded marquee tile, matching the project README.

### Improved
- **Store Descriptions**: Standardized and synchronized feature descriptions (Linkwarden, Smart Search, Wizard) across all 12 supported languages for Chrome and Firefox.
- **Chrome Marquee Tile**: Added dedicated 1400x560 promo marquee asset (no alpha) for Chrome Web Store compliance.

## [2.6.0] - 2026-03-07 (*Link*)

### Migration
- **No breaking changes**: Core bookmark sync remains fully compatible with existing v2.5.x repositories.
- **Linkwarden**: New integration requires manual configuration in the Linkwarden settings tab (URL & API Key).

### Added
- Linkwarden integration — context menu Save to Linkwarden, options tab, tags, screenshots
- Smart Search — lightning-fast search interface with theme support and keyboard navigation
- Setup Wizard — guided onboarding for tokens and repository configuration
- Enhanced README.md — comprehensive feature documentation and visual tour

## [2.5.4] - 2026-03-06 (*Cortana*)


### Fixed

- **Onboarding rate limiting** ([#51](https://github.com/d0dg3r/GitSyncMarks/issues/51)): Initial sync blob uploads are now created in parallel batches of 5 instead of sequentially. This is ~3× faster and prevents hitting GitHub secondary rate limits during first sync.
- **Sync lock stuck after error**: `checkStorageQuota()` was called before the `try` block in `sync()`, so any error it threw left `isSyncing = true` permanently, blocking all future syncs with "Sync already in progress". The call is now inside the `try/finally` block.
- **`checkStorageQuota` undefined**: The function was called but never defined in `sync-engine.js`. Added the missing implementation (checks Chrome storage quota and logs a warning when below 20%).
- **Stale sync state after repo change**: `saveProfile()` only cleared `lastCommitSha` / `lastSyncFiles` when the file *path* changed, not when the repo owner or name changed. Reconnecting to a new or recreated repo with the same name would carry over old commit SHAs, breaking the wizard. State is now cleared whenever owner, repo name, or path changes.

### Improved

- **Wizard sync progress**: The onboarding wizard now shows a unified status area (below the action buttons) for all states — loading (spinner + animated phase messages + elapsed seconds counter), success, and error — in a single consistent box instead of two separate areas.
- **Onboarding sync timing**: Bookmark count and both estimated and actual sync duration are logged to the extension debug log after first sync completes (visible in Service Worker DevTools).
- **Internationalization (i18n)**: Added full localization for all 12 supported languages to the onboarding wizard phases and the new "Restart Wizard" card in the Help tab.
- **Wizard discoverability**: The Setup Wizard can now be easily restarted from the Help tab via a prominent restart card, making it easier for users to reconfigure their connection.

### Added

- **Wizard Restart Card**: A new interactive card in the Help tab that displays the current connection status and allows one-click access to the Setup Wizard for reconfiguration.

## [2.5.3] - 2026-03-02 (*Cortana*)

### Added

- **Dynamic Folders (context menu)**: New "Add to Folder..." recursive submenu in the context menu lets you add a bookmark directly to any folder. Added an "Add to this folder" entry at the top of submenus to allow direct parent selection.
- **Browser-Native Naming**: Synced root folders ("Toolbar" and "Other") now automatically use browser-native names (e.g., "Bookmarks Bar" vs. "Bookmarks Toolbar") based on whether you are using Chrome or Firefox.
- **Improved Context Menu Filtering**: The "Add to Folder..." menu is now filtered to only show sync-active root folders, providing a more focused user experience.
- **Sync Now in Search**: New "Sync Now" button in the search popup header allows triggering a sync directly without opening the main popup.
- **Search UI Redesign**: Redesigned the search popup header with unified styling for Sync and Close buttons, improved spacing, and better visual alignment.
- **Full Translation**: The context menu and search UI are now fully translated into all 12 supported languages.
- **Mobile App Info**: Added an explicit note in the Options -> About tab for Android users, clarifying that Firefox for Android does not support direct bookmark integration and directing them to the companion app.
- **Pinned Quick Folders (context menu)**: Up to 3 profile-specific folders can now be pinned in Files -> Settings and used as one-click `Add to ...` entries in the right-click context menu.
- **Open All from Folder (context menu)**: New submenu to open bookmark folders directly; safety guard requires a second click within 15 seconds when folder tab count exceeds the configured threshold.
- **Bookmark search shortcut from context menu**: New `Search Bookmarks` entry opens a dedicated search popup window with local bookmark search and clickable result list.
- **Files -> Settings tools card**: New UI block for context-menu quick-folder setup and open-all threshold configuration.

### Changed

- **Search highlighting**: The search text is now visually highlighted within titles and URLs in the search popup results.
- **Context menu refresh behavior**: Dynamic sections (quick folders, open-all folder list, profile entries) now refresh when bookmarks or active profile data changes.
- **Bookmark search popup polish**: Search popup now follows the extension theme (`auto/light/dark`), uses improved dark-mode button contrast, moves close to a compact top-right icon control, closes via both button and `Esc`, and replaces the old clear button with an inline `X` control in the search field.
- **E2E smoke test robustness**: Settings-sync smoke test now validates disabled/enabled button states around client-name requirement instead of clicking disabled actions

## [2.5.2] - 2026-02-27 (*Cortana*)

### Fixed

- **Orphan subfolders in generated files**: README.md, bookmarks.html, feed.xml, and dashy-conf.yml now include subfolders that exist in the file map but are not listed in the parent folder's `_order.json`. Previously only the tree builder handled such orphans; all generators now scan for and include them (handles manually created folders, corrupted `_order.json`, or migration from older formats)

### Changed

- **Extension icon**: Toolbar icon uses sync logo (assets/sync_logo.png) with transparent background, no border, max size; app UI keeps original logo (logo-source.png)
- **Website layout**: Extension and App tabs unified — intro removed; menu first; badges and ZIP/APK text below; layout matches across both tabs
- **Website navigation**: Docs link removed from quick-nav (still in footer); download buttons no longer duplicated in extension tab
- **README**: "Load from source" section added — load unpacked from `build/chrome/` (not project root) because Chrome rejects directories containing `_site/`
- **Settings sync UI**: Import & Apply, Sync current to selected, and Create my client setting buttons are disabled until a client name is set; password entered for Import/Sync/Create is automatically saved as the encryption password; layout: Client name + Create in one row, Refresh + Dropdown + Import + Sync in one row under "Available settings in repository"
- **Help tab**: "Start setup wizard" button added to Getting Started section — launches the onboarding wizard from Help

## [2.5.1] - 2026-02-25 (*Cortana*)

### Fixed

- **Password dialog placement**: Password prompt for Settings sync actions (Import & Apply, Sync current to selected, Create my client setting) now appears in the Settings sub-tab instead of the Export/Import sub-tab

## [2.5.0] - 2026-02-23 (*Cortana*)

### Added

- **Context menu**: Right-click on any page or link — Add to Toolbar, Add to Other Bookmarks, Sync Now, Switch Profile, Copy Favicon URL, Download Favicon; auto-syncs after adding; new permissions: `contextMenus`, `activeTab`, `scripting`, `downloads`
- **Profile switching via context menu**: Switch between profiles directly from the right-click menu — active profile shown with radio check; submenu updates dynamically when profiles are added, renamed, or deleted
- **Favicon tools**: Copy any site's favicon URL to clipboard or download it as PNG — uses the browser's `tab.favIconUrl` with Google favicon service fallback (`s2/favicons`)
- **8 new languages**: Portuguese (Brazil), Italian, Japanese, Chinese (Simplified), Korean, Russian, Turkish, Polish — extension now supports 12 languages total; auto-detection improved for regional locales (pt_BR, zh_CN)
- **Dynamic keyboard shortcuts**: Shortcut keys displayed from `chrome.commands.getAll()` instead of hardcoded; "Customize shortcuts" button opens the browser's native shortcut settings
- **Factory reset**: "Reset all data" button in Files → Settings — clears all profiles, tokens, and settings (browser bookmarks are preserved); two-step confirmation dialog
- **Folder browser**: Browse repository folders to select the sync path — no more manual typing; available in GitHub → Connection next to the File Path input; navigate into subfolders or select with one click
- **CI screenshot workflow**: GitHub Actions workflow (`screenshots.yml`) to auto-generate store screenshots for all 12 languages; manual trigger via `workflow_dispatch`; commits updated images back to the repo

### Changed

- **Feature lists reordered**: README and store listings now sorted by user interest — leading with unique selling points (No middleman, per-file storage, three-way merge)
- **"No server needed" renamed to "No middleman"**: More precise wording — the extension communicates directly with the GitHub API, no third-party server or backend involved

## [2.4.0] - 2026-02-19 (*R2-D2*)

### Added

- **RSS feed export**: New generated file `feed.xml` (RSS 2.0) — each bookmark becomes an `<item>` with title, URL, and folder as category; subscribable in any RSS reader; enables automations (Slack, IFTTT, n8n); works as live feed via GitHub Pages or raw URL
- **Generated files mode selector**: Each generated file (README.md, bookmarks.html, feed.xml) can be set to **Off**, **Manual**, or **Auto** individually; "Generate now" button triggers manual generation and push; backward-compatible with existing boolean settings
- **Settings sync to Git**: Optional encrypted settings file in the repo — syncs extension settings (profiles, tokens, preferences) across devices; AES-256-GCM encrypted with user password; password stored locally per device; auto-push on every sync, auto-pull on pull/sync; supports **Global** mode (shared `settings.enc`) and **Individual** mode (device-specific `settings-{id}.enc`); import settings from other devices in individual mode
- **Backlog voting awareness**: "Vote on backlog" button in Help tab quick links; poll link in README

### Changed

- **Options reorganized**: Reduced from 6 tabs to 5 — Backup and Automation merged into new **Files** tab; sub-tab navigation for GitHub (Profile, Connection, Repos) and Files (Generated, Settings, Export/Import, Git Add); Help quick links restyled as pill buttons
- **Debug Log moved**: Debug Log section moved from Help tab to Sync tab (where sync diagnostics belong)
- **Generated files UI**: Checkbox toggles replaced by dropdown selectors (Off / Manual / Auto) with per-file control; dashy-conf.yml added as fourth generated file
- **GitHub Repos Folder**: Moved to GitHub tab → Repos sub-tab

## [2.3.0] - 2026-02-19 (*Data*)

### Added

- **Encrypted settings export**: Password-protected export for secure backup; PBKDF2 + AES-256-GCM; two buttons (plain JSON / encrypted .enc); import supports both formats and prompts for password when needed

### Changed

- **Options tab label**: "Synchronization" tab shortened to "Sync" in all languages (en, de, fr, es)
- **Store screenshots**: Popup uses crop method (left-half only) to avoid stretching; Options tabs use default resize; light/dark mode displayed correctly side by side (1280×800)
- **Import hints**: Bookmark import clarifies it affects the active profile; Settings import clarifies it affects all profiles
- **Popup**: Force push/pull buttons disabled during sync; conflict detection uses `result.conflict` (language-independent)
- **Options**: Profile buttons DRY helper `setProfileButtonsEnabled()`
- **Automation tab**: Copy buttons (JSON, gh command); "Create file in repo" block; parameter table; subfolder example; Raw workflow link; section/folder terminology
- **Help tab**: Quick Links (Documentation, Discussions, Report Issue) as button row at top; removed redundant Links accordion; aligned card styling with other tabs
- **Theme selector**: Single cycle button (A → Dark → Light → A) replaces three separate buttons; icon and tooltip reflect current mode; A and moon icon in white for dark mode
- **Auto-save**: GitHub tab (token, owner, repo, branch, filepath, profile switch) and Sync tab (all dropdowns, toggles, generated files) save automatically on change; Save buttons removed
- **GitHub Repos Folder**: Moved from GitHub tab to Sync tab (later moved to GitHub → Repos sub-tab in v2.4.0)
- **Save feedback layout**: Save result integrated into cards with top border instead of standalone area

## [2.2.1] - 2026-02-19

### Added

- **Debug Log commit hashes**: Sync diagnostics now include 7-char commit SHAs (base, remote, saved) at key points for easier troubleshooting of state-regression and stale-fetch issues

### Changed

- **Profile dialogs**: Add, Rename, Delete use inline dialogs instead of native `prompt()` / `confirm()`
- **Onboarding**: Create folder and Pull use inline dialogs instead of `confirm()`
- **Error messages**: Inline message area instead of `alert()` for validation and other errors
- **Path change hint**: When saving a changed File Path, a hint is shown: "On next sync a conflict may occur. Use GitHub → Local to adopt the remote state."

### Fixed

- **Sync feedback message**: After a merge with push or pull, the popup now shows "Push success" or "Pull success" instead of "All in sync"
- **State regression**: Prevented overwriting local state with stale cached remote data; added verification before path-8 pull and `cache: no-store` for GitHub API requests

## [2.2.0] - 2025-02-15

### Added

- **Auto-save on switches**: Toggles (GitHub Repos, auto-sync, sync on startup/focus, profile switch without confirm) save automatically on change; no need to click Save for switch changes
- **Auto-save before actions**: "Update GitHub Repos" and "Test Connection" save current settings before running, so state is never lost
- **GitHub Repos folder**: Auto-generated folder with all user repos as bookmarks (public/private); toggle, configurable position (toolbar/other), manual refresh; folder preserved on pull when not in Git; changes synced via normal bookmark sync
- **Multiple profiles**: Work and personal bookmark sets with separate GitHub repos; up to 10 profiles; switching replaces local bookmarks with the selected profile's data
- **Onboarding**: Test Connection checks the target path; offers to create the folder structure when empty, or to pull existing bookmarks when found
- **Profile Add**: When adding a new profile, automatically switch to it for immediate configuration
- **Spinner**: Loading indicators during profile switch and Test Connection
- **Keyboard shortcuts**: Quick sync (Ctrl+Shift+.), open options (Ctrl+Shift+,); customizable in browser extension settings
- **Help tab**: New tab in options with keyboard shortcuts and main features overview (popup, profiles, auto-sync, conflicts)
- **French and Spanish**: New languages (Français, Español) in the language selector
- **Profile limit display**: Shows current/max profiles (e.g. 3/10) in the Profile card; Add button disabled when limit reached

### Fixed

- **Settings import**: Restores `profileSwitchWithoutConfirm` and per-profile GitHub Repos fields (`githubReposEnabled`, `githubReposParent`, `githubReposUsername`) on round-trip

### Changed

- **Backup tab**: Compact design matching Automation (single card, automation-block style); shorter i18n texts (EN/DE/FR/ES); equal spacing for Import/Export buttons
- **Help tab**: Collapsible accordion sections; "Why does sync sometimes take long?" moved to position 2; only Getting Started and Links open by default; compact styling
- **Options tabs**: All tabs (GitHub, Sync, Backup, Automation, Help, About) use consistent compact styling — reduced padding, margins, font sizes
- **Contributors**: Updated Special Thanks to Patrick W., Gernot B.
- **Profile switch**: Inline confirmation instead of `confirm()`; optional toggle "Switch without confirmation"
- **Profile layout**: Redesigned Profile card (label, dropdown, actions, toggle, inline confirmation)
- **Popup**: Restructured layout — profile dropdown in header; simplified status area (status line + meta); theme-aware spinner; compact footer; auto-sync and countdown on one line
- **Pull success message**: Shortened to "Loaded from GitHub." / "Von GitHub geladen."
- **Options header**: Language label removed; dropdown only

## [2.1.2] - 2025-02-13

### Added

- **Store buttons in README**: Chrome Web Store and Firefox Add-on badges with direct links
- **Testing guide** ([docs/TESTING.md](docs/TESTING.md)): Instructions for Chrome, Firefox desktop, and Firefox Android

### Changed

- **Responsive mobile layout** for Firefox Android: Popup and options page adapt to narrow viewports; tab bar scrolls horizontally; header stacks on small screens

## [2.1.1] - TBD

### Changed

- **New icon**: Updated logo (blue bookmark + green sync arrow on black background) across extension, store assets, and favicons

## [2.1.0] - 2025-02-10

### Added

- **Sync profiles**: Presets for real-time (1 min), frequent (5 min), normal (15 min), and power-save (60 min) sync — each with tuned debounce delay
- **Custom sync profile**: Manual interval and debounce settings
- **Sync on browser start**: Optional automatic sync when the browser starts
- **Sync when browser gains focus**: Optional sync when switching back to the browser (with 60s cooldown)
- **Commit link in popup**: Last commit hash shown as a clickable link to GitHub
- **Next sync countdown**: Countdown timer until the next periodic sync (when auto-sync is on)
- **Theme selector**: Light, dark, or auto (system) — applies to options page and popup
- **Pre-release workflow**: Tags like `v2.1.0-pre.1`, `v2.1.0-alpha.1`, `v2.1.0-beta.1`, `v2.1.0-rc.1` create GitHub Pre-releases
- **Language selector** in options header (moved from Settings tab)

### Changed

- **Project renamed**: BookHub → GitSyncMarks
- **Firefox**: New extension ID `gitsyncmarks@d0dg3r` — existing Firefox users must uninstall the old extension and install the new one
- **IndexedDB migration**: Automatic migration from `bookhub-keys` to `gitsyncmarks-keys` — existing users keep their token without re-entering it
- **Options tabs**: Reorganized into GitHub, Synchronization, Backup, Automation, About
- **Backup tab**: Redesigned with clearer block layout, descriptions per action, file picker with chosen filename display
- **Last data change**: Popup shows "Last data change" instead of "Last sync" when changes were pushed
- **Debounce**: Configurable per profile; max-wait cap prevents indefinite deferral (30s or 6× debounce)
- **package.json**: Version kept in sync with manifest for releases

## [2.0.1] - TBD

### Fixed

- False merge conflicts when two devices edit the same folder concurrently (`_order.json` content-level merge)
- Hardened GitHub Action inputs for automation workflow
- Updated Firefox manifest and i18n
- Updated store screenshots

## [2.0.0] - TBD

### Added

- Per-file bookmark storage (one JSON file per bookmark)
- Three-way merge sync
- Firefox support
- Automation via GitHub Actions
- Cross-browser build system

## [1.5.0] - TBD

### Added

- Token encryption at rest (AES-256-GCM)
- Token moved to local storage

## [1.4.0] - TBD

### Added

- Tabbed options page
- Import/export of bookmarks
- GitHub project links
- Improved description

## [1.3.0] - TBD

### Added

- Multilanguage support (i18n) with manual language selection

## [1.2.0] - TBD

### Added

- Chrome Web Store preparation
- Privacy policy

## [1.1.0] - TBD

### Added

- Open source (MIT license)
- English translation

## [1.0.0] - TBD

### Added

- Initial release: bookmark sync with GitHub

[Unreleased]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.7.0...HEAD
[2.7.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.6.2...v2.7.0
[2.6.2]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.6.1...v2.6.2
[2.6.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.6.0...v2.6.1
[2.6.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.5.4...v2.6.0
[2.5.4]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.5.3...v2.5.4

[2.5.3]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.5.2...v2.5.3
[2.5.2]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.5.1...v2.5.2
[2.5.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.1.2...v2.2.0
[2.1.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.5.0...v2.0.0
[1.5.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/d0dg3r/GitSyncMarks/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/d0dg3r/GitSyncMarks/releases/tag/v1.0.0
