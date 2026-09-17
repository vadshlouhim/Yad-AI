# Images du dashboard — validation du 17 septembre 2026

## Modification locale

Les portraits d'agents de la sidebar et du carrousel mobile utilisent maintenant
`next/image` : dimensions explicites, `sizes` adapté aux boîtes CSS, qualité par
défaut 75 et chargement différé sans préchargement. Les tailles de la sidebar
sont exprimées en rem dans `sizes`, comme les classes CSS existantes ; le
carrousel reste à 94 px.

Les URL sources, classes CSS, proportions visuelles via `object-contain`, positions,
transparences, ombres et attributs d'accessibilité sont conservés. Aucun fichier
image, avatar, logo, bannière, règle de sécurité, configuration distante, API ou
type public n'a été modifié. Les changements précédents du proxy sont préservés.
Le guide Supabase a cadré la vérification de la source publique distante sans
intervention sur le stockage ou ses permissions.

## Contrôles terminés

- Lint ciblé des deux composants et des scripts de validation : réussi.
- `node scripts/test-dashboard-images.mjs` : réussi. Vérifie les composants réels
  par analyse JSX et les attributs générés par Next.js : dimensions, `sizes`, URL
  optimisée, accessibilité, chargement lazy, qualité 75, absence de préchargement.
- `npm run build` : réussi, 211 pages générées. La configuration préexistante
  ignore la validation des types ; ce build ne garantit pas un contrôle TypeScript global.
- Sur le serveur de production local, les dix portraits PNG référencés dans
  `AGENT_IMAGE_URLS` sont servis en WebP par `/_next/image`, avec réponse 200 aux
  largeurs 96, 256 et 384 px, dimensions proportionnelles et canal alpha conservé.
  Toutes ces variantes sont plus légères que leur original.

Exemple David, octets de corps HTTP reçus en local, avec `Accept: image/webp` et
requêtes sans cache client :

| Source / variante | Octets |
| --- | ---: |
| PNG original | 929 205 |
| WebP 96 × 144 | 4 922 |
| WebP 256 × 384 | 21 270 |
| WebP 384 × 576 | 39 178 |

Les largeurs testées correspondent aux candidats Next.js pour une carte de 94 px
à DPR 1, 2 et 3, et couvrent les besoins des portraits de sidebar jusqu'à DPR 3.
Ce sont des contrôles des fichiers servis, pas une mesure du poids total d'un
dashboard dans un navigateur, ni un gain de temps de chargement.

Commande reproductible :
`node scripts/check-dashboard-image-transfer.mjs http://127.0.0.1:3100`.
Le script affiche les octets et dimensions pour chaque portrait et renvoie un
code d'échec si une source manque ou une vérification échoue.

## Source distante Shlomi : anomalie existante

L'URL conservée dans `EASYCOM_AGENTS` renvoie directement HTTP 400 avec le corps
`statusCode: 404`, `Object not found`, `NoSuchKey`. L'optimiseur renvoie également
400 parce que la réponse de la source est invalide. L'image ne peut donc pas être
validée comme fonctionnelle actuellement ; le script HTTP complet échoue pour
cette raison. Ce constat existe sur la source elle-même, indépendamment du changement.
L'URL et le stockage n'ont pas été modifiés. Il faudra retrouver la bonne source
ou restaurer l'objet dans un chantier distinct avant une validation complète.

## Contrôles restants avant publication

Aucun navigateur n'était disponible dans cette session et aucun déploiement
Netlify n'a été effectué. Le serveur de développement reste disponible sur
`http://localhost:3000` pour les tests utilisateur.

1. Dans un navigateur connecté, comparer avant/après les octets transférés pour
   les portraits sur le même dashboard, cache désactivé, mobile et ordinateur.
   Vérifier `currentSrc` : les vignettes doivent utiliser l'optimiseur plutôt que
   télécharger directement les PNG. Le cache serveur peut rester actif.
2. Vérifier le rendu à DPR 1/2/3, transparence, cadrage, absence de déplacements,
   sidebar ouverte/repliée et carrousel après défilement, sur les deux interfaces
   responsive et les écrans démo qui réutilisent ces composants.
3. Valider en préversion Netlify les mêmes parcours et le premier accès aux images
   optimisées. Traiter et revérifier la source distante manquante avant de déclarer
   tous les portraits fonctionnels.
4. Publier seulement après validation, puis surveiller les erreurs de chargement
   des images. Aucun pourcentage de gain global ou temps précis n'est annoncé.
