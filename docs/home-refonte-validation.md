# Refonte de la Home publique EasyCom AI

La composition publique est entièrement remplacée sur PC et mobile : header compact, Hero crème avec Dov Ber dans un cercle violet, démonstration immédiatement après, cartes outils, cinq agents, tarif court, deux FAQ sur desktop, bandeau synagogue et footer légal. La carte « Boutique en ligne » est ajoutée à la demande complémentaire de l’utilisateur : six outils sur desktop, défilement horizontal sur mobile.

## Fichiers et parcours

- `src/app/page.tsx` : entrée et métadonnées de la Home.
- `src/components/home/easycom-home.tsx` et `easycom-home.css` : présentation et interactions isolées de la Home.
- `public/media/home/` : vidéos originales copiées, posters extraits et visuels propres à la Home ; portraits du dashboard conservés.
- `src/proxy.ts` : exclusion strictement limitée aux MP4 de `/media/home/`, auparavant redirigés vers la connexion. Les branches de session et les routes privées sont conservées.
- `scripts/test-proxy.ts` : vérifie que les MP4 publics sont servis directement et que les vidéos ou routes privées restent protégées.
- `tmp/home-visual-qa.cjs`, `tmp/home-qa/home-{1440,768,390}.png`, `tmp/home-qa/results.json` : contrôles navigateur et captures.

Connexion : `/auth/login`. Essai : `/auth/register`. Les aperçus existants sont conservés, avec `callbackUrl` vers l’outil choisi. La boutique ouvre l’aperçu public existant puis `/auth/register?callbackUrl=%2Fdashboard%2Fboutique`. L’annulation sans engagement est reprise du contenu Paiement/onboarding existant. Aucune modification de schéma, de dashboard, d’API ou de logique commerciale. Impact sur la base : 0/100.

## Médias

Vidéos utilisées :

| Emplacement | Fichier |
| --- | --- |
| Démonstration générale | `easycom-demo-master.mp4` |
| Publier partout | `02-dovber-publier-partout.mp4` |
| Newsletter papier | `04-levik-newsletter.mp4` |
| Horaires & automatisations | `07-david-automatisations.mp4` |
| Affiches & visuels | `03-zalman-affiches.mp4` |
| Cours de Torah | `08-shmouel-cours-torah.mp4` |

Les sources 01, 05, 06 et 09 sont également disponibles dans le dossier. Pas de fichier 10 fourni : le master utilisateur tient lieu de vidéo générale finale. Le master fourni dure 120 secondes et est vertical (1080 × 1920) ; aucun montage, encodage ou recadrage destructeur réalisé. Le lecteur le conserve sans l’étirer. Posters PC et mobile distincts, générés à partir de la vraie interface extraite des vidéos. Portraits Home Dov Ber, Levik, Zalman et Shmouel dérivés des personnages existants ; illustration synagogue générée dans la direction des références. Le logo existant est conservé : son symbole bulle/check diffère du logo jaune/violet des captures.

La vidéo générale se charge lorsque visible et démarre silencieusement si autorisé. Les previews ne reçoivent leur source qu’au survol ou au focus ; une seule est active, les extraits bouclent sur huit secondes. Pause hors viewport, dans un onglet masqué et pendant un aperçu ouvert. La pause volontaire est conservée. `prefers-reduced-motion` empêche le démarrage automatique et arrête les previews lorsque la préférence change.

## Vérifications

Playwright local autorisé par l’utilisateur : 1440, 768 et 390 px, densité 1, Chromium/Chrome headless dans un profil temporaire indépendant. Console : aucune erreur JavaScript sur les trois formats. Aucun débordement horizontal. Six cartes et cinq agents présents, FAQ absente du corps mobile. Menu avec Échap, accordéon, aperçus, retour du focus, callback newsletter/boutique, exclusivité des previews, lecture/pause/reprise et pause hors viewport vérifiés. Avec réduction des animations, aucune vidéo ne charge sa source au premier affichage. Contrôle complémentaire réussi : synchronisation du son entre contrôles natifs et bouton dédié, puis maintien de la pause volontaire après sortie et retour dans le viewport.

Lint des fichiers Home/proxy et du test proxy : réussi, sans avertissement. Lint global du code source : réussi, zéro erreur et 40 avertissements dans l’existant ; les dossiers générés `.netlify/`, `.codex/`, `.codex-local/` et `tmp/` sont exclus par arguments CLI, sans changement de configuration ni désactivation de règle. Tests `test:proxy` et `test:public-discovery` : réussis. Build : compilation et génération des 211 pages réussies. Le projet possède déjà `typescript.ignoreBuildErrors: true` ; cette option n’a pas été ajoutée ou modifiée. Le typecheck séparé signale sept diagnostics préexistants dans cinq fichiers métier, aucun dans les fichiers Home : donation-campaign/config, email/classify, donation-campaign/visuals, whatsapp-client et email/ai-settings. Les erreurs de ces fonctions restent hors périmètre.

## Comparaison visuelle restante

Les références sont les deux maquettes jointes dans la conversation et le prompt fourni. Les captures finales du navigateur ont été inspectées ; l’empiètement du titre mobile, les icônes de réseaux masquées et les portraits de rôles incorrects ont été corrigés. Une comparaison normalisée côte à côte avec les PNG sources n’a pas été effectuée, les fichiers PNG n’étant pas disponibles dans le workspace. La conformité visuelle à 100 % n’est donc pas certifiée. La sixième carte boutique est une extension explicitement demandée après le brief.

Aucun déploiement effectué. Serveur local : `http://localhost:3000`.
