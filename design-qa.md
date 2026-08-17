# Design QA — Accueil et assistant mobile « Studio dynamique »

- Source visuelle : PNG joint dans la conversation (aucun chemin de fichier local exposé)
- Implémentation : `http://localhost:3000/dashboard/overview`
- Assistant : `http://localhost:3000/dashboard/assistant?agent=dov`
- Viewports prévus : 320, 375, 390, 430, 767 et 768 px
- Source : 852 × 1876 px, interprétée comme une maquette @2x pour un viewport CSS proche de 426 × 938
- État : utilisateur connecté, accueil mobile, aucune fenêtre ouverte
- Capture d’implémentation : indisponible dans cette session

## Contrôles effectués

- Composition mobile isolée sous 768 px ; dashboard ordinateur conservé.
- Logo, profil, notifications et données des agents réutilisés sans mutation métier.
- Dix agents présents dans l’ordre des rubriques ; Avi puis Tsemah/Newsletter terminent le carrousel.
- La flèche fait défiler le carrousel et revient au début après le dernier agent.
- Les sept cartes ouvrent une fenêtre modale centrale associée à leur rubrique.
- Chaque en-tête de fenêtre reprend exactement la famille de couleurs de sa carte.
- Les intitulés des cartes utilisent une taille fluide, une largeur flexible et une disposition verticale sur les écrans les plus étroits.
- Les quatre boutons inférieurs sont remplacés sur l’accueil par un bouton unique « Menu principal ».
- Le bouton « Menu principal » déclenche le menu mobile existant et conserve toutes les routes actuelles.
- ESLint : aucune erreur sur les fichiers de l’accueil mobile ; quatre avertissements `<img>` préexistants dans `topbar.tsx`.
- TypeScript : aucune erreur dans les fichiers modifiés. Le contrôle global reste en échec sur des erreurs antérieures dans les modules dons et email, hors périmètre de cette refonte.

## Comparaison visuelle

La maquette source est visible dans la conversation, mais aucun navigateur pilotable n’est disponible dans cette session. La capture navigateur de l’implémentation, la comparaison côte à côte, les interactions réelles et la console ne peuvent donc pas être certifiées ici.

## Historique des corrections

1. Première intégration : cartes trop contraintes sur certaines largeurs, carrousel limité à trois agents et sous-menus en tiroir inférieur.
2. Correction : typographie fluide, adaptation verticale sous 360 px, dix agents ordonnés, flèche de défilement et fenêtres centrales colorées.
3. Correction : suppression complète des quatre boutons inférieurs et remplacement par un bouton unique « Menu principal ».
4. Refonte de l’assistant mobile : passage du slug de l’agent depuis l’accueil, portrait individuel, titre personnalisé, compétences rapides, en-tête et composer violets.
5. Conservation du chat existant : historique, nouvelle conversation, pièces jointes, dictée, validations, cartes d’action et réponses IA restent branchés sur leurs fonctions actuelles.

## Résultat

final result: blocked

Blocage : absence de navigateur pilotable et de capture authentifiée pour réaliser la comparaison visuelle obligatoire avec la maquette.
