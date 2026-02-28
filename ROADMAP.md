# Roadmap

Planned features and ideas for GitSyncMarks. See [CHANGELOG.md](CHANGELOG.md) for released changes.

Contributions and ideas welcome — open an issue or pull request.

---

## Planned for v2.6.0 — Linkwarden Integration

- **Linkwarden context menu** — Save current page or right-clicked link directly to Linkwarden; "Save with screenshot" captures visible viewport and uploads to link archive
- **Options tab: Linkwarden** — Instance URL, API key, default collection, default tags; test connection; enable/disable
- **Tags** — Default tags from options; optional per-save tag editing (if dialog added)
- **Screenshots** — `chrome.tabs.captureVisibleTab()` + `POST /api/v1/archives/:linkId` (PNG upload)

See [docs/IDEAS-LINKWARDEN.md](docs/IDEAS-LINKWARDEN.md) for full specification (what, how, where). Feature parity with [official Linkwarden extension](https://github.com/linkwarden/browser-extension) (options, tags, screenshots).

---

## Planned for v3.0 (*GLaDOS*) — Larger milestones

- **GitLab support** — GitLab API wrapper (different endpoints than GitHub), provider abstraction (`lib/git-provider.js`), GitLab CI/CD automation equivalent. Current `lib/github-api.js` is tightly coupled to `api.github.com`.
- **Gitea / Forgejo support** — Self-hosted Git with GitHub-compatible API; point extension to own server (e.g. `https://gitea.example.com/api/v1/`) instead of GitHub. Enables sync without GitHub, including private/air-gapped setups.

---

## Recently completed

- **v2.5.0** *Cortana* — Context menu (Add to Toolbar/Other, Sync Now, Switch Profile, Copy Favicon URL, Download Favicon); profile switching via context menu; favicon tools (copy URL / download PNG); 8 new languages (PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL — 12 total); dynamic keyboard shortcuts; factory reset; folder browser for path selection; CI screenshot workflow; feature lists reordered; "No middleman" replaces "No server needed"
- **v2.4.0** *R2-D2* — Settings sync to Git (encrypted `settings.enc`); RSS feed export (`feed.xml`); dashy-conf.yml (Dashy dashboard); generated files mode selector (Off/Manual/Auto per file); options reorganized to 5 tabs with sub-tabs (GitHub, Sync, Files, Help, About); Debug Log moved to Sync tab; backlog voting; 6 store screenshots per language
- **v2.3.0** *Data* — Encrypted settings export (password-protected .enc); plain JSON and encrypted supported; import with password prompt; Sync tab shortened to "Sync" in all languages; browser import files (`bookmarks.html`)
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
| **Open tabs sync** | Save open tabs to Git; full history in repo for restore/jump-back; default tabs per profile. | Large |
| **Tab-Profile** | Named sets of URLs (from bookmark folder, current tabs, or manual). Open in current window (replace/append) or new window. Stored in repo (`tab-profiles.json`). See [docs/IDEAS-TAB-PROFILES.md](docs/IDEAS-TAB-PROFILES.md). | Large |
| **Additional sync sources (read-only)** | Add extra folders from centrally maintained repos (e.g. team bookmarks). Your personal bookmarks stay in your repo; the shared folder is merged in read-only. Assemble bookmarks from multiple sources in one place | Medium |
| **Selective folder sync** | Sync only specific bookmark folders instead of all | Medium |
| **Sync history / rollback** | Restore previous sync states (requires storing commit history) | Medium |
| **Conflict resolution UI** | Diff view for merge conflicts instead of force push/pull only | Medium |
| **Automation: Bulk add from URLs** | Paste list of URLs → generate multiple JSON files or script for batch add | Medium |
| **AI + Bookmarks** | User enters API token (OpenAI, Anthropic, Gemini, Groq, Qwen). Ideas: auto-categorize, semantic search, summaries, duplicate detection, title improvement, virtual folders, smart cleanup. Privacy/cost disclaimer; optional AI tab in options. | Large |
| **Context Menu: Add to Folder** | Dynamic "Add to…" submenu that lists the user's actual bookmark folders (like the profile switcher does with profiles). Right-click a page or link and pick the exact target folder instead of only "Toolbar" / "Other Bookmarks". Build nested folder submenus recursively via `chrome.bookmarks.getTree()` with `parentId` chaining. Refresh the submenu when bookmark folders change (`chrome.bookmarks.onCreated/onRemoved/onMoved`). | Medium |
| **Context Menu: Add to Synced Folder** | Variant of the folder picker that only shows folders within the active sync profile's bookmark root (the repo path). Filters out non-synced folders to reduce clutter. Read the current profile's root folder ID, then build the submenu from that subtree only. Combine with or replace the generic "Add to Folder" entry depending on user preference. | Medium |
| **Context Menu: Pinned Quick Folders** | Let the user define 2–3 "Quick Folders" in Settings. These appear as top-level context menu entries (e.g. "Add to Projekte", "Add to Later") for one-click saving without navigating submenus. Folder IDs stored in `chrome.storage.sync`. Rebuild menu items on settings change. Settings UI: multi-select or folder picker in the GitHub / Files tab. | Small |
| **Context Menu: Open All from Folder** | Submenu listing synced bookmark folders. Clicking a folder opens all its bookmarks in new tabs (`chrome.tabs.create` in a loop). Useful for "open my morning tabs" or "open all project links". Optional: open in a new window via `chrome.windows.create` with the collected URLs. Guard against accidentally opening hundreds of tabs (confirmation if count > N). | Small |
| **Context Menu: Search Bookmarks** | "Search Bookmarks" entry that opens the Options page with focus on a search input, or opens a dedicated popup/panel with a search field. Use `chrome.bookmarks.search()` for fast lookup. Results shown as a clickable list that opens the bookmark or highlights it in the tree. | Small |
| **Context Menu: Save All Tabs to Folder** | "Save all open tabs" entry that creates a bookmark for every open tab in the current window and places them into a chosen folder (subfolder picker or a default "Saved Sessions" folder). Uses `chrome.tabs.query({ currentWindow: true })` + `chrome.bookmarks.create()` in a loop. Optional: auto-name the session with a timestamp (e.g. "Session 2025-02-19 14:30"). Trigger a sync afterwards so the session is persisted to Git immediately. | Medium |
| **Dashy Import + Template-Merge** | Two-part feature: **(A) Dashy Import** — import a `dashy-conf.yml` as bookmark source (sections become folders, items become bookmarks). New import type in Files > Export/Import. Needs minimal YAML parser or `js-yaml`. **(B) Template-Merge on export** — when generating `dashy-conf.yml`, read the existing file from the repo and merge instead of overwriting. Match items by normalized URL: matched items keep their Dashy metadata (icon URLs, description, statusCheck, target, displayData); new bookmarks get `icon: favicon`; deleted bookmarks are removed. `pageInfo` and `appConfig` blocks pass through unchanged. Extends `fileMapToDashyYaml(files, basePath, existingYaml)`. See [docs/IDEAS-DASHY-IMPORT-MERGE.md](docs/IDEAS-DASHY-IMPORT-MERGE.md) for full concept. | Large |
