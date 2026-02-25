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
- [x] `en/chrome-7-wizard-welcome.png` — Setup wizard (Welcome)
- [x] `en/chrome-8-wizard-token.png` — Setup wizard (Token help)
- [x] `en/chrome-9-wizard-repo.png` — Setup wizard (Repository details)

### Deutsch (DE)
- [x] `de/chrome-1-github.png` — GitHub-Tab (Profil)
- [x] `de/chrome-2-connection.png` — GitHub-Tab (Verbindung)
- [x] `de/chrome-3-sync.png` — Sync-Tab
- [x] `de/chrome-4-files.png` — Dateien-Tab (Generiert)
- [x] `de/chrome-5-export-import.png` — Dateien-Tab (Export / Import)
- [x] `de/chrome-6-popup.png` — Popup
- [x] `de/chrome-7-wizard-welcome.png` — Setup-Wizard (Willkommen)
- [x] `de/chrome-8-wizard-token.png` — Setup-Wizard (Token-Hilfe)
- [x] `de/chrome-9-wizard-repo.png` — Setup-Wizard (Repository-Details)

### Français (FR)
- [x] `fr/chrome-1-github.png` — Onglet GitHub (Profil)
- [x] `fr/chrome-2-connection.png` — Onglet GitHub (Connexion)
- [x] `fr/chrome-3-sync.png` — Onglet Sync
- [x] `fr/chrome-4-files.png` — Onglet Fichiers (Générés)
- [x] `fr/chrome-5-export-import.png` — Onglet Fichiers (Export / Import)
- [x] `fr/chrome-6-popup.png` — Popup
- [x] `fr/chrome-7-wizard-welcome.png` — Assistant de configuration (Bienvenue)
- [x] `fr/chrome-8-wizard-token.png` — Assistant de configuration (Aide token)
- [x] `fr/chrome-9-wizard-repo.png` — Assistant de configuration (Détails dépôt)

### Español (ES)
- [x] `es/chrome-1-github.png` — Pestaña GitHub (Perfil)
- [x] `es/chrome-2-connection.png` — Pestaña GitHub (Conexión)
- [x] `es/chrome-3-sync.png` — Pestaña Sync
- [x] `es/chrome-4-files.png` — Pestaña Archivos (Generados)
- [x] `es/chrome-5-export-import.png` — Pestaña Archivos (Exportar / Importar)
- [x] `es/chrome-6-popup.png` — Popup
- [x] `es/chrome-7-wizard-welcome.png` — Asistente de configuración (Bienvenida)
- [x] `es/chrome-8-wizard-token.png` — Asistente de configuración (Ayuda token)
- [x] `es/chrome-9-wizard-repo.png` — Asistente de configuración (Detalles repositorio)

### Português Brasil (PT-BR)
- [x] `pt_BR/chrome-1-github.png` — Aba GitHub (Perfil)
- [x] `pt_BR/chrome-2-connection.png` — Aba GitHub (Conexão)
- [x] `pt_BR/chrome-3-sync.png` — Aba Sync
- [x] `pt_BR/chrome-4-files.png` — Aba Arquivos (Gerados)
- [x] `pt_BR/chrome-5-export-import.png` — Aba Arquivos (Exportar / Importar)
- [x] `pt_BR/chrome-6-popup.png` — Popup
- [x] `pt_BR/chrome-7-wizard-welcome.png` — Assistente de configuração (Bem-vindo)
- [x] `pt_BR/chrome-8-wizard-token.png` — Assistente de configuração (Ajuda token)
- [x] `pt_BR/chrome-9-wizard-repo.png` — Assistente de configuração (Detalhes repositório)

### Italiano (IT)
- [x] `it/chrome-1-github.png` — Scheda GitHub (Profilo)
- [x] `it/chrome-2-connection.png` — Scheda GitHub (Connessione)
- [x] `it/chrome-3-sync.png` — Scheda Sync
- [x] `it/chrome-4-files.png` — Scheda File (Generati)
- [x] `it/chrome-5-export-import.png` — Scheda File (Esporta / Importa)
- [x] `it/chrome-6-popup.png` — Popup
- [x] `it/chrome-7-wizard-welcome.png` — Procedura guidata (Benvenuto)
- [x] `it/chrome-8-wizard-token.png` — Procedura guidata (Aiuto token)
- [x] `it/chrome-9-wizard-repo.png` — Procedura guidata (Dettagli repository)

### 日本語 (JA)
- [x] `ja/chrome-1-github.png` — GitHub (プロフィール)
- [x] `ja/chrome-2-connection.png` — GitHub (接続)
- [x] `ja/chrome-3-sync.png` — Sync
- [x] `ja/chrome-4-files.png` — ファイル (生成)
- [x] `ja/chrome-5-export-import.png` — ファイル (エクスポート / インポート)
- [x] `ja/chrome-6-popup.png` — Popup
- [x] `ja/chrome-7-wizard-welcome.png` — セットアップウィザード (ようこそ)
- [x] `ja/chrome-8-wizard-token.png` — セットアップウィザード (トークン)
- [x] `ja/chrome-9-wizard-repo.png` — セットアップウィザード (リポジトリ)

### 中文简体 (ZH-CN)
- [x] `zh_CN/chrome-1-github.png` — GitHub (个人资料)
- [x] `zh_CN/chrome-2-connection.png` — GitHub (连接)
- [x] `zh_CN/chrome-3-sync.png` — Sync
- [x] `zh_CN/chrome-4-files.png` — 文件 (生成)
- [x] `zh_CN/chrome-5-export-import.png` — 文件 (导出 / 导入)
- [x] `zh_CN/chrome-6-popup.png` — Popup
- [x] `zh_CN/chrome-7-wizard-welcome.png` — 设置向导 (欢迎)
- [x] `zh_CN/chrome-8-wizard-token.png` — 设置向导 (令牌)
- [x] `zh_CN/chrome-9-wizard-repo.png` — 设置向导 (仓库)

### 한국어 (KO)
- [x] `ko/chrome-1-github.png` — GitHub (프로필)
- [x] `ko/chrome-2-connection.png` — GitHub (연결)
- [x] `ko/chrome-3-sync.png` — Sync
- [x] `ko/chrome-4-files.png` — 파일 (생성)
- [x] `ko/chrome-5-export-import.png` — 파일 (내보내기 / 가져오기)
- [x] `ko/chrome-6-popup.png` — Popup
- [x] `ko/chrome-7-wizard-welcome.png` — 설정 마법사 (환영)
- [x] `ko/chrome-8-wizard-token.png` — 설정 마법사 (토큰)
- [x] `ko/chrome-9-wizard-repo.png` — 설정 마법사 (저장소)

### Русский (RU)
- [x] `ru/chrome-1-github.png` — Вкладка GitHub (Профиль)
- [x] `ru/chrome-2-connection.png` — Вкладка GitHub (Подключение)
- [x] `ru/chrome-3-sync.png` — Вкладка Sync
- [x] `ru/chrome-4-files.png` — Вкладка Файлы (Генерируемые)
- [x] `ru/chrome-5-export-import.png` — Вкладка Файлы (Экспорт / Импорт)
- [x] `ru/chrome-6-popup.png` — Popup
- [x] `ru/chrome-7-wizard-welcome.png` — Мастер настройки (Приветствие)
- [x] `ru/chrome-8-wizard-token.png` — Мастер настройки (Токен)
- [x] `ru/chrome-9-wizard-repo.png` — Мастер настройки (Репозиторий)

### Türkçe (TR)
- [x] `tr/chrome-1-github.png` — GitHub (Profil)
- [x] `tr/chrome-2-connection.png` — GitHub (Bağlantı)
- [x] `tr/chrome-3-sync.png` — Sync
- [x] `tr/chrome-4-files.png` — Dosyalar (Oluşturulan)
- [x] `tr/chrome-5-export-import.png` — Dosyalar (Dışa / İçe Aktar)
- [x] `tr/chrome-6-popup.png` — Popup
- [x] `tr/chrome-7-wizard-welcome.png` — Kurulum sihirbazı (Hoş geldiniz)
- [x] `tr/chrome-8-wizard-token.png` — Kurulum sihirbazı (Token)
- [x] `tr/chrome-9-wizard-repo.png` — Kurulum sihirbazı (Depo)

### Polski (PL)
- [x] `pl/chrome-1-github.png` — Zakładka GitHub (Profil)
- [x] `pl/chrome-2-connection.png` — Zakładka GitHub (Połączenie)
- [x] `pl/chrome-3-sync.png` — Zakładka Sync
- [x] `pl/chrome-4-files.png` — Zakładka Pliki (Generowane)
- [x] `pl/chrome-5-export-import.png` — Zakładka Pliki (Eksport / Import)
- [x] `pl/chrome-6-popup.png` — Popup
- [x] `pl/chrome-7-wizard-welcome.png` — Kreator konfiguracji (Powitanie)
- [x] `pl/chrome-8-wizard-token.png` — Kreator konfiguracji (Token)
- [x] `pl/chrome-9-wizard-repo.png` — Kreator konfiguracji (Repozytorium)
