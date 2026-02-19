# Roadmap

Planned features and ideas for GitSyncMarks. See [CHANGELOG.md](CHANGELOG.md) for released changes.

Contributions and ideas welcome — open an issue or pull request.

---

## Planned for v2.3.0

- **Encrypted settings export** — Password-protected export for secure backup; currently plain JSON
| **Browser import files** | Automatically generate import files for common browsers (e.g. Netscape HTML) alongside README.md. Enables importing directly from the repo without the extension. | Medium |


---

## Planned for v3.0 (Larger milestones)

- **GitLab support** — GitLab API wrapper (different endpoints than GitHub), provider abstraction (`lib/git-provider.js`), GitLab CI/CD automation equivalent. Current `lib/github-api.js` is tightly coupled to `api.github.com`.
- **Gitea / Forgejo support** — Self-hosted Git with GitHub-compatible API; point extension to own server (e.g. `https://gitea.example.com/api/v1/`) instead of GitHub. Enables sync without GitHub, including private/air-gapped setups.

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
| **Open tabs sync** | Save open tabs to Git; full history in repo for restore/jump-back; default tabs per profile. | Large |
| **Tab-Profile** | Named sets of URLs (from bookmark folder, current tabs, or manual). Open in current window (replace/append) or new window. Stored in repo (`tab-profiles.json`). See [docs/IDEAS-TAB-PROFILES.md](docs/IDEAS-TAB-PROFILES.md). | Large |
| Additional sync sources (read-only) | Add extra folders from centrally maintained repos (e.g. team bookmarks). Your personal bookmarks stay in your repo; the shared folder is merged in read-only. Assemble bookmarks from multiple sources in one place | Medium |
| Selective folder sync | Sync only specific bookmark folders instead of all | Medium |
| Sync history / rollback | Restore previous sync states (requires storing commit history) | Medium |
| Conflict resolution UI | Diff view for merge conflicts instead of force push/pull only | Medium |
