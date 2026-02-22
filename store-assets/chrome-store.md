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
• Multilanguage: 12 languages — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manual selection or auto-detect
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
• Mehrsprachig: 12 Sprachen — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuelle Auswahl oder Auto-Erkennung
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
• Multilingue : 12 langues — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL ; sélection manuelle ou auto-détection
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
• Multilingüe: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; selección manual o auto-detección
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

## Português (Brasil) (PT-BR)

### Name
GitSyncMarks

### Summary (max 132 characters)
Seus favoritos, seguros no GitHub — armazenamento por arquivo, sincronização merge triplo, Chrome e Firefox. Sem servidor.

### Detailed Description
GitSyncMarks sincroniza os favoritos do seu navegador com um repositório GitHub — bidirecional, automaticamente e sem nenhum servidor externo.

Recursos:
• Armazenamento por arquivo: cada favorito é um arquivo JSON individual — legível e amigável ao diff
• Merge triplo: sincronização automática sem conflitos quando há mudanças em ambos os lados
• Multi-navegador: funciona com Chrome, Chromium, Brave, Edge e Firefox
• Múltiplos perfis de favoritos: até 10 perfis com repositórios GitHub separados; a troca substitui os favoritos locais
• Pasta Repos GitHub: pasta opcional com favoritos para todos os seus repositórios GitHub (públicos e privados)
• Integração: criar pasta ou importar favoritos ao configurar um novo perfil
• Perfis de sync: tempo real, frequente, normal ou economia de energia (intervalos pré-definidos)
• Auto-sync em cada alteração de favorito (atraso configurável por perfil)
• Sync ao iniciar / ao foco: sync opcional ao abrir o navegador ou ao retornar à janela (com intervalo de espera)
• Sync periódico para detectar mudanças remotas (1–120 minutos, configurável)
• Notificações: Todas (sucesso + erro), Apenas erros ou Desativadas
• Push, Pull e Sync completo manuais via popup
• Detecção de conflitos quando o merge automático não é possível
• Arquivos gerados: README.md (visão geral), bookmarks.html (importação do navegador), feed.xml (feed RSS 2.0) e dashy-conf.yml (painel Dashy) — cada um configurável como Desativado, Manual ou Auto
• Sync de configurações com Git: backup criptografado das configurações da extensão no repositório — modo Global (compartilhado) ou Individual (por dispositivo); importar configurações de outros dispositivos; mesma senha em cada dispositivo, sincronizado automaticamente
• Automação: adicionar favoritos via Git, CLI ou GitHub Actions — sem abrir o navegador
• Importar/Exportar: favoritos (JSON), configuração Dashy (YAML) ou configurações (JSON / .enc criptografado); importação com detecção automática de formato
• Salvamento automático: todas as configurações são salvas ao alterar — sem botões Salvar
• Opções: 5 abas (GitHub, Sync, Arquivos, Ajuda, Sobre) com sub-abas para GitHub e Arquivos — interface organizada
• Tema: claro, escuro ou auto — botão cíclico (A → Escuro → Claro → A) nas opções e no popup
• Votação do backlog: enquete comunitária para priorizar as próximas funcionalidades
• Multilíngue: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; seleção manual ou auto-detecção
• Atalhos de teclado: sync rápido (Ctrl+Shift+.), abrir configurações (Ctrl+Shift+,) — personalizáveis
• Log de depuração: aba Sync — ativar para diagnósticos de sync, exportar para solução de problemas
• Companheiro móvel: GitSyncMarks-Mobile (iOS + Android) — veja seus favoritos em qualquer lugar, sync somente leitura do seu repositório
• Sem servidor externo — comunica-se diretamente com a API do GitHub usando seu Personal Access Token

Como funciona:
1. Crie um repositório GitHub para seus favoritos
2. Gere um Personal Access Token com o scope "repo"
3. Configure o GitSyncMarks com seu token e repositório
4. Clique em "Sincronizar agora" — pronto!

Cada favorito é armazenado como um arquivo JSON individual no seu repositório, organizado em pastas que espelham a hierarquia dos seus favoritos. Um README.md oferece uma visão geral diretamente no GitHub; um bookmarks.html permite importar em qualquer navegador; um feed.xml RSS permite se inscrever ou usar para automações; um dashy-conf.yml fornece seções para o painel Dashy.

Automação:
Você pode adicionar favoritos sem abrir o navegador. GitSyncMarks inclui um workflow de GitHub Actions (add-bookmark.yml) que permite adicionar favoritos pela interface web do GitHub ou pela linha de comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Exemplo" -f folder="toolbar"

Você também pode criar arquivos de favoritos diretamente no repositório — basta adicionar um arquivo JSON com "title" e "url" em qualquer pasta de favoritos. A extensão detecta novos arquivos automaticamente na próxima sincronização e os normaliza para o formato canônico.

GitSyncMarks é totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvel: GitSyncMarks-Mobile (iOS + Android) — veja seus favoritos em qualquer lugar. Somente leitura; F-Droid e Google Play em breve. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Produtividade

### Language
Português (Brasil)

---

## Italiano (IT)

### Name
GitSyncMarks

### Summary (max 132 characters)
I tuoi segnalibri, al sicuro su GitHub — archiviazione per file, sync merge triplo, Chrome e Firefox. Nessun server.

### Detailed Description
GitSyncMarks sincronizza i segnalibri del tuo browser con un repository GitHub — bidirezionale, automatico e senza server esterno.

Funzionalità:
• Archiviazione per file: ogni segnalibro è un file JSON individuale — leggibile e adatto al diff
• Merge triplo: sincronizzazione automatica senza conflitti quando ci sono modifiche su entrambi i lati
• Multi-browser: funziona con Chrome, Chromium, Brave, Edge e Firefox
• Profili multipli di segnalibri: fino a 10 profili con repository GitHub separati; il cambio sostituisce i segnalibri locali
• Cartella Repos GitHub: cartella opzionale con segnalibri a tutti i tuoi repository GitHub (pubblici e privati)
• Onboarding: crea cartella o importa segnalibri durante la configurazione di un nuovo profilo
• Profili di sync: tempo reale, frequente, normale o risparmio energetico (intervalli preimpostati)
• Auto-sync ad ogni modifica dei segnalibri (ritardo configurabile per profilo)
• Sync all'avvio / al focus: sync opzionale all'apertura del browser o al ritorno alla finestra (con cooldown)
• Sync periodico per rilevare modifiche remote (1–120 minuti, configurabile)
• Notifiche: Tutte (successo + errore), Solo errori o Disattivate
• Push, Pull e Sync completo manuali tramite popup
• Rilevamento conflitti quando il merge automatico non è possibile
• File generati: README.md (panoramica), bookmarks.html (importazione browser), feed.xml (feed RSS 2.0) e dashy-conf.yml (dashboard Dashy) — ciascuno configurabile come Disattivato, Manuale o Auto
• Sync delle impostazioni con Git: backup crittografato delle impostazioni dell'estensione nel repository — modalità Globale (condivisa) o Individuale (per dispositivo); importa impostazioni da altri dispositivi; stessa password su ogni dispositivo, sincronizzata automaticamente
• Automazione: aggiungi segnalibri via Git, CLI o GitHub Actions — senza aprire il browser
• Importa/Esporta: segnalibri (JSON), configurazione Dashy (YAML) o impostazioni (JSON / .enc crittografato); importazione con rilevamento automatico del formato
• Salvataggio automatico: tutte le impostazioni si salvano automaticamente alla modifica — nessun pulsante Salva
• Opzioni: 5 schede (GitHub, Sync, File, Aiuto, Info) con sotto-schede per GitHub e File — interfaccia ordinata
• Tema: chiaro, scuro o auto — pulsante ciclico (A → Scuro → Chiaro → A) nelle opzioni e nel popup
• Votazione backlog: sondaggio della comunità per dare priorità alle prossime funzionalità
• Multilingue: 12 lingue — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; selezione manuale o rilevamento automatico
• Scorciatoie da tastiera: sync rapido (Ctrl+Shift+.), apri impostazioni (Ctrl+Shift+,) — personalizzabili
• Log di debug: scheda Sync — attiva per diagnostica sync, esporta per risoluzione problemi
• Compagno mobile: GitSyncMarks-Mobile (iOS + Android) — consulta i tuoi segnalibri ovunque, sync in sola lettura dal tuo repository
• Nessun server esterno — comunica direttamente con l'API di GitHub usando il tuo Personal Access Token

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

---

## 日本語 (JA)

### Name
GitSyncMarks

### Summary (max 132 characters)
ブックマークをGitHubで安全に保管 — ファイル単位の保存、3ウェイマージ同期、Chrome & Firefox対応。サーバー不要。

### Detailed Description
GitSyncMarksは、ブラウザのブックマークをGitHubリポジトリと同期します — 双方向、自動、外部サーバー不要。

機能:
• ファイル単位の保存: 各ブックマークは個別のJSONファイル — 人間が読みやすく、diff対応
• 3ウェイマージ: 両側で変更があっても自動的に競合なしで同期
• クロスブラウザ: Chrome、Chromium、Brave、Edge、Firefoxに対応
• 複数のブックマークプロファイル: 最大10個のプロファイル、個別のGitHubリポジトリ対応; 切替でローカルブックマークを置き換え
• GitHub Reposフォルダ: すべてのGitHubリポジトリ（公開・非公開）へのブックマークを含むオプションフォルダ
• オンボーディング: 新しいプロファイル設定時にフォルダ作成またはブックマークをPull
• Syncプロファイル: リアルタイム、頻繁、通常、省電力（プリセット間隔とデバウンス）
• ブックマーク変更ごとの自動Sync（プロファイルごとにデバウンス設定可能）
• 起動時/フォーカス時のSync: ブラウザ起動時やフォーカス復帰時のオプションSync（クールダウン付き）
• 定期Syncでリモート変更を検出（1〜120分、設定可能）
• 通知: すべて（成功+失敗）、エラーのみ、またはオフ
• ポップアップからの手動Push、Pull、完全Sync
• 自動マージが不可能な場合の競合検出
• 生成ファイル: README.md（概要）、bookmarks.html（ブラウザインポート）、feed.xml（RSS 2.0フィード）、dashy-conf.yml（Dashyダッシュボード） — それぞれオフ、手動、自動に設定可能
• Git設定Sync: リポジトリ内の拡張機能設定の暗号化バックアップ — グローバル（共有）または個別（デバイスごと）モード; 他のデバイスから設定をインポート; すべてのデバイスで同じパスワード、自動同期
• 自動化: Git、CLI、またはGitHub Actionsでブックマーク追加 — ブラウザ不要
• インポート/エクスポート: ブックマーク（JSON）、Dashy設定（YAML）、または設定（プレーンJSON / 暗号化.enc）のエクスポート; 自動形式検出によるインポート
• 自動保存: すべての設定は変更時に自動保存 — 保存ボタン不要
• オプション: 5つのタブ（GitHub、Sync、ファイル、ヘルプ、バージョン情報）、GitHubとファイルにサブタブ付き — 整理されたUI
• テーマ: ライト、ダーク、または自動 — サイクルボタン（A → ダーク → ライト → A）オプションとポップアップ
• バックログ投票: 次の機能の優先順位を決めるコミュニティ投票
• 多言語: 12言語 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 手動選択または自動検出
• キーボードショートカット: クイックSync（Ctrl+Shift+.）、設定を開く（Ctrl+Shift+,） — カスタマイズ可能
• デバッグログ: Syncタブ — Sync診断用に有効化、トラブルシューティング用にエクスポート
• モバイルコンパニオン: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧、リポジトリからの読み取り専用Sync
• 外部サーバー不要 — Personal Access Tokenを使用してGitHub APIと直接通信

使い方:
1. ブックマーク用のGitHubリポジトリを作成
2. 「repo」スコープのPersonal Access Tokenを生成
3. トークンとリポジトリでGitSyncMarksを設定
4. 「今すぐ同期」をクリック — 完了！

各ブックマークはリポジトリ内に個別のJSONファイルとして保存され、ブックマーク階層を反映したフォルダに整理されます。README.mdはGitHub上で直接概要を表示; bookmarks.htmlは任意のブラウザにインポート可能; feed.xml RSSフィードは購読や自動化に利用可能; dashy-conf.ymlはDashyダッシュボードのセクションを提供します。

自動化:
ブラウザを開かずにブックマークを追加できます。GitSyncMarksにはGitHub Actionsワークフロー（add-bookmark.yml）が含まれており、GitHub WebUIまたはコマンドラインからブックマークを追加できます:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

リポジトリ内に直接ブックマークファイルを作成することもできます — ブックマークフォルダに「title」と「url」を含むJSONファイルを追加するだけです。拡張機能は次回のSync時に新しいファイルを自動検出し、正規形式に正規化します。

GitSyncMarksは完全にオープンソースです: https://github.com/d0dg3r/GitSyncMarks

モバイルアプリ: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧。読み取り専用; F-DroidとGoogle Playは近日公開予定。 https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
仕事効率化

### Language
日本語

---

## 中文简体 (ZH-CN)

### Name
GitSyncMarks

### Summary (max 132 characters)
书签安全存储在GitHub — 单文件存储、三方合并同步，支持Chrome和Firefox。无需服务器。

### Detailed Description
GitSyncMarks将您的浏览器书签与GitHub仓库同步 — 双向、自动，无需任何外部服务器。

功能：
• 单文件存储：每个书签是一个独立的JSON文件 — 人类可读，适合diff
• 三方合并：当双方都有更改时，自动无冲突同步
• 跨浏览器：支持Chrome、Chromium、Brave、Edge和Firefox
• 多书签配置文件：最多10个配置文件，使用独立GitHub仓库；切换会替换本地书签
• GitHub Repos文件夹：可选文件夹，包含您所有GitHub仓库（公共和私有）的书签
• 引导设置：配置新配置文件时创建文件夹或Pull书签
• Sync配置文件：实时、频繁、正常或省电（预设间隔和防抖）
• 每次书签更改时自动Sync（每个配置文件可配置防抖）
• 启动/聚焦时Sync：浏览器启动或获得焦点时可选Sync（带冷却时间）
• 定期Sync检测远程更改（1-120分钟，可配置）
• 通知：全部（成功+失败）、仅错误或关闭
• 通过弹出窗口手动Push、Pull和完整Sync
• 自动合并不可能时的冲突检测
• 生成文件：README.md（概览）、bookmarks.html（浏览器导入）、feed.xml（RSS 2.0 feed）和dashy-conf.yml（Dashy仪表板） — 每个可配置为关闭、手动或自动
• Git设置Sync：仓库中扩展设置的加密备份 — 全局（共享）或个人（每设备）模式；从其他设备导入设置；每个设备相同密码，自动同步
• 自动化：通过Git、CLI或GitHub Actions添加书签 — 无需浏览器
• 导入/导出：导出书签（JSON）、Dashy配置（YAML）或设置（纯JSON / 加密.enc）；导入时自动检测格式
• 自动保存：所有设置更改时自动保存 — 无需保存按钮
• 选项：5个标签页（GitHub、Sync、文件、帮助、关于），GitHub和文件有子标签页 — 整洁有序的设置界面
• 主题：浅色、深色或自动 — 循环按钮（A → 深色 → 浅色 → A）在选项和弹出窗口中
• 待办投票：社区投票决定下一步开发哪些功能
• 多语言：12种语言 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL；手动选择或自动检测
• 键盘快捷键：快速Sync（Ctrl+Shift+.）、打开设置（Ctrl+Shift+,） — 可自定义
• 调试日志：Sync标签页 — 启用Sync诊断，导出以排查问题
• 移动伴侣：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签，从仓库只读Sync
• 无需外部服务器 — 使用您的Personal Access Token直接与GitHub API通信

使用方法：
1. 为书签创建一个GitHub仓库
2. 生成具有"repo"范围的Personal Access Token
3. 使用您的token和仓库配置GitSyncMarks
4. 点击"立即同步" — 完成！

每个书签作为独立的JSON文件存储在您的仓库中，按照书签层级结构组织到文件夹中。README.md在GitHub上直接提供清晰概览；bookmarks.html可导入任何浏览器；feed.xml RSS feed可订阅或用于自动化；dashy-conf.yml为Dashy仪表板提供分区。

自动化：
您无需打开浏览器即可添加书签。GitSyncMarks包含GitHub Actions工作流（add-bookmark.yml），可通过GitHub网页界面或命令行添加书签：

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

您也可以直接在仓库中创建书签文件 — 只需在书签文件夹中添加包含"title"和"url"的JSON文件。扩展程序会在下次Sync时自动检测新文件并将其规范化为标准格式。

GitSyncMarks完全开源：https://github.com/d0dg3r/GitSyncMarks

移动应用：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签。只读伴侣；F-Droid和Google Play即将推出。 https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
效率工具

### Language
中文（简体）

---

## 한국어 (KO)

### Name
GitSyncMarks

### Summary (max 132 characters)
북마크를 GitHub에 안전하게 보관 — 파일별 저장, 3방향 병합 동기화, Chrome 및 Firefox 지원. 서버 불필요.

### Detailed Description
GitSyncMarks는 브라우저 북마크를 GitHub 리포지토리와 동기화합니다 — 양방향, 자동, 외부 서버 불필요.

기능:
• 파일별 저장: 각 북마크는 개별 JSON 파일 — 사람이 읽기 쉽고 diff 친화적
• 3방향 병합: 양쪽에서 변경이 있어도 충돌 없이 자동 동기화
• 크로스 브라우저: Chrome, Chromium, Brave, Edge, Firefox 지원
• 다중 북마크 프로필: 최대 10개 프로필, 별도 GitHub 리포지토리; 전환 시 로컬 북마크 교체
• GitHub Repos 폴더: 모든 GitHub 리포지토리(공개 및 비공개)의 북마크가 포함된 선택적 폴더
• 온보딩: 새 프로필 구성 시 폴더 생성 또는 북마크 Pull
• Sync 프로필: 실시간, 빈번, 보통 또는 절전(사전 설정 간격 및 디바운스)
• 모든 북마크 변경 시 자동 Sync(프로필별 디바운스 구성 가능)
• 시작/포커스 시 Sync: 브라우저 시작 또는 포커스 복귀 시 선택적 Sync(쿨다운 포함)
• 원격 변경 감지를 위한 주기적 Sync(1~120분, 구성 가능)
• 알림: 모두(성공 + 실패), 오류만 또는 끄기
• 팝업에서 수동 Push, Pull 및 전체 Sync
• 자동 병합이 불가능할 때 충돌 감지
• 생성 파일: README.md(개요), bookmarks.html(브라우저 가져오기), feed.xml(RSS 2.0 피드), dashy-conf.yml(Dashy 대시보드) — 각각 끄기, 수동, 자동으로 구성 가능
• Git 설정 Sync: 리포지토리에 확장 프로그램 설정의 암호화된 백업 — 글로벌(공유) 또는 개별(기기별) 모드; 다른 기기에서 설정 가져오기; 모든 기기에서 동일한 비밀번호, 자동 동기화
• 자동화: Git, CLI 또는 GitHub Actions로 북마크 추가 — 브라우저 불필요
• 가져오기/내보내기: 북마크(JSON), Dashy 구성(YAML) 또는 설정(일반 JSON / 암호화된 .enc) 내보내기; 자동 형식 감지로 가져오기
• 자동 저장: 모든 설정은 변경 시 자동 저장 — 저장 버튼 없음
• 옵션: 5개 탭(GitHub, Sync, 파일, 도움말, 정보), GitHub 및 파일에 하위 탭 — 깔끔하게 정리된 설정 UI
• 테마: 라이트, 다크 또는 자동 — 순환 버튼(A → 다크 → 라이트 → A) 옵션 및 팝업
• 백로그 투표: 다음 기능 우선순위를 결정하는 커뮤니티 투표
• 다국어: 12개 언어 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 수동 선택 또는 자동 감지
• 키보드 단축키: 빠른 Sync(Ctrl+Shift+.), 설정 열기(Ctrl+Shift+,) — 사용자 지정 가능
• 디버그 로그: Sync 탭 — Sync 진단을 위해 활성화, 문제 해결을 위해 내보내기
• 모바일 동반앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중에 북마크 보기, 리포지토리에서 읽기 전용 Sync
• 외부 서버 없음 — Personal Access Token을 사용하여 GitHub API와 직접 통신

사용 방법:
1. 북마크용 GitHub 리포지토리 생성
2. "repo" 범위의 Personal Access Token 생성
3. 토큰과 리포지토리로 GitSyncMarks 구성
4. "지금 동기화" 클릭 — 완료!

각 북마크는 리포지토리에 개별 JSON 파일로 저장되며, 북마크 계층 구조를 반영하는 폴더로 구성됩니다. README.md는 GitHub에서 직접 깔끔한 개요를 제공하고; bookmarks.html은 모든 브라우저로 가져올 수 있으며; feed.xml RSS 피드는 구독하거나 자동화에 사용할 수 있고; dashy-conf.yml은 Dashy 대시보드 섹션을 제공합니다.

자동화:
브라우저를 열지 않고도 북마크를 추가할 수 있습니다. GitSyncMarks에는 GitHub Actions 워크플로(add-bookmark.yml)가 포함되어 있어 GitHub 웹 UI 또는 명령줄에서 북마크를 추가할 수 있습니다:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

리포지토리에 직접 북마크 파일을 생성할 수도 있습니다 — 북마크 폴더에 "title"과 "url"이 포함된 JSON 파일을 추가하기만 하면 됩니다. 확장 프로그램은 다음 Sync 시 새 파일을 자동으로 감지하고 표준 형식으로 정규화합니다.

GitSyncMarks는 완전히 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중에 북마크 보기. 읽기 전용; F-Droid 및 Google Play 출시 예정. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
생산성

### Language
한국어

---

## Русский (RU)

### Name
GitSyncMarks

### Summary (max 132 characters)
Ваши закладки на GitHub — пофайловое хранение, трёхсторонний merge, Chrome и Firefox. Сервер не нужен.

### Detailed Description
GitSyncMarks синхронизирует закладки вашего браузера с репозиторием GitHub — двунаправленно, автоматически и без внешнего сервера.

Возможности:
• Пофайловое хранение: каждая закладка — отдельный JSON-файл — читаемый и удобный для diff
• Трёхсторонний merge: автоматическая бесконфликтная синхронизация при изменениях с обеих сторон
• Кроссбраузерность: работает с Chrome, Chromium, Brave, Edge и Firefox
• Несколько профилей закладок: до 10 профилей с отдельными GitHub-репозиториями; переключение заменяет локальные закладки
• Папка GitHub Repos: необязательная папка с закладками на все ваши GitHub-репозитории (публичные и приватные)
• Онбординг: создание папки или Pull закладок при настройке нового профиля
• Профили Sync: реальное время, частый, обычный или энергосбережение (предустановленные интервалы и дебаунс)
• Авто-Sync при каждом изменении закладок (дебаунс настраивается для каждого профиля)
• Sync при запуске / фокусе: необязательный Sync при запуске браузера или возврате фокуса (с кулдауном)
• Периодический Sync для обнаружения удалённых изменений (1–120 минут, настраиваемо)
• Уведомления: Все (успех + ошибка), Только ошибки или Выключены
• Ручной Push, Pull и полный Sync через всплывающее окно
• Обнаружение конфликтов, когда автоматический merge невозможен
• Генерируемые файлы: README.md (обзор), bookmarks.html (импорт в браузер), feed.xml (RSS 2.0 лента), dashy-conf.yml (панель Dashy) — каждый настраивается как Выключен, Ручной или Авто
• Sync настроек с Git: зашифрованная резервная копия настроек расширения в репозитории — Глобальный (общий) или Индивидуальный (для устройства) режим; импорт настроек с других устройств; одинаковый пароль на каждом устройстве, автоматическая синхронизация
• Автоматизация: добавление закладок через Git, CLI или GitHub Actions — без браузера
• Импорт/Экспорт: экспорт закладок (JSON), конфигурации Dashy (YAML) или настроек (обычный JSON / зашифрованный .enc); импорт с автоматическим определением формата
• Автосохранение: все настройки сохраняются автоматически при изменении — без кнопок сохранения
• Опции: 5 вкладок (GitHub, Sync, Файлы, Помощь, О программе) с подвкладками для GitHub и Файлов — аккуратный интерфейс настроек
• Тема: светлая, тёмная или авто — кнопка цикла (A → Тёмная → Светлая → A) в настройках и всплывающем окне
• Голосование по бэклогу: голосование сообщества для определения приоритетов функций
• Мультиязычность: 12 языков — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; ручной выбор или автоопределение
• Горячие клавиши: быстрый Sync (Ctrl+Shift+.), открыть настройки (Ctrl+Shift+,) — настраиваемые
• Лог отладки: вкладка Sync — включите для диагностики Sync, экспортируйте для устранения неполадок
• Мобильный компаньон: GitSyncMarks-Mobile (iOS + Android) — просматривайте закладки на ходу, Sync только для чтения из вашего репозитория
• Без внешнего сервера — напрямую связывается с API GitHub через ваш Personal Access Token

Как это работает:
1. Создайте репозиторий GitHub для закладок
2. Сгенерируйте Personal Access Token с правами «repo»
3. Настройте GitSyncMarks, указав токен и репозиторий
4. Нажмите «Синхронизировать сейчас» — готово!

Каждая закладка хранится как отдельный JSON-файл в вашем репозитории, организованный в папки, отражающие иерархию закладок. README.md даёт чёткий обзор прямо на GitHub; bookmarks.html позволяет импортировать в любой браузер; feed.xml RSS-лента позволяет подписаться или использовать для автоматизаций; dashy-conf.yml предоставляет секции для панели Dashy.

Автоматизация:
Вы можете добавлять закладки, не открывая браузер. GitSyncMarks включает GitHub Actions workflow (add-bookmark.yml), позволяющий добавлять закладки через веб-интерфейс GitHub или командную строку:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Пример" -f folder="toolbar"

Вы также можете создавать файлы закладок прямо в репозитории — просто добавьте JSON-файл с «title» и «url» в любую папку закладок. Расширение автоматически обнаружит новые файлы при следующем Sync и нормализует их в канонический формат.

GitSyncMarks полностью с открытым исходным кодом: https://github.com/d0dg3r/GitSyncMarks

Мобильное приложение: GitSyncMarks-Mobile (iOS + Android) — закладки на ходу. Только чтение; F-Droid и Google Play скоро. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Продуктивность

### Language
Русский

---

## Türkçe (TR)

### Name
GitSyncMarks

### Summary (max 132 characters)
Yer imleriniz GitHub'da güvende — dosya bazlı depolama, üç yönlü merge sync, Chrome ve Firefox. Sunucu gereksiz.

### Detailed Description
GitSyncMarks, tarayıcı yer imlerinizi bir GitHub deposuyla senkronize eder — çift yönlü, otomatik ve harici sunucu gerektirmez.

Özellikler:
• Dosya bazlı depolama: her yer imi ayrı bir JSON dosyası — okunabilir ve diff dostu
• Üç yönlü merge: her iki tarafta da değişiklik olduğunda otomatik çakışmasız sync
• Çapraz tarayıcı: Chrome, Chromium, Brave, Edge ve Firefox ile çalışır
• Çoklu yer imi profili: ayrı GitHub depoları ile en fazla 10 profil; geçiş yerel yer imlerini değiştirir
• GitHub Repos klasörü: tüm GitHub depolarınıza (genel ve özel) yer imleri içeren isteğe bağlı klasör
• Başlangıç kurulumu: yeni profil yapılandırırken klasör oluşturma veya yer imlerini Pull etme
• Sync profilleri: gerçek zamanlı, sık, normal veya enerji tasarrufu (önceden ayarlanmış aralıklar ve debounce)
• Her yer imi değişikliğinde otomatik Sync (profil başına debounce yapılandırılabilir)
• Başlangıçta / odaklanmada Sync: tarayıcı başladığında veya odak kazandığında isteğe bağlı Sync (bekleme süresiyle)
• Uzak değişiklikleri algılamak için periyodik Sync (1–120 dakika, yapılandırılabilir)
• Bildirimler: Tümü (başarı + hata), Yalnızca hatalar veya Kapalı
• Popup'tan manuel Push, Pull ve tam Sync
• Otomatik merge mümkün olmadığında çakışma algılama
• Oluşturulan dosyalar: README.md (genel bakış), bookmarks.html (tarayıcı içe aktarma), feed.xml (RSS 2.0 akışı) ve dashy-conf.yml (Dashy panosu) — her biri Kapalı, Manuel veya Otomatik olarak yapılandırılabilir
• Git ile ayar Sync'i: depodaki uzantı ayarlarının şifrelenmiş yedekleme — Global (paylaşılan) veya Bireysel (cihaz başına) mod; diğer cihazlardan ayarları içe aktarma; her cihazda aynı şifre, otomatik senkronize
• Otomasyon: Git, CLI veya GitHub Actions ile yer imi ekleme — tarayıcı gerektirmez
• İçe/Dışa Aktarma: yer imleri (JSON), Dashy yapılandırması (YAML) veya ayarlar (düz JSON / şifreli .enc) dışa aktarma; otomatik format algılama ile içe aktarma
• Otomatik kaydetme: tüm ayarlar değiştirildiğinde otomatik kaydedilir — Kaydet düğmesi yok
• Seçenekler: 5 sekme (GitHub, Sync, Dosyalar, Yardım, Hakkında) ile GitHub ve Dosyalar için alt sekmeler — düzenli ayarlar arayüzü
• Tema: açık, koyu veya otomatik — döngü düğmesi (A → Koyu → Açık → A) seçeneklerde ve popup'ta
• Backlog oylaması: sonraki özelliklerin önceliğini belirlemek için topluluk anketi
• Çok dilli: 12 dil — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuel seçim veya otomatik algılama
• Klavye kısayolları: hızlı Sync (Ctrl+Shift+.), ayarları aç (Ctrl+Shift+,) — özelleştirilebilir
• Hata ayıklama günlüğü: Sync sekmesi — Sync tanılama için etkinleştirin, sorun giderme için dışa aktarın
• Mobil eşlik uygulaması: GitSyncMarks-Mobile (iOS + Android) — hareket halindeyken yer imlerinizi görüntüleyin, deponuzdan salt okunur Sync
• Harici sunucu yok — Personal Access Token'ınızı kullanarak doğrudan GitHub API ile iletişim kurar

Nasıl çalışır:
1. Yer imleriniz için bir GitHub deposu oluşturun
2. "repo" kapsamında bir Personal Access Token oluşturun
3. GitSyncMarks'ı token'ınız ve deponuzla yapılandırın
4. "Şimdi Senkronize Et"e tıklayın — bitti!

Her yer imi, deponuzda ayrı bir JSON dosyası olarak saklanır ve yer imi hiyerarşinizi yansıtan klasörler halinde düzenlenir. README.md doğrudan GitHub'da net bir genel bakış sunar; bookmarks.html herhangi bir tarayıcıya içe aktarmanızı sağlar; feed.xml RSS akışı abone olmanıza veya otomasyonlar için kullanmanıza olanak tanır; dashy-conf.yml, Dashy panosu için bölümler sağlar.

Otomasyon:
Tarayıcıyı açmadan yer imi ekleyebilirsiniz. GitSyncMarks, GitHub Web arayüzü veya komut satırı üzerinden yer imi eklemenizi sağlayan bir GitHub Actions iş akışı (add-bookmark.yml) içerir:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Örnek" -f folder="toolbar"

Doğrudan depoda yer imi dosyaları da oluşturabilirsiniz — herhangi bir yer imi klasörüne "title" ve "url" içeren bir JSON dosyası ekleyin. Uzantı, bir sonraki Sync'te yeni dosyaları otomatik olarak algılar ve bunları kanonik formata normalleştirir.

GitSyncMarks tamamen açık kaynaklıdır: https://github.com/d0dg3r/GitSyncMarks

Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — hareket halindeyken yer imleriniz. Salt okunur; F-Droid ve Google Play yakında. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Üretkenlik

### Language
Türkçe

---

## Polski (PL)

### Name
GitSyncMarks

### Summary (max 132 characters)
Twoje zakładki bezpiecznie na GitHub — pliki jednostkowe, synchronizacja z merge trójstronnym, Chrome i Firefox. Bez serwera.

### Detailed Description
GitSyncMarks synchronizuje zakładki przeglądarki z repozytorium GitHub — dwukierunkowo, automatycznie i bez żadnego zewnętrznego serwera.

Funkcje:
• Plikowe przechowywanie: każda zakładka to osobny plik JSON — czytelny i przyjazny dla diff
• Trójstronny merge: automatyczna, bezkonfliktowa synchronizacja przy zmianach po obu stronach
• Wieloprzeglądarkowy: działa z Chrome, Chromium, Brave, Edge i Firefox
• Wiele profili zakładek: do 10 profili z oddzielnymi repozytoriami GitHub; przełączenie zastępuje lokalne zakładki
• Folder GitHub Repos: opcjonalny folder z zakładkami do wszystkich Twoich repozytoriów GitHub (publicznych i prywatnych)
• Onboarding: tworzenie folderu lub Pull zakładek przy konfiguracji nowego profilu
• Profile Sync: czas rzeczywisty, częsty, normalny lub oszczędzanie energii (ustawione interwały i debounce)
• Auto-Sync przy każdej zmianie zakładki (debounce konfigurowalny per profil)
• Sync przy uruchomieniu / fokusie: opcjonalny Sync przy starcie przeglądarki lub powrocie fokusa (z cooldownem)
• Okresowy Sync do wykrywania zdalnych zmian (1–120 minut, konfigurowalne)
• Powiadomienia: Wszystkie (sukces + błąd), Tylko błędy lub Wyłączone
• Ręczny Push, Pull i pełny Sync z poziomu popup
• Wykrywanie konfliktów, gdy automatyczny merge jest niemożliwy
• Generowane pliki: README.md (przegląd), bookmarks.html (import do przeglądarki), feed.xml (kanał RSS 2.0) i dashy-conf.yml (panel Dashy) — każdy konfigurowalny jako Wyłączony, Ręczny lub Auto
• Sync ustawień z Git: zaszyfrowana kopia zapasowa ustawień rozszerzenia w repozytorium — tryb Globalny (współdzielony) lub Indywidualny (per urządzenie); importowanie ustawień z innych urządzeń; to samo hasło na każdym urządzeniu, automatycznie synchronizowane
• Automatyzacja: dodawanie zakładek przez Git, CLI lub GitHub Actions — bez przeglądarki
• Import/Eksport: eksport zakładek (JSON), konfiguracji Dashy (YAML) lub ustawień (zwykły JSON / zaszyfrowany .enc); import z automatycznym wykrywaniem formatu
• Automatyczny zapis: wszystkie ustawienia zapisują się automatycznie przy zmianie — bez przycisków Zapisz
• Opcje: 5 zakładek (GitHub, Sync, Pliki, Pomoc, O programie) z podzakładkami dla GitHub i Plików — przejrzysty interfejs ustawień
• Motyw: jasny, ciemny lub auto — przycisk cykliczny (A → Ciemny → Jasny → A) w opcjach i popup
• Głosowanie na backlog: ankieta społeczności do ustalania priorytetów funkcji
• Wielojęzyczność: 12 języków — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; wybór ręczny lub automatyczne wykrywanie
• Skróty klawiszowe: szybki Sync (Ctrl+Shift+.), otwórz ustawienia (Ctrl+Shift+,) — konfigurowalne
• Dziennik debugowania: zakładka Sync — włącz do diagnostyki Sync, eksportuj do rozwiązywania problemów
• Towarzysz mobilny: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży, Sync tylko do odczytu z repozytorium
• Bez zewnętrznego serwera — komunikuje się bezpośrednio z API GitHub przy użyciu Twojego Personal Access Token

Jak to działa:
1. Utwórz repozytorium GitHub na swoje zakładki
2. Wygeneruj Personal Access Token z zakresem „repo"
3. Skonfiguruj GitSyncMarks swoim tokenem i repozytorium
4. Kliknij „Synchronizuj teraz" — gotowe!

Każda zakładka jest przechowywana jako osobny plik JSON w Twoim repozytorium, zorganizowana w foldery odzwierciedlające hierarchię zakładek. README.md daje przejrzysty przegląd bezpośrednio na GitHub; bookmarks.html umożliwia import do dowolnej przeglądarki; feed.xml RSS umożliwia subskrypcję lub wykorzystanie do automatyzacji; dashy-conf.yml dostarcza sekcje dla panelu Dashy.

Automatyzacja:
Możesz dodawać zakładki bez otwierania przeglądarki. GitSyncMarks zawiera workflow GitHub Actions (add-bookmark.yml), który pozwala dodawać zakładki przez interfejs webowy GitHub lub wiersz poleceń:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Przykład" -f folder="toolbar"

Możesz też tworzyć pliki zakładek bezpośrednio w repozytorium — wystarczy dodać plik JSON z „title" i „url" do dowolnego folderu zakładek. Rozszerzenie automatycznie wykrywa nowe pliki przy następnym Sync i normalizuje je do kanonicznego formatu.

GitSyncMarks jest w pełni open source: https://github.com/d0dg3r/GitSyncMarks

Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — zakładki w podróży. Tylko odczyt; F-Droid i Google Play wkrótce. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Category
Produktywność

### Language
Polski

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
