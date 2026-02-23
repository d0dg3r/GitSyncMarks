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
- [x] `en/firefox-1-github.png` — GitHub tab (Profile)
- [x] `en/firefox-2-connection.png` — GitHub tab (Connection)
- [x] `en/firefox-3-sync.png` — Sync tab
- [x] `en/firefox-4-files.png` — Files tab (Generated)
- [x] `en/firefox-5-export-import.png` — Files tab (Export / Import)
- [x] `en/firefox-6-popup.png` — Popup (centered)

### Deutsch (DE)
- [x] `de/firefox-1-github.png` — GitHub-Tab (Profil)
- [x] `de/firefox-2-connection.png` — GitHub-Tab (Verbindung)
- [x] `de/firefox-3-sync.png` — Sync-Tab
- [x] `de/firefox-4-files.png` — Dateien-Tab (Generiert)
- [x] `de/firefox-5-export-import.png` — Dateien-Tab (Export / Import)
- [x] `de/firefox-6-popup.png` — Popup (zentriert)

### Français (FR)
- [x] `fr/firefox-1-github.png` — Onglet GitHub (Profil)
- [x] `fr/firefox-2-connection.png` — Onglet GitHub (Connexion)
- [x] `fr/firefox-3-sync.png` — Onglet Sync
- [x] `fr/firefox-4-files.png` — Onglet Fichiers (Généré)
- [x] `fr/firefox-5-export-import.png` — Onglet Fichiers (Export / Import)
- [x] `fr/firefox-6-popup.png` — Popup (centré)

### Español (ES)
- [x] `es/firefox-1-github.png` — Pestaña GitHub (Perfil)
- [x] `es/firefox-2-connection.png` — Pestaña GitHub (Conexión)
- [x] `es/firefox-3-sync.png` — Pestaña Sync
- [x] `es/firefox-4-files.png` — Pestaña Archivos (Generados)
- [x] `es/firefox-5-export-import.png` — Pestaña Archivos (Export / Import)
- [x] `es/firefox-6-popup.png` — Popup (centrado)

### Português Brasil (PT-BR)
- [ ] `pt_BR/firefox-1-github.png` — Aba GitHub (Perfil)
- [ ] `pt_BR/firefox-2-connection.png` — Aba GitHub (Conexão)
- [ ] `pt_BR/firefox-3-sync.png` — Aba Sync
- [ ] `pt_BR/firefox-4-files.png` — Aba Arquivos (Gerados)
- [ ] `pt_BR/firefox-5-export-import.png` — Aba Arquivos (Exportar / Importar)
- [ ] `pt_BR/firefox-6-popup.png` — Popup

### Italiano (IT)
- [ ] `it/firefox-1-github.png` — Scheda GitHub (Profilo)
- [ ] `it/firefox-2-connection.png` — Scheda GitHub (Connessione)
- [ ] `it/firefox-3-sync.png` — Scheda Sync
- [ ] `it/firefox-4-files.png` — Scheda File (Generati)
- [ ] `it/firefox-5-export-import.png` — Scheda File (Esporta / Importa)
- [ ] `it/firefox-6-popup.png` — Popup

### 日本語 (JA)
- [ ] `ja/firefox-1-github.png` — GitHub (プロフィール)
- [ ] `ja/firefox-2-connection.png` — GitHub (接続)
- [ ] `ja/firefox-3-sync.png` — Sync
- [ ] `ja/firefox-4-files.png` — ファイル (生成)
- [ ] `ja/firefox-5-export-import.png` — ファイル (エクスポート / インポート)
- [ ] `ja/firefox-6-popup.png` — Popup

### 中文简体 (ZH-CN)
- [ ] `zh_CN/firefox-1-github.png` — GitHub (个人资料)
- [ ] `zh_CN/firefox-2-connection.png` — GitHub (连接)
- [ ] `zh_CN/firefox-3-sync.png` — Sync
- [ ] `zh_CN/firefox-4-files.png` — 文件 (生成)
- [ ] `zh_CN/firefox-5-export-import.png` — 文件 (导出 / 导入)
- [ ] `zh_CN/firefox-6-popup.png` — Popup

### 한국어 (KO)
- [ ] `ko/firefox-1-github.png` — GitHub (프로필)
- [ ] `ko/firefox-2-connection.png` — GitHub (연결)
- [ ] `ko/firefox-3-sync.png` — Sync
- [ ] `ko/firefox-4-files.png` — 파일 (생성)
- [ ] `ko/firefox-5-export-import.png` — 파일 (내보내기 / 가져오기)
- [ ] `ko/firefox-6-popup.png` — Popup

### Русский (RU)
- [ ] `ru/firefox-1-github.png` — Вкладка GitHub (Профиль)
- [ ] `ru/firefox-2-connection.png` — Вкладка GitHub (Подключение)
- [ ] `ru/firefox-3-sync.png` — Вкладка Sync
- [ ] `ru/firefox-4-files.png` — Вкладка Файлы (Генерируемые)
- [ ] `ru/firefox-5-export-import.png` — Вкладка Файлы (Экспорт / Импорт)
- [ ] `ru/firefox-6-popup.png` — Popup

### Türkçe (TR)
- [ ] `tr/firefox-1-github.png` — GitHub (Profil)
- [ ] `tr/firefox-2-connection.png` — GitHub (Bağlantı)
- [ ] `tr/firefox-3-sync.png` — Sync
- [ ] `tr/firefox-4-files.png` — Dosyalar (Oluşturulan)
- [ ] `tr/firefox-5-export-import.png` — Dosyalar (Dışa / İçe Aktar)
- [ ] `tr/firefox-6-popup.png` — Popup

### Polski (PL)
- [ ] `pl/firefox-1-github.png` — Zakładka GitHub (Profil)
- [ ] `pl/firefox-2-connection.png` — Zakładka GitHub (Połączenie)
- [ ] `pl/firefox-3-sync.png` — Zakładka Sync
- [ ] `pl/firefox-4-files.png` — Zakładka Pliki (Generowane)
- [ ] `pl/firefox-5-export-import.png` — Zakładka Pliki (Eksport / Import)
- [ ] `pl/firefox-6-popup.png` — Popup
