# Firefox Add-ons (AMO) — GitSyncMarks (Italiano)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync segnalibri al tuo repository Git. Linkwarden, Smart Search, backup Bitwarden, wizard guidato. Bidirezionale, sicuro, privato. Supporto Firefox completo. Nessun intermediario.

### Detailed Description
GitSyncMarks sincronizza i segnalibri bidirezionalmente con il tuo repository Git — grandi piattaforme ospitate e server Git self-hosted. Nessun intermediario, nessun server di terze parti – i tuoi dati restano completamente sotto il tuo controllo.

In evidenza

- Sync Git multi-provider: Connetti il tuo host Git o server self-hosted — ogni profilo usa il proprio provider e URL. Elenco completo dei provider: https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/PROVIDERS.md
- Trasferimento profili e mirror push: Copia segnalibri tra profili (sostituisci o unisci); remote di backup push-only opzionali dopo ogni sync.
- Progresso sync live: Testo di fase durante push, pull e cambio profilo (es. `3 / 12 file` o `1 di 3` passi).
- Backup compatibile Bitwarden su Git: Archivia export del vault protetti da password nel repo, crittografia extra opzionale; elenca, scarica o elimina backup remoti.
- UI nested-card: Sezioni raggruppate più chiare in Opzioni, wizard, popup e ricerca.
- Cronologia sync e ripristino: Sfoglia commit passati, anteprima modifiche con diff e ripristina qualsiasi stato precedente con un clic.
- Pulizia orfani remoti: Anteprima ed elimina file segnalibri remoti che non esistono più localmente.
- Sinergia Linkwarden: Salva pagine o link nella tua istanza Linkwarden — screenshot viewport, sync collezioni e tag predefiniti.
- Smart Search: Ricerca segnalibri dedicata e velocissima con temi chiaro/scuro e navigazione completa da tastiera.
- Wizard di configurazione guidato: Il test connessione valida solo l'accesso; scegli pull, merge/sync, push, setup cartelle o salta — con conferma prima di scrivere nel repository.
- Performance Git self-hosted: Letture git tree + blob rapide e push single-commit su host compatibili (fallback Contents API se necessario).
- Menu contestuale: Cartelle rapide, popup ricerca, Apri tutto dalla cartella, copia/scarica favicon e azioni profilo con clic destro.
- Sync impostazioni su Git: Backup crittografato impostazioni (`settings.enc`) nel repository — condividi configurazione tra dispositivi.

Funzionalità chiave

- Privacy by design: Comunicazione diretta con l'API del provider Git. Nessun terzo vede i tuoi dati.
- Ottimizzato per Firefox: Supporta strutture native (Barra degli strumenti, Menu, Altri).
- Merge three-way: Sync di livello industriale che gestisce automaticamente modifiche concorrenti su più dispositivi.
- Archiviazione per file: Ogni segnalibro è un file JSON leggibile – ideale per versioning e modifica manuale.
- Profili multipli: Fino a 10 profili separati per lavoro, personale o progetti, ciascuno con il proprio repository.
- Automazione: Aggiungi segnalibri via CLI o workflow CI/CD; l'estensione li integra al prossimo sync.
- File generati: README.md (panoramica), bookmarks.html (import), feed RSS e dashy-conf.yml — opzionale per file.
- Design e i18n: Temi chiaro, scuro e auto-sistema; densità UI regolabile (compatto / medio / grande); 12 lingue.

App companion
Usa GitSyncMarks-App (mobile e desktop) per gestire i segnalibri direttamente dal tuo repository Git. (Nota: Firefox per Android non supporta sync diretta segnalibri via estensioni – usa l'app.)

GitSyncMarks è Open Source: https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
segnalibri, sync, github, gitlab, backup, automazione
