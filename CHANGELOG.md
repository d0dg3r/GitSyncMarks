# Changelog

All notable changes to GitSyncMarks are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[Unreleased]: https://github.com/d0dg3r/GitSyncMarks/compare/v2.4.0...HEAD
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
