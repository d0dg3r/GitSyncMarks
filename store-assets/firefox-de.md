# Firefox Add-ons (AMO) — GitSyncMarks (Deutsch)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Lesezeichen-Sync via GitHub, GitLab, Codeberg, Gitea & mehr. Linkwarden, Smart Search, Bitwarden-Backup, Setup-Assistent. Bidirektional, sicher, privat. Volle Firefox-Unterstützung. Ohne Mittelsmann.

### Detailed Description
GitSyncMarks synchronisiert Ihre Lesezeichen bidirektional mit GitHub, GitLab, Codeberg, Gitea, Forgejo oder Gogs. Ohne Mittelsmann, ohne Drittserver – Ihre Daten bleiben vollständig unter Ihrer Kontrolle.

Highlights

- Multi-Provider Git-Sync: GitHub, GitLab, Codeberg, Gitea, Forgejo oder Gogs — jedes Profil kann eigenen Anbieter und Server-URL nutzen.
- Profil-Transfer & Push-Mirrors: Lesezeichen zwischen Profilen kopieren (ersetzen oder zusammenführen); optionale Push-only-Backup-Remotes nach jedem Sync.
- Live-Sync-Fortschritt: Schritttext beim Push, Pull und Profilwechsel (z. B. `3 / 12 Dateien` oder `1 von 3` Schritte).
- Bitwarden / Vaultwarden Backup zu Git: Passwortgeschützte Vault-Exporte im Repo speichern, optional extra verschlüsselt; Remote-Backups auflisten, herunterladen oder löschen.
- Nested-Card-UI: Klarere gruppierte Bereiche in Einstellungen, Setup-Assistent, Popup und Suche.
- Sync-Verlauf & Wiederherstellung: Vergangene Commits durchsuchen, Änderungen per Diff-Vorschau prüfen und jeden früheren Lesezeichen-Stand mit einem Klick wiederherstellen.
- Remote-Waisen bereinigen: Remote-Lesezeichendateien in der Vorschau anzeigen und löschen, die lokal nicht mehr existieren.
- Linkwarden-Synergie: Seiten oder Links direkt in Ihre Linkwarden-Instanz speichern — Viewport-Screenshots, Kollektions-Sync und vordefinierte Tags.
- Smart Search: Dedizierte, blitzschnelle Lesezeichen-Suche mit Hell/Dunkel-Themes und vollständiger Tastaturbedienung.
- Geführter Setup-Assistent: Verbindungstest prüft nur den Zugriff; Sie wählen Pull, Merge/Sync, Push, Ordner-Setup oder Überspringen — mit Bestätigung vor jedem Schreibzugriff aufs Repository.
- Codeberg / Gitea Performance: Schnelle Git-Tree- und Blob-Lesevorgänge sowie Single-Commit-Pushes auf Gitea-Familie-Hosts (Contents-API-Fallback bei Bedarf).
- Kontextmenü: Schnellordner, Lesezeichen-Suche-Popup, Alle aus Ordner öffnen, Favicon kopieren/herunterladen und Profilaktionen per Rechtsklick.
- Einstellungs-Sync zu Git: Verschlüsseltes Einstellungs-Backup (`settings.enc`) im Repository — Konfiguration geräteübergreifend teilen.

Kernfunktionen

- Private-by-Design: Direkte Kommunikation mit der Git-Provider-API. Keine Dritten sehen Ihre Daten.
- Firefox-optimiert: Unterstützt native Lesezeichenstrukturen (Symbolleiste, Menü, Andere).
- Three-Way-Merge: Industrietauglicher Sync behandelt gleichzeitige Änderungen auf mehreren Geräten automatisch.
- Einzeldatei-Speicherung: Jedes Lesezeichen ist eine lesbare JSON-Datei – ideal für Versionierung und manuelle Bearbeitung im Git-Repo.
- Multiple Profile: Bis zu 10 getrennte Profile für Beruf, Privatleben oder Projekte, jeweils mit eigenem Repository.
- Automatisierung: Lesezeichen via CLI oder GitHub Actions hinzufügen; die Erweiterung integriert sie beim nächsten Sync.
- Generierte Dateien: README.md (Übersicht), bookmarks.html (Import-Datei), RSS-Feed und dashy-conf.yml — optional pro Datei.
- Design & i18n: Hell-, Dunkel- und Auto-Themes; einstellbare UI-Dichte (kompakt / mittel / groß); 12 Sprachen.

Begleit-App
Nutzen Sie die GitSyncMarks-App (Android, iOS, Desktop), um Ihre Lesezeichen direkt aus Ihrem Git-Repository auf mobilen Geräten zu verwalten. (Hinweis: Firefox für Android unterstützt keinen direkten Lesezeichen-Sync via Erweiterungen – nutzen Sie die App dafür.)

GitSyncMarks ist Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Lesezeichen

### Tags
lesezeichen, sync, github, gitlab, backup, automatisierung
