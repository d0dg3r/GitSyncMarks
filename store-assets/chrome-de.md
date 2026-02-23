# Chrome Web Store — GitSyncMarks (Deutsch)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Deine Lesezeichen, sicher auf GitHub — Einzeldatei-Speicherung, Drei-Wege-Merge, funktioniert mit Chrome & Firefox. Kein Mittelsmann.

### Detailed Description
GitSyncMarks synchronisiert deine Browser-Lesezeichen mit einem GitHub-Repository — bidirektional, automatisch und ohne Mittelsmann.

Funktionen:
• Kein Mittelsmann: kommuniziert direkt mit der GitHub API — kein Drittanbieter-Server, kein Backend, deine Daten bleiben zwischen deinem Browser und GitHub
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei — lesbar und diff-freundlich
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung bei Änderungen auf beiden Seiten
• Cross-Browser: funktioniert mit Chrome, Chromium, Brave, Edge und Firefox
• Auto-Sync bei jeder Lesezeichen-Änderung (Verzögerung pro Profil konfigurierbar)
• Mehrere Lesezeichen-Profile: bis zu 10 Profile mit getrennten GitHub-Repos; Wechsel ersetzt lokale Lesezeichen
• Kontextmenü: Rechtsklick auf Seite oder Link — Zur Lesezeichenleiste hinzufügen, Zu Andere Lesezeichen, Jetzt synchronisieren, Profil wechseln, Favicon-URL kopieren, Favicon herunterladen
• Favicon-Tools: Favicon-URL einer Webseite in die Zwischenablage kopieren oder als PNG herunterladen — nutzt das Browser-Favicon mit Google-Favicon-Dienst als Fallback
• Automatisierung: Lesezeichen über Git, CLI oder GitHub Actions hinzufügen — ohne Browser
• GitHub-Repos-Ordner: optionaler Ordner mit Lesezeichen zu allen deinen GitHub-Repositories (öffentlich und privat)
• Sync-Profile: Echtzeit, häufig, normal oder Stromsparen (vorkonfigurierte Intervalle)
• Sync bei Start / Fokus: optionaler Sync beim Browserstart oder Fensterfokus (mit Cooldown)
• Periodischer Sync zur Erkennung von Remote-Änderungen (1–120 Min., konfigurierbar)
• Manuelles Push, Pull und Sync über das Popup
• Konflikterkennung, wenn automatisches Mergen nicht möglich ist
• Generierte Dateien: README.md (Übersicht), bookmarks.html (Browser-Import), feed.xml (RSS-2.0-Feed) und dashy-conf.yml (Dashy-Dashboard) — einzeln als Aus, Manuell oder Auto konfigurierbar
• Einstellungen-Sync mit Git: verschlüsseltes Backup der Erweiterungseinstellungen im Repo — Global (geteilt) oder Individuell (pro Gerät); Einstellungen von anderen Geräten importieren; gleiches Passwort auf jedem Gerät, automatisch synchronisiert
• Import/Export: Lesezeichen (JSON), Dashy-Konfiguration (YAML) oder Einstellungen (JSON / verschlüsselt .enc) exportieren; Import mit automatischer Formaterkennung
• Onboarding: Ordner anlegen oder Lesezeichen laden beim Konfigurieren eines neuen Profils
• Mehrsprachig: 12 Sprachen — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuelle Auswahl oder Auto-Erkennung
• Tastenkürzel: Schnell-Sync (Strg+Umschalt+.), Einstellungen öffnen (Strg+Umschalt+,) — anpassbar
• Design: Hell, Dunkel oder Auto — Wechsel-Button (A → Dunkel → Hell → A) in Optionen und Popup
• Optionen: 5 Tabs (GitHub, Sync, Dateien, Hilfe, Über) mit Sub-Tabs für GitHub und Dateien — übersichtliche Einstellungen
• Benachrichtigungen: Alle (Erfolg + Fehler), Nur Fehler oder Aus
• Auto-Save: alle Einstellungen speichern sich automatisch bei Änderung — keine Speichern-Buttons
• Debug-Log: Sync-Tab — für Sync-Diagnostik aktivierbar, exportierbar
• Backlog-Voting: Community-Abstimmung für Feature-Priorisierung
• Mobile-Begleiter: GitSyncMarks-Mobile (iOS + Android) — Lesezeichen unterwegs ansehen

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
