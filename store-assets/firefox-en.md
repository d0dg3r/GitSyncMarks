# Firefox Add-ons (AMO) — GitSyncMarks (English)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync your Firefox bookmarks with GitHub — bidirectionally, conflict-free. Per-file JSON storage, three-way merge, auto-sync. Full support for Bookmarks Toolbar, Menu, and Mobile. Add bookmarks via Git, CLI, or GitHub Actions. Open source, no middleman.

### Detailed Description
GitSyncMarks syncs your Firefox bookmarks with a GitHub repository — bidirectionally, automatically, and with no middleman.

Features:
• No middleman: communicates directly with the GitHub API — no third-party server, no backend, your data stays between your browser and GitHub
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Full Firefox support including the Bookmarks Menu folder
• Auto-sync on every bookmark change (debounce configurable per profile)
• Multiple bookmark profiles: up to 10 profiles with separate GitHub repos; switch replaces local bookmarks
• Context menu: right-click on page or link — Add to Toolbar, Add to Other Bookmarks, Sync Now, Switch Profile, Copy Favicon URL, Download Favicon
• Favicon tools: copy any site's favicon URL to clipboard or download it as PNG — uses browser favicon with Google favicon service fallback
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• GitHub Repos folder: optional folder with bookmarks to all your GitHub repositories (public and private)
• Sync profiles: real-time, frequent, normal, or power-save
• Sync on startup / focus: optional sync when the browser starts or gains focus (with cooldown)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• Generated files: README.md (overview), bookmarks.html (browser import), feed.xml (RSS 2.0 feed), and dashy-conf.yml (Dashy dashboard) — each configurable as Off, Manual, or Auto
• Settings sync to Git: encrypted backup of extension settings in the repo — Global (shared) or Individual (per device) mode; import settings from other devices; same password on every device, auto-synced
• Import/Export: export bookmarks (JSON), Dashy config (YAML), or settings (plain JSON / encrypted .enc); import with automatic format detection
• Factory reset: "Reset all data" in Files → Settings — clears all profiles, tokens, and settings (browser bookmarks preserved); two-step confirmation
• Setup wizard: guided 8-step onboarding for token, repository, and first sync
• Onboarding: folder browser to select the sync path; create folder or pull bookmarks when configuring a new profile
• Multilanguage: 12 languages — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manual selection or auto-detect
• Keyboard shortcuts: quick sync (Ctrl+Shift+.), open settings (Ctrl+Shift+,) — customizable
• Theme: light, dark, or auto — single cycle button (A → Dark → Light → A) in options and popup
• Options: 5 tabs (GitHub, Sync, Files, Help, About) with sub-tabs for GitHub and Files — clean, organized settings UI
• Notifications: All (success + failure), Errors only, or Off
• Auto-save: all settings save automatically when changed — no Save buttons
• Debug log: Sync tab — enable for sync diagnostics, export for troubleshooting
• Vote on backlog: community poll to influence which features come next
• Mobile companion: GitSyncMarks-App (iOS + Android) — view bookmarks on the go, read-only sync from your repo

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

Mobile app: GitSyncMarks-App (iOS + Android) — view your bookmarks on the go. Read-only companion; F-Droid and Google Play coming soon. https://github.com/d0dg3r/GitSyncMarks-App

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation
