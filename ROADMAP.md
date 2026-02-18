# Roadmap

Planned features and ideas for GitSyncMarks. See [CHANGELOG.md](CHANGELOG.md) for released changes.

Contributions and ideas welcome — open an issue or pull request.

---

## Planned for v2.3.0

- **Encrypted settings export** — Password-protected export for secure backup; currently plain JSON
- *(Weitere Ideen aus dem Backlog oder neue Vorschläge)*

---

## Planned for v3.0 (Larger milestones)

- **GitLab support** — GitLab API wrapper (different endpoints than GitHub), provider abstraction (`lib/git-provider.js`), GitLab CI/CD automation equivalent. Current `lib/github-api.js` is tightly coupled to `api.github.com`.

- **New layout** — Redesign of popup and/or options page (tabs, sidebar, more compact UI, improved responsive behaviour).

---

## Recently completed

- **v2.2.1** — Sync feedback message fix; state regression fix (stale fetch guard, cache-busting); debug log with commit hashes
- **Profile dialogs inline** — Add, Rename, Delete use inline dialogs (no prompt/confirm)
- **Onboarding inline** — Create folder and Pull use inline dialogs (no confirm)
- **Error messages inline** — validation-result area instead of alert()
- **Path change hint** — Hint shown when File Path changes on save
- **Browser notifications** (v2.2.0) — Sync success/failure; configurable (All / Errors only / Off)
- **Keyboard shortcuts** (v2.2.0) — Quick sync (Ctrl+Shift+.), open options (Ctrl+Shift+,)
- **Multiple sync profiles** (v2.2.0) — Work/personal bookmark sets; onboarding (create folder / pull)
- **French and Spanish** (v2.2.0) — New languages: Français, Español

## Backlog / ideas (No timeline)

| Idea | Description | Effort |
|------|-------------|--------|
| **CI E2E Tests** | E2E-Workflow in GitHub Actions reaktivieren (xvfb/headed, Service-Worker-Start). Aktuell lokal mit `npm run test:e2e`. | Medium |
| **CI Screenshots** | Screenshot-Generierung und Push im Release-Workflow. Aktuell lokal mit `npm run screenshots`. | Small |
| **Folder browse/select** | Select or browse the sync folder in the Git repo instead of typing the path manually | Small |
| **Browser import files** | Automatically generate import files for common browsers (e.g. Netscape HTML) alongside README.md. Enables importing directly from the repo without the extension. | Medium |
| **Open tabs sync** | Save open tabs to Git; full history in repo for restore/jump-back; default tabs per profile. | Large |
| **Tab-Profile** | Named sets of URLs (from bookmark folder, current tabs, or manual). Open in current window (replace/append) or new window. Stored in repo (`tab-profiles.json`). See [docs/IDEAS-TAB-PROFILES.md](docs/IDEAS-TAB-PROFILES.md). | Large |
| **Flutter Bookmark App** | Mobile app (iOS + Android) that syncs bookmarks from the GitHub repo (read-only), displays them in a tree view, and opens URLs in the user-selected browser. See [docs/IDEAS-FLUTTER-BOOKMARK-APP.md](docs/IDEAS-FLUTTER-BOOKMARK-APP.md). | Large |
| Additional sync sources (read-only) | Add extra folders from centrally maintained repos (e.g. team bookmarks). Your personal bookmarks stay in your repo; the shared folder is merged in read-only. Assemble bookmarks from multiple sources in one place | Medium |
| Selective folder sync | Sync only specific bookmark folders instead of all | Medium |
| Sync history / rollback | Restore previous sync states (requires storing commit history) | Medium |
| Conflict resolution UI | Diff view for merge conflicts instead of force push/pull only | Medium |
| **Encrypted settings export** | Export settings (including tokens) as an encrypted file; password-protected import for secure backup and migration. See v2.3.0. | Medium |
| Self-hosted Git (Gitea, Forgejo) | Broader provider support beyond GitHub/GitLab | Large |
