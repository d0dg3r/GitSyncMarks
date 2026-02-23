# Firefox Add-ons (AMO) — GitSyncMarks (English)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync your Firefox bookmarks with GitHub — bidirectionally, conflict-free. Per-file JSON storage, three-way merge, auto-sync. Full support for Bookmarks Toolbar, Menu, and Mobile. Add bookmarks via Git, CLI, or GitHub Actions. Open source, no external server.

### Detailed Description
GitSyncMarks syncs your Firefox bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Full Firefox support including the Bookmarks Menu folder
• Multiple bookmark profiles: up to 10 profiles with separate GitHub repos; switch replaces local bookmarks
• GitHub Repos folder: optional folder with bookmarks to all your GitHub repositories (public and private)
• Onboarding: create folder or pull bookmarks when configuring a new profile
• Sync profiles: real-time, frequent, normal, or power-save
• Auto-sync on every bookmark change (debounce configurable per profile)
• Sync on startup / focus: optional sync when the browser starts or gains focus (with cooldown)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Notifications: All (success + failure), Errors only, or Off
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• Generated files: README.md (overview), bookmarks.html (browser import), feed.xml (RSS 2.0 feed), and dashy-conf.yml (Dashy dashboard) — each configurable as Off, Manual, or Auto
• Settings sync to Git: encrypted backup of extension settings in the repo — Global (shared) or Individual (per device) mode; import settings from other devices; same password on every device, auto-synced
• Options: 5 tabs (GitHub, Sync, Files, Help, About) with sub-tabs for GitHub and Files — clean, organized settings UI
• Context menu: right-click on page or link — Add to Toolbar, Add to Other Bookmarks, Sync Now, Copy Favicon URL, Download Favicon
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: export bookmarks (JSON), Dashy config (YAML), or settings (plain JSON / encrypted .enc); import with automatic format detection
• Auto-save: all settings save automatically when changed — no Save buttons
• Theme: light, dark, or auto — single cycle button (A → Dark → Light → A) in options and popup
• Vote on backlog: community poll to influence which features come next
• Multilanguage: 12 languages — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manual selection or auto-detect
• Keyboard shortcuts: quick sync (Ctrl+Shift+.), open settings (Ctrl+Shift+,) — customizable
• Debug log: Sync tab — enable for sync diagnostics, export for troubleshooting
• Mobile companion: GitSyncMarks-Mobile (iOS + Android) — view bookmarks on the go, read-only sync from your repo
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure GitSyncMarks with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your Firefox bookmark hierarchy (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks). A README.md gives you a clean overview directly on GitHub; a bookmarks.html lets you import into any browser; a feed.xml RSS feed lets you subscribe or use for automations; a dashy-conf.yml provides sections for the Dashy dashboard.

Automation:
You can add bookmarks without even opening Firefox. GitSyncMarks includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync.

GitSyncMarks is fully open source: https://github.com/d0dg3r/GitSyncMarks

Mobile app: GitSyncMarks-Mobile (iOS + Android) — view your bookmarks on the go. Read-only companion; F-Droid and Google Play coming soon. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation
