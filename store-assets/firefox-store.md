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
• Mehrsprachig: 12 Sprachen — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
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
• Multilingue : 12 langues — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
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
• Multilingüe: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
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

## Português (Brasil) (PT-BR)

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincronize seus favoritos do Firefox com o GitHub — bidirecional, sem conflitos. JSON por arquivo, merge triplo, auto-sync. Suporte para Barra de Favoritos, Menu e Mobile. Adicione favoritos via Git, CLI ou GitHub Actions. Open source, sem servidor externo.

### Detailed Description
GitSyncMarks sincroniza seus favoritos do Firefox com um repositório GitHub — bidirecional, automaticamente e sem nenhum servidor externo.

Recursos:
• Armazenamento por arquivo: cada favorito é um arquivo JSON individual — legível e amigável para diff
• Merge triplo: sincronização automática sem conflitos quando há alterações em ambos os lados
• Suporte completo ao Firefox incluindo a pasta Menu de Favoritos
• Múltiplos perfis de favoritos: até 10 perfis com repositórios GitHub separados; a troca substitui os favoritos locais
• Pasta Repos GitHub: pasta opcional com favoritos para todos os seus repositórios GitHub (públicos e privados)
• Onboarding: criar pasta ou importar favoritos ao configurar um novo perfil
• Perfis de sync: tempo real, frequente, normal ou economia de energia
• Auto-sync a cada alteração de favorito (atraso configurável por perfil)
• Sync ao iniciar / ao focar: sync opcional ao iniciar o navegador ou ao focar a janela (com cooldown)
• Sync periódico para detectar alterações remotas (1–120 minutos, configurável)
• Notificações: Todas (sucesso + erro), Somente erros ou Desativadas
• Push, Pull e Sync completo manuais pelo popup
• Detecção de conflitos quando o merge automático não é possível
• Arquivos gerados: README.md (visão geral), bookmarks.html (importação do navegador), feed.xml (feed RSS 2.0) e dashy-conf.yml (painel Dashy) — cada um configurável como Desativado, Manual ou Auto
• Sync de configurações com Git: backup criptografado das configurações da extensão no repositório — modo Global (compartilhado) ou Individual (por dispositivo); importar configurações de outros dispositivos; mesma senha em todos os dispositivos, sincronizado automaticamente
• Opções: 5 abas (GitHub, Sync, Arquivos, Ajuda, Sobre) com sub-abas para GitHub e Arquivos — interface organizada
• Automatização: adicionar favoritos via Git, CLI ou GitHub Actions — sem abrir o navegador
• Importar/Exportar: favoritos (JSON), configuração Dashy (YAML) ou configurações (JSON / .enc criptografado); importação com detecção automática de formato
• Auto-save: todas as configurações são salvas automaticamente ao alterar — sem botões Salvar
• Tema: claro, escuro ou auto — botão de ciclo (A → Escuro → Claro → A) nas opções e popup
• Votação do backlog: enquete comunitária para priorizar próximos recursos
• Multilíngue: 12 idiomas — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; seleção manual ou auto-detecção
• Atalhos de teclado: sync rápido (Ctrl+Shift+.), abrir configurações (Ctrl+Shift+,) — personalizáveis
• Log de depuração: aba Sync — ativar para diagnósticos de sync, exportar para solução de problemas
• App móvel: GitSyncMarks-Mobile (iOS + Android) — visualize seus favoritos em qualquer lugar, sync somente leitura do seu repositório
• Sem servidor externo — comunica diretamente com a API do GitHub usando seu Personal Access Token

Como funciona:
1. Crie um repositório GitHub para seus favoritos
2. Gere um Personal Access Token com o escopo "repo"
3. Configure o GitSyncMarks com seu token e repositório
4. Clique em "Sincronizar agora" — pronto!

Cada favorito é armazenado como um arquivo JSON individual no seu repositório, organizado em pastas que espelham a hierarquia de favoritos do Firefox (Barra de Favoritos, Menu de Favoritos, Outros Favoritos). Um README.md oferece uma visão geral diretamente no GitHub; um bookmarks.html permite importar em qualquer navegador; um feed.xml RSS permite assinar ou usar para automações; um dashy-conf.yml fornece seções para o painel Dashy.

Automatização:
Você pode adicionar favoritos sem abrir o Firefox. O GitSyncMarks inclui um workflow do GitHub Actions (add-bookmark.yml) que permite adicionar favoritos pela interface web do GitHub ou pela linha de comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Você também pode criar arquivos de favoritos diretamente no repositório — basta adicionar um arquivo JSON com "title" e "url" em qualquer pasta de favoritos. A extensão detecta novos arquivos automaticamente na próxima sincronização.

GitSyncMarks é totalmente open source: https://github.com/d0dg3r/GitSyncMarks

App móvel: GitSyncMarks-Mobile (iOS + Android) — visualize seus favoritos em qualquer lugar. Companheiro somente leitura; F-Droid e Google Play em breve. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Favoritos

### Tags
bookmarks, sync, github, backup, automation

---

## Italiano (IT)

### Name
GitSyncMarks

### Summary (max 250 characters)
Sincronizza i segnalibri Firefox con GitHub — bidirezionale, senza conflitti. JSON per file, merge a tre vie, auto-sync. Supporto completo per Barra dei segnalibri, Menu e Mobile. Aggiungi segnalibri via Git, CLI o GitHub Actions. Open source, nessun server esterno.

### Detailed Description
GitSyncMarks sincronizza i tuoi segnalibri Firefox con un repository GitHub — bidirezionale, automaticamente e senza alcun server esterno.

Funzionalità:
• Archiviazione per file: ogni segnalibro è un file JSON individuale — leggibile e compatibile con diff
• Merge a tre vie: sincronizzazione automatica senza conflitti quando ci sono modifiche su entrambi i lati
• Supporto completo Firefox inclusa la cartella Menu dei segnalibri
• Profili multipli di segnalibri: fino a 10 profili con repository GitHub separati; il cambio sostituisce i segnalibri locali
• Cartella Repos GitHub: cartella opzionale con segnalibri a tutti i tuoi repository GitHub (pubblici e privati)
• Onboarding: creare cartella o importare segnalibri durante la configurazione di un nuovo profilo
• Profili di sync: tempo reale, frequente, normale o risparmio energetico
• Auto-sync ad ogni modifica di segnalibro (ritardo configurabile per profilo)
• Sync all'avvio / al focus: sync opzionale all'avvio del browser o al ritorno alla finestra (con cooldown)
• Sync periodico per rilevare modifiche remote (1–120 minuti, configurabile)
• Notifiche: Tutte (successo + errore), Solo errori o Disattivate
• Push, Pull e Sync completo manuali tramite il popup
• Rilevamento dei conflitti quando il merge automatico non è possibile
• File generati: README.md (panoramica), bookmarks.html (importazione browser), feed.xml (feed RSS 2.0) e dashy-conf.yml (dashboard Dashy) — ciascuno configurabile come Disattivato, Manuale o Auto
• Sync delle impostazioni con Git: backup crittografato delle impostazioni dell'estensione nel repository — modalità Globale (condivisa) o Individuale (per dispositivo); importa impostazioni da altri dispositivi; stessa password su ogni dispositivo, sincronizzato automaticamente
• Opzioni: 5 schede (GitHub, Sync, File, Aiuto, Info) con sotto-schede per GitHub e File — interfaccia organizzata
• Automatizzazione: aggiungi segnalibri via Git, CLI o GitHub Actions — senza aprire il browser
• Importa/Esporta: segnalibri (JSON), configurazione Dashy (YAML) o impostazioni (JSON / .enc crittografato); importazione con rilevamento automatico del formato
• Salvataggio automatico: tutte le impostazioni si salvano automaticamente alla modifica — nessun pulsante Salva
• Tema: chiaro, scuro o auto — pulsante ciclo (A → Scuro → Chiaro → A) nelle opzioni e nel popup
• Votazione backlog: sondaggio della comunità per dare priorità alle prossime funzionalità
• Multilingue: 12 lingue — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; selezione manuale o rilevamento automatico
• Scorciatoie da tastiera: sync rapido (Ctrl+Shift+.), apri impostazioni (Ctrl+Shift+,) — personalizzabili
• Log di debug: scheda Sync — attivare per diagnostica sync, esportare per risoluzione problemi
• App mobile: GitSyncMarks-Mobile (iOS + Android) — visualizza i tuoi segnalibri ovunque, sync in sola lettura dal tuo repository
• Nessun server esterno — comunica direttamente con l'API GitHub usando il tuo Personal Access Token

Come funziona:
1. Crea un repository GitHub per i tuoi segnalibri
2. Genera un Personal Access Token con lo scope "repo"
3. Configura GitSyncMarks con il tuo token e repository
4. Clicca su "Sincronizza ora" — fatto!

Ogni segnalibro è archiviato come file JSON individuale nel tuo repository, organizzato in cartelle che rispecchiano la gerarchia dei segnalibri di Firefox (Barra dei segnalibri, Menu dei segnalibri, Altri segnalibri). Un README.md offre una panoramica direttamente su GitHub; un bookmarks.html permette l'importazione in qualsiasi browser; un feed.xml RSS permette di abbonarsi o usare per automazioni; un dashy-conf.yml fornisce sezioni per la dashboard Dashy.

Automatizzazione:
Puoi aggiungere segnalibri senza aprire Firefox. GitSyncMarks include un workflow GitHub Actions (add-bookmark.yml) che permette di aggiungere segnalibri tramite l'interfaccia web di GitHub o la riga di comando:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Puoi anche creare file di segnalibri direttamente nel repository — basta aggiungere un file JSON con "title" e "url" in qualsiasi cartella di segnalibri. L'estensione rileva i nuovi file automaticamente alla prossima sincronizzazione.

GitSyncMarks è completamente open source: https://github.com/d0dg3r/GitSyncMarks

App mobile: GitSyncMarks-Mobile (iOS + Android) — visualizza i tuoi segnalibri ovunque. Compagno in sola lettura; F-Droid e Google Play in arrivo. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Segnalibri

### Tags
bookmarks, sync, github, backup, automation

---

## 日本語 (JA)

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefoxのブックマークをお手元のGitHubリポジトリと双方向・競合なしで同期。ファイル単位のJSON保存、三方マージ、自動同期。ブックマークツールバー・メニュー・モバイルに完全対応。Git、CLI、GitHub Actionsで追加可能。オープンソース、外部サーバー不要。

### Detailed Description
GitSyncMarksは、FirefoxのブックマークをGitHubリポジトリと同期します — 双方向、自動、外部サーバー不要。

機能:
• ファイル単位の保存: 各ブックマークは個別のJSONファイル — 人間が読みやすくdiffに最適
• 三方マージ: 両側で変更があっても自動で競合なく同期
• Firefoxの完全サポート（ブックマークメニューフォルダを含む）
• 複数のブックマークプロファイル: 最大10プロファイル、個別のGitHubリポジトリ対応; 切り替え時にローカルブックマークを置換
• GitHub Reposフォルダ: すべてのGitHubリポジトリ（パブリック・プライベート）へのブックマークを含むオプションフォルダ
• オンボーディング: 新しいプロファイル設定時にフォルダ作成またはブックマーク取得
• Syncプロファイル: リアルタイム、頻繁、通常、省電力
• ブックマーク変更ごとの自動同期（プロファイルごとにデバウンス設定可能）
• 起動時/フォーカス時のSync: ブラウザ起動時またはフォーカス取得時のオプション同期（クールダウン付き）
• リモート変更検出のための定期Sync（1〜120分、設定可能）
• 通知: すべて（成功+失敗）、エラーのみ、またはオフ
• ポップアップからの手動Push、Pull、フルSync
• 自動マージ不可能時の競合検出
• 生成ファイル: README.md（概要）、bookmarks.html（ブラウザインポート）、feed.xml（RSS 2.0フィード）、dashy-conf.yml（Dashyダッシュボード） — 各ファイルをオフ、手動、自動で設定可能
• 設定のGit同期: リポジトリ内の拡張機能設定の暗号化バックアップ — グローバル（共有）または個別（デバイスごと）モード; 他のデバイスから設定をインポート; すべてのデバイスで同じパスワード、自動同期
• オプション: 5つのタブ（GitHub、Sync、ファイル、ヘルプ、About）とGitHub・ファイルのサブタブ — 整理された設定UI
• 自動化: Git、CLI、またはGitHub Actionsでブックマークを追加 — ブラウザ不要
• インポート/エクスポート: ブックマーク（JSON）、Dashy設定（YAML）、または設定（プレーンJSON / 暗号化.enc）; 自動フォーマット検出によるインポート
• 自動保存: すべての設定は変更時に自動保存 — 保存ボタンなし
• テーマ: ライト、ダーク、または自動 — サイクルボタン（A → ダーク → ライト → A）オプションとポップアップで
• バックログ投票: コミュニティ投票で次の機能の優先順位を決定
• 多言語対応: 12言語 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 手動選択または自動検出
• キーボードショートカット: クイックSync（Ctrl+Shift+.）、設定を開く（Ctrl+Shift+,） — カスタマイズ可能
• デバッグログ: Syncタブ — Sync診断の有効化、トラブルシューティング用エクスポート
• モバイルアプリ: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧、リポジトリからの読み取り専用同期
• 外部サーバー不要 — Personal Access Tokenを使用してGitHub APIと直接通信

使い方:
1. ブックマーク用のGitHubリポジトリを作成
2. "repo"スコープのPersonal Access Tokenを生成
3. GitSyncMarksにトークンとリポジトリを設定
4. 「今すぐ同期」をクリック — 完了！

各ブックマークはリポジトリ内の個別のJSONファイルとして保存され、Firefoxのブックマーク階層（ブックマークツールバー、ブックマークメニュー、他のブックマーク）を反映するフォルダに整理されます。README.mdはGitHub上で直接概要を提供し、bookmarks.htmlは任意のブラウザにインポート可能、feed.xml RSSフィードは購読や自動化に使用可能、dashy-conf.ymlはDashyダッシュボードのセクションを提供します。

自動化:
Firefoxを開かずにブックマークを追加できます。GitSyncMarksにはGitHub Actionsワークフロー（add-bookmark.yml）が含まれており、GitHub WebUIまたはコマンドラインからブックマークを追加できます:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

リポジトリ内に直接ブックマークファイルを作成することもできます — 任意のブックマークフォルダに"title"と"url"を含むJSONファイルを追加するだけです。拡張機能は次回のSync時に新しいファイルを自動的に検出します。

GitSyncMarksは完全にオープンソースです: https://github.com/d0dg3r/GitSyncMarks

モバイルアプリ: GitSyncMarks-Mobile（iOS + Android） — 外出先でブックマークを閲覧。読み取り専用コンパニオン; F-DroidとGoogle Playは近日公開予定。https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
ブックマーク

### Tags
bookmarks, sync, github, backup, automation

---

## 中文简体 (ZH-CN)

### Name
GitSyncMarks

### Summary (max 250 characters)
将Firefox书签与GitHub同步 — 双向、无冲突。单文件JSON存储、三方合并、自动同步。完整支持书签工具栏、菜单和移动端。通过Git、CLI或GitHub Actions添加书签。开源，无需外部服务器。

### Detailed Description
GitSyncMarks将您的Firefox书签与GitHub仓库同步 — 双向、自动，无需任何外部服务器。

功能：
• 单文件存储：每个书签是一个独立的JSON文件 — 可读且适合diff
• 三方合并：当两端都有更改时自动无冲突同步
• 完整Firefox支持，包括书签菜单文件夹
• 多个书签配置文件：最多10个配置文件，使用独立GitHub仓库；切换时替换本地书签
• GitHub Repos文件夹：可选文件夹，包含您所有GitHub仓库（公开和私有）的书签
• 引导设置：配置新配置文件时创建文件夹或拉取书签
• Sync配置文件：实时、频繁、正常或省电模式
• 每次书签更改时自动同步（每个配置文件可配置防抖延迟）
• 启动/聚焦时Sync：浏览器启动或窗口获得焦点时的可选同步（带冷却时间）
• 定期Sync以检测远程更改（1–120分钟，可配置）
• 通知：全部（成功+失败）、仅错误或关闭
• 通过弹窗手动Push、Pull和完整Sync
• 自动合并不可能时的冲突检测
• 生成文件：README.md（概览）、bookmarks.html（浏览器导入）、feed.xml（RSS 2.0 Feed）和dashy-conf.yml（Dashy仪表板） — 每个可配置为关闭、手动或自动
• 设置Git同步：仓库中扩展设置的加密备份 — 全局（共享）或个人（按设备）模式；从其他设备导入设置；所有设备相同密码，自动同步
• 选项：5个标签页（GitHub、Sync、文件、帮助、关于）及GitHub和文件的子标签页 — 整洁有序的设置界面
• 自动化：通过Git、CLI或GitHub Actions添加书签 — 无需打开浏览器
• 导入/导出：书签（JSON）、Dashy配置（YAML）或设置（纯JSON / 加密.enc）；导入时自动检测格式
• 自动保存：所有设置更改时自动保存 — 无需保存按钮
• 主题：浅色、深色或自动 — 循环切换按钮（A → 深色 → 浅色 → A）在选项和弹窗中
• 待办投票：社区投票影响下一个功能优先级
• 多语言：12种语言 — EN、DE、FR、ES、PT-BR、IT、JA、ZH-CN、KO、RU、TR、PL；手动选择或自动检测
• 键盘快捷键：快速Sync（Ctrl+Shift+.）、打开设置（Ctrl+Shift+,） — 可自定义
• 调试日志：Sync标签页 — 启用Sync诊断，导出以排查问题
• 移动应用：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签，从仓库只读同步
• 无需外部服务器 — 使用您的Personal Access Token直接与GitHub API通信

使用方法：
1. 创建一个GitHub仓库用于存放书签
2. 生成具有"repo"范围的Personal Access Token
3. 用您的Token和仓库配置GitSyncMarks
4. 点击"立即同步" — 完成！

每个书签作为独立的JSON文件存储在您的仓库中，按照Firefox书签层级（书签工具栏、书签菜单、其他书签）组织到文件夹中。README.md在GitHub上直接提供概览；bookmarks.html可导入任何浏览器；feed.xml RSS Feed可用于订阅或自动化；dashy-conf.yml为Dashy仪表板提供分区。

自动化：
您可以不打开Firefox就添加书签。GitSyncMarks包含一个GitHub Actions工作流（add-bookmark.yml），允许您通过GitHub网页界面或命令行添加书签：

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

您也可以直接在仓库中创建书签文件 — 只需在任意书签文件夹中添加包含"title"和"url"的JSON文件。扩展会在下次同步时自动检测新文件。

GitSyncMarks完全开源：https://github.com/d0dg3r/GitSyncMarks

移动应用：GitSyncMarks-Mobile（iOS + Android） — 随时随地查看书签。只读伴侣应用；F-Droid和Google Play即将推出。https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
书签

### Tags
bookmarks, sync, github, backup, automation

---

## 한국어 (KO)

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefox 북마크를 GitHub와 동기화 — 양방향, 충돌 없음. 파일별 JSON 저장, 삼방향 병합, 자동 동기화. 북마크 도구 모음, 메뉴, 모바일 완벽 지원. Git, CLI 또는 GitHub Actions로 북마크 추가. 오픈 소스, 외부 서버 불필요.

### Detailed Description
GitSyncMarks는 Firefox 북마크를 GitHub 저장소와 동기화합니다 — 양방향, 자동, 외부 서버 없이.

기능:
• 파일별 저장: 각 북마크는 개별 JSON 파일 — 사람이 읽기 쉽고 diff에 최적화
• 삼방향 병합: 양쪽에서 변경 시 자동으로 충돌 없이 동기화
• 북마크 메뉴 폴더를 포함한 Firefox 완벽 지원
• 다중 북마크 프로필: 최대 10개 프로필, 별도의 GitHub 저장소 사용; 전환 시 로컬 북마크 교체
• GitHub Repos 폴더: 모든 GitHub 저장소(공개 및 비공개)의 북마크가 포함된 선택적 폴더
• 온보딩: 새 프로필 구성 시 폴더 생성 또는 북마크 가져오기
• Sync 프로필: 실시간, 빈번, 일반 또는 절전 모드
• 모든 북마크 변경 시 자동 동기화(프로필별 디바운스 설정 가능)
• 시작/포커스 시 Sync: 브라우저 시작 또는 창 포커스 시 선택적 동기화(쿨다운 포함)
• 원격 변경 감지를 위한 주기적 Sync(1~120분, 설정 가능)
• 알림: 전체(성공 + 실패), 오류만 또는 끄기
• 팝업을 통한 수동 Push, Pull 및 전체 Sync
• 자동 병합이 불가능할 때 충돌 감지
• 생성 파일: README.md(개요), bookmarks.html(브라우저 가져오기), feed.xml(RSS 2.0 피드), dashy-conf.yml(Dashy 대시보드) — 각각 끄기, 수동 또는 자동으로 설정 가능
• 설정 Git 동기화: 저장소에 확장 설정의 암호화 백업 — 글로벌(공유) 또는 개별(장치별) 모드; 다른 장치에서 설정 가져오기; 모든 장치에서 동일한 비밀번호, 자동 동기화
• 옵션: 5개 탭(GitHub, Sync, 파일, 도움말, 정보)과 GitHub 및 파일의 하위 탭 — 깔끔한 설정 UI
• 자동화: Git, CLI 또는 GitHub Actions로 북마크 추가 — 브라우저 불필요
• 가져오기/내보내기: 북마크(JSON), Dashy 구성(YAML) 또는 설정(일반 JSON / 암호화 .enc); 자동 형식 감지로 가져오기
• 자동 저장: 모든 설정은 변경 시 자동 저장 — 저장 버튼 없음
• 테마: 라이트, 다크 또는 자동 — 순환 버튼(A → 다크 → 라이트 → A) 옵션 및 팝업에서
• 백로그 투표: 커뮤니티 투표로 다음 기능 우선순위 결정
• 다국어: 12개 언어 — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; 수동 선택 또는 자동 감지
• 키보드 단축키: 빠른 Sync(Ctrl+Shift+.), 설정 열기(Ctrl+Shift+,) — 사용자 정의 가능
• 디버그 로그: Sync 탭 — 동기화 진단 활성화, 문제 해결을 위한 내보내기
• 모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중 북마크 보기, 저장소에서 읽기 전용 동기화
• 외부 서버 없음 — Personal Access Token을 사용하여 GitHub API와 직접 통신

사용 방법:
1. 북마크용 GitHub 저장소 생성
2. "repo" 범위의 Personal Access Token 생성
3. GitSyncMarks에 토큰과 저장소 구성
4. "지금 동기화" 클릭 — 완료!

각 북마크는 저장소에 개별 JSON 파일로 저장되며, Firefox 북마크 계층 구조(북마크 도구 모음, 북마크 메뉴, 기타 북마크)를 반영하는 폴더로 구성됩니다. README.md는 GitHub에서 직접 개요를 제공하고, bookmarks.html은 모든 브라우저로 가져오기가 가능하며, feed.xml RSS 피드는 구독이나 자동화에 사용할 수 있고, dashy-conf.yml은 Dashy 대시보드의 섹션을 제공합니다.

자동화:
Firefox를 열지 않고도 북마크를 추가할 수 있습니다. GitSyncMarks에는 GitHub Actions 워크플로(add-bookmark.yml)가 포함되어 있어 GitHub 웹 UI 또는 명령줄을 통해 북마크를 추가할 수 있습니다:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

저장소에 직접 북마크 파일을 생성할 수도 있습니다 — 북마크 폴더에 "title"과 "url"이 포함된 JSON 파일을 추가하기만 하면 됩니다. 확장 프로그램이 다음 동기화 시 새 파일을 자동으로 감지합니다.

GitSyncMarks는 완전 오픈 소스입니다: https://github.com/d0dg3r/GitSyncMarks

모바일 앱: GitSyncMarks-Mobile(iOS + Android) — 이동 중 북마크 보기. 읽기 전용 동반 앱; F-Droid 및 Google Play 출시 예정. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
북마크

### Tags
bookmarks, sync, github, backup, automation

---

## Русский (RU)

### Name
GitSyncMarks

### Summary (max 250 characters)
Синхронизируйте закладки Firefox с GitHub — двусторонне, без конфликтов. JSON по файлам, трёхсторонний merge, авто-sync. Полная поддержка Панели, Меню закладок и Мобильных. Добавляйте закладки через Git, CLI или GitHub Actions. Open source, без внешнего сервера.

### Detailed Description
GitSyncMarks синхронизирует ваши закладки Firefox с репозиторием GitHub — двусторонне, автоматически и без внешнего сервера.

Возможности:
• Хранение по файлам: каждая закладка — отдельный JSON-файл — удобный для чтения и diff
• Трёхсторонний merge: автоматическая синхронизация без конфликтов при изменениях с обеих сторон
• Полная поддержка Firefox, включая папку Меню закладок
• Несколько профилей закладок: до 10 профилей с отдельными репозиториями GitHub; переключение заменяет локальные закладки
• Папка GitHub Repos: опциональная папка с закладками на все ваши репозитории GitHub (публичные и приватные)
• Начальная настройка: создание папки или загрузка закладок при настройке нового профиля
• Профили Sync: реальное время, частый, обычный или энергосбережение
• Автоматическая синхронизация при каждом изменении закладки (задержка настраивается по профилю)
• Sync при запуске / фокусе: опциональная синхронизация при запуске браузера или получении фокуса (с перерывом)
• Периодический Sync для обнаружения удалённых изменений (1–120 минут, настраивается)
• Уведомления: Все (успех + ошибка), Только ошибки или Выкл
• Ручной Push, Pull и полный Sync через popup
• Обнаружение конфликтов при невозможности автоматического merge
• Генерируемые файлы: README.md (обзор), bookmarks.html (импорт в браузер), feed.xml (RSS 2.0 лента), dashy-conf.yml (панель Dashy) — каждый настраивается как Выкл, Вручную или Авто
• Sync настроек с Git: зашифрованная резервная копия настроек расширения в репозитории — Глобальный (общий) или Индивидуальный (по устройству) режим; импорт настроек с других устройств; один пароль на всех устройствах, автоматически синхронизируется
• Параметры: 5 вкладок (GitHub, Sync, Файлы, Помощь, О программе) с подвкладками для GitHub и Файлов — аккуратный интерфейс настроек
• Автоматизация: добавляйте закладки через Git, CLI или GitHub Actions — без открытия браузера
• Импорт/Экспорт: закладки (JSON), конфигурация Dashy (YAML) или настройки (обычный JSON / зашифрованный .enc); импорт с автоматическим определением формата
• Автосохранение: все настройки сохраняются автоматически при изменении — без кнопок Сохранить
• Тема: светлая, тёмная или авто — кнопка циклического переключения (A → Тёмная → Светлая → A) в настройках и popup
• Голосование за backlog: голосование сообщества для определения приоритетов будущих функций
• Многоязычность: 12 языков — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; ручной выбор или автоопределение
• Горячие клавиши: быстрый Sync (Ctrl+Shift+.), открыть настройки (Ctrl+Shift+,) — настраиваемые
• Журнал отладки: вкладка Sync — включить для диагностики синхронизации, экспорт для устранения неполадок
• Мобильное приложение: GitSyncMarks-Mobile (iOS + Android) — просматривайте закладки в пути, только чтение из вашего репозитория
• Без внешнего сервера — взаимодействует напрямую с GitHub API через ваш Personal Access Token

Как это работает:
1. Создайте репозиторий GitHub для ваших закладок
2. Сгенерируйте Personal Access Token с правами "repo"
3. Настройте GitSyncMarks с вашим токеном и репозиторием
4. Нажмите «Синхронизировать» — готово!

Каждая закладка хранится как отдельный JSON-файл в вашем репозитории, организованный в папки, отражающие иерархию закладок Firefox (Панель закладок, Меню закладок, Другие закладки). README.md даёт обзор прямо на GitHub; bookmarks.html позволяет импортировать в любой браузер; feed.xml RSS-лента для подписки или автоматизации; dashy-conf.yml предоставляет секции для панели Dashy.

Автоматизация:
Вы можете добавлять закладки, не открывая Firefox. GitSyncMarks включает workflow GitHub Actions (add-bookmark.yml), позволяющий добавлять закладки через веб-интерфейс GitHub или командную строку:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Вы также можете создавать файлы закладок прямо в репозитории — просто добавьте JSON-файл с "title" и "url" в любую папку закладок. Расширение автоматически обнаружит новые файлы при следующей синхронизации.

GitSyncMarks полностью открытый исходный код: https://github.com/d0dg3r/GitSyncMarks

Мобильное приложение: GitSyncMarks-Mobile (iOS + Android) — закладки в пути. Только чтение; F-Droid и Google Play скоро. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Закладки

### Tags
bookmarks, sync, github, backup, automation

---

## Türkçe (TR)

### Name
GitSyncMarks

### Summary (max 250 characters)
Firefox yer imlerinizi GitHub ile senkronize edin — çift yönlü, çakışmasız. Dosya başına JSON, üç yönlü merge, otomatik sync. Yer İmleri Araç Çubuğu, Menü ve Mobil tam destek. Git, CLI veya GitHub Actions ile ekleyin. Açık kaynak, harici sunucu yok.

### Detailed Description
GitSyncMarks, Firefox yer imlerinizi bir GitHub deposuyla senkronize eder — çift yönlü, otomatik ve harici sunucu olmadan.

Özellikler:
• Dosya başına depolama: her yer imi ayrı bir JSON dosyası — okunabilir ve diff dostu
• Üç yönlü merge: her iki tarafta değişiklik olduğunda otomatik çakışmasız senkronizasyon
• Yer İmleri Menüsü klasörü dahil tam Firefox desteği
• Çoklu yer imi profili: ayrı GitHub depolarıyla en fazla 10 profil; geçiş yerel yer imlerini değiştirir
• GitHub Repos klasörü: tüm GitHub depolarınıza (genel ve özel) yer imleri içeren isteğe bağlı klasör
• Başlangıç: yeni profil yapılandırırken klasör oluşturma veya yer imlerini çekme
• Sync profilleri: gerçek zamanlı, sık, normal veya güç tasarrufu
• Her yer imi değişikliğinde otomatik sync (profil başına gecikme yapılandırılabilir)
• Başlatma / odaklanma ile Sync: tarayıcı başlatıldığında veya odaklandığında isteğe bağlı sync (bekleme süresiyle)
• Uzak değişiklikleri algılamak için periyodik Sync (1–120 dakika, yapılandırılabilir)
• Bildirimler: Tümü (başarılı + hata), Yalnızca hatalar veya Kapalı
• Popup üzerinden manuel Push, Pull ve tam Sync
• Otomatik merge mümkün olmadığında çakışma algılama
• Oluşturulan dosyalar: README.md (genel bakış), bookmarks.html (tarayıcı içe aktarma), feed.xml (RSS 2.0 akışı) ve dashy-conf.yml (Dashy panosu) — her biri Kapalı, Manuel veya Otomatik olarak yapılandırılabilir
• Ayarları Git ile Sync: depodaki uzantı ayarlarının şifreli yedeği — Global (paylaşılan) veya Bireysel (cihaz başına) modu; diğer cihazlardan ayarları içe aktarma; her cihazda aynı şifre, otomatik senkronize
• Seçenekler: 5 sekme (GitHub, Sync, Dosyalar, Yardım, Hakkında) ve GitHub ile Dosyalar için alt sekmeler — düzenli ayarlar arayüzü
• Otomasyon: Git, CLI veya GitHub Actions ile yer imi ekleyin — tarayıcı açmadan
• İçe/Dışa Aktarma: yer imleri (JSON), Dashy yapılandırması (YAML) veya ayarlar (düz JSON / şifreli .enc); otomatik biçim algılamayla içe aktarma
• Otomatik kayıt: tüm ayarlar değiştirildiğinde otomatik kaydedilir — Kaydet düğmesi yok
• Tema: açık, koyu veya otomatik — döngü düğmesi (A → Koyu → Açık → A) seçeneklerde ve popup'ta
• Backlog oylaması: topluluk anketi ile sonraki özelliklerin önceliğini belirleyin
• Çok dilli: 12 dil — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; manuel seçim veya otomatik algılama
• Klavye kısayolları: hızlı Sync (Ctrl+Shift+.), ayarları aç (Ctrl+Shift+,) — özelleştirilebilir
• Hata ayıklama günlüğü: Sync sekmesi — sync tanılaması için etkinleştirin, sorun giderme için dışa aktarın
• Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin, deponuzdan salt okunur sync
• Harici sunucu yok — Personal Access Token'ınızı kullanarak doğrudan GitHub API ile iletişim kurar

Nasıl çalışır:
1. Yer imleriniz için bir GitHub deposu oluşturun
2. "repo" kapsamında bir Personal Access Token oluşturun
3. GitSyncMarks'ı token ve deponuzla yapılandırın
4. "Şimdi Senkronize Et"e tıklayın — tamam!

Her yer imi, deponuzda ayrı bir JSON dosyası olarak saklanır ve Firefox yer imi hiyerarşinizi (Yer İmleri Araç Çubuğu, Yer İmleri Menüsü, Diğer Yer İmleri) yansıtan klasörler halinde düzenlenir. README.md doğrudan GitHub'da genel bir bakış sunar; bookmarks.html herhangi bir tarayıcıya içe aktarmayı sağlar; feed.xml RSS akışı abonelik veya otomasyon için kullanılabilir; dashy-conf.yml Dashy panosu için bölümler sağlar.

Otomasyon:
Firefox'u açmadan yer imi ekleyebilirsiniz. GitSyncMarks, GitHub web arayüzü veya komut satırı üzerinden yer imi eklemenizi sağlayan bir GitHub Actions iş akışı (add-bookmark.yml) içerir:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Ayrıca depoda doğrudan yer imi dosyaları oluşturabilirsiniz — herhangi bir yer imi klasörüne "title" ve "url" içeren bir JSON dosyası ekleyin. Uzantı, sonraki senkronizasyonda yeni dosyaları otomatik olarak algılar.

GitSyncMarks tamamen açık kaynaktır: https://github.com/d0dg3r/GitSyncMarks

Mobil uygulama: GitSyncMarks-Mobile (iOS + Android) — yer imlerinizi hareket halinde görüntüleyin. Salt okunur yardımcı uygulama; F-Droid ve Google Play yakında. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Yer İmleri

### Tags
bookmarks, sync, github, backup, automation

---

## Polski (PL)

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronizuj zakładki Firefoksa z GitHubem — dwukierunkowo, bez konfliktów. JSON per plik, trójdrożny merge, auto-sync. Pełne wsparcie dla Paska zakładek, Menu i Mobilnych. Dodawaj zakładki przez Git, CLI lub GitHub Actions. Open source, bez serwera.

### Detailed Description
GitSyncMarks synchronizuje Twoje zakładki Firefoksa z repozytorium GitHub — dwukierunkowo, automatycznie i bez zewnętrznego serwera.

Funkcje:
• Przechowywanie per plik: każda zakładka to osobny plik JSON — czytelny i przyjazny dla diff
• Trójdrożny merge: automatyczna synchronizacja bez konfliktów, gdy zmiany występują po obu stronach
• Pełne wsparcie Firefoksa, w tym folder Menu zakładek
• Wiele profili zakładek: do 10 profili z oddzielnymi repozytoriami GitHub; przełączenie zastępuje lokalne zakładki
• Folder GitHub Repos: opcjonalny folder z zakładkami do wszystkich Twoich repozytoriów GitHub (publicznych i prywatnych)
• Onboarding: tworzenie folderu lub pobieranie zakładek podczas konfiguracji nowego profilu
• Profile Sync: czas rzeczywisty, częsty, normalny lub oszczędzanie energii
• Auto-sync przy każdej zmianie zakładki (opóźnienie konfigurowalne per profil)
• Sync przy uruchomieniu / fokusie: opcjonalna synchronizacja przy starcie przeglądarki lub uzyskaniu fokusu (z cooldownem)
• Okresowy Sync do wykrywania zdalnych zmian (1–120 minut, konfigurowalne)
• Powiadomienia: Wszystkie (sukces + błąd), Tylko błędy lub Wyłączone
• Ręczny Push, Pull i pełny Sync przez popup
• Wykrywanie konfliktów, gdy automatyczny merge nie jest możliwy
• Generowane pliki: README.md (przegląd), bookmarks.html (import do przeglądarki), feed.xml (kanał RSS 2.0) i dashy-conf.yml (panel Dashy) — każdy konfigurowalny jako Wyłączony, Ręczny lub Automatyczny
• Sync ustawień z Git: zaszyfrowana kopia zapasowa ustawień rozszerzenia w repozytorium — tryb Globalny (współdzielony) lub Indywidualny (per urządzenie); import ustawień z innych urządzeń; to samo hasło na każdym urządzeniu, automatycznie zsynchronizowane
• Opcje: 5 kart (GitHub, Sync, Pliki, Pomoc, O programie) z podkartami dla GitHub i Plików — przejrzysty interfejs ustawień
• Automatyzacja: dodawaj zakładki przez Git, CLI lub GitHub Actions — bez otwierania przeglądarki
• Import/Eksport: zakładki (JSON), konfiguracja Dashy (YAML) lub ustawienia (zwykły JSON / zaszyfrowany .enc); import z automatycznym wykrywaniem formatu
• Automatyczny zapis: wszystkie ustawienia zapisują się automatycznie po zmianie — bez przycisków Zapisz
• Motyw: jasny, ciemny lub automatyczny — przycisk cykliczny (A → Ciemny → Jasny → A) w opcjach i popup
• Głosowanie na backlog: ankieta społecznościowa do ustalania priorytetów kolejnych funkcji
• Wielojęzyczność: 12 języków — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL; ręczny wybór lub automatyczne wykrywanie
• Skróty klawiszowe: szybki Sync (Ctrl+Shift+.), otwórz ustawienia (Ctrl+Shift+,) — konfigurowalne
• Dziennik debugowania: karta Sync — włącz dla diagnostyki synchronizacji, eksportuj do rozwiązywania problemów
• Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży, synchronizacja tylko do odczytu z repozytorium
• Bez zewnętrznego serwera — komunikuje się bezpośrednio z API GitHub za pomocą Twojego Personal Access Token

Jak to działa:
1. Utwórz repozytorium GitHub na swoje zakładki
2. Wygeneruj Personal Access Token z uprawnieniem "repo"
3. Skonfiguruj GitSyncMarks z tokenem i repozytorium
4. Kliknij „Synchronizuj teraz" — gotowe!

Każda zakładka jest przechowywana jako osobny plik JSON w Twoim repozytorium, zorganizowany w foldery odzwierciedlające hierarchię zakładek Firefoksa (Pasek zakładek, Menu zakładek, Inne zakładki). README.md zapewnia przejrzysty przegląd bezpośrednio na GitHubie; bookmarks.html umożliwia import do dowolnej przeglądarki; feed.xml RSS umożliwia subskrypcję lub automatyzację; dashy-conf.yml dostarcza sekcje dla panelu Dashy.

Automatyzacja:
Możesz dodawać zakładki bez otwierania Firefoksa. GitSyncMarks zawiera workflow GitHub Actions (add-bookmark.yml), który pozwala dodawać zakładki przez interfejs webowy GitHub lub wiersz poleceń:

  gh workflow run add-bookmark.yml -f url="https://example.com" -f title="Example" -f folder="toolbar"

Możesz także tworzyć pliki zakładek bezpośrednio w repozytorium — po prostu dodaj plik JSON z "title" i "url" do dowolnego folderu zakładek. Rozszerzenie automatycznie wykryje nowe pliki przy następnej synchronizacji.

GitSyncMarks jest w pełni open source: https://github.com/d0dg3r/GitSyncMarks

Aplikacja mobilna: GitSyncMarks-Mobile (iOS + Android) — przeglądaj zakładki w podróży. Towarzysz tylko do odczytu; F-Droid i Google Play wkrótce. https://github.com/d0dg3r/GitSyncMarks-Mobile

### Categories
Zakładki

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
