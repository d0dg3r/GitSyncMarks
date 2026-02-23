# Chrome Web Store — GitSyncMarks (Français)
<!-- See chrome-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 132 characters)
Vos favoris, en sécurité sur GitHub — stockage par fichier, synchronisation à fusion triple, Chrome et Firefox. Sans intermédiaire.

### Detailed Description
GitSyncMarks synchronise vos favoris de navigateur avec un dépôt GitHub — bidirectionnel, automatique et sans intermédiaire.

Fonctionnalités :
• Sans intermédiaire : communique directement avec l'API GitHub — pas de serveur tiers, pas de backend, vos données restent entre votre navigateur et GitHub
• Stockage par fichier : chaque favori est un fichier JSON individuel — lisible et adapté au diff
• Fusion triple : synchronisation automatique sans conflit lorsque des changements surviennent des deux côtés
• Multi-navigateur : fonctionne avec Chrome, Chromium, Brave, Edge et Firefox
• Auto-sync à chaque modification de favori (délai configurable par profil)
• Plusieurs profils de favoris : jusqu'à 10 profils avec des dépôts GitHub séparés ; le changement remplace les favoris locaux
• Menu contextuel : clic droit sur une page ou un lien — Ajouter à la barre de favoris, Ajouter aux autres favoris, Synchroniser maintenant, Changer de profil, Copier l'URL du favicon, Télécharger le favicon
• Outils favicon : copiez l'URL du favicon d'un site dans le presse-papiers ou téléchargez-le en PNG — utilise le favicon du navigateur avec le service Google comme solution de repli
• Automatisation : ajouter des favoris via Git, CLI ou GitHub Actions — sans ouvrir le navigateur
• Dossier Repos GitHub : dossier optionnel avec des favoris vers tous vos dépôts GitHub (publics et privés)
• Profils de sync : temps réel, fréquent, normal ou économie d'énergie (intervalles prédéfinis)
• Sync au démarrage / au focus : sync optionnel au lancement du navigateur ou au retour à la fenêtre (avec délai)
• Sync périodique pour détecter les changements distants (1–120 minutes, configurable)
• Push, Pull et Sync complet manuels via le popup
• Détection des conflits lorsque la fusion automatique est impossible
• Fichiers générés : README.md (aperçu), bookmarks.html (import navigateur), feed.xml (flux RSS 2.0) et dashy-conf.yml (tableau de bord Dashy) — chacun configurable comme Désactivé, Manuel ou Auto
• Sync des paramètres avec Git : sauvegarde chiffrée des paramètres de l'extension dans le dépôt — mode Global (partagé) ou Individuel (par appareil) ; import depuis d'autres appareils ; même mot de passe, synchronisé automatiquement
• Import/Export : favoris (JSON), configuration Dashy (YAML) ou paramètres (JSON / .enc chiffré) ; import avec détection automatique du format
• Intégration : créer le dossier ou récupérer les favoris lors de la configuration d'un nouveau profil
• Multilingue : 12 langues — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL ; sélection manuelle ou auto-détection
• Raccourcis clavier : sync rapide, paramètres — personnalisables
• Thème : clair, sombre ou auto — bouton cycle (A → Sombre → Clair → A) dans les options et le popup
• Options : 5 onglets (GitHub, Sync, Fichiers, Aide, À propos) avec sous-onglets pour GitHub et Fichiers
• Notifications : Tout (succès + erreur), Erreurs uniquement, ou Désactivé
• Enregistrement automatique : tous les paramètres se sauvegardent à la modification — pas de bouton Enregistrer
• Journal de débogage : onglet Sync — pour le dépannage de sync
• Vote backlog : sondage communautaire pour prioriser les prochaines fonctionnalités
• Application mobile : GitSyncMarks-Mobile (iOS + Android) — consultez vos favoris en déplacement

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
