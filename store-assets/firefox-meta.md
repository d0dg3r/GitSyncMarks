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
- [x] `en/firefox-7-wizard-welcome.png` — Setup wizard (Welcome)
- [x] `en/firefox-8-wizard-token.png` — Setup wizard (Token help)
- [x] `en/firefox-9-wizard-repo.png` — Setup wizard (Repository details)

### Deutsch (DE)
- [x] `de/firefox-1-github.png` — GitHub-Tab (Profil)
- [x] `de/firefox-2-connection.png` — GitHub-Tab (Verbindung)
- [x] `de/firefox-3-sync.png` — Sync-Tab
- [x] `de/firefox-4-files.png` — Dateien-Tab (Generiert)
- [x] `de/firefox-5-export-import.png` — Dateien-Tab (Export / Import)
- [x] `de/firefox-6-popup.png` — Popup (zentriert)
- [x] `de/firefox-7-wizard-welcome.png` — Setup-Wizard (Willkommen)
- [x] `de/firefox-8-wizard-token.png` — Setup-Wizard (Token-Hilfe)
- [x] `de/firefox-9-wizard-repo.png` — Setup-Wizard (Repository-Details)

### Français (FR)
- [x] `fr/firefox-1-github.png` — Onglet GitHub (Profil)
- [x] `fr/firefox-2-connection.png` — Onglet GitHub (Connexion)
- [x] `fr/firefox-3-sync.png` — Onglet Sync
- [x] `fr/firefox-4-files.png` — Onglet Fichiers (Généré)
- [x] `fr/firefox-5-export-import.png` — Onglet Fichiers (Export / Import)
- [x] `fr/firefox-6-popup.png` — Popup (centré)
- [x] `fr/firefox-7-wizard-welcome.png` — Assistant de configuration (Bienvenue)
- [x] `fr/firefox-8-wizard-token.png` — Assistant de configuration (Aide token)
- [x] `fr/firefox-9-wizard-repo.png` — Assistant de configuration (Détails dépôt)

### Español (ES)
- [x] `es/firefox-1-github.png` — Pestaña GitHub (Perfil)
- [x] `es/firefox-2-connection.png` — Pestaña GitHub (Conexión)
- [x] `es/firefox-3-sync.png` — Pestaña Sync
- [x] `es/firefox-4-files.png` — Pestaña Archivos (Generados)
- [x] `es/firefox-5-export-import.png` — Pestaña Archivos (Export / Import)
- [x] `es/firefox-6-popup.png` — Popup (centrado)
- [x] `es/firefox-7-wizard-welcome.png` — Asistente de configuración (Bienvenida)
- [x] `es/firefox-8-wizard-token.png` — Asistente de configuración (Ayuda token)
- [x] `es/firefox-9-wizard-repo.png` — Asistente de configuración (Detalles repositorio)

### Português Brasil (PT-BR)
- [x] `pt_BR/firefox-1-github.png` — Aba GitHub (Perfil)
- [x] `pt_BR/firefox-2-connection.png` — Aba GitHub (Conexão)
- [x] `pt_BR/firefox-3-sync.png` — Aba Sync
- [x] `pt_BR/firefox-4-files.png` — Aba Arquivos (Gerados)
- [x] `pt_BR/firefox-5-export-import.png` — Aba Arquivos (Exportar / Importar)
- [x] `pt_BR/firefox-6-popup.png` — Popup
- [x] `pt_BR/firefox-7-wizard-welcome.png` — Assistente de configuração (Bem-vindo)
- [x] `pt_BR/firefox-8-wizard-token.png` — Assistente de configuração (Ajuda token)
- [x] `pt_BR/firefox-9-wizard-repo.png` — Assistente de configuração (Detalhes repositório)

### Italiano (IT)
- [x] `it/firefox-1-github.png` — Scheda GitHub (Profilo)
- [x] `it/firefox-2-connection.png` — Scheda GitHub (Connessione)
- [x] `it/firefox-3-sync.png` — Scheda Sync
- [x] `it/firefox-4-files.png` — Scheda File (Generati)
- [x] `it/firefox-5-export-import.png` — Scheda File (Esporta / Importa)
- [x] `it/firefox-6-popup.png` — Popup
- [x] `it/firefox-7-wizard-welcome.png` — Procedura guidata (Benvenuto)
- [x] `it/firefox-8-wizard-token.png` — Procedura guidata (Aiuto token)
- [x] `it/firefox-9-wizard-repo.png` — Procedura guidata (Dettagli repository)

### 日本語 (JA)
- [x] `ja/firefox-1-github.png` — GitHub (プロフィール)
- [x] `ja/firefox-2-connection.png` — GitHub (接続)
- [x] `ja/firefox-3-sync.png` — Sync
- [x] `ja/firefox-4-files.png` — ファイル (生成)
- [x] `ja/firefox-5-export-import.png` — ファイル (エクスポート / インポート)
- [x] `ja/firefox-6-popup.png` — Popup
- [x] `ja/firefox-7-wizard-welcome.png` — セットアップウィザード (ようこそ)
- [x] `ja/firefox-8-wizard-token.png` — セットアップウィザード (トークン)
- [x] `ja/firefox-9-wizard-repo.png` — セットアップウィザード (リポジトリ)

### 中文简体 (ZH-CN)
- [x] `zh_CN/firefox-1-github.png` — GitHub (个人资料)
- [x] `zh_CN/firefox-2-connection.png` — GitHub (连接)
- [x] `zh_CN/firefox-3-sync.png` — Sync
- [x] `zh_CN/firefox-4-files.png` — 文件 (生成)
- [x] `zh_CN/firefox-5-export-import.png` — 文件 (导出 / 导入)
- [x] `zh_CN/firefox-6-popup.png` — Popup
- [x] `zh_CN/firefox-7-wizard-welcome.png` — 设置向导 (欢迎)
- [x] `zh_CN/firefox-8-wizard-token.png` — 设置向导 (令牌)
- [x] `zh_CN/firefox-9-wizard-repo.png` — 设置向导 (仓库)

### 한국어 (KO)
- [x] `ko/firefox-1-github.png` — GitHub (프로필)
- [x] `ko/firefox-2-connection.png` — GitHub (연결)
- [x] `ko/firefox-3-sync.png` — Sync
- [x] `ko/firefox-4-files.png` — 파일 (생성)
- [x] `ko/firefox-5-export-import.png` — 파일 (내보내기 / 가져오기)
- [x] `ko/firefox-6-popup.png` — Popup
- [x] `ko/firefox-7-wizard-welcome.png` — 설정 마법사 (환영)
- [x] `ko/firefox-8-wizard-token.png` — 설정 마법사 (토큰)
- [x] `ko/firefox-9-wizard-repo.png` — 설정 마법사 (저장소)

### Русский (RU)
- [x] `ru/firefox-1-github.png` — Вкладка GitHub (Профиль)
- [x] `ru/firefox-2-connection.png` — Вкладка GitHub (Подключение)
- [x] `ru/firefox-3-sync.png` — Вкладка Sync
- [x] `ru/firefox-4-files.png` — Вкладка Файлы (Генерируемые)
- [x] `ru/firefox-5-export-import.png` — Вкладка Файлы (Экспорт / Импорт)
- [x] `ru/firefox-6-popup.png` — Popup
- [x] `ru/firefox-7-wizard-welcome.png` — Мастер настройки (Приветствие)
- [x] `ru/firefox-8-wizard-token.png` — Мастер настройки (Токен)
- [x] `ru/firefox-9-wizard-repo.png` — Мастер настройки (Репозиторий)

### Türkçe (TR)
- [x] `tr/firefox-1-github.png` — GitHub (Profil)
- [x] `tr/firefox-2-connection.png` — GitHub (Bağlantı)
- [x] `tr/firefox-3-sync.png` — Sync
- [x] `tr/firefox-4-files.png` — Dosyalar (Oluşturulan)
- [x] `tr/firefox-5-export-import.png` — Dosyalar (Dışa / İçe Aktar)
- [x] `tr/firefox-6-popup.png` — Popup
- [x] `tr/firefox-7-wizard-welcome.png` — Kurulum sihirbazı (Hoş geldiniz)
- [x] `tr/firefox-8-wizard-token.png` — Kurulum sihirbazı (Token)
- [x] `tr/firefox-9-wizard-repo.png` — Kurulum sihirbazı (Depo)

### Polski (PL)
- [x] `pl/firefox-1-github.png` — Zakładka GitHub (Profil)
- [x] `pl/firefox-2-connection.png` — Zakładka GitHub (Połączenie)
- [x] `pl/firefox-3-sync.png` — Zakładka Sync
- [x] `pl/firefox-4-files.png` — Zakładka Pliki (Generowane)
- [x] `pl/firefox-5-export-import.png` — Zakładka Pliki (Eksport / Import)
- [x] `pl/firefox-6-popup.png` — Popup
- [x] `pl/firefox-7-wizard-welcome.png` — Kreator konfiguracji (Powitanie)
- [x] `pl/firefox-8-wizard-token.png` — Kreator konfiguracji (Token)
- [x] `pl/firefox-9-wizard-repo.png` — Kreator konfiguracji (Repozytorium)
