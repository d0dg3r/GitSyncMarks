# Changelog

All notable changes to GitSyncMarks are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
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
- **Bookmark search popup polish**: Search popup now follows the extension theme (`auto/light/dark`), uses improved dark-mode button contrast, moves close to a compact top-right icon control, closes via both button and `Esc`, and replaces the old clear button with an inline `X` control in the search field
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

[Unreleased]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.6.1...HEAD
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
