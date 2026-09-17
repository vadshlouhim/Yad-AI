# Validation visuelle — accueil de présentation

## Références et états

Source visual truth path : sept captures jointes par l'utilisateur dans cette conversation : deux écrans Publier partout, deux écrans Banque d'affiches, deux écrans Newsletter Chabbat et un écran Accueil mobile.

Sources : 1080 × 2400 pixels, affichées dans la conversation à 922 × 2048 pixels. La densité CSS du téléphone n'est pas fournie. La barre Android, l'heure, les données personnelles et les photos des captures ne font pas partie de l'interface publique à reproduire.

Implementation screenshot path : indisponible.

Viewport prévu : 390, 768 et 1440 pixels de largeur. Normalisation et deviceScaleFactor : non exécutés faute de capture navigateur.

États à comparer : bandeau et cartes de l'accueil ; sélection/personnalisation/aperçu d'une affiche ; texte et sélection des canaux ; rubriques/contenu/aperçu du feuillet ; fenêtres ouvertes et contrôles de lecture.

## Findings

Blocage de validation : aucun navigateur connecté au runtime disponible. Les captures de référence sont visibles, mais aucune capture du rendu local ne peut être obtenue. Le code, les tests et les réponses HTTP ne constituent pas une validation visuelle.

Full-view comparison evidence : indisponible. Focused region comparison evidence : indisponible. Aucun constat de fidélité pixel à pixel, d'absence de débordement ou de qualité responsive n'est revendiqué.

## Surfaces de fidélité requises

- Typographie : styles existants réutilisés ; tailles, retours à la ligne et rendu réel non comparés.
- Espacement et rythme : arrondis et ombres partagés avec le dashboard ; cadrage réel et débordements non comparés.
- Couleurs et tokens : fond crème, violet et couleurs des modules issus du code existant ; contraste et perception du rendu non vérifiés en navigateur.
- Images : portraits locaux réutilisés et affiche dérivée fournie via imagegen, inspectée séparément. Cadrage, netteté en contexte et comparaison de l'interface non vérifiés.
- Texte : exemples fictifs et libellés des outils ; lisibilité et correspondance visuelle non comparées.

## Historique de comparaison

Aucune comparaison visuelle source/rendu n'a pu être réalisée. Pas de classification P0/P1/P2 fondée sur une comparaison inexistante. Les corrections de code et tests ne sont pas des itérations de QA visuelle.

## Implementation checklist

1. Connecter un navigateur et ouvrir l'accueil local.
2. Capturer les états aux trois largeurs prévues, normaliser les captures sources sans le chrome Android et comparer chaque paire dans la même vue.
3. Vérifier les cartes, Échap, retour du focus, pause/relecture, onglet masqué, sortie du viewport et réduction des mouvements ; vérifier console et réseau.
4. Corriger toute différence P0/P1/P2, capturer à nouveau et mettre à jour ce rapport.
5. Valider en préversion Netlify avant toute publication. Aucun déploiement réalisé.

final result: blocked
