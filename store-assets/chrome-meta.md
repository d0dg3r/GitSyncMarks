# Chrome Web Store — GitSyncMarks (Meta)

Shared metadata for all Chrome Web Store listings.
Language-specific files: chrome-{lang}.md (e.g. chrome-en.md, chrome-de.md, ...)

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

**Screenshots** are auto-generated. Run `npm run screenshots` (see [docs/TESTING.md](../docs/TESTING.md#store-screenshots)). Each image shows light and dark mode side by side.

- [ ] `store-assets/icon128-store.png` — 128x128px store icon
- [ ] `store-assets/promo-small.png` — 440x280px small promo tile

### English (EN)
- [x] `en/chrome-1-connection.png` — Connection
- [x] `en/chrome-2-sync.png` — Sync
- [x] `en/chrome-3-menu.png` — Menu
- [x] `en/chrome-4-linkwarden.png` — Linkwarden
- [x] `en/chrome-5-search.png` — Search
- [x] `en/chrome-6-popup.png` — Popup
- [x] `en/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `en/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `en/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `en/chrome-10-wizard-repo.png` — Wizard (Repository)

### Deutsch (DE)
- [x] `de/chrome-1-connection.png` — Connection
- [x] `de/chrome-2-sync.png` — Sync
- [x] `de/chrome-3-menu.png` — Menu
- [x] `de/chrome-4-linkwarden.png` — Linkwarden
- [x] `de/chrome-5-search.png` — Search
- [x] `de/chrome-6-popup.png` — Popup
- [x] `de/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `de/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `de/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `de/chrome-10-wizard-repo.png` — Wizard (Repository)

### Français (FR)
- [x] `fr/chrome-1-connection.png` — Connection
- [x] `fr/chrome-2-sync.png` — Sync
- [x] `fr/chrome-3-menu.png` — Menu
- [x] `fr/chrome-4-linkwarden.png` — Linkwarden
- [x] `fr/chrome-5-search.png` — Search
- [x] `fr/chrome-6-popup.png` — Popup
- [x] `fr/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `fr/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `fr/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `fr/chrome-10-wizard-repo.png` — Wizard (Repository)

### Español (ES)
- [x] `es/chrome-1-connection.png` — Connection
- [x] `es/chrome-2-sync.png` — Sync
- [x] `es/chrome-3-menu.png` — Menu
- [x] `es/chrome-4-linkwarden.png` — Linkwarden
- [x] `es/chrome-5-search.png` — Search
- [x] `es/chrome-6-popup.png` — Popup
- [x] `es/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `es/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `es/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `es/chrome-10-wizard-repo.png` — Wizard (Repository)

### Português Brasil (PT-BR)
- [x] `pt_BR/chrome-1-connection.png` — Connection
- [x] `pt_BR/chrome-2-sync.png` — Sync
- [x] `pt_BR/chrome-3-menu.png` — Menu
- [x] `pt_BR/chrome-4-linkwarden.png` — Linkwarden
- [x] `pt_BR/chrome-5-search.png` — Search
- [x] `pt_BR/chrome-6-popup.png` — Popup
- [x] `pt_BR/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `pt_BR/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `pt_BR/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `pt_BR/chrome-10-wizard-repo.png` — Wizard (Repository)

### Italiano (IT)
- [x] `it/chrome-1-connection.png` — Connection
- [x] `it/chrome-2-sync.png` — Sync
- [x] `it/chrome-3-menu.png` — Menu
- [x] `it/chrome-4-linkwarden.png` — Linkwarden
- [x] `it/chrome-5-search.png` — Search
- [x] `it/chrome-6-popup.png` — Popup
- [x] `it/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `it/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `it/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `it/chrome-10-wizard-repo.png` — Wizard (Repository)

### 日本語 (JA)
- [x] `ja/chrome-1-connection.png` — Connection
- [x] `ja/chrome-2-sync.png` — Sync
- [x] `ja/chrome-3-menu.png` — Menu
- [x] `ja/chrome-4-linkwarden.png` — Linkwarden
- [x] `ja/chrome-5-search.png` — Search
- [x] `ja/chrome-6-popup.png` — Popup
- [x] `ja/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `ja/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `ja/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `ja/chrome-10-wizard-repo.png` — Wizard (Repository)

### 中文简体 (ZH-CN)
- [x] `zh_CN/chrome-1-connection.png` — Connection
- [x] `zh_CN/chrome-2-sync.png` — Sync
- [x] `zh_CN/chrome-3-menu.png` — Menu
- [x] `zh_CN/chrome-4-linkwarden.png` — Linkwarden
- [x] `zh_CN/chrome-5-search.png` — Search
- [x] `zh_CN/chrome-6-popup.png` — Popup
- [x] `zh_CN/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `zh_CN/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `zh_CN/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `zh_CN/chrome-10-wizard-repo.png` — Wizard (Repository)

### 한국어 (KO)
- [x] `ko/chrome-1-connection.png` — Connection
- [x] `ko/chrome-2-sync.png` — Sync
- [x] `ko/chrome-3-menu.png` — Menu
- [x] `ko/chrome-4-linkwarden.png` — Linkwarden
- [x] `ko/chrome-5-search.png` — Search
- [x] `ko/chrome-6-popup.png` — Popup
- [x] `ko/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `ko/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `ko/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `ko/chrome-10-wizard-repo.png` — Wizard (Repository)

### Русский (RU)
- [x] `ru/chrome-1-connection.png` — Connection
- [x] `ru/chrome-2-sync.png` — Sync
- [x] `ru/chrome-3-menu.png` — Menu
- [x] `ru/chrome-4-linkwarden.png` — Linkwarden
- [x] `ru/chrome-5-search.png` — Search
- [x] `ru/chrome-6-popup.png` — Popup
- [x] `ru/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `ru/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `ru/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `ru/chrome-10-wizard-repo.png` — Wizard (Repository)

### Türkçe (TR)
- [x] `tr/chrome-1-connection.png` — Connection
- [x] `tr/chrome-2-sync.png` — Sync
- [x] `tr/chrome-3-menu.png` — Menu
- [x] `tr/chrome-4-linkwarden.png` — Linkwarden
- [x] `tr/chrome-5-search.png` — Search
- [x] `tr/chrome-6-popup.png` — Popup
- [x] `tr/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `tr/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `tr/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `tr/chrome-10-wizard-repo.png` — Wizard (Repository)

### Polski (PL)
- [x] `pl/chrome-1-connection.png` — Connection
- [x] `pl/chrome-2-sync.png` — Sync
- [x] `pl/chrome-3-menu.png` — Menu
- [x] `pl/chrome-4-linkwarden.png` — Linkwarden
- [x] `pl/chrome-5-search.png` — Search
- [x] `pl/chrome-6-popup.png` — Popup
- [x] `pl/chrome-7-linkwarden-save.png` — Save to Linkwarden
- [x] `pl/chrome-8-wizard-welcome.png` — Wizard (Welcome)
- [x] `pl/chrome-9-wizard-token.png` — Wizard (Token)
- [x] `pl/chrome-10-wizard-repo.png` — Wizard (Repository)
