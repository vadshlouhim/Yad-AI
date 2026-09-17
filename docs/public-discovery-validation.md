# Accueil public : implémentation et validation

Date : 17 septembre 2026.

## Périmètre livré

- Accueil sombre et cyan : bandeau compact, animation de 14 secondes, trois outils phares, catalogue de 25 outils, quatre services complémentaires, bloc Prochainement, FAQ et pied de page.
- Aperçus fictifs uniquement : aucune génération, publication, sauvegarde ou donnée client. Catalogue statique indépendant des données privées du dashboard.
- Portraits locaux optimisés avec Next/Image ; aucune dépendance au portrait distant de Shlomi. Aucun fichier vidéo ou nouvelle bibliothèque d'animation.
- Aperçus en fenêtre chargés à leur ouverture. Pause/relecture, arrêt hors écran ou onglet masqué, pause du bandeau lorsqu'une fenêtre est ouverte, réduction des mouvements avec lecture volontaire.
- Destination choisie transmise par callbackUrl dans l'inscription, la connexion, le callback email/Google et l'onboarding. Liste autorisée de destinations du catalogue ; contrôle renforcé des redirections relatives.
- Autorisations métier, API, RLS, schéma et fichiers originaux des portraits inchangés. Optimisations précédentes du proxy et des images conservées.

## Vérifications automatisées

- `npm run test:public-discovery` : réussi. Catalogue, routes et portraits existants, destinations autorisées/interdites, comportement du lecteur via simulation déterministe des hooks, callback réel avec échange de session simulé et transfert des cookies, absence d'appels métier dans les aperçus.
- `npx tsx scripts/test-proxy.ts` : réussi. Pages publiques sans Auth, panne simulée, redirections, cookies, routes privées, OAuth, démos, API et matcher.
- `node scripts/test-dashboard-images.mjs` : réussi.
- ESLint ciblé sur les fichiers de ce chantier : réussi.
- `npm run build` : réussi, 211 pages générées. La configuration existante ignore les erreurs de types pendant le build ; un contrôle TypeScript distinct a donc été exécuté.
- TypeScript complet : échec sur les erreurs préexistantes de `api/donation-campaign/config`, `api/email/classify`, `dashboard/donation-campaign/visuals`, `whatsapp-client` et `lib/email/ai-settings`. Aucune erreur signalée dans les nouveaux fichiers ou modifications de ce chantier.
- HTTP en production locale : accueil, méthode, contact et inscription avec destination répondent 200. Dashboard newsletter, admin et onboarding redirigent les anonymes vers la connexion (307). Démo sans accès autorisé : 404.

Les tests du callback utilisent des dépendances Auth simulées. Ils ne constituent pas un essai réel de confirmation email, de connexion Google ou de création d'une communauté.

## Mesures avant/après en production locale

Même machine, serveur Next en production sur `127.0.0.1:3100`. Poids décodés des réponses HTTP : ne comprend pas CSS, images, compression réseau ni chargements ultérieurs. JavaScript : somme des URL uniques de scripts présentes dans le HTML initial.

| Mesure accueil | Avant | Après |
| --- | ---: | ---: |
| HTML, octets | 95 226 | 104 646 |
| JavaScript initial, octets | 671 616 | 687 152 |
| Nombre de scripts initiaux | 11 | 11 |

Le JavaScript initial augmente de 15 536 octets pour la découverte interactive. Aucun gain de poids initial n'est annoncé.

TTFB : 20 requêtes par page, après trois requêtes de chauffe, avec le script `scripts/benchmark-public-ttfb.mjs`.

| Page | Médiane avant / après (ms) | P95 avant / après (ms) |
| --- | ---: | ---: |
| Accueil | 6,07 / 5,35 | 9,31 / 7,90 |
| Méthode | 4,57 / 4,56 | 6,58 / 6,97 |
| Contact | 3,89 / 3,68 | 5,02 / 4,52 |

Ces faibles écarts locaux ne prouvent pas un gain utilisateur. Aucun test de navigateur mobile, LCP, INP, transfert total ou réseau ralenti n'a pu être réalisé.

## Validations manuelles encore nécessaires

Le navigateur intégré n'était pas disponible dans cet environnement. Aucune validation visuelle, au clavier ou de focus n'est revendiquée. Aucun déploiement Netlify ni publication en production n'a été effectué.

1. Ouvrir `http://localhost:3000`, vérifier ordinateur et mobile, transparence/cadrage des portraits, défilement et absence de déplacement de mise en page.
2. Ouvrir chaque carte ; tester pause, relecture, étapes, fermeture avec Échap, retour du focus et défilement du dialogue sur petit écran.
3. Faire défiler le bandeau hors écran, changer d'onglet, ouvrir un aperçu et activer la réduction des mouvements : vérifier qu'une seule animation tourne à la fois et que la lecture volontaire reste possible.
4. Sans compte, choisir Newsletter puis Utiliser cet outil. Tester réellement inscription email avec confirmation, connexion Google, connexion par mot de passe et onboarding : arriver ensuite dans `/dashboard/newsletter`. Répéter avec un autre outil et sans destination pour vérifier les parcours par défaut.
5. Avec un compte existant, répéter avec et sans communauté configurée. Tester une session renouvelable et les redirections invalides ; aucun accès anonyme aux fonctions réelles ne doit être autorisé.
6. Sur une préversion Netlify : vérifier images optimisées au premier accès, chargement différé des fenêtres, console/réseau, parcours Auth et mesures mobiles de production. Valider avant toute publication.

## Fichiers principaux

- `src/app/page.tsx`, `src/components/home/public-tool-discovery.tsx` : accueil.
- `src/lib/public-tools.ts` : catalogue et destinations publiques autorisées.
- `src/components/home/animated-tool-preview.tsx`, `use-preview-playback.ts`, `preview-animation.css`, `tool-preview-dialog.tsx` : animations et fenêtres.
- Formulaires Auth, callback, helpers de redirection, onboarding, layout dashboard et proxy : conservation de la destination sans modifier les protections métier.
- `scripts/test-public-discovery.ts` et `scripts/test-proxy.ts` : tests de non-régression.
