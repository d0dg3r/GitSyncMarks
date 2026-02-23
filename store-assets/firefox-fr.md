# Firefox Add-ons (AMO) — GitSyncMarks (Français)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

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
• Menu contextuel : clic droit sur une page ou un lien — Ajouter à la barre de favoris, Ajouter aux autres favoris, Synchroniser maintenant, Copier l'URL du favicon, Télécharger le favicon
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
