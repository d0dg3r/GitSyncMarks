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
- [x] `en/chrome-1-github.png` — GitHub tab (Profile)
- [x] `en/chrome-2-connection.png` — GitHub tab (Connection)
- [x] `en/chrome-3-sync.png` — Sync tab
- [x] `en/chrome-4-files.png` — Files tab (Generated)
- [x] `en/chrome-5-export-import.png` — Files tab (Export / Import)
- [x] `en/chrome-6-popup.png` — Popup (centered)

### Deutsch (DE)
- [x] `de/chrome-1-github.png` — GitHub-Tab (Profil)
- [x] `de/chrome-2-connection.png` — GitHub-Tab (Verbindung)
- [x] `de/chrome-3-sync.png` — Sync-Tab
- [x] `de/chrome-4-files.png` — Dateien-Tab (Generiert)
- [x] `de/chrome-5-export-import.png` — Dateien-Tab (Export / Import)
- [x] `de/chrome-6-popup.png` — Popup

### Français (FR)
- [x] `fr/chrome-1-github.png` — Onglet GitHub (Profil)
- [x] `fr/chrome-2-connection.png` — Onglet GitHub (Connexion)
- [x] `fr/chrome-3-sync.png` — Onglet Sync
- [x] `fr/chrome-4-files.png` — Onglet Fichiers (Générés)
- [x] `fr/chrome-5-export-import.png` — Onglet Fichiers (Export / Import)
- [x] `fr/chrome-6-popup.png` — Popup

### Español (ES)
- [x] `es/chrome-1-github.png` — Pestaña GitHub (Perfil)
- [x] `es/chrome-2-connection.png` — Pestaña GitHub (Conexión)
- [x] `es/chrome-3-sync.png` — Pestaña Sync
- [x] `es/chrome-4-files.png` — Pestaña Archivos (Generados)
- [x] `es/chrome-5-export-import.png` — Pestaña Archivos (Exportar / Importar)
- [x] `es/chrome-6-popup.png` — Popup

### Português Brasil (PT-BR)
- [ ] `pt_BR/chrome-1-github.png` — Aba GitHub (Perfil)
- [ ] `pt_BR/chrome-2-connection.png` — Aba GitHub (Conexão)
- [ ] `pt_BR/chrome-3-sync.png` — Aba Sync
- [ ] `pt_BR/chrome-4-files.png` — Aba Arquivos (Gerados)
- [ ] `pt_BR/chrome-5-export-import.png` — Aba Arquivos (Exportar / Importar)
- [ ] `pt_BR/chrome-6-popup.png` — Popup

### Italiano (IT)
- [ ] `it/chrome-1-github.png` — Scheda GitHub (Profilo)
- [ ] `it/chrome-2-connection.png` — Scheda GitHub (Connessione)
- [ ] `it/chrome-3-sync.png` — Scheda Sync
- [ ] `it/chrome-4-files.png` — Scheda File (Generati)
- [ ] `it/chrome-5-export-import.png` — Scheda File (Esporta / Importa)
- [ ] `it/chrome-6-popup.png` — Popup

### 日本語 (JA)
- [ ] `ja/chrome-1-github.png` — GitHub (プロフィール)
- [ ] `ja/chrome-2-connection.png` — GitHub (接続)
- [ ] `ja/chrome-3-sync.png` — Sync
- [ ] `ja/chrome-4-files.png` — ファイル (生成)
- [ ] `ja/chrome-5-export-import.png` — ファイル (エクスポート / インポート)
- [ ] `ja/chrome-6-popup.png` — Popup

### 中文简体 (ZH-CN)
- [ ] `zh_CN/chrome-1-github.png` — GitHub (个人资料)
- [ ] `zh_CN/chrome-2-connection.png` — GitHub (连接)
- [ ] `zh_CN/chrome-3-sync.png` — Sync
- [ ] `zh_CN/chrome-4-files.png` — 文件 (生成)
- [ ] `zh_CN/chrome-5-export-import.png` — 文件 (导出 / 导入)
- [ ] `zh_CN/chrome-6-popup.png` — Popup

### 한국어 (KO)
- [ ] `ko/chrome-1-github.png` — GitHub (프로필)
- [ ] `ko/chrome-2-connection.png` — GitHub (연결)
- [ ] `ko/chrome-3-sync.png` — Sync
- [ ] `ko/chrome-4-files.png` — 파일 (생성)
- [ ] `ko/chrome-5-export-import.png` — 파일 (내보내기 / 가져오기)
- [ ] `ko/chrome-6-popup.png` — Popup

### Русский (RU)
- [ ] `ru/chrome-1-github.png` — Вкладка GitHub (Профиль)
- [ ] `ru/chrome-2-connection.png` — Вкладка GitHub (Подключение)
- [ ] `ru/chrome-3-sync.png` — Вкладка Sync
- [ ] `ru/chrome-4-files.png` — Вкладка Файлы (Генерируемые)
- [ ] `ru/chrome-5-export-import.png` — Вкладка Файлы (Экспорт / Импорт)
- [ ] `ru/chrome-6-popup.png` — Popup

### Türkçe (TR)
- [ ] `tr/chrome-1-github.png` — GitHub (Profil)
- [ ] `tr/chrome-2-connection.png` — GitHub (Bağlantı)
- [ ] `tr/chrome-3-sync.png` — Sync
- [ ] `tr/chrome-4-files.png` — Dosyalar (Oluşturulan)
- [ ] `tr/chrome-5-export-import.png` — Dosyalar (Dışa / İçe Aktar)
- [ ] `tr/chrome-6-popup.png` — Popup

### Polski (PL)
- [ ] `pl/chrome-1-github.png` — Zakładka GitHub (Profil)
- [ ] `pl/chrome-2-connection.png` — Zakładka GitHub (Połączenie)
- [ ] `pl/chrome-3-sync.png` — Zakładka Sync
- [ ] `pl/chrome-4-files.png` — Zakładka Pliki (Generowane)
- [ ] `pl/chrome-5-export-import.png` — Zakładka Pliki (Eksport / Import)
- [ ] `pl/chrome-6-popup.png` — Popup
