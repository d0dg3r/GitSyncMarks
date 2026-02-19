# Firefox Add-ons (AMO) — GitSyncMarks

---

## English (EN)

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync your Firefox bookmarks with GitHub — bidirectionally, conflict-free. Per-file JSON storage, three-way merge, auto-sync. Full support for Bookmarks Toolbar, Menu, and Mobile. Add bookmarks via Git, CLI, or GitHub Actions. Open source, no external server.

### Detailed Description
GitSyncMarks syncs your Firefox bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Full Firefox support including the Bookmarks Menu folder
• Multiple bookmark profiles: up to 10 profiles with separate GitHub repos; switch replaces local bookmarks
• GitHub Repos folder: optional folder with bookmarks to all your GitHub repositories (public and private)
• Onboarding: create folder or pull bookmarks when configuring a new profile
• Sync profiles: real-time, frequent, normal, or power-save
• Auto-sync on every bookmark change (debounce configurable per profile)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• A README.md with all bookmarks is generated in the repo for easy browsing
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: back up and restore bookmarks or settings as JSON files; settings can be exported as password-encrypted .enc for secure backup (clear UI with file picker)
• Theme: light, dark, or auto (system) for options and popup
• Multilanguage: English, German, French, and Spanish with manual language selection
• Keyboard shortcuts: quick sync (Ctrl+Shift+.), open settings (Ctrl+Shift+,) — customizable
• Debug log: Help tab — enable for sync diagnostics, export for troubleshooting
• Mobile companion: GitSyncMarks-Mobile (iOS + Android) — view bookmarks on the go, read-only sync from your repo
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure GitSyncMarks with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your Firefox bookmark hierarchy (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks, Mobile Bookmarks). A README.md gives you a clean overview directly on GitHub.

Automation:
You can add bookmarks without even opening Firefox. GitSyncMarks includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync.

GitSyncMarks is fully open source: https://github.com/d0dg3r/GitSyncMarks

Mobile app: GitSyncMarks-Mobile (iOS + Android) — view your bookmarks on the go. Read-only companion; F-Droid and Google Play coming soon. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Bookmarks

### Tags
bookmarks, sync, github, backup, automation

---

## Deutsch (DE)

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronisiere deine Firefox-Lesezeichen mit GitHub — bidirektional, konfliktfrei. Einzeldatei-JSON, Drei-Wege-Merge, Auto-Sync. Volle Unterstützung für Lesezeichen-Symbolleiste, -Menü und -Mobil. Lesezeichen über Git, CLI oder GitHub Actions hinzufügen. Open Source, kein externer Server.

### Detailed Description
GitSyncMarks synchronisiert deine Firefox-Lesezeichen mit einem GitHub-Repository — bidirektional, automatisch und ohne externen Server.

Funktionen:
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung
• Volle Firefox-Unterstützung inkl. Lesezeichen-Menü
• Bis zu 10 Profile, GitHub Repos-Ordner, Onboarding, Sync-Profile
• Auto-Sync, periodischer Sync, manuelles Push/Pull
• Import/Export (JSON oder verschlüsselt .enc), Design Hell/Dunkel, Mehrsprachig, Tastenkürzel, Debug-Log
• Mobile-Begleiter: GitSyncMarks-Mobile (iOS + Android)

So funktioniert es:
1. GitHub-Repository erstellen
2. Personal Access Token mit Scope „repo" erzeugen
3. GitSyncMarks mit Token und Repository konfigurieren
4. „Jetzt synchronisieren" klicken — fertig!

GitSyncMarks ist vollständig Open Source: https://github.com/d0dg3r/GitSyncMarks

Mobile-App: GitSyncMarks-Mobile (iOS + Android) — Lesezeichen unterwegs. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Lesezeichen

### Tags
bookmarks, sync, github, backup, automation

---

## Français (FR)

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronisez vos favoris Firefox avec GitHub — bidirectionnel, sans conflit. Stockage JSON par fichier, fusion triple, auto-sync. Prise en charge complète de la Barre des favoris, du Menu et Mobile. Ajoutez des favoris via Git, CLI ou GitHub Actions. Open source, pas de serveur externe.

### Detailed Description
GitSyncMarks synchronise vos favoris Firefox avec un dépôt GitHub — bidirectionnel, automatique et sans serveur externe.

Fonctionnalités :
• Stockage par fichier, fusion triple, support complet Firefox (y compris le Menu favoris)
• Jusqu'à 10 profils, dossier Repos GitHub, intégration, profils de sync
• Auto-sync, sync périodique, Push/Pull manuel
• Import/Export (JSON ou .enc chiffré), thème clair/sombre, multilingue, raccourcis clavier, journal de débogage
• Application mobile : GitSyncMarks-Mobile (iOS + Android)

Comment ça marche :
1. Créer un dépôt GitHub
2. Générer un Personal Access Token avec le scope « repo »
3. Configurer GitSyncMarks
4. Cliquer sur « Synchroniser maintenant » — terminé !

GitSyncMarks est entièrement open source : https://github.com/d0dg3r/GitSyncMarks

Application mobile : GitSyncMarks-Mobile (iOS + Android). https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Favoris

### Tags
bookmarks, sync, github, backup, automation

---

## Español (ES)

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincroniza tus marcadores de Firefox con GitHub — bidireccional, sin conflictos. Almacenamiento JSON por archivo, fusión triple, auto-sync. Soporte completo para Barra de marcadores, Menú y Móvil. Añade marcadores vía Git, CLI o GitHub Actions. Open source, sin servidor externo.

### Detailed Description
GitSyncMarks sincroniza tus marcadores de Firefox con un repositorio GitHub — bidireccional, automáticamente y sin servidor externo.

Características:
• Almacenamiento por archivo, fusión triple, soporte completo Firefox (incl. menú de marcadores)
• Hasta 10 perfiles, carpeta Repos GitHub, integración, perfiles de sync
• Auto-sync, sync periódico, Push/Pull manual
• Importar/Exportar (JSON o .enc cifrado), tema claro/oscuro, multilingüe, atajos de teclado, registro de depuración
• App móvil: GitSyncMarks-Mobile (iOS + Android)

Cómo funciona:
1. Crear un repositorio GitHub
2. Generar un Personal Access Token con el scope « repo »
3. Configurar GitSyncMarks
4. Clic en « Sincronizar ahora » — ¡listo!

GitSyncMarks es totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvil: GitSyncMarks-Mobile (iOS + Android). https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Marcadores

### Tags
bookmarks, sync, github, backup, automation

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

**Screenshots** are copied from Chrome (UI is identical; Playwright cannot load Firefox extension). Run `npm run screenshots`.

### English (EN)
- [x] `en/firefox-1-github.png` — GitHub tab
- [x] `en/firefox-2-synchronization.png` — Sync tab
- [x] `en/firefox-3-backup.png` — Backup tab
- [x] `en/firefox-4-automation.png` — Automation tab
- [x] `en/firefox-5-help.png` — Help tab
- [x] `en/firefox-6-about.png` — About tab
- [x] `en/firefox-7-popup.png` — Popup

### Deutsch (DE)
- [x] `de/firefox-1-github.png` — GitHub-Tab
- [x] `de/firefox-2-synchronization.png` — Sync-Tab
- [x] `de/firefox-3-backup.png` — Backup-Tab
- [x] `de/firefox-4-automation.png` — Automatisierung-Tab
- [x] `de/firefox-5-help.png` — Hilfe-Tab
- [x] `de/firefox-6-about.png` — Über-Tab
- [x] `de/firefox-7-popup.png` — Popup

### Français (FR)
- [x] `fr/firefox-1-github.png` — Onglet GitHub
- [x] `fr/firefox-2-synchronization.png` — Onglet Sync
- [x] `fr/firefox-3-backup.png` — Onglet Sauvegarde
- [x] `fr/firefox-4-automation.png` — Onglet Automatisation
- [x] `fr/firefox-5-help.png` — Onglet Aide
- [x] `fr/firefox-6-about.png` — Onglet À propos
- [x] `fr/firefox-7-popup.png` — Popup

### Español (ES)
- [x] `es/firefox-1-github.png` — Pestaña GitHub
- [x] `es/firefox-2-synchronization.png` — Pestaña Sync
- [x] `es/firefox-3-backup.png` — Pestaña Copia de seguridad
- [x] `es/firefox-4-automation.png` — Pestaña Automatización
- [x] `es/firefox-5-help.png` — Pestaña Ayuda
- [x] `es/firefox-6-about.png` — Pestaña Acerca de
- [x] `es/firefox-7-popup.png` — Popup
