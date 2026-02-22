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
• Sync on startup / focus: optional sync when the browser starts or gains focus (with cooldown)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Notifications: All (success + failure), Errors only, or Off
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• Generated files: README.md (overview), bookmarks.html (browser import), feed.xml (RSS 2.0 feed), and dashy-conf.yml (Dashy dashboard) — each configurable as Off, Manual, or Auto
• Settings sync to Git: encrypted backup of extension settings in the repo — Global (shared) or Individual (per device) mode; import settings from other devices; same password on every device, auto-synced
• Options: 5 tabs (GitHub, Sync, Files, Help, About) with sub-tabs for GitHub and Files — clean, organized settings UI
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: export bookmarks (JSON), Dashy config (YAML), or settings (plain JSON / encrypted .enc); import with automatic format detection
• Auto-save: all settings save automatically when changed — no Save buttons
• Theme: light, dark, or auto — single cycle button (A → Dark → Light → A) in options and popup
• Vote on backlog: community poll to influence which features come next
• Multilanguage: English, German, French, and Spanish with manual language selection
• Keyboard shortcuts: quick sync (Ctrl+Shift+.), open settings (Ctrl+Shift+,) — customizable
• Debug log: Sync tab — enable for sync diagnostics, export for troubleshooting
• Mobile companion: GitSyncMarks-Mobile (iOS + Android) — view bookmarks on the go, read-only sync from your repo
• No external server — communicates directly with the GitHub API using your Personal Access Token

How it works:
1. Create a GitHub repository for your bookmarks
2. Generate a Personal Access Token with the "repo" scope
3. Configure GitSyncMarks with your token and repository
4. Click "Sync Now" — done!

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your Firefox bookmark hierarchy (Bookmarks Toolbar, Bookmarks Menu, Other Bookmarks). A README.md gives you a clean overview directly on GitHub; a bookmarks.html lets you import into any browser; a feed.xml RSS feed lets you subscribe or use for automations; a dashy-conf.yml provides sections for the Dashy dashboard.

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
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei — lesbar und diff-freundlich
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung bei Änderungen auf beiden Seiten
• Volle Firefox-Unterstützung inkl. Lesezeichen-Menü
• Mehrere Lesezeichen-Profile: bis zu 10 Profile mit getrennten GitHub-Repos; Wechsel ersetzt lokale Lesezeichen
• GitHub-Repos-Ordner: optionaler Ordner mit Lesezeichen zu allen deinen GitHub-Repositories
• Onboarding: Ordner anlegen oder Lesezeichen laden beim Konfigurieren eines neuen Profils
• Sync-Profile: Echtzeit, häufig, normal oder Stromsparen
• Auto-Sync bei jeder Lesezeichen-Änderung (Verzögerung pro Profil konfigurierbar)
• Sync bei Start / Fokus: optionaler Sync beim Browserstart oder Fensterfokus (mit Cooldown)
• Periodischer Sync zur Erkennung von Remote-Änderungen (1–120 Min., konfigurierbar)
• Benachrichtigungen: Alle (Erfolg + Fehler), Nur Fehler oder Aus
• Manuelles Push, Pull und Sync über das Popup
• Konflikterkennung, wenn automatisches Mergen nicht möglich ist
• Generierte Dateien: README.md, bookmarks.html, feed.xml und dashy-conf.yml — einzeln als Aus, Manuell oder Auto
• Einstellungen-Sync mit Git: verschlüsseltes Backup im Repo — Global oder Individuell (pro Gerät)
• Optionen: 5 Tabs (GitHub, Sync, Dateien, Hilfe, Über) mit Sub-Tabs für GitHub und Dateien
• Automatisierung: Lesezeichen über Git, CLI oder GitHub Actions hinzufügen — ohne Browser
• Import/Export: Lesezeichen (JSON), Dashy (YAML) oder Einstellungen (JSON / verschlüsselt .enc)
• Auto-Save: alle Einstellungen speichern sich automatisch — keine Speichern-Buttons
• Design: Hell, Dunkel oder Auto — Wechsel-Button (A → Dunkel → Hell → A)
• Mehrsprachig: Englisch, Deutsch, Französisch und Spanisch
• Tastenkürzel: Schnell-Sync (Strg+Umschalt+.), Einstellungen öffnen (Strg+Umschalt+,)
• Debug-Log: Sync-Tab — für Sync-Diagnostik aktivierbar, exportierbar
• Backlog-Voting: Community-Abstimmung für Feature-Priorisierung
• Mobile-Begleiter: GitSyncMarks-Mobile (iOS + Android)
• Kein externer Server — kommuniziert direkt mit der GitHub API

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
• Stockage par fichier : chaque favori est un fichier JSON individuel — lisible et adapté au diff
• Fusion triple : synchronisation automatique sans conflit
• Support complet Firefox y compris le Menu favoris
• Plusieurs profils de favoris : jusqu'à 10 profils avec des dépôts GitHub séparés
• Dossier Repos GitHub : dossier optionnel avec des favoris vers tous vos dépôts GitHub
• Intégration : créer le dossier ou récupérer les favoris lors de la configuration d'un nouveau profil
• Profils de sync : temps réel, fréquent, normal ou économie d'énergie
• Auto-sync à chaque modification de favori (délai configurable par profil)
• Sync au démarrage / au focus : sync optionnel au lancement du navigateur ou au retour à la fenêtre
• Sync périodique pour détecter les changements distants (1–120 minutes, configurable)
• Notifications : Tout (succès + erreur), Erreurs uniquement, ou Désactivé
• Push, Pull et Sync complet manuels via le popup
• Détection des conflits lorsque la fusion automatique est impossible
• Fichiers générés : README.md, bookmarks.html, feed.xml et dashy-conf.yml — chacun configurable comme Désactivé, Manuel ou Auto
• Sync des paramètres avec Git : sauvegarde chiffrée dans le dépôt — mode Global ou Individuel (par appareil)
• Options : 5 onglets (GitHub, Sync, Fichiers, Aide, À propos) avec sous-onglets pour GitHub et Fichiers
• Automatisation : ajouter des favoris via Git, CLI ou GitHub Actions — sans ouvrir le navigateur
• Import/Export : favoris (JSON), configuration Dashy (YAML) ou paramètres (JSON / .enc chiffré)
• Enregistrement automatique : tous les paramètres se sauvegardent à la modification — pas de bouton Enregistrer
• Thème : clair, sombre ou auto — bouton cycle (A → Sombre → Clair → A)
• Multilingue : anglais, allemand, français et espagnol
• Raccourcis clavier : sync rapide, paramètres — personnalisables
• Journal de débogage : onglet Sync — pour le dépannage de sync
• Vote backlog : sondage communautaire pour prioriser les prochaines fonctionnalités
• Application mobile : GitSyncMarks-Mobile (iOS + Android)
• Pas de serveur externe — communique directement avec l'API GitHub

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
• Almacenamiento por archivo: cada marcador es un archivo JSON individual — legible y apto para diff
• Fusión triple: sincronización automática sin conflictos
• Soporte completo Firefox incluyendo el Menú de marcadores
• Múltiples perfiles de marcadores: hasta 10 perfiles con repos GitHub separados
• Carpeta Repos GitHub: carpeta opcional con marcadores a todos tus repositorios GitHub
• Integración: crear carpeta o importar marcadores al configurar un nuevo perfil
• Perfiles de sync: tiempo real, frecuente, normal o ahorro de energía
• Auto-sync en cada cambio de marcador (retardo configurable por perfil)
• Sync al inicio / al foco: sync opcional al abrir el navegador o al volver a la ventana
• Sync periódico para detectar cambios remotos (1–120 minutos, configurable)
• Notificaciones: Todas (éxito + error), Solo errores o Desactivadas
• Push, Pull y Sync completo manuales desde el popup
• Detección de conflictos cuando la fusión automática no es posible
• Archivos generados: README.md, bookmarks.html, feed.xml y dashy-conf.yml — cada uno configurable como Desactivado, Manual o Auto
• Sync de ajustes con Git: copia cifrada en el repositorio — modo Global o Individual (por dispositivo)
• Opciones: 5 pestañas (GitHub, Sync, Archivos, Ayuda, Acerca de) con sub-pestañas para GitHub y Archivos
• Automatización: añadir marcadores vía Git, CLI o GitHub Actions — sin abrir el navegador
• Importar/Exportar: marcadores (JSON), configuración Dashy (YAML) o ajustes (JSON / .enc cifrado)
• Guardado automático: todos los ajustes se guardan al cambiar — sin botones Guardar
• Tema: claro, oscuro o auto — botón cíclico (A → Oscuro → Claro → A)
• Multilingüe: inglés, alemán, francés y español
• Atajos de teclado: sync rápido, configuración — personalizables
• Registro de depuración: pestaña Sync — para diagnosticar la sincronización
• Votación del backlog: encuesta comunitaria para priorizar las próximas funciones
• App móvil: GitSyncMarks-Mobile (iOS + Android)
• Sin servidor externo — se comunica directamente con la API de GitHub

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
