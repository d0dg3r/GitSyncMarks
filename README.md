<p align="center">
  <img src="store-assets/marquee_promo_tile_linkwarden.png" width="960" alt="GitSyncMarks — Effortless Bookmark Sync via GitHub & Linkwarden Integration">
</p>

<p align="center">
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks" alt="Release"></a>
  <a href="https://github.com/d0dg3r/GitSyncMarks/releases?q=pre"><img src="https://img.shields.io/github/v/release/d0dg3r/GitSyncMarks?include_prereleases&label=pre-release&logo=github&style=flat-square" alt="Pre-release"></a>
  <a href="https://chromewebstore.google.com/detail/kogijidhfkoibgihpiaiippajhgdgmif"><img src="https://img.shields.io/badge/Chrome_Web_Store-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Web Store"></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/"><img src="https://img.shields.io/badge/Firefox_Add-on-FF7139?style=flat-square&logo=firefoxbrowser&logoColor=white" alt="Firefox Add-on"></a>
</p>

<p align="center">
  <strong>GitSyncMarks</strong> — Your bookmarks, safe on GitHub. <br>
  Bidirectional, automatic sync for Chrome, Firefox, and the <strong>Companion App</strong>. <br>
  <em>No middleman. No privacy concerns. Total control.</em>
</p>

---

## Highlights

### 📱 Companion App
Take your bookmarks everywhere with the **[GitSyncMarks-App](https://github.com/d0dg3r/GitSyncMarks-App)**.
- **Cross-Platform**: Available for Android, iOS, Windows, macOS, and Linux.
- **Direct Sync**: Connects directly to your GitHub repository.
- **Mobile Power**: Browse, search, and manage your bookmarks on the go.

### Linkwarden Synergy
Save any page or link directly to your **Linkwarden** instance from the right-click menu.
- **Auto-Screenshots**: Capture the viewport automatically on save.
- **Default Tags**: Organise flawlessly with pre-configured tags.
- **Collection Sync**: Pull your Linkwarden collections straight into your browser bookmarks and push them to Git.

### Smart Search Popup
A dedicated, lightning-fast search interface accessible from anywhere.
- **Theme Support**: Beautiful light and dark modes.
- **Keyboard Friendly**: Instant results with "Esc" to close.
- **Visual Clarity**: Logo headers and clean result lists.

### Three-Way Merge
Industrial-grade reliability. If you change bookmarks on two devices at once, GitSyncMarks handles the merge automatically whenever possible—no manual "fixing" required.

### Guided Onboarding Wizard
Perfect for new users. GitSyncMarks walks you through the entire setup process.
- **Zero to Sync**: Step-by-Step guidance for tokens, repository selection, and first sync.
- **Auto-Validation**: Instant feedback on your GitHub connection and folder paths.
- **Flexible Flow**: Restart the wizard any time from the help or connection settings.

---

## Visual Tour

| **1. Guided Onboarding** | **2. Smart Search** | **3. Linkwarden Tab** |
| :---: | :---: | :---: |
| <img src="store-assets/en/chrome-8-wizard-welcome.png" width="280"> | <img src="store-assets/en/chrome-5-search.png" width="280"> | <img src="store-assets/en/chrome-4-linkwarden.png" width="280"> |
| *Easy Step-by-Step* | *Lightning Fast Search* | *Deep Integration* |

| **4. GitHub Connection** | **5. Action Popup** | **6. Save to Linkwarden** |
| :---: | :---: | :---: |
| <img src="store-assets/en/chrome-1-connection.png" width="280"> | <img src="store-assets/en/chrome-6-popup.png" width="280"> | <img src="store-assets/en/chrome-7-linkwarden-save.png" width="280"> |
| *Manage Profiles* | *Status at a Glance* | *Context Menu Power* |

---

## Key Capabilities

### Core — GitSyncMarks
- **Private by Design**: Communicates directly with GitHub — no third-party servers see your data.
- **Human Readable**: Every bookmark is a separate JSON file. Browse and edit them directly on GitHub.
- **Zero Configuration Sync**: Once set up, it just works in the background.

### Power User Tools
- **Multiple Profiles**: Separate work, personal, and project bookmarks. Supports up to 10 profiles.
- **Favicon Utilities**: Copy or download any site's favicon as high-quality PNG.
- **Automation Ready**: Add bookmarks via CLI or GitHub Actions using the provided `add-bookmark.yml` workflow.
- **GitHub Repos Folder**: Automatically keep a folder of all your own repositories synced as bookmarks.

### File Exports & Formats
Automatically generate and push these files to your repository on every sync:
- `README.md`: A beautiful, browsable index of your bookmarks.
- `bookmarks.html`: Netscape format for easy migration to other browsers.
- `feed.xml`: An RSS 2.0 feed to follow your latest bookmarks in any reader.
- `dashy-conf.yml`: Ready-to-use config for your Dashy dashboard.

---

## Setup & Installation

### 1. Installation
- **Chrome/Edge/Brave**: [Download ZIP](https://github.com/d0dg3r/GitSyncMarks/releases), Extract, and Load Unpacked in `chrome://extensions/` (Developer Mode).
- **Firefox**: [Install from AMO](https://addons.mozilla.org/en-US/firefox/addon/gitsyncmarks/).

### 2. GitHub Configuration
1. Create a **Personal Access Token (PAT)** with specifically the `repo` scope.
2. Open extension settings, enter your token, owner, and repository name.
3. Use the **Setup Wizard** (Help -> Getting Started) for a guided walkthrough.

### 3. Linkwarden Integration
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
- GitHub account with a repository for bookmarks
- Personal Access Token with the `repo` scope

- Chrome, Chromium, Brave, Edge, or Firefox
- GitHub account with a repository for bookmarks
- Personal Access Token with the `repo` scope

## License

[MIT](LICENSE)
