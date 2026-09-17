# Accueil — présentation de la plateforme mobile

## Implémentation

Références : les sept captures mobiles fournies dans la conversation (publication, affiches, newsletter, accueil). Le chrome Android n'est pas reproduit. Les informations, photos et coordonnées des captures ne sont pas importées.

- Accueil crème/violet, typographie épaisse, arrondis et cartes colorées issus du dashboard mobile. Variante de navigation et de pied de page activée uniquement sur l'accueil.
- Catalogue public et parcours d'inscription existants conservés : 25 outils, quatre services et annonces non interactives. Dov accompagne désormais les outils sociaux, conformément aux captures.
- Styles des bandeaux dashboard mobile, banque d'affiches et newsletter extraits sans changer leurs classes. Les interactions et appels métier de ces composants ne sont pas modifiés.
- Démonstration principale de 20 secondes : accueil (0–3 s), affiche (3–8 s), diffusion (8–13 s), newsletter (13–18 s), résultats (18–20 s).
- Vues natives de présentation en lecture seule : sélection simulée, saisie progressive, préparation et résultat. Aucun montage des composants métier complets. Les étapes secondaires durent 10 secondes et leur code est chargé avec la fenêtre à son ouverture.
- Pause/relecture, étapes sélectionnables, arrêt hors écran et onglet masqué, pause du bandeau avec une fenêtre ouverte, réduction des mouvements et lecture volontaire. Défilement guidé dans un viewport fixe ; le geste de défilement manuel met la lecture en pause.
- Les aperçus secondaires reprennent les besoins et éléments visuels des outils avec des exemples locaux ; leur fidélité à chaque écran réel reste à contrôler visuellement.

## Sécurité et données

Impact base réel : 0/100. Aucune migration, aucun changement de schéma, de RLS, d'API métier ou du parcours Auth pendant cette refonte. Aucun appel réseau métier dans les modules de présentation. Les écrans simulés ne contiennent aucun bouton, champ ou formulaire métier actif. Aucun succès de publication réelle n'est affiché.

Les optimisations précédentes du proxy et des portraits sont conservées. Les changements déjà présents dans l'espace de travail n'ont pas été réinitialisés.

## Asset d'affiche

Fichier : `public/presentation/chabbat-demo.png`, 1054 × 1492 pixels, 2 016 690 octets pour l'original local. Affichage via Next/Image avec dimensions, sizes et chargement différé ; aucun téléchargement PNG pleine taille demandé par les composants.

La variante a été créée avec l'outil intégré imagegen à partir de l'affiche fournie, puis inspectée. L'original fourni n'a pas été remplacé. Le lieu et la communauté sont fictifs ; les horaires de bougies/prière et les tarifs ont été retirés. La variante n'est pas présentée comme une génération effectuée par la plateforme.

Prompt utilisé :

> Use case: text-localization. Edit target: the last attached portrait poster for Repas de Chabbat communautaire. This is an asset for a read-only fictional product demonstration in a website, not a new flyer publication. Preserve the exact overall visual composition, food photography, candles, wine, cream and burgundy/gold palette, typography hierarchy and elegant print style. Change text only: keep heading 'Repas de Chabbat communautaire'; replace the occasion subtitle with 'Un moment à partager'; replace date ribbon with 'Vendredi soir · 19 h 30'; replace real community and address with 'Communauté de démonstration' and 'Lieu fictif'; remove the candle-lighting time and prayer timetable completely and replace that area with one elegant sentence 'Retrouvons-nous pour un repas convivial.'; remove the price circle and replace its text with 'Exemple fictif'. Add small discreet bottom label 'Démonstration · aucune réservation réelle'. No real personal contact details, no invented religious times, no logos, no other changes. Deliver one polished portrait raster asset retaining the reference faithfully.

## Tests

- `npm run test:public-discovery` : réussi ; chemins et retours Auth, callback simulé, refus des destinations invalides, lecture 20/10 secondes, pause/relecture, réduction des mouvements, palette partagée, rendu serveur des 25 outils sur trois étapes et trois progressions, absence de contrôles métier actifs et de données des captures.
- `npm run test:proxy` : réussi.
- `node scripts/test-dashboard-images.mjs` : réussi.
- Lint ciblé : réussi après correction du contrôle de défilement.
- TypeScript complet final (`npx tsc --noEmit --incremental false`) : échec avec sept diagnostics préexistants dans cinq fichiers — donation-campaign/config (ligne 467), email/classify (161), donation-campaign/visuals (64), whatsapp-client (828) et email/ai-settings (103). Aucun diagnostic dans les nouveaux fichiers ni dans les composants modifiés pour cette refonte. Ces erreurs hors périmètre n'ont pas été corrigées.
- Build de production final : réussi après les derniers ajustements du cadrage ; 211 pages générées. Le build ignore TypeScript selon la configuration existante, d'où le contrôle séparé.

## Validation visuelle et publication

`design-qa.md` : final result: blocked. Aucun navigateur connecté n'a pu être sélectionné. Les captures sources et l'affiche générée sont inspectées, mais le rendu réel n'a pas pu être capturé/comparé. Ne pas assimiler compilation, HTML statique ou HTTP 200 à une validation visuelle.

Restent à faire : comparaison des captures aux largeurs 390/768/1440 px, gestes et focus au clavier, console/réseau, parcours email/Google réels et tests mobiles de performance. Aucun outil Netlify disponible ; aucune préversion ni publication effectuée.

### Mesures locales de production

Même environnement, serveur production local port 3100 ; poids décodés, sans CSS/images/compression ni mesure des ressources chargées après interaction :

| Ressource initiale | Avant cette refonte | Après |
| --- | ---: | ---: |
| HTML | 104 646 octets | 99 023 octets |
| Scripts | 11 | 12 |
| JavaScript | 687 152 octets | 709 123 octets |

Le JavaScript initial augmente de 21 971 octets (environ 3,2 %). Aucun gain de performance mobile revendiqué ; le bilan réseau total, CSS, images et comportement mobile restent à mesurer dans un navigateur.

Optimiseur testé avec `/_next/image?url=%2Fpresentation%2Fchabbat-demo.png&w=640&q=75` et `Accept: image/webp` : HTTP 200, `image/webp`, 71 590 octets. Cette mesure concerne uniquement ce format/largeur, pas le poids total des images sur mobile.

Contrôles HTTP anonymes : accueil, méthode, contact et inscription avec callback interne répondent 200 ; dashboard, admin et onboarding répondent 307 vers la connexion ; démo privée répond 404. Le serveur de développement port 3000 répond également 200 et reste disponible pour essais locaux. Ces contrôles ne remplacent pas les parcours Auth réels ni les interactions au clavier.

TTFB approché par les en-têtes Node fetch, 20 requêtes par page après trois échauffements : accueil médiane 15,96 ms / p95 20,14 ms ; méthode 14,15 / 17,11 ms ; contact 11,61 / 13,08 ms. Le contrôle TypeScript et le serveur de développement tournaient en parallèle : ces valeurs ne constituent pas une comparaison isolée avant/après ni une mesure mobile.
