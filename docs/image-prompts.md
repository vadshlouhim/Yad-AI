# Personnalisation des affiches

## Parcours utilisateur

1. L'utilisateur choisit une image template.
2. Il décrit librement les textes à changer : titre, date, heure, lieu, personnes invitées ou appel à l'action.
3. Gemini 2.5 Flash analyse simultanément le template et la demande, même lorsque le template ne contient aucun champ prédéfini.
4. L'application présente une synthèse, les anciens textes à nettoyer, les contenus finaux, le plan d'édition adapté à l'image et les éventuelles informations manquantes.
5. L'utilisateur corrige si nécessaire puis confirme.
6. fal.ai reçoit l'image originale et uniquement les changements confirmés.
7. L'affiche produite est enregistrée dans Supabase Storage et proposée au téléchargement.

La personnalisation ne dépend plus de coordonnées, de zones de texte ou d'un rendu Sharp.

## Compréhension avec Gemini

Le modèle utilisé via OpenRouter est `google/gemini-2.5-flash`. Sa réponse est un JSON structuré contenant :

- un résumé compréhensible par l'utilisateur ;
- les contenus finaux sous la forme `label`, `currentText`, `newText`, avec `currentText` vide si aucun texte correspondant n'existe ;
- les anciens textes événementiels à retirer pour éviter les doublons ;
- un plan d'édition propre à la composition du template ;
- les éléments visuels qui doivent rester inchangés ;
- les informations manquantes à demander avant génération.

Gemini ne doit pas inventer de date, d'heure, de lieu ou de nom. Tant qu'une information requise manque, le bouton de génération reste indisponible.

## Modification avec fal.ai

Le modèle utilisé est `xai/grok-imagine-image/quality/edit`. L'appel serveur fournit le template dans `image_urls` et une consigne stricte construite depuis les changements confirmés.

La consigne impose de :

- conserver le cadrage, la composition, le fond, les couleurs et la hiérarchie ;
- préserver les photos, visages, logos, illustrations et décorations ;
- nettoyer les anciens textes événementiels qui entreraient en conflit avec le nouveau contenu ;
- remplacer les textes détectés ou ajouter les informations si aucun champ correspondant n'existe ;
- n'afficher chaque nouvelle information qu'une seule fois et ne jamais conserver simultanément l'ancienne version ;
- respecter la langue, les accents, les noms propres, les chiffres et le sens droite-à-gauche de l'hébreu ;
- ne rien ajouter et ne rien supprimer en dehors des remplacements demandés.

Le secret `FAL_KEY` reste exclusivement côté serveur. Le navigateur ne contacte jamais fal.ai directement.

## Limite importante

Un modèle génératif peut parfois altérer légèrement un détail ou rendre imparfaitement une typographie. La comparaison avant/après et la confirmation explicite réduisent les erreurs fonctionnelles, mais une vérification visuelle du résultat reste nécessaire avant publication.
