# Firefox Add-ons (AMO) — GitSyncMarks (Italiano)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Nome
GitSyncMarks

Puoi aggiungere segnalibri senza aprire Firefox. GitSyncMarks include un workflow GitHub Actions (add-bookmark.yml) che permette di aggiungere segnalibri tramite l'interfaccia web di GitHub o la riga di comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Puoi anche creare file di segnalibri direttamente nel repository — basta aggiungere un file JSON con "title" e "url" in qualsiasi cartella di segnalibri. L'estensione rileva i nuovi file automaticamente alla prossima sincronizzazione.

GitSyncMarks è completamente open source: https://github.com/d0dg3r/GitSyncMarks

App mobile: GitSyncMarks-App (iOS + Android) — visualizza i tuoi segnalibri ovunque. Compagno in sola lettura; F-Droid e Google Play in arrivo. https://github.com/d0dg3r/GitSyncMarks-App

### Categories
Segnalibri

### Tags
bookmarks, sync, github, backup, automation
