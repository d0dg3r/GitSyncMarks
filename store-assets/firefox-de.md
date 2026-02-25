# Firefox Add-ons (AMO) — GitSyncMarks (Deutsch)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronisiere deine Firefox-Lesezeichen mit GitHub — bidirektional, konfliktfrei. Einzeldatei-JSON, Drei-Wege-Merge, Auto-Sync. Volle Unterstützung für Lesezeichen-Symbolleiste, -Menü und -Mobil. Lesezeichen über Git, CLI oder GitHub Actions hinzufügen. Open Source, kein Mittelsmann.

### Detailed Description
GitSyncMarks synchronisiert deine Firefox-Lesezeichen mit einem GitHub-Repository — bidirektional, automatisch und ohne Mittelsmann.

Funktionen:
• Kein Mittelsmann: kommuniziert direkt mit der GitHub API — kein Drittanbieter-Server, kein Backend, deine Daten bleiben zwischen deinem Browser und GitHub
• Einzeldatei-Speicherung: Jedes Lesezeichen ist eine eigene JSON-Datei — lesbar und diff-freundlich
• Drei-Wege-Merge: automatische konfliktfreie Synchronisierung bei Änderungen auf beiden Seiten
• Volle Firefox-Unterstützung inkl. Lesezeichen-Menü
• Auto-Sync bei jeder Lesezeichen-Änderung (Verzögerung pro Profil konfigurierbar)
• Mehrere Lesezeichen-Profile: bis zu 10 Profile mit getrennten GitHub-Repos; Wechsel ersetzt lokale Lesezeichen
• Kontextmenü: Rechtsklick auf Seite oder Link — Zur Lesezeichenleiste hinzufügen, Zu Andere Lesezeichen, Jetzt synchronisieren, Profil wechseln, Favicon-URL kopieren, Favicon herunterladen
• Favicon-Tools: Favicon-URL einer Webseite in die Zwischenablage kopieren oder als PNG herunterladen — nutzt das Browser-Favicon mit Google-Favicon-Dienst als Fallback
• Automatisierung: Lesezeichen über Git, CLI oder GitHub Actions hinzufügen — ohne Browser
• GitHub-Repos-Ordner: optionaler Ordner mit Lesezeichen zu allen deinen GitHub-Repositories
• Sync-Profile: Echtzeit, häufig, normal oder Stromsparen
• Sync bei Start / Fokus: optionaler Sync beim Browserstart oder Fensterfokus (mit Cooldown)
• Periodischer Sync zur Erkennung von Remote-Änderungen (1–120 Min., konfigurierbar)
• Manuelles Push, Pull und Sync über das Popup
• Konflikterkennung, wenn automatisches Mergen nicht möglich ist
• Generierte Dateien: README.md, bookmarks.html, feed.xml und dashy-conf.yml — einzeln als Aus, Manuell oder Auto
• Einstellungen-Sync mit Git: verschlüsseltes Backup im Repo — Global oder Individuell (pro Gerät)
• Import/Export: Lesezeichen (JSON), Dashy (YAML) oder Einstellungen (JSON / verschlüsselt .enc)
• Factory reset: „Alle Daten zurücksetzen" in Dateien → Einstellungen — löscht alle Profile, Token und Einstellungen (Browser-Lesezeichen bleiben erhalten); zweistufige Bestätigung
• Setup-Wizard: geführtes 8-Schritte-Onboarding für Token, Repository und ersten Sync
• Onboarding: Ordner-Browser zur Auswahl des Sync-Pfads; Ordner anlegen oder Lesezeichen laden beim Konfigurieren eines neuen Profils
• Mehrsprachig: 12 Sprachen — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
• Tastenkürzel: Schnell-Sync (Strg+Umschalt+.), Einstellungen öffnen (Strg+Umschalt+,)
• Design: Hell, Dunkel oder Auto — Wechsel-Button (A → Dunkel → Hell → A)
• Optionen: 5 Tabs (GitHub, Sync, Dateien, Hilfe, Über) mit Sub-Tabs für GitHub und Dateien
• Benachrichtigungen: Alle (Erfolg + Fehler), Nur Fehler oder Aus
• Auto-Save: alle Einstellungen speichern sich automatisch — keine Speichern-Buttons
• Debug-Log: Sync-Tab — für Sync-Diagnostik aktivierbar, exportierbar
• Backlog-Voting: Community-Abstimmung für Feature-Priorisierung
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
