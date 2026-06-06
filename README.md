<p align="center">
  <img src="store-assets/marquee_promo_tile_linkwarden.png" width="960" alt="GitSyncMarks — Bookmark sync via GitHub, GitLab, Codeberg, Gitea & Linkwarden">
</p>

<p align="center">
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks" alt="Release"></a>
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases?q=pre"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks?include_prereleases&label=pre-release&logo=github&style=flat-square" alt="Pre-release"></a>
  <a href="https://chromewebstore.google.com/detail/kogijidhfkoibgihpiaiippajhgdgmif"><img src="https://img.shields.io/badge/Chrome_Web_Store-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/"><img src="https://img.shields.io/badge/Firefox_Add-on-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-on"></a>
  <a href="https://github.com/sponsors/d0dg3r"><img src="https://img.shields.io/badge/Sponsor-EA4AAA?style=flat-square&logo=githubsponsors&logoColor=white" alt="Sponsor"></a>
</p>

<p align="center">
  <strong>GitSyncMarks</strong> — Your bookmarks, safe in your Git repo. <br>
  Bidirectional, automatic sync for Chrome, Firefox, and the <strong>Companion App</strong>. <br>
  <em>No middleman. No privacy concerns. Total control.</em>
</p>

> [!NOTE]
> *"With a distributed tool, no single place is vital to your data."*
> — **Linus Torvalds** (Git creator)

> [!IMPORTANT]
> **Stable release ([v2.8.0](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v2.8.0))** — the builds in the [Chrome Web Store](https://chromewebstore.google.com/detail/kogijidhfkoibgihpiaiippajhgdgmif) and on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/) are still **v2.x**. They provide **GitHub** bookmark sync, Linkwarden, Smart Search, sync history, profiles, and the rest of the feature list marked **(stable)** below. **GitLab, Codeberg, Gitea, profile transfer, push mirrors, and live sync progress are not in the store builds yet.**

> [!TIP]
> **Try GitSyncMarks 3.0 (beta)** — upcoming multi-provider sync and related features are in the **v3.0 pre-release** only. Download the latest beta from [GitHub Releases (pre-releases)](https://github.com/d0dg3r/GitSyncMarks/releases?q=pre) — currently **[v3.0.0-beta.5](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v3.0.0-beta.5)**.
>
> **What’s new in the beta (not in store builds):**
> - **Multi-provider Git sync** — GitHub, GitLab, Codeberg, Gitea, Forgejo, Gogs (not GitHub-only)
> - **Gitea/Codeberg performance** — fast git tree + blob reads; single-commit pushes (beta.5)
> - **Codeberg CORS fix** — sync/push no longer blocked as “Network error” (beta.5)
> - **Live sync progress** and **profile-switch step progress** (`1 of 3`) in popup, wizard, and options
> - **Profile transfer**, **push mirrors**, and **clean remote orphans**
> - **Safer setup wizard** — connection check does not push; you choose pull / merge / push / skip with confirmation ([#146](https://github.com/d0dg3r/GitSyncMarks/issues/146))
> - **Codeberg / Gitea** connection test works with repository-scoped tokens; settings export/import via profile-manager token API
>
> **Install beta:** Chrome/Edge/Brave — download the ZIP, extract, **Load unpacked** (`chrome://extensions`, Developer mode). Firefox — **Install temporary add-on** from the ZIP. Existing GitHub profiles keep working; no breaking changes planned for stable 3.0.0. Feedback welcome before the store release.

---

## Features

Items marked **(v3.0 beta)** require the pre-release ZIP from [GitHub Releases](https://github.com/d0dg3r/GitSyncMarks/releases?q=pre), not the Chrome Web Store or Firefox Add-on.

### Core Sync & Workflow
- **Bidirectional & Automatic (stable)**: Syncs bookmarks seamlessly between GitHub and your browsers (Chrome, Firefox, Edge, Brave). **(v3.0 beta):** any supported Git provider.
- **Three-Way Merge (stable)**: Industrial-grade reliability. Handles concurrent changes across multiple devices automatically.
- **Multiple Profiles (stable)**: Manage up to 10 separate profiles (e.g., Work, Personal, Research) with individual repositories.
- **Native Integration (stable)**: Full support for native browser structures, including toolbars, menus, and context menus.
- **Multi-Provider Git Sync (v3.0 beta)**: GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs — each profile can use its own provider and server URL.
- **Live Sync Progress (v3.0 beta)**: Popup, wizard, and options show step text during sync (e.g. `3 / 12 files` while pushing).
- **Profile Transfer (v3.0 beta)**: Copy bookmarks between profiles (replace or merge) — ideal for migrating GitHub → Gitea or similar.
- **Push Mirrors (v3.0 beta)**: Optional backup remotes receive a push-only copy after each successful primary commit.
- **Bitwarden Backup (v3.0 beta)**: Upload a password-protected Bitwarden/Vaultwarden export to your Git repo (`backups/bitwarden/`) — versioned vault backup, optional extra Git encryption, list/download/delete remote backups.
- **Clean Remote Orphans (v3.0 beta)**: Preview and delete remote bookmark files that no longer exist locally.
- **Guided Onboarding (stable)**: Step-by-step wizard from token to first sync. **(v3.0 beta):** **Check connection** only validates access; you then choose pull, merge/sync, push, folder setup, or skip — with confirm dialogs before anything is written to the repo ([#146](https://github.com/d0dg3r/GitSyncMarks/issues/146)).

### Privacy & Security
- **Private-by-Design (stable)**: Direct communication with the Git provider API (GitHub in store builds). No third-party servers, no analytics, no tracking.
- **You Own the Data (stable)**: Your bookmarks are stored in *your* repository, under *your* control.
- **Human-Readable Storage (stable)**: Every bookmark is a separate, editable JSON file—perfect for versioning and manual audits.

### Linkwarden Synergy (stable)
Save any page or link directly to your **[Linkwarden](https://linkwarden.app/)** instance.
- **Auto-Screenshots**: Automatically captures and uploads a viewport screenshot on save.
- **Collection Sync**: Seamlessly pull Linkwarden collections into your browser and push them to Git.
- **Tag Management**: Organize with pre-configured tags and collection targets.

### Smart Search Popup (stable)
A dedicated, lightning-fast search interface accessible from anywhere via the extension icon or keyboard.
- **Instant Results**: Supercharged search with immediate feedback.
- **Theme Support**: Beautifully crafted light and dark modes.
- **Keyboard Power**: Navigate and select results entirely from your keyboard.

### Companion App (stable)
Take your bookmarks everywhere with the **[GitSyncMarks-App](https://github.com/d0dg3r/GitSyncMarks-App)**.
- **Cross-Platform**: Native apps for **Android, iOS, Windows, macOS, and Linux**.
- **Direct Access**: Connects directly to your Git repository for mobile management.

### Developer & Power User Tools (stable)
- **Automation Ready**: Use provided GitHub Actions (`add-bookmark.yml`) or CLI tools to add bookmarks programmatically.
- **GitHub Repos Folder**: Automatically keep a folder of all your own repositories synced as bookmarks.
- **Auto-Generated Files**: Every sync generates a `README.md` (index), `bookmarks.html` (netscape), `feed.xml` (RSS), and `dashy-conf.yml`.
- **Favicon Utilities**: Copy or download high-quality site favicons as PNGs directly from the context menu.
- **I18n**: Professionally translated into **12 languages** (EN, DE, FR, ES, JA, and more).
- **Appearance**: **UI density** (compact / medium / large) scales typography and spacing across Settings, the toolbar popup, Smart Search, and the Linkwarden save dialog; **theme** supports light, dark, or system auto. Both sync via `chrome.storage.sync`.

---

## Visual Tour

| **1. Guided Onboarding** | **2. Smart Search** | **3. Linkwarden Tab** |
| :---: | :---: | :---: |
| <img src="store-assets/en/chrome-9-wizard-welcome.png" width="280"> | <img src="store-assets/en/chrome-6-search.png" width="280"> | <img src="store-assets/en/chrome-4-linkwarden.png" width="280"> |
| *Easy Step-by-Step* | *Lightning Fast Search* | *Deep Integration* |

| **4. Git Connection** | **5. Action Popup** | **6. Save to Linkwarden** |
| :---: | :---: | :---: |
| <img src="store-assets/en/chrome-1-connection.png" width="280"> | <img src="store-assets/en/chrome-7-popup.png" width="280"> | <img src="store-assets/en/chrome-8-linkwarden-save.png" width="280"> |
| *Manage Profiles* | *Status at a Glance* | *Context Menu Power* |

| **7. Sync History** | | |
| :---: | :---: | :---: |
| <img src="store-assets/en/chrome-5-history.png" width="280"> | | |
| *Backup tab — review & restore* | | |

---

## Upgrading

### Stable v2.8 (Chrome Web Store / Firefox Add-ons)

> [!IMPORTANT]
> **v2.8.0** adds **sync history and restore** in the Backup tab, plus stability fixes. There are **no breaking changes** to your core GitHub bookmark sync.

- **No action needed** for everyday sync after an update from the store.
- **Backup / History**: Open the **Backup** tab to load recent commits, preview diffs, and restore bookmarks.
- **Linkwarden**: Configure in the **Linkwarden** tab (instance URL + API key).
- **Wizard**: **Restart Wizard** in the **Help** tab to re-verify your GitHub connection.

### v3.0 beta (GitHub Releases only)

> [!IMPORTANT]
> **v3.0.0** adds **multi-provider Git sync** (GitLab, Codeberg, Gitea family), **profile transfer**, **push mirrors**, **clean remote orphans**, and **live sync progress**. Available only in the **beta ZIP** until stable 3.0.0 ships to the stores. **No breaking changes** for existing GitHub profiles.

- **Install beta**: **[v3.0.0-beta.5](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v3.0.0-beta.5)** — Load unpacked / temporary add-on (see beta box above).
- **No action needed**: Existing GitHub profiles keep working without reconfiguration.
- **New providers**: **Settings → Git → Connection** — choose GitLab, Codeberg, Gitea, etc. See [docs/PROVIDERS.md](docs/PROVIDERS.md).
- **Profile transfer**: **Transfer…** on the Profile tab (e.g. GitHub → Gitea migration).
- **Push mirrors**: Optional backup remotes on the Connection tab.
- **Wizard**: Connection test does not sync; pick your first action explicitly ([#146](https://github.com/d0dg3r/GitSyncMarks/issues/146)).

---

## Setup & Installation

### 1. Stable — Chrome Web Store / Firefox Add-ons (v2.8, GitHub)

- **Chrome/Edge/Brave**: [Chrome Web Store](https://chromewebstore.google.com/detail/kogijidhfkoibgihpiaiippajhgdgmif)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/)

### 2. v3.0 beta — GitHub Releases (multi-provider)

- **Chrome/Edge/Brave**: Download **[v3.0.0-beta.5](https://github.com/d0dg3r/GitSyncMarks/releases/tag/v3.0.0-beta.5)** ZIP, extract, **Load unpacked** in `chrome://extensions/` (Developer Mode).
- **Firefox**: Same ZIP → **Install temporary add-on** in `about:debugging`.

### 3. Git configuration

**Stable (store) builds — GitHub only:**

1. Create a **GitHub Token** (fine-grained PAT with `Contents: Read/Write` + `Metadata: Read`, or classic PAT with `repo`).
2. Enter token, owner, repository, branch, and bookmark path in **Settings → Git → Connection**.
3. Use the **Setup Wizard** (Help → Getting Started) for a guided walkthrough.

**v3.0 beta — any supported provider:**

1. Open **Settings → Git → Connection** and choose **Git provider** (GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs).
2. For **self-hosted** providers, enter your server URL and allow host access when prompted. **Codeberg** presets `codeberg.org`; **GitLab.com** needs no server URL.
3. Create a **Personal Access Token** (GitHub / GitLab `api` / Gitea-family repo read+write).
4. Enter token, owner, repository, branch, and bookmark path. For **GitLab subgroup** projects, use `group/subgroup` as owner.

See [docs/PROVIDERS.md](docs/PROVIDERS.md) for API details per provider.

### 4. Linkwarden Integration (stable)
1. Go to the **Linkwarden** tab in settings.
2. Enter your Instance URL and API Key.
3. Enable features like **Auto-Screenshots** for the best experience.

---

## Community & Support

- **[Website](https://gitsyncmarks.com/)**: Official landing page.
- **[Discussions](https://github.com/d0dg3r/GitSyncMarks/discussions)**: Q&A, ideas, and show-and-tell.
- **[Backlog Voting](https://github.com/d0dg3r/GitSyncMarks/discussions/37)**: Vote on the next feature we build!
- **[Changelog](CHANGELOG.md)**: Stay up to date with the latest releases.

Licensed under [MIT](LICENSE). Made with heart by developers, for developers.

## Requirements

- Chrome, Chromium, Brave, Edge, or Firefox
- **Stable (store):** GitHub repository + PAT (`repo` or fine-grained `Contents: R/W`)
- **v3.0 beta:** Git repository on **GitHub**, **GitLab**, **Codeberg**, **Gitea**, **Forgejo**, or **Gogs** (self-hosted supported) + provider-specific token

## License

[MIT](LICENSE)

---

## Support the Project

If you find **GitSyncMarks** helpful, consider supporting its development:

- **[Sponsor on GitHub](https://github.com/sponsors/d0dg3r)**: Directly support the developer.
- **Star the Repository**: Help others discover the project.
- **[Contribute](CONTRIBUTING.md)**: Submit bug reports, feature ideas, or pull requests.
