# Chrome Web Store — GitSyncMarks (Italiano)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
I tuoi segnalibri, al sicuro su GitHub — archiviazione per file, sync merge triplo, Chrome e Firefox. Nessun intermediario.

### Detailed Description
GitSyncMarks sincronizza i segnalibri del tuo browser con un repository GitHub — bidirezionale, automatico e senza intermediari.

Funzionalità:
• Nessun intermediario: comunica direttamente con l'API di GitHub — nessun server di terze parti, nessun backend, i tuoi dati restano tra il tuo browser e GitHub
• Archiviazione per file: ogni segnalibro è un file JSON individuale — leggibile e adatto al diff
• Merge triplo: sincronizzazione automatica senza conflitti quando ci sono modifiche su entrambi i lati
• Multi-browser: funziona con Chrome, Chromium, Brave, Edge e Firefox
• Auto-sync ad ogni modifica dei segnalibri (ritardo configurabile per profilo)
• Profili multipli di segnalibri: fino a 10 profili con repository GitHub separati; il cambio sostituisce i segnalibri locali
• Menu contestuale: clic destro su pagina o link — Aggiungi alla barra dei preferiti, Aggiungi ad altri preferiti, Sincronizza ora, Cambia profilo, Copia URL favicon, Scarica favicon
• Strumenti favicon: copia l'URL del favicon di qualsiasi sito negli appunti o scaricalo come PNG — usa il favicon del browser con il servizio Google come fallback
• Automazione: aggiungi segnalibri via Git, CLI o GitHub Actions — senza aprire il browser
• Cartella Repos GitHub: cartella opzionale con segnalibri a tutti i tuoi repository GitHub (pubblici e privati)
• Profili di sync: tempo reale, frequente, normale o risparmio energetico (intervalli preimpostati)
• Sync all'avvio / al focus: sync opzionale all'apertura del browser o al ritorno alla finestra (con cooldown)
• Sync periodico per rilevare modifiche remote (1–120 minuti, configurabile)
• Push, Pull e Sync completo manuali tramite popup
• Rilevamento conflitti quando il merge automatico non è possibile
• File generati: README.md (panoramica), bookmarks.html (importazione browser), feed.xml (feed RSS 2.0) e dashy-conf.yml (dashboard Dashy) — ciascuno configurabile come Disattivato, Manuale o Auto
• Sync delle impostazioni con Git: backup crittografato delle impostazioni dell'estensione nel repository — modalità Globale (condivisa) o Individuale (per dispositivo); importa impostazioni da altri dispositivi; stessa password su ogni dispositivo, sincronizzata automaticamente
• Importa/Esporta: segnalibri (JSON), configurazione Dashy (YAML) o impostazioni (JSON / .enc crittografato); importazione con rilevamento automatico del formato
• Onboarding: crea cartella o importa segnalibri durante la configurazione di un nuovo profilo
• Multilingue: 12 lingue — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; selezione manuale o rilevamento automatico
• Scorciatoie da tastiera: sync rapido (Ctrl+Shift+.), apri impostazioni (Ctrl+Shift+,) — personalizzabili
• Tema: chiaro, scuro o auto — pulsante ciclico (A → Scuro → Chiaro → A) nelle opzioni e nel popup
• Opzioni: 5 schede (GitHub, Sync, File, Aiuto, Info) con sotto-schede per GitHub e File — interfaccia ordinata
• Notifiche: Tutte (successo + errore), Solo errori o Disattivate
• Salvataggio automatico: tutte le impostazioni si salvano automaticamente alla modifica — nessun pulsante Salva
• Log di debug: scheda Sync — attiva per diagnostica sync, esporta per risoluzione problemi
• Votazione backlog: sondaggio della comunità per dare priorità alle prossime funzionalità
• Compagno mobile: GitSyncMarks-Mobile (iOS + Android) — consulta i tuoi segnalibri ovunque, sync in sola lettura dal tuo repository

Come funziona:
1. Crea un repository GitHub per i tuoi segnalibri
2. Genera un Personal Access Token con lo scope "repo"
3. Configura GitSyncMarks con il tuo token e il repository
4. Clicca su "Sincronizza ora" — fatto!

Ogni segnalibro è archiviato come file JSON individuale nel tuo repository, organizzato in cartelle che rispecchiano la gerarchia dei tuoi segnalibri. Un README.md offre una panoramica direttamente su GitHub; un bookmarks.html permette l'importazione in qualsiasi browser; un feed.xml RSS permette di iscriversi o utilizzarlo per automazioni; un dashy-conf.yml fornisce sezioni per la dashboard Dashy.

Automazione:
Puoi aggiungere segnalibri senza aprire il browser. GitSyncMarks include un workflow GitHub Actions (add-bookmark.yml) che ti permette di aggiungere segnalibri tramite l'interfaccia web di GitHub o la riga di comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Esempio" -f folder="toolbar"

Puoi anche creare file di segnalibri direttamente nel repository — basta aggiungere un file JSON con "title" e "url" in qualsiasi cartella di segnalibri. L'estensione rileva automaticamente i nuovi file alla prossima sincronizzazione e li normalizza nel formato canonico.

GitSyncMarks è completamente open source: https://github.com/d0dg3r/GitSyncMarks

App mobile: GitSyncMarks-Mobile (iOS + Android) — i tuoi segnalibri ovunque. Sola lettura; F-Droid e Google Play in arrivo. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Produttività

### Language
Italiano
