# Firefox Add-ons (AMO) — GitSyncMarks (English)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Bookmark sync via GitHub, GitLab, Codeberg, Gitea & more. Linkwarden, Smart Search, guided wizard. Private.

### Detailed Description
GitSyncMarks bidirectionally synchronizes your bookmarks with GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs. No middleman, no third-party servers – your data remains completely under your control.

Highlights

- Multi-Provider Git Sync: GitHub, GitLab, Codeberg, Gitea, Forgejo, or Gogs — each profile can use its own provider and server URL.
- Profile Transfer & Mirrors: Copy bookmarks between profiles (replace or merge); optional push-only backup remotes after each sync.
- Live Sync Progress: See step text during sync (e.g. files or bookmarks uploaded while pushing or pulling).
- Sync History & Restore: Browse past commits, preview changes with a diff view, and restore any previous bookmark state in one click.
- Duplicate Fix: Same-name folders no longer multiply across syncs — duplicates are automatically merged.
- Linkwarden Synergy: Save pages or links directly to your Linkwarden instance. Includes automatic viewport screenshots, collection synchronization, and predefined tags.
- Smart Search: A dedicated, lightning-fast search interface for your bookmarks. Supports light and dark themes and is fully keyboard-accessible.
- Guided Setup Wizard: A step-by-step onboarding process safely guides new users through token and repository configuration to their first successful sync.

Key Capabilities

- Private-by-Design: Direct communication with your Git provider's API. No third parties see your data.
- Firefox-Optimized: Supports native bookmark structures (Toolbar, Menu, Other).
- Single-File Storage: Each bookmark is stored as a readable JSON file – ideal for versioning and manual editing in your Git repo.
- Multiple Profiles: Manage up to 10 separate profiles for work, personal life, or projects, each with their own repositories.
- Automation: Add bookmarks via CLI or GitHub Actions; the extension automatically integrates them during the next sync.
- Generated Files: Automatically creates a README.md (overview), bookmarks.html (import file), or RSS feed in your repository.
- Design & i18n: Light, dark, and system-auto themes; adjustable UI density (compact / medium / large) across Settings, popup, search, and Linkwarden save; 12 languages.

Companion App
Use the GitSyncMarks-App (Android, iOS, Desktop) to manage your bookmarks directly from your Git repository on mobile devices. (Note: Firefox for Android does not support direct bookmark sync via extensions – use the app for this).

GitSyncMarks is Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation
