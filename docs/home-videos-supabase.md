# Accueil : vidéos et portraits Supabase

Les vidéos de présentation utilisent les fichiers déjà déposés dans le bucket
`Video du site`, désormais public. Les sept sources des fonctions sont définies
dans `src/components/home/home-video-sources.json`. Chaque source a été vérifiée
sans authentification : HTTP 206, type vidéo et signature MP4.

Les cinq portraits et le Dov Ber du hero utilisent les fichiers originaux du
bucket `Image du site`. Aucun portrait généré n'est utilisé par ces éléments.
La rangée d'agents conserve cinq entrées. Les six fonctions vidéo restent dans
la rangée principale. Boutique en ligne et Affiche sont deux liens horizontaux
côte à côte en dessous, à gauche des flèches lorsqu'elles sont présentes.
La Boutique reste un lien direct externe ; Affiche ouvre `/affiches`, catalogue
public accessible sans connexion, avec le badge blanc « AI & Canva ».

## Remplacer la vidéo principale

Déposer **`Video general.mp4` à la racine du bucket `Video du site`**. Pour les
versions suivantes, remplacer ce même fichier en conservant son nom et son
emplacement. L'URL de base reste :

https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Video%20du%20site/Video%20general.mp4

L'accueil vérifie ce fichier à chaque requête, sans cache Next.js et avec un
paramètre de version renouvelé pour éviter une ancienne copie en cache. La
nouvelle version est utilisée après rechargement de la page. Le lecteur est
16:9, avec affichage intégral du contenu. Si le fichier est absent, inaccessible
ou ne présente pas une signature MP4 valide, la vidéo principale locale actuelle
reste utilisée. Le fichier `Video general.mp4` n'était pas encore présent lors
de la vérification de cette intervention.

## Vérification

- `npx tsx scripts/test-home-main-video.ts` : fichier stable, URLs fraîches,
  requêtes sans cache, validation MP4 et repli sur la vidéo actuelle.
- `node tmp/home-supabase-qa.cjs` : contrôle Playwright des cartes, portraits,
  lecteur 16:9, vidéos, fenêtres, callbacks, focus, flèches, gestes tactiles et
  accès direct à la Boutique. Résultats dans
  `tmp/home-qa/supabase-home-results.json`.
- ESLint ciblé et tests de découverte publique : réussis.
- TypeScript global : mêmes sept diagnostics préexistants dans les fichiers
  hors de cette intervention ; aucun nouveau diagnostic dans les fichiers modifiés.

La revalidation après remplacement du fichier principal est testée avec des
réponses simulées. Un remplacement réel de `Video general.mp4` reste à vérifier
après son premier dépôt. Aucun déploiement du site n'a été effectué.
