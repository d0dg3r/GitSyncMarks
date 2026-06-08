# Firefox Add-ons (AMO) — GitSyncMarks (English)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Bookmark sync via GitHub, GitLab, Codeberg, Gitea & more. Linkwarden, Smart Search, Bitwarden backup, guided wizard. Bidirectional, secure, private. Full Firefox support. No middleman.

### Detailed Description
GitSyncMarks bidirectionally synchronizes your bookmarks with GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs. No middleman, no third-party servers – your data remains completely under your control.

Highlights

- Multi-Provider Git Sync: GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs — each profile can use its own provider and server URL.
- Profile Transfer & Push Mirrors: Copy bookmarks between profiles (replace or merge); optional push-only backup remotes after each sync.
- Live Sync Progress: Step text during push, pull, and profile switch (e.g. `3 / 12 files` or `1 of 3` steps).
- Bitwarden / Vaultwarden Backup to Git: Store password-protected vault exports in your repo with optional extra encryption; list, download, or delete remote backups.
- Nested-Card UI: Clearer grouped sections across Options, setup wizard, popup, and search.
- Sync History & Restore: Browse past commits, preview changes with a diff view, and restore any previous bookmark state in one click.
- Clean Remote Orphans: Preview and delete remote bookmark files that no longer exist locally.
- Linkwarden Synergy: Save pages or links directly to your Linkwarden instance — viewport screenshots, collection sync, and predefined tags.
- Smart Search: Dedicated, lightning-fast bookmark search with light/dark themes and full keyboard navigation.
- Guided Setup Wizard: Connection check only validates access; you choose pull, merge/sync, push, folder setup, or skip — with confirmation before anything is written to the repository.
- Codeberg / Gitea Performance: Fast git tree + blob reads and single-commit pushes on Gitea-family hosts (Contents API fallback when needed).
- Context Menu: Quick folders, Search Bookmarks popup, Open All from Folder, favicon copy/download, and profile actions from right-click.
- Settings Sync to Git: Encrypted settings backup (`settings.enc`) in your repository — share configuration across devices.

Key Capabilities

- Private-by-Design: Direct communication with your Git provider's API. No third parties see your data.
- Firefox-Optimized: Supports native bookmark structures (Toolbar, Menu, Other).
- Three-Way Merge: Industrial-grade sync handles concurrent changes across multiple devices automatically.
- Single-File Storage: Each bookmark is a readable JSON file – ideal for versioning and manual editing in your Git repo.
- Multiple Profiles: Up to 10 separate profiles for work, personal life, or projects, each with its own repository.
- Automation: Add bookmarks via CLI or GitHub Actions; the extension integrates them during the next sync.
- Generated Files: README.md (overview), bookmarks.html (import file), RSS feed, and dashy-conf.yml — optional per file.
- Design & i18n: Light, dark, and system-auto themes; adjustable UI density (compact / medium / large); 12 languages.

Companion App
Use the GitSyncMarks-App (Android, iOS, Desktop) to manage your bookmarks directly from your Git repository on mobile devices. (Note: Firefox for Android does not support direct bookmark sync via extensions – use the app for this).

GitSyncMarks is Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, gitlab, backup, automation
