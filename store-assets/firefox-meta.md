# Firefox Add-ons (AMO) — GitSyncMarks (Meta)

Shared metadata for all Firefox Add-ons listings.
Language-specific files: firefox-{lang}.md (e.g. firefox-en.md, firefox-de.md, ...)

---

## Privacy

### Single Purpose
Sync browser bookmarks with a GitHub repository.

### Privacy Policy URL
https://github.com/d0dg3r/GitSyncMarks/blob/main/PRIVACY.md

### Permission Justifications

| Permission | Justification |
|------------|---------------|
| `bookmarks` | Required to read and write the user's bookmarks for synchronization with GitHub. |
| `storage` | Required to store extension settings (token, repo config) and sync state (timestamps, SHAs) locally in the browser. |
| `alarms` | Required to schedule periodic background sync checks for remote changes. |
| `notifications` | Required to show sync success or failure notifications (user-configurable). |
| `host_permissions: https://api.github.com/*` | Required to communicate with the GitHub REST API to read and write bookmark files in the user's repository. |
| `contextMenus` | Required to add right-click menu items for adding bookmarks, syncing, and favicon utilities. |
| `activeTab` | Required to access the active tab's URL and title when adding a bookmark via the context menu. |
| `scripting` | Required to copy the favicon URL to the clipboard via the context menu. |
| `downloads` | Required to download favicons to the local file system via the context menu. |

### Data Use Disclosure

**Does your extension collect or transmit user data?**
Yes — the extension reads the user's bookmarks and transmits them to the GitHub API (api.github.com) to store them in the user's own repository.

**What data is collected?**
- Browser bookmarks (titles, URLs, folder structure)

**Is data transmitted to any server?**
- Only to api.github.com, authenticated with the user's own Personal Access Token
- No other servers, no analytics, no tracking

**Is data sold or transferred to third parties?**
No.

---

## Test Instructions

### Username
*(leave empty)*

### Password
*(leave empty)*

### Additional Instructions

No shared account needed. Create a GitHub PAT at github.com/settings/tokens (repo scope), create an empty repo, then enter both in the extension settings. Click "Sync Now" to test.

---

## Distribution

### Visibility
Public

### Regions
All regions

---

## Store Assets Checklist

**Screenshots** are copied from Chrome (UI is identical; Playwright cannot load Firefox extension). Run `npm run screenshots`. Each image shows light and dark mode side by side.

### English (EN)
- [x] `en/firefox-1-connection.png` — Connection
- [x] `en/firefox-2-sync.png` — Sync
- [x] `en/firefox-3-menu.png` — Menu
- [x] `en/firefox-4-linkwarden.png` — Linkwarden
- [x] `en/firefox-5-history.png` — Sync History
- [x] `en/firefox-6-search.png` — Search
- [x] `en/firefox-7-popup.png` — Popup
- [x] `en/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `en/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `en/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `en/firefox-11-wizard-repo.png` — Wizard (Repository)

### Deutsch (DE)
- [x] `de/firefox-1-connection.png` — Connection
- [x] `de/firefox-2-sync.png` — Sync
- [x] `de/firefox-3-menu.png` — Menu
- [x] `de/firefox-4-linkwarden.png` — Linkwarden
- [x] `de/firefox-5-history.png` — Sync History
- [x] `de/firefox-6-search.png` — Search
- [x] `de/firefox-7-popup.png` — Popup
- [x] `de/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `de/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `de/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `de/firefox-11-wizard-repo.png` — Wizard (Repository)

### Français (FR)
- [x] `fr/firefox-1-connection.png` — Connection
- [x] `fr/firefox-2-sync.png` — Sync
- [x] `fr/firefox-3-menu.png` — Menu
- [x] `fr/firefox-4-linkwarden.png` — Linkwarden
- [x] `fr/firefox-5-history.png` — Sync History
- [x] `fr/firefox-6-search.png` — Search
- [x] `fr/firefox-7-popup.png` — Popup
- [x] `fr/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `fr/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `fr/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `fr/firefox-11-wizard-repo.png` — Wizard (Repository)

### Español (ES)
- [x] `es/firefox-1-connection.png` — Connection
- [x] `es/firefox-2-sync.png` — Sync
- [x] `es/firefox-3-menu.png` — Menu
- [x] `es/firefox-4-linkwarden.png` — Linkwarden
- [x] `es/firefox-5-history.png` — Sync History
- [x] `es/firefox-6-search.png` — Search
- [x] `es/firefox-7-popup.png` — Popup
- [x] `es/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `es/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `es/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `es/firefox-11-wizard-repo.png` — Wizard (Repository)

### Português Brasil (PT-BR)
- [x] `pt_BR/firefox-1-connection.png` — Connection
- [x] `pt_BR/firefox-2-sync.png` — Sync
- [x] `pt_BR/firefox-3-menu.png` — Menu
- [x] `pt_BR/firefox-4-linkwarden.png` — Linkwarden
- [x] `pt_BR/firefox-5-history.png` — Sync History
- [x] `pt_BR/firefox-6-search.png` — Search
- [x] `pt_BR/firefox-7-popup.png` — Popup
- [x] `pt_BR/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `pt_BR/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `pt_BR/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `pt_BR/firefox-11-wizard-repo.png` — Wizard (Repository)

### Italiano (IT)
- [x] `it/firefox-1-connection.png` — Connection
- [x] `it/firefox-2-sync.png` — Sync
- [x] `it/firefox-3-menu.png` — Menu
- [x] `it/firefox-4-linkwarden.png` — Linkwarden
- [x] `it/firefox-5-history.png` — Sync History
- [x] `it/firefox-6-search.png` — Search
- [x] `it/firefox-7-popup.png` — Popup
- [x] `it/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `it/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `it/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `it/firefox-11-wizard-repo.png` — Wizard (Repository)

### 日本語 (JA)
- [x] `ja/firefox-1-connection.png` — Connection
- [x] `ja/firefox-2-sync.png` — Sync
- [x] `ja/firefox-3-menu.png` — Menu
- [x] `ja/firefox-4-linkwarden.png` — Linkwarden
- [x] `ja/firefox-5-history.png` — Sync History
- [x] `ja/firefox-6-search.png` — Search
- [x] `ja/firefox-7-popup.png` — Popup
- [x] `ja/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `ja/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `ja/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `ja/firefox-11-wizard-repo.png` — Wizard (Repository)

### 中文简体 (ZH-CN)
- [x] `zh_CN/firefox-1-connection.png` — Connection
- [x] `zh_CN/firefox-2-sync.png` — Sync
- [x] `zh_CN/firefox-3-menu.png` — Menu
- [x] `zh_CN/firefox-4-linkwarden.png` — Linkwarden
- [x] `zh_CN/firefox-5-history.png` — Sync History
- [x] `zh_CN/firefox-6-search.png` — Search
- [x] `zh_CN/firefox-7-popup.png` — Popup
- [x] `zh_CN/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `zh_CN/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `zh_CN/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `zh_CN/firefox-11-wizard-repo.png` — Wizard (Repository)

### 한국어 (KO)
- [x] `ko/firefox-1-connection.png` — Connection
- [x] `ko/firefox-2-sync.png` — Sync
- [x] `ko/firefox-3-menu.png` — Menu
- [x] `ko/firefox-4-linkwarden.png` — Linkwarden
- [x] `ko/firefox-5-history.png` — Sync History
- [x] `ko/firefox-6-search.png` — Search
- [x] `ko/firefox-7-popup.png` — Popup
- [x] `ko/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `ko/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `ko/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `ko/firefox-11-wizard-repo.png` — Wizard (Repository)

### Русский (RU)
- [x] `ru/firefox-1-connection.png` — Connection
- [x] `ru/firefox-2-sync.png` — Sync
- [x] `ru/firefox-3-menu.png` — Menu
- [x] `ru/firefox-4-linkwarden.png` — Linkwarden
- [x] `ru/firefox-5-history.png` — Sync History
- [x] `ru/firefox-6-search.png` — Search
- [x] `ru/firefox-7-popup.png` — Popup
- [x] `ru/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `ru/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `ru/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `ru/firefox-11-wizard-repo.png` — Wizard (Repository)

### Türkçe (TR)
- [x] `tr/firefox-1-connection.png` — Connection
- [x] `tr/firefox-2-sync.png` — Sync
- [x] `tr/firefox-3-menu.png` — Menu
- [x] `tr/firefox-4-linkwarden.png` — Linkwarden
- [x] `tr/firefox-5-history.png` — Sync History
- [x] `tr/firefox-6-search.png` — Search
- [x] `tr/firefox-7-popup.png` — Popup
- [x] `tr/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `tr/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `tr/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `tr/firefox-11-wizard-repo.png` — Wizard (Repository)

### Polski (PL)
- [x] `pl/firefox-1-connection.png` — Connection
- [x] `pl/firefox-2-sync.png` — Sync
- [x] `pl/firefox-3-menu.png` — Menu
- [x] `pl/firefox-4-linkwarden.png` — Linkwarden
- [x] `pl/firefox-5-history.png` — Sync History
- [x] `pl/firefox-6-search.png` — Search
- [x] `pl/firefox-7-popup.png` — Popup
- [x] `pl/firefox-8-linkwarden-save.png` — Save to Linkwarden
- [x] `pl/firefox-9-wizard-welcome.png` — Wizard (Welcome)
- [x] `pl/firefox-10-wizard-token.png` — Wizard (Token)
- [x] `pl/firefox-11-wizard-repo.png` — Wizard (Repository)
