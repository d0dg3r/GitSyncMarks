# Chrome Web Store — GitSyncMarks

---

## English (EN)

### Name
GitSyncMarks

### Summary (max 132 characters)
Your bookmarks, safe on GitHub — per-file storage, three-way merge sync, works on Chrome & Firefox. No server needed.

### Detailed Description
GitSyncMarks syncs your browser bookmarks with a GitHub repository — bidirectionally, automatically, and without any external server.

Features:
• Per-file storage: each bookmark is an individual JSON file — human-readable and diff-friendly
• Three-way merge: automatic conflict-free sync when changes happen on both sides
• Cross-browser: works with Chrome, Chromium, Brave, Edge, and Firefox
• Multiple bookmark profiles: up to 10 profiles with separate GitHub repos; switch replaces local bookmarks
• GitHub Repos folder: optional folder with bookmarks to all your GitHub repositories (public and private)
• Onboarding: create folder or pull bookmarks when configuring a new profile
• Sync profiles: real-time, frequent, normal, or power-save (preset intervals and debounce)
• Auto-sync on every bookmark change (debounce configurable per profile)
• Sync on startup / focus: optional sync when the browser starts or gains focus (with cooldown)
• Periodic sync to detect remote changes (1–120 minutes, configurable)
• Notifications: All (success + failure), Errors only, or Off
• Manual Push, Pull, and full Sync via the popup
• Conflict detection when automatic merge is not possible
• Generated files: README.md (overview), bookmarks.html (browser import), feed.xml (RSS 2.0 feed), and dashy-conf.yml (Dashy dashboard) — each configurable as Off, Manual, or Auto
• Settings sync to Git: encrypted backup of extension settings in the repo — Global (shared) or Individual (per device) mode; import settings from other devices; same password on every device, auto-synced
• Automation: add bookmarks via Git, CLI, or GitHub Actions — no browser needed
• Import/Export: export bookmarks (JSON), Dashy config (YAML), or settings (plain JSON / encrypted .enc); import with automatic format detection
• Auto-save: all settings save automatically when changed — no Save buttons
• Options: 5 tabs (GitHub, Sync, Files, Help, About) with sub-tabs for GitHub and Files — clean, organized settings UI
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

Each bookmark is stored as an individual JSON file in your repository, organized into folders that mirror your bookmark hierarchy. A README.md gives you a clean overview directly on GitHub; a bookmarks.html lets you import into any browser; a feed.xml RSS feed lets you subscribe or use for automations; a dashy-conf.yml provides sections for the Dashy dashboard.

Automation:
You can add bookmarks without even opening the browser. GitSyncMarks includes a GitHub Actions workflow (add-bookmark.yml) that lets you add bookmarks via the GitHub web UI or the command line:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

You can also create bookmark files directly in the repository — just add a JSON file with "title" and "url" to any bookmark folder. The extension detects new files automatically on the next sync and normalizes them into its canonical format.

GitSyncMarks is fully open source: https://github.com/d0dg3r/GitSyncMarks

Mobile app: GitSyncMarks-Mobile (iOS + Android) — view your bookmarks on the go. Read-only companion; F-Droid and Google Play coming soon. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Productivity

### Language
English

---

## Deutsch (DE)

### Name
GitSyncMarks

### Summary (max 132 characters)
Deine Lesezeichen, sicher auf GitHub — Einzeldatei-Speicherung, Drei-Wege-Merge, funktioniert mit Chrome & Firefox. Kein Server nötig.

### Detailed Description
GitSyncMarks synchronisiert deine Browser-Lesezeichen mit einem GitHub-Repository — bidirektional, automatisch und ohne externen Server.

Funktionen:
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei — lesbar und diff-freundlich
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung bei Änderungen auf beiden Seiten
• Cross-Browser: funktioniert mit Chrome, Chromium, Brave, Edge und Firefox
• Mehrere Lesezeichen-Profile: bis zu 10 Profile mit getrennten GitHub-Repos; Wechsel ersetzt lokale Lesezeichen
• GitHub-Repos-Ordner: optionaler Ordner mit Lesezeichen zu allen deinen GitHub-Repositories (öffentlich und privat)
• Onboarding: Ordner anlegen oder Lesezeichen laden beim Konfigurieren eines neuen Profils
• Sync-Profile: Echtzeit, häufig, normal oder Stromsparen (vorkonfigurierte Intervalle)
• Auto-Sync bei jeder Lesezeichen-Änderung (Verzögerung pro Profil konfigurierbar)
• Sync bei Start / Fokus: optionaler Sync beim Browserstart oder Fensterfokus (mit Cooldown)
• Periodischer Sync zur Erkennung von Remote-Änderungen (1–120 Min., konfigurierbar)
• Benachrichtigungen: Alle (Erfolg + Fehler), Nur Fehler oder Aus
• Manuelles Push, Pull und Sync über das Popup
• Konflikterkennung, wenn automatisches Mergen nicht möglich ist
• Generierte Dateien: README.md (Übersicht), bookmarks.html (Browser-Import), feed.xml (RSS-2.0-Feed) und dashy-conf.yml (Dashy-Dashboard) — einzeln als Aus, Manuell oder Auto konfigurierbar
• Einstellungen-Sync mit Git: verschlüsseltes Backup der Erweiterungseinstellungen im Repo — Global (geteilt) oder Individuell (pro Gerät); Einstellungen von anderen Geräten importieren; gleiches Passwort auf jedem Gerät, automatisch synchronisiert
• Automatisierung: Lesezeichen über Git, CLI oder GitHub Actions hinzufügen — ohne Browser
• Import/Export: Lesezeichen (JSON), Dashy-Konfiguration (YAML) oder Einstellungen (JSON / verschlüsselt .enc) exportieren; Import mit automatischer Formaterkennung
• Auto-Save: alle Einstellungen speichern sich automatisch bei Änderung — keine Speichern-Buttons
• Optionen: 5 Tabs (GitHub, Sync, Dateien, Hilfe, Über) mit Sub-Tabs für GitHub und Dateien — übersichtliche Einstellungen
• Design: Hell, Dunkel oder Auto — Wechsel-Button (A → Dunkel → Hell → A) in Optionen und Popup
• Backlog-Voting: Community-Abstimmung für Feature-Priorisierung
• Mehrsprachig: Englisch, Deutsch, Französisch und Spanisch mit manueller Sprachauswahl
• Tastenkürzel: Schnell-Sync (Strg+Umschalt+.), Einstellungen öffnen (Strg+Umschalt+,) — anpassbar
• Debug-Log: Sync-Tab — für Sync-Diagnostik aktivierbar, exportierbar
• Mobile-Begleiter: GitSyncMarks-Mobile (iOS + Android) — Lesezeichen unterwegs ansehen
• Kein externer Server — kommuniziert direkt mit der GitHub API über deinen Personal Access Token

So funktioniert es:
1. Erstelle ein GitHub-Repository für deine Lesezeichen
2. Generiere einen Personal Access Token mit dem Scope „repo"
3. Konfiguriere GitSyncMarks mit deinem Token und Repository
4. Klicke auf „Jetzt synchronisieren" — fertig!

Jedes Lesezeichen wird als einzelne JSON-Datei in deinem Repository gespeichert, organisiert in Ordnern, die deine Lesezeichen-Hierarchie widerspiegeln. Eine README.md bietet dir eine übersichtliche Darstellung direkt auf GitHub; eine bookmarks.html ermöglicht den Import in jeden Browser; ein feed.xml RSS-Feed kann in Readern abonniert oder für Automatisierungen genutzt werden; eine dashy-conf.yml liefert Sektionen für das Dashy-Dashboard.

Automatisierung:
Du kannst Lesezeichen hinzufügen, ohne den Browser zu öffnen. GitSyncMarks enthält einen GitHub Actions Workflow (add-bookmark.yml), mit dem du Lesezeichen über die GitHub-Oberfläche oder die Kommandozeile hinzufügen kannst:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Beispiel" -f folder="toolbar"

Du kannst auch Lesezeichen-Dateien direkt im Repository erstellen — füge einfach eine JSON-Datei mit „title" und „url" in einen Lesezeichen-Ordner ein. Die Extension erkennt neue Dateien beim nächsten Sync automatisch und normalisiert sie in das kanonische Format.

GitSyncMarks ist vollständig Open Source: https://github.com/d0dg3r/GitSyncMarks

Mobile-App: GitSyncMarks-Mobile (iOS + Android) — Lesezeichen unterwegs. Nur Lese-Zugriff; F-Droid und Google Play bald. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Produktivität

### Language
Deutsch

---

## Français (FR)

### Name
GitSyncMarks

### Summary (max 132 characters)
Vos favoris, en sécurité sur GitHub — stockage par fichier, synchronisation à fusion triple, Chrome et Firefox. Pas de serveur requis.

### Detailed Description
GitSyncMarks synchronise vos favoris de navigateur avec un dépôt GitHub — bidirectionnel, automatique et sans serveur externe.

Fonctionnalités :
• Stockage par fichier : chaque favori est un fichier JSON individuel — lisible et adapté au diff
• Fusion triple : synchronisation automatique sans conflit lorsque des changements surviennent des deux côtés
• Multi-navigateur : fonctionne avec Chrome, Chromium, Brave, Edge et Firefox
• Plusieurs profils de favoris : jusqu'à 10 profils avec des dépôts GitHub séparés ; le changement remplace les favoris locaux
• Dossier Repos GitHub : dossier optionnel avec des favoris vers tous vos dépôts GitHub (publics et privés)
• Intégration : créer le dossier ou récupérer les favoris lors de la configuration d'un nouveau profil
• Profils de sync : temps réel, fréquent, normal ou économie d'énergie (intervalles prédéfinis)
• Auto-sync à chaque modification de favori (délai configurable par profil)
• Sync au démarrage / au focus : sync optionnel au lancement du navigateur ou au retour à la fenêtre (avec délai)
• Sync périodique pour détecter les changements distants (1–120 minutes, configurable)
• Notifications : Tout (succès + erreur), Erreurs uniquement, ou Désactivé
• Push, Pull et Sync complet manuels via le popup
• Détection des conflits lorsque la fusion automatique est impossible
• Fichiers générés : README.md (aperçu), bookmarks.html (import navigateur), feed.xml (flux RSS 2.0) et dashy-conf.yml (tableau de bord Dashy) — chacun configurable comme Désactivé, Manuel ou Auto
• Sync des paramètres avec Git : sauvegarde chiffrée des paramètres de l'extension dans le dépôt — mode Global (partagé) ou Individuel (par appareil) ; import depuis d'autres appareils ; même mot de passe, synchronisé automatiquement
• Automatisation : ajouter des favoris via Git, CLI ou GitHub Actions — sans ouvrir le navigateur
• Import/Export : favoris (JSON), configuration Dashy (YAML) ou paramètres (JSON / .enc chiffré) ; import avec détection automatique du format
• Enregistrement automatique : tous les paramètres se sauvegardent à la modification — pas de bouton Enregistrer
• Options : 5 onglets (GitHub, Sync, Fichiers, Aide, À propos) avec sous-onglets pour GitHub et Fichiers
• Thème : clair, sombre ou auto — bouton cycle (A → Sombre → Clair → A) dans les options et le popup
• Vote backlog : sondage communautaire pour prioriser les prochaines fonctionnalités
• Multilingue : anglais, allemand, français et espagnol avec sélection manuelle de la langue
• Raccourcis clavier : sync rapide, paramètres — personnalisables
• Journal de débogage : onglet Sync — pour le dépannage de sync
• Application mobile : GitSyncMarks-Mobile (iOS + Android) — consultez vos favoris en déplacement
• Pas de serveur externe — communique directement avec l'API GitHub via votre Personal Access Token

Comment ça marche :
1. Créez un dépôt GitHub pour vos favoris
2. Générez un Personal Access Token avec le scope « repo »
3. Configurez GitSyncMarks avec votre token et le dépôt
4. Cliquez sur « Synchroniser maintenant » — terminé !

Chaque favori est stocké comme un fichier JSON individuel dans votre dépôt, organisé en dossiers qui reflètent la hiérarchie de vos favoris. Un README.md vous donne une vue d'ensemble directement sur GitHub ; un bookmarks.html permet l'import dans n'importe quel navigateur ; un feed.xml RSS permet de s'abonner ou d'automatiser ; un dashy-conf.yml fournit des sections pour le tableau de bord Dashy.

Automatisation :
Vous pouvez ajouter des favoris sans ouvrir le navigateur. GitSyncMarks inclut un workflow GitHub Actions (add-bookmark.yml) pour ajouter des favoris via l'interface web GitHub ou la ligne de commande :

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Exemple" -f folder="toolbar"

Vous pouvez aussi créer des fichiers de favoris directement dans le dépôt — ajoutez simplement un fichier JSON avec « title » et « url » dans un dossier de favoris. L'extension détecte les nouveaux fichiers au prochain sync et les normalise.

GitSyncMarks est entièrement open source : https://github.com/d0dg3r/GitSyncMarks

Application mobile : GitSyncMarks-Mobile (iOS + Android) — favoris en déplacement. Lecture seule ; F-Droid et Google Play bientôt. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Productivité

### Language
Français

---

## Español (ES)

### Name
GitSyncMarks

### Summary (max 132 characters)
Tus marcadores, seguros en GitHub — almacenamiento por archivo, sincronización de fusión triple, Chrome y Firefox. Sin servidor.

### Detailed Description
GitSyncMarks sincroniza tus marcadores del navegador con un repositorio GitHub — bidireccional, automáticamente y sin ningún servidor externo.

Características:
• Almacenamiento por archivo: cada marcador es un archivo JSON individual — legible y apto para diff
• Fusión triple: sincronización automática sin conflictos cuando hay cambios en ambos lados
• Multi-navegador: funciona con Chrome, Chromium, Brave, Edge y Firefox
• Múltiples perfiles de marcadores: hasta 10 perfiles con repos GitHub separados; el cambio reemplaza los marcadores locales
• Carpeta Repos GitHub: carpeta opcional con marcadores a todos tus repositorios GitHub (públicos y privados)
• Integración: crear carpeta o importar marcadores al configurar un nuevo perfil
• Perfiles de sync: tiempo real, frecuente, normal o ahorro de energía (intervalos predefinidos)
• Auto-sync en cada cambio de marcador (retardo configurable por perfil)
• Sync al inicio / al foco: sync opcional al abrir el navegador o al volver a la ventana (con enfriamiento)
• Sync periódico para detectar cambios remotos (1–120 minutos, configurable)
• Notificaciones: Todas (éxito + error), Solo errores o Desactivadas
• Push, Pull y Sync completo manuales desde el popup
• Detección de conflictos cuando la fusión automática no es posible
• Archivos generados: README.md (resumen), bookmarks.html (importación del navegador), feed.xml (feed RSS 2.0) y dashy-conf.yml (panel Dashy) — cada uno configurable como Desactivado, Manual o Auto
• Sync de ajustes con Git: copia cifrada de los ajustes de la extensión en el repositorio — modo Global (compartido) o Individual (por dispositivo); importar ajustes de otros dispositivos; misma contraseña, sincronizado automáticamente
• Automatización: añadir marcadores vía Git, CLI o GitHub Actions — sin abrir el navegador
• Importar/Exportar: marcadores (JSON), configuración Dashy (YAML) o ajustes (JSON / .enc cifrado); importación con detección automática de formato
• Guardado automático: todos los ajustes se guardan al cambiar — sin botones Guardar
• Opciones: 5 pestañas (GitHub, Sync, Archivos, Ayuda, Acerca de) con sub-pestañas para GitHub y Archivos
• Tema: claro, oscuro o auto — botón cíclico (A → Oscuro → Claro → A) en opciones y popup
• Votación del backlog: encuesta comunitaria para priorizar las próximas funciones
• Multilingüe: inglés, alemán, francés y español con selección manual del idioma
• Atajos de teclado: sync rápido, configuración — personalizables
• Registro de depuración: pestaña Sync — para diagnosticar la sincronización
• App móvil: GitSyncMarks-Mobile (iOS + Android) — consulta tus marcadores en movimiento
• Sin servidor externo — se comunica directamente con la API de GitHub usando tu Personal Access Token

Cómo funciona:
1. Crea un repositorio GitHub para tus marcadores
2. Genera un Personal Access Token con el scope « repo »
3. Configura GitSyncMarks con tu token y el repositorio
4. Haz clic en « Sincronizar ahora » — ¡listo!

Cada marcador se almacena como un archivo JSON individual en tu repositorio, organizado en carpetas que reflejan la jerarquía de tus marcadores. Un README.md te ofrece una visión general directamente en GitHub; un bookmarks.html permite importar en cualquier navegador; un feed.xml RSS permite suscribirse o automatizar; un dashy-conf.yml proporciona secciones para el panel Dashy.

Automatización:
Puedes añadir marcadores sin abrir el navegador. GitSyncMarks incluye un workflow de GitHub Actions (add-bookmark.yml) para añadir marcadores vía la interfaz web de GitHub o la línea de comandos:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Ejemplo" -f folder="toolbar"

También puedes crear archivos de marcadores directamente en el repositorio — solo añade un archivo JSON con « title » y « url » en una carpeta de marcadores. La extensión detecta los nuevos archivos en la próxima sincronización y los normaliza.

GitSyncMarks es totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvil: GitSyncMarks-Mobile (iOS + Android) — marcadores en movimiento. Solo lectura; F-Droid y Google Play próximamente. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Productividad

### Language
Español

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
