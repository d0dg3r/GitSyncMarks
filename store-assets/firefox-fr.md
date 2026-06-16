# Firefox Add-ons (AMO) — GitSyncMarks (Français)
<!-- See firefox-meta.md for Privacy, Test Instructions, and Distribution -->

### Name
GitSyncMarks

### Summary (max 250 characters)
Sync favoris vers votre dépôt Git. Linkwarden, Smart Search, sauvegarde Bitwarden, assistant guidé. Bidirectionnel, sécurisé, privé. Support Firefox complet. Sans intermédiaire.

### Detailed Description
GitSyncMarks synchronise vos favoris de manière bidirectionnelle avec votre propre dépôt Git — grandes plateformes hébergées et serveurs Git auto-hébergés. Aucun intermédiaire, aucun serveur tiers – vos données restent entièrement sous votre contrôle.

Points forts

- Sync Git multi-fournisseur : Connectez votre hôte Git ou serveur auto-hébergé — chaque profil utilise son propre fournisseur et URL. Liste complète des fournisseurs : https://github.com/d0dg3r/GitSyncMarks/blob/main/docs/PROVIDERS.md
- Transfert de profil & miroirs push : Copiez les favoris entre profils (remplacer ou fusionner) ; remotes de sauvegarde push-only optionnels après chaque sync.
- Progression sync en direct : Texte d'étape pendant push, pull et changement de profil (ex. `3 / 12 fichiers` ou `1 sur 3` étapes).
- Sauvegarde compatible Bitwarden vers Git : Stockez des exports de coffre protégés par mot de passe dans votre dépôt, chiffrement supplémentaire optionnel ; lister, télécharger ou supprimer les sauvegardes distantes.
- Interface nested-card : Sections groupées plus claires dans Options, assistant, popup et recherche.
- Historique sync & restauration : Parcourez les commits passés, prévisualisez les changements via diff et restaurez tout état antérieur en un clic.
- Nettoyage orphelins distants : Prévisualisez et supprimez les fichiers de favoris distants qui n'existent plus localement.
- Synergie Linkwarden : Sauvegardez pages ou liens vers votre instance Linkwarden — captures viewport, sync collections et tags prédéfinis.
- Smart Search : Recherche de favoris dédiée et ultra-rapide avec thèmes clair/sombre et navigation clavier complète.
- Assistant de configuration guidé : Le test de connexion valide uniquement l'accès ; vous choisissez pull, merge/sync, push, configuration dossiers ou ignorer — avec confirmation avant toute écriture.
- Performance Git auto-hébergé : Lectures git tree + blob rapides et pushes single-commit sur hôtes compatibles (fallback Contents API si nécessaire).
- Menu contextuel : Dossiers rapides, popup recherche favoris, Ouvrir tout du dossier, copie/téléchargement favicon et actions profil au clic droit.
- Sync paramètres vers Git : Sauvegarde chiffrée des paramètres (`settings.enc`) dans votre dépôt — partagez la configuration entre appareils.

Fonctionnalités clés

- Confidentialité by design : Communication directe avec l'API de votre fournisseur Git. Aucun tiers ne voit vos données.
- Optimisé Firefox : Prend en charge les structures natives (Barre d'outils, Menu, Autres).
- Fusion three-way : Sync de qualité industrielle gérant automatiquement les changements concurrents sur plusieurs appareils.
- Stockage par fichier : Chaque favori est un fichier JSON lisible – idéal pour le versionnage et l'édition manuelle.
- Profils multiples : Jusqu'à 10 profils distincts (travail, perso, projets), chacun avec son dépôt.
- Automatisation : Ajoutez du JSON de favoris à votre dépôt via git ou le modèle d'action GitHub inclus ; l'extension les importe au prochain sync.
- Fichiers générés : README.md (aperçu), bookmarks.html (import), flux RSS et dashy-conf.yml — optionnel par fichier.
- Design & i18n : Thèmes clair, sombre et auto-système ; densité UI ajustable (compact / moyen / large) ; 12 langues.

Application compagnon
Utilisez GitSyncMarks-App (mobile et bureau) pour gérer vos favoris directement depuis votre dépôt Git. (Note : Firefox pour Android ne prend pas en charge la sync directe des favoris via extensions – utilisez l'app.)

GitSyncMarks est Open Source : https://github.com/d0dg3r/GitSyncMarks

### Categories
Bookmarks

### Tags
favoris, sync, github, gitlab, sauvegarde, automatisation
