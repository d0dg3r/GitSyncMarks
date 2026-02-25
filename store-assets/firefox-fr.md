# Firefox Add-ons (AMO) — GitSyncMarks (Français)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Synchronisez vos favoris Firefox avec GitHub — bidirectionnel, sans conflit. Stockage JSON par fichier, fusion triple, auto-sync. Prise en charge complète de la Barre des favoris, du Menu et Mobile. Ajoutez des favoris via Git, CLI ou GitHub Actions. Open source, sans intermédiaire.

### Detailed Description
GitSyncMarks synchronise vos favoris Firefox avec un dépôt GitHub — bidirectionnel, automatique et sans intermédiaire.

Fonctionnalités :
• Sans intermédiaire : communique directement avec l'API GitHub — pas de serveur tiers, pas de backend, vos données restent entre votre navigateur et GitHub
• Stockage par fichier : chaque favori est un fichier JSON individuel — lisible et adapté au diff
• Fusion triple : synchronisation automatique sans conflit
• Support complet Firefox y compris le Menu favoris
• Auto-sync à chaque modification de favori (délai configurable par profil)
• Plusieurs profils de favoris : jusqu'à 10 profils avec des dépôts GitHub séparés
• Menu contextuel : clic droit sur une page ou un lien — Ajouter à la barre de favoris, Ajouter aux autres favoris, Synchroniser maintenant, Changer de profil, Copier l'URL du favicon, Télécharger le favicon
• Outils favicon : copiez l'URL du favicon d'un site dans le presse-papiers ou téléchargez-le en PNG — utilise le favicon du navigateur avec le service Google comme solution de repli
• Automatisation : ajouter des favoris via Git, CLI ou GitHub Actions — sans ouvrir le navigateur
• Dossier Repos GitHub : dossier optionnel avec des favoris vers tous vos dépôts GitHub
• Profils de sync : temps réel, fréquent, normal ou économie d'énergie
• Sync au démarrage / au focus : sync optionnel au lancement du navigateur ou au retour à la fenêtre
• Sync périodique pour détecter les changements distants (1–120 minutes, configurable)
• Push, Pull et Sync complet manuels via le popup
• Détection des conflits lorsque la fusion automatique est impossible
• Fichiers générés : README.md, bookmarks.html, feed.xml et dashy-conf.yml — chacun configurable comme Désactivé, Manuel ou Auto
• Sync des paramètres avec Git : sauvegarde chiffrée dans le dépôt — mode Global ou Individuel (par appareil)
• Import/Export : favoris (JSON), configuration Dashy (YAML) ou paramètres (JSON / .enc chiffré)
• Réinitialisation complète : « Réinitialiser toutes les données » dans Fichiers → Paramètres — efface tous les profils, jetons et paramètres (les favoris du navigateur sont conservés) ; confirmation en deux étapes
• Assistant de configuration : intégration guidée en 8 étapes pour le token, le dépôt et la première synchronisation
• Intégration : navigateur de dossiers pour sélectionner le chemin de sync ; créer le dossier ou récupérer les favoris lors de la configuration d'un nouveau profil
• Multilingue : 12 langues — EN, DE, FR, ES, PT-BR, IT, JA, ZH-CN, KO, RU, TR, PL
• Raccourcis clavier : sync rapide, paramètres — personnalisables
• Thème : clair, sombre ou auto — bouton cycle (A → Sombre → Clair → A)
• Options : 5 onglets (GitHub, Sync, Fichiers, Aide, À propos) avec sous-onglets pour GitHub et Fichiers
• Notifications : Tout (succès + erreur), Erreurs uniquement, ou Désactivé
• Enregistrement automatique : tous les paramètres se sauvegardent à la modification — pas de bouton Enregistrer
• Journal de débogage : onglet Sync — pour le dépannage de sync
• Vote backlog : sondage communautaire pour prioriser les prochaines fonctionnalités
• Application mobile : GitSyncMarks-Mobile (iOS + Android)

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
