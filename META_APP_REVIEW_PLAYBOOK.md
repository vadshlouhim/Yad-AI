# Meta App Review Playbook - Facebook Pages

Objectif: maximiser les chances d'approbation Meta pour EasyCom AI apres deux refus lies a la video de demonstration.

Important: aucune review Meta ne peut etre garantie a 100%, car elle depend d'un reviewer humain. En revanche, ce document donne la procedure la plus robuste pour eviter le motif exact du dernier refus: "la capture video ne demontre pas l'experience de bout en bout".

## 1. Diagnostic Du Refus

Meta n'a pas dit que le cas d'usage etait interdit.

Meta a dit:

- Le cas d'utilisation de l'app est autorise.
- La video fournie ne correspond pas assez aux details du cas d'utilisation.
- La video ne montre pas le flux complet de bout en bout.
- La video ne montre pas clairement le flux Meta OAuth complet.
- La video ne montre pas clairement l'utilisateur qui accorde les permissions.
- La video ne montre pas clairement l'utilisation reelle de chaque permission demandee.

Conclusion: la prochaine soumission doit etre traitee comme une preuve video complete, pas comme une presentation marketing.

## 2. Permissions A Demander

Demander uniquement les permissions strictement necessaires au parcours Facebook actuellement implemente.

Permissions recommandees:

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_posts`

Ne pas demander:

- `pages_manage_metadata`

Raison: dans le code actuel, EasyCom AI utilise Meta OAuth pour recuperer les Pages de l'utilisateur et publier sur une Page. Je n'ai pas trouve de fonctionnalite visible utilisant concretement `pages_manage_metadata` comme la gestion des webhooks de Page, `subscribed_apps`, ou une operation de metadata de Page. Demander une permission non demontree augmente fortement le risque de refus.

## 3. Ce Que Chaque Permission Doit Prouver

### `pages_show_list`

Ce que Meta veut comprendre:

EasyCom AI doit recuperer la liste des Pages Facebook que l'utilisateur gere afin de connecter la bonne Page a l'application.

Dans la video, montrer:

- Le clic sur le bouton de connexion Facebook.
- Le dialogue Meta OAuth.
- L'ecran Meta ou l'utilisateur autorise l'acces a ses Pages.
- Le retour dans EasyCom AI avec la Page connectee.

Annotation video conseillee:

```text
pages_show_list: EasyCom AI retrieves the Facebook Pages managed by the user so they can select and connect their Page.
```

### `pages_read_engagement`

Ce que Meta veut comprendre:

EasyCom AI lit les informations de base de la Page connectee pour afficher le nom de la Page et confirmer que le bon canal Facebook est connecte.

Dans la video, montrer:

- Le nom de la Page affiche dans EasyCom AI apres connexion.
- Le statut "connected" ou equivalent.
- Si possible, le Page ID ou le handle affiche dans les settings.

Annotation video conseillee:

```text
pages_read_engagement: EasyCom AI reads basic Page information to display and confirm the connected Facebook Page.
```

### `pages_manage_posts`

Ce que Meta veut comprendre:

EasyCom AI permet a l'utilisateur de creer puis publier une publication sur sa propre Page Facebook.

Dans la video, montrer:

- Creation d'un post dans EasyCom AI.
- Ajout d'un texte.
- Ajout d'une image si possible.
- Clic sur `Publish now`.
- Message de succes dans EasyCom AI.
- Ouverture de Facebook.
- Publication visible sur la Page Facebook.

Annotation video conseillee:

```text
pages_manage_posts: EasyCom AI publishes the post created by the user to the selected Facebook Page.
```

## 4. Preparation Avant De Filmer

### 4.1 Compte De Test

Creer ou utiliser un compte test qui peut etre fourni a Meta.

Ce compte doit:

- Pouvoir se connecter a EasyCom AI.
- Avoir acces au dashboard.
- Avoir une communaute deja creee.
- Avoir le droit d'aller dans `Settings > Channels`.
- Pouvoir connecter Facebook.
- Pouvoir publier sur Facebook depuis EasyCom AI.

Ne pas utiliser un compte personnel sensible dans la video.

### 4.2 Page Facebook De Test

Creer une Page Facebook de test dediee a la review.

Exemple de nom:

```text
EasyCom AI Review Test Page
```

Le compte Meta utilise dans la video doit etre admin de cette Page.

Avant de filmer:

- Verifier que la Page existe.
- Verifier que le compte Meta a les droits admin.
- Verifier que la Page est visible dans Meta Business/Facebook.
- Verifier que le compte peut publier manuellement sur la Page.

### 4.3 App Meta

Dans Meta Developers:

- Verifier que les URLs OAuth sont correctes.
- Verifier que le domaine de production est configure.
- Verifier que la politique de confidentialite est accessible publiquement.
- Verifier que les conditions d'utilisation sont accessibles publiquement.
- Verifier que l'app icon, le nom, le domaine et les informations de contact sont propres.

### 4.4 EasyCom AI

Avant de filmer:

- Deconnecter le canal Facebook dans EasyCom AI si deja connecte.
- Verifier que le bouton de connexion Facebook apparait.
- Verifier que la publication Facebook fonctionne vraiment.
- Preparer une image simple pour le post test.
- Preparer un texte de publication court en anglais.

Texte de publication conseille:

```text
This is a test post created and published from EasyCom AI during the Meta App Review demonstration.
```

Image conseillee:

- Image simple.
- Pas de contenu religieux, politique, medical, financier ou sensible.
- Pas de logo Meta/Facebook.
- Pas de donnees personnelles.

## 5. Langue De La Video

Meta recommande une interface en anglais si possible.

Si l'interface EasyCom AI reste en francais, cela peut passer uniquement si la video contient des annotations claires en anglais.

Ne pas compter uniquement sur une extension de traduction automatique dans le navigateur.

Le mieux:

- Interface en francais acceptable.
- Annotations en anglais directement integrees dans la video.
- Sous-titres anglais.
- Notes de soumission en anglais.
- Souris visible.
- Zoom sur les elements importants.

## 6. Format Video Recommande

Parametres:

- Resolution: 1080p idealement.
- Format: MP4.
- Audio: inutile; Meta indique que les reviewers peuvent ne pas ecouter l'audio.
- Duree: 4 a 8 minutes.
- Fenetre: navigateur plein ecran ou fenetre croppee proprement.
- Curseur: visible et assez grand.
- Vitesse: normale, ne pas accelerer les moments importants.
- Donnees sensibles: masquer les tokens, emails prives, identifiants internes si visibles.

Outils possibles:

- OBS
- Loom
- Screen Studio
- Camtasia
- QuickTime + montage
- CapCut ou autre outil pour ajouter les annotations

## 7. Script Video Exact

La video doit montrer un seul parcours fluide de bout en bout.

### Scene 1 - Depart Deconnecte

Objectif: montrer que le reviewer peut tester depuis zero.

A filmer:

1. Ouvrir EasyCom AI.
2. Montrer l'ecran de login.
3. Se connecter avec le compte test.
4. Arriver dans le dashboard.

Annotation:

```text
Step 1: The test user logs into EasyCom AI.
```

### Scene 2 - Aller Aux Canaux

Objectif: montrer ou se trouve la connexion Facebook.

A filmer:

1. Aller dans le menu dashboard.
2. Cliquer sur `Settings`.
3. Cliquer sur `Channels`.
4. Montrer la liste des canaux.
5. Ouvrir le bloc Facebook.

Annotation:

```text
Step 2: The user opens Settings > Channels to connect a Facebook Page.
```

### Scene 3 - Connexion Meta OAuth Complete

Objectif: satisfaire explicitement la demande Meta: "Le flux de connexion Meta complet".

A filmer:

1. Cliquer sur `Connect Facebook` ou `Se connecter via Facebook`.
2. Montrer l'ouverture du dialogue Meta OAuth.
3. Montrer le compte Meta utilise.
4. Continuer dans le flux OAuth.
5. Montrer l'ecran ou Meta demande les autorisations.
6. Montrer l'ecran ou l'utilisateur accorde l'acces a la Page.
7. Ne pas couper cette partie.

Annotation:

```text
Step 3: The official Meta OAuth flow opens and the user grants Page permissions.
```

Annotation supplementaire pendant la selection Page:

```text
pages_show_list: EasyCom AI retrieves the Pages managed by the user.
```

### Scene 4 - Retour EasyCom AI Avec Page Connectee

Objectif: prouver que l'app utilise les donnees de Page et connecte la bonne Page.

A filmer:

1. Retour automatique dans EasyCom AI.
2. Montrer le message de succes.
3. Montrer le canal Facebook connecte.
4. Montrer le nom de la Page connectee.
5. Montrer le statut connecte.

Annotation:

```text
pages_read_engagement: EasyCom AI reads basic Page information and displays the connected Page.
```

### Scene 5 - Creation D'une Publication Facebook

Objectif: preparer la preuve de `pages_manage_posts`.

A filmer:

1. Aller dans `Dashboard > Facebook`.
2. Montrer la page "Publish to Facebook".
3. Entrer le texte du post test.
4. Ajouter une image si possible.
5. Montrer l'apercu Facebook dans EasyCom AI.

Annotation:

```text
Step 5: The user creates a Facebook post inside EasyCom AI.
```

Texte a utiliser:

```text
This is a test post created and published from EasyCom AI during the Meta App Review demonstration.
```

### Scene 6 - Publication Immediate

Objectif: prouver l'utilisation reelle de `pages_manage_posts`.

A filmer:

1. Cliquer sur `Publish now`.
2. Attendre le message de succes.
3. Montrer clairement le message de succes.

Annotation:

```text
pages_manage_posts: EasyCom AI publishes the user-created post to the selected Facebook Page.
```

### Scene 7 - Verification Sur Facebook

Objectif: boucler le parcours de bout en bout.

A filmer:

1. Ouvrir Facebook dans un nouvel onglet.
2. Aller sur la Page de test.
3. Montrer la publication qui vient d'etre publiee.
4. Si besoin, rafraichir la Page.
5. Zoomer sur le texte du post pour qu'il corresponde au texte cree dans EasyCom AI.

Annotation:

```text
Final verification: The post created in EasyCom AI is visible on the connected Facebook Page.
```

## 8. Ce Qu'il Ne Faut Pas Faire Dans La Video

Ne pas:

- Couper le flux OAuth.
- Commencer la video deja connecte a Facebook.
- Montrer seulement les settings sans publier.
- Montrer seulement une publication programmee sans preuve finale sur Facebook.
- Demander des permissions qui ne sont pas demontrees.
- Laisser l'interface totalement en francais sans annotations anglaises.
- Montrer des tokens, secrets, variables d'environnement ou cles API.
- Utiliser des donnees clients reelles.
- Faire une video trop rapide.
- Mettre seulement de l'audio sans texte visuel.
- Dire "the app can publish" sans montrer une vraie publication visible sur Facebook.

## 9. Texte A Mettre Dans La Soumission Meta

Utiliser un texte clair, simple et en anglais.

### Description Generale

```text
EasyCom AI helps community managers create, schedule, and publish content to their own Facebook Pages.

The user logs into EasyCom AI, opens Settings > Channels, connects Facebook through the official Meta OAuth flow, grants access to a Facebook Page they manage, then creates a Facebook post inside EasyCom AI and publishes it directly to that Page.

The screen recording shows the complete end-to-end flow: app login, Meta OAuth, permission grant, Page access, post creation, publishing from EasyCom AI, and the published post visible on Facebook.
```

### `pages_show_list`

```text
EasyCom AI uses pages_show_list during the Facebook connection flow to retrieve the Facebook Pages managed by the user. This allows the app to connect the correct Page selected/authorized by the user.

In the screen recording, this is shown when the user connects Facebook from Settings > Channels and grants EasyCom AI access to a Page they manage through the official Meta OAuth flow.
```

### `pages_read_engagement`

```text
EasyCom AI uses pages_read_engagement to read basic information about the connected Facebook Page, such as the Page name and identifier, so the app can display and confirm which Page is connected.

In the screen recording, this is shown after the OAuth flow when EasyCom AI displays the connected Facebook Page in Settings > Channels.
```

### `pages_manage_posts`

```text
EasyCom AI uses pages_manage_posts to publish posts created by the user to the Facebook Page they connected.

In the screen recording, the user creates a Facebook post inside EasyCom AI, clicks Publish now, receives a success confirmation, and then opens Facebook to verify that the post is visible on the connected Page.
```

## 10. Identifiants De Test A Fournir A Meta

Fournir un compte test EasyCom AI.

Exemple:

```text
Test account URL: https://YOUR_DOMAIN.com/auth/login
Email: reviewer@example.com
Password: YOUR_TEST_PASSWORD

After login:
1. Go to Dashboard.
2. Open Settings > Channels.
3. Expand Facebook.
4. Click Connect with Facebook.
5. Complete the Meta OAuth flow with a Facebook account that manages a test Page.
6. Go to Dashboard > Facebook.
7. Create and publish a test post.
```

Important:

- Le compte test doit fonctionner sans 2FA compliquee.
- Le reviewer doit pouvoir se connecter sans devoir te contacter.
- Si le reviewer doit utiliser son propre compte Facebook, explique-le.
- Si tu fournis un compte Meta de test, assure-toi qu'il peut acceder a la Page de test.

## 11. Checklist Avant Envoi

Avant de soumettre:

- [ ] La video commence par une connexion a EasyCom AI.
- [ ] La video montre `Settings > Channels`.
- [ ] La video montre le bouton Facebook.
- [ ] La video montre le flux Meta OAuth complet.
- [ ] La video montre l'utilisateur qui accorde les permissions.
- [ ] La video montre la Page Facebook autorisee.
- [ ] La video montre le retour dans EasyCom AI.
- [ ] La video montre la Page connectee dans EasyCom AI.
- [ ] La video montre la creation d'un post Facebook.
- [ ] La video montre le clic `Publish now`.
- [ ] La video montre le message de succes.
- [ ] La video montre le post visible sur Facebook.
- [ ] La video contient des annotations anglaises.
- [ ] Chaque permission demandee est mentionnee dans une annotation.
- [ ] Les notes Meta sont en anglais.
- [ ] Les identifiants test EasyCom AI sont fournis.
- [ ] Aucune permission non utilisee n'est demandee.
- [ ] Aucun token ou secret n'est visible.
- [ ] La Page Facebook de test ne contient rien de sensible.
- [ ] La video est lisible en 1080p ou equivalent.

## 12. Checklist Technique EasyCom AI

Avant de filmer, verifier:

- [ ] `META_APP_ID` ou `FACEBOOK_APP_ID` est configure.
- [ ] `META_APP_SECRET` ou `FACEBOOK_APP_SECRET` est configure.
- [ ] `APP_URL` ou `NEXT_PUBLIC_APP_URL` pointe vers l'URL de production.
- [ ] L'URL de callback Meta est autorisee:

```text
https://YOUR_DOMAIN.com/api/auth/oauth/facebook/callback
```

- [ ] Le canal Facebook peut etre deconnecte/reconnecte.
- [ ] La publication Facebook fonctionne depuis `Dashboard > Facebook`.
- [ ] La Page de test recoit bien la publication.
- [ ] Le build de production est deploye avec les scopes corrects.

## 13. Conseils Specifiques Pour Eviter Un Troisieme Refus

Le reviewer Meta doit pouvoir repondre a ces questions uniquement en regardant la video:

1. Qui est l'utilisateur?
2. Ou se connecte-t-il a EasyCom AI?
3. Ou connecte-t-il Facebook?
4. Est-ce bien le dialogue officiel Meta?
5. A quel moment accorde-t-il les permissions?
6. Quelle Page est connectee?
7. Que fait EasyCom AI avec cette Page?
8. Ou l'utilisateur cree-t-il le post?
9. A quel moment EasyCom AI publie-t-il sur Facebook?
10. Le post est-il vraiment visible sur Facebook?

Si une de ces reponses n'est pas visible, la video est encore trop faible.

## 14. Version Courte Du Parcours A Filmer

Cette version peut etre utilisee comme script pendant l'enregistrement.

```text
1. Login to EasyCom AI.
2. Open Settings > Channels.
3. Expand Facebook.
4. Click Connect with Facebook.
5. Complete the full Meta OAuth flow.
6. Grant access to the Facebook Page.
7. Return to EasyCom AI.
8. Show the connected Facebook Page.
9. Open Dashboard > Facebook.
10. Create a post with text and image.
11. Click Publish now.
12. Show the success message.
13. Open Facebook.
14. Show the published post on the Page.
```

## 15. Sources Officielles Meta

Meta explique que les screen recordings doivent montrer comment tester chaque permission et fonctionnalite demandee. Si les reviewers ne peuvent pas verifier qu'une permission est necessaire a partir de la video, la permission peut etre refusee.

Source:

```text
https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings
```

Meta recommande aussi:

- Interface en anglais si possible.
- Captions et tooltips si l'interface n'est pas en anglais.
- Explication des boutons et elements UI qui ne sont pas evidents.
- Flux de login complet.
- Flux d'autorisation complet.
- Demonstration de l'utilisation des donnees ou actions liees a chaque permission.

## 16. Decision Finale Avant Soumission

Soumettre seulement si:

- La video prouve tout le parcours.
- Les notes Meta correspondent exactement a ce qui est filme.
- Les permissions demandees correspondent exactement a ce qui est filme.
- Le reviewer peut reproduire le test avec les informations fournies.

Ne pas soumettre si:

- La video est une demo partielle.
- Le post n'est pas montre sur Facebook a la fin.
- Une permission demandee n'apparait pas dans la video.
- Les notes mentionnent une fonctionnalite non visible.
- L'interface est en francais sans annotations anglaises.

## 17. Recommandation Finale

Pour la prochaine soumission, faire simple:

- Un seul cas d'usage: connecter une Page Facebook et publier dessus.
- Une seule video claire.
- Trois permissions maximum:
  - `pages_show_list`
  - `pages_read_engagement`
  - `pages_manage_posts`
- Aucune permission supplementaire.
- Des annotations anglaises au moment exact ou chaque permission est utilisee.

Le but n'est pas d'impressionner Meta. Le but est de rendre la review impossible a mal interpreter.
