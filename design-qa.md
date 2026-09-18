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

---

# Refonte Home — validation du 18 septembre 2026

Source visual truth path : deux maquettes desktop/mobile jointes dans la conversation et prompt maître utilisateur. PNG desktop affiché 846 × 1859 ; mobile original 724 × 2172, affiché 683 × 2048. Le cadre iPhone est exclu du produit selon le brief.

Implementation screenshot path : tmp/home-qa/home-1440.png (1440 × 2886), home-768.png (768 × 2720), home-390.png (390 × 1524). Viewports CSS : 1440/768/390 × 1000, deviceScaleFactor 1. État : début de page, menus et FAQ fermés, posters visibles, réduction des animations activée pour les captures. Le widget de développement Next est masqué uniquement pour les captures.

Full-view comparison evidence : captures réelles ouvertes et inspectées. Les références inline et les captures ont été examinées séparément ; aucune composition côte à côte normalisée n’a été créée. Focused region comparison evidence : Hero mobile, cartes, portraits et bandeau final inspectés dans la capture 390 px. Cette inspection ne certifie pas une conformité à 100 % aux PNG.

Surfaces : typographie Arial, titres lourds et texte compact ; grille de six outils suite à la demande boutique et agents compacts ; crème/violet et bleu/corail/rose/turquoise avec couleurs mobile légèrement assombries pour contraste ; portraits Home dérivés, posters produit et synagogue inspectés ; textes exacts du brief, rôles compacts et FAQ reprise de l’existant. Symbole de marque existant conservé, différent du jaune/violet de la maquette.

Historique : premier rendu avait empiètement Hero mobile, icônes réseaux masquées et portraits email/tablette au lieu des rôles visuels. Corrections : titre en lignes explicites, portrait décalé, glyphes dérivés des SVG existants, portraits newsletter/affiche/livre adaptés. Recaptures aux mêmes largeurs ; aucun débordement horizontal détecté. Ces corrections sont fondées sur inspection du rendu ; la comparaison source/rendu dans une même image reste à réaliser.

Interactions testées dans le navigateur autorisé : menu et Échap, accordéon, aperçu public, restauration du focus, callbacks newsletter et boutique, une seule preview, source différée, lecture/pause/relecture, pause hors viewport et changement de préférence de mouvement. Console : zéro erreur JavaScript. Résultats : tmp/home-qa/results.json. Build et lint Home/proxy réussis ; typecheck global bloqué par sept erreurs métier préexistantes.

Blocage restant : comparaison normalisée côte à côte avec les PNG source. Les vérifications fonctionnelles navigateur sont réussies ; la validation comparative visuelle complète reste ouverte. Bilan et fichiers détaillés : docs/home-refonte-validation.md.

final result: blocked
