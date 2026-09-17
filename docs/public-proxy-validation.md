# Optimisation du proxy public — validation du 17 septembre 2026

## Changement livré localement

Les routes de la liste publique existante quittent le proxy avant la configuration
Supabase et `updateSession()`, sauf les chemins exacts `/auth/login` et
`/auth/register`. Ces deux pages conservent la vérification d'identité et la
destination actuelle des utilisateurs connectés.

Les redirections issues de la réponse de session transfèrent tous ses cookies
(avec leurs attributs) et les en-têtes `cache-control`, `expires`, `pragma` présents.
Cela couvre également la redirection d'un visiteur non authentifié depuis une
route privée. Aucun autre en-tête du proxy n'est transféré vers la redirection.

La liste publique, le matcher, les branches démo/entrée démo/API, `requireAuth()`,
les permissions dashboard, les règles RLS et la base restent inchangés. Aucune
session globale n'est mise en cache ; un cookie seul ne prouve pas une identité.

## Tests

- `npm run test:proxy` : réussi. Exécution du vrai fichier proxy, avec dépendances
  isolées et vraies requêtes/réponses Next.js, sans réseau ni sessions réelles.
- Toutes les familles publiques existantes sont testées avec et sans cookie,
  avec `updateSession()` configuré pour lever une erreur : zéro appel Auth.
- Connexion/inscription : formulaire anonyme, redirection d'un utilisateur
  vérifié, destination par défaut et `callbackUrl`, cookies renouvelés en plusieurs
  morceaux et attributs conservés, en-têtes de cache conservés.
- Dashboard/admin/onboarding et chemins inconnus : refus anonyme, même avec
  cookie non vérifié ; passage de l'utilisateur vérifié ; configuration absente
  et panne Auth ne permettent pas de contourner la vérification.
- Callbacks publics, APIs et protections démo : branchement du proxy vérifié.
  Le matcher est vérifié inchangé.
- `npx eslint src/proxy.ts scripts/test-proxy.ts scripts/benchmark-public-ttfb.mjs` : réussi.
- `npm run build` : réussi avant et après, 211 pages générées. La configuration
  existante du build ignore la validation TypeScript ; le build n'est donc pas une
  preuve de validation complète des types.
- Vérification TypeScript globale : première tentative interrompue par la limite
  mémoire Node ; deuxième tentative avec 8 Go de heap terminée avec des erreurs
  dans des fichiers non modifiés (donation-campaign/config, email/classify,
  donation-campaign/visuals, whatsapp-client et email/ai-settings). Aucune erreur
  signalée dans le proxy ou le nouveau test. Ces problèmes hors périmètre n'ont
  pas été corrigés.
- Vérification HTTP sur le serveur de production local après modification :
  `/auth/login` et `/auth/register` → 200 ; `/dashboard`, `/admin`, `/onboarding`
  → 307 vers login avec `callbackUrl` ; `/demo` sans cookie → 404.

Les simulations de session renouvelée vérifient le transfert de la réponse,
pas un renouvellement réel auprès de Supabase. Les connexions authentifiées,
OAuth complet et renouvellements réels restent à valider en préversion.

## Mesures avant/après

Même machine, Node/Next.js et origine `http://127.0.0.1:3100`, deux builds de
production, serveur redémarré entre versions. Trois requêtes de chauffe, puis
20 requêtes successives sans cookies par page. Aucune autre commande de validation
n'était encore active pendant les mesures. Le chronomètre s'arrête à la réception
des en-têtes via Node `fetch` : approximation locale du TTFB, pas du chargement
complet. Médiane = moyenne des deux observations centrales ; p95 = rang 19/20.

| Page | Médiane avant (ms) | Après (ms) | p95 avant (ms) | Après (ms) |
| --- | ---: | ---: | ---: | ---: |
| Accueil `/` | 6,51 | 6,33 | 8,11 | 8,28 |
| Méthode `/method` | 4,79 | 5,20 | 7,40 | 6,47 |
| Contact `/contact` | 3,80 | 3,53 | 5,91 | 6,25 |

Ces petites variations ne démontrent pas de gain significatif et ne représentent
pas Netlify avec une session réelle. Le bénéfice établi par les tests est la
suppression de la dépendance du proxy à Auth sur les routes publiques ordinaires.
Les pages lisant la base elles-mêmes peuvent toujours dépendre de Supabase Database.

Commande reproductible : `npm run benchmark:public-ttfb -- https://URL-PREVERSION`.
Le script affiche aussi chaque échantillon. Ne pas comparer une version locale à
une version distante ; garder environnement et conditions équivalents.

## Déploiement restant

Aucun déploiement n'a été effectué. Aucun outil ou accès Netlify exploitable n'était
disponible dans cette session. Avant publication :

1. Déployer uniquement ce changement en préversion Netlify.
2. Vérifier une connexion réelle, un utilisateur déjà connecté visitant login et
   inscription, une session renouvelable, la déconnexion et les callbacks OAuth.
3. Répéter les contrôles anonymes, démo et API ; vérifier les routes privées.
4. Mesurer 20 requêtes par page avant/après dans des conditions Netlify identiques.
5. Après validation, publier puis surveiller 24 h les erreurs HTTP, boucles de
   redirection et déconnexions inattendues. Restaurer le déploiement précédent
   si une régression d'authentification apparaît.

Les pages vitrines ne renouvellent plus les sessions via le proxy. La vérification
et le renouvellement restent exécutés au retour sur une route authentifiée.
Images, JavaScript, requêtes dashboard et index SQL sont hors périmètre.
