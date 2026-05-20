# Configurer Facebook dans Yad.ia

Ce guide est basé sur le code actuel du projet.

Important : dans cette version, `META_APP_ID` et `META_APP_SECRET` existent bien dans `.env.example`, mais aucune route OAuth Facebook n'est encore implémentée dans `src/app/api/auth/oauth/`.

Conséquence :

- remplir `.env.local` est nécessaire pour préparer l'intégration Meta ;
- mais cela ne suffit pas, à lui seul, pour connecter automatiquement une page Facebook ;
- pour publier aujourd'hui, il faut aussi enregistrer un `accessToken` et un `pageId` dans le canal Facebook en base.

## 1. Ce que le projet attend réellement

Le code de publication Facebook utilise :

- `channel.accessToken`
- `channel.pageId`

Le code concerné est dans [src/lib/publishing/adapters/facebook.ts](/Users/jordanchekroun/Documents/Yad/src/lib/publishing/adapters/facebook.ts:1).

Si l'un des deux manque, l'app bascule en mode manuel et te demande de publier toi-même sur Facebook.

## 2. Variables à remplir dans `.env.local`

Commence par copier le modèle :

```bash
cp .env.example .env.local
```

Pour Facebook, les variables Meta à renseigner sont :

```env
META_APP_ID="ton-app-id-meta"
META_APP_SECRET="ton-app-secret-meta"
```

Même si elles ne sont pas encore consommées automatiquement par le code, tu dois les préparer maintenant si tu veux brancher une vraie connexion OAuth ensuite.

## 3. Créer l'application Meta

Dans <https://developers.facebook.com/> :

1. Crée une application.
2. Choisis un type orienté business / intégrations.
3. Ajoute les produits Facebook Login et, si besoin, Instagram Graph API.
4. Récupère :
   - l'App ID
   - l'App Secret
5. Colle-les dans `.env.local`.

## 4. Préparer le compte Facebook

Avant de tester, vérifie ces prérequis :

- tu es administrateur de la page Facebook ;
- la page est bien publiée ;
- si tu veux aussi Instagram, le compte Instagram doit être un compte professionnel ;
- le compte Instagram doit être lié à la page Facebook.

## 5. Permissions nécessaires côté Meta

Pour la publication Facebook, le projet poste sur :

```text
POST /{pageId}/feed
POST /{pageId}/photos
```

Donc, en pratique, l'intégration devra obtenir un token de page avec les permissions adaptées côté Meta.

Selon ton montage Meta, tu auras généralement besoin de permissions de type :

- `pages_manage_posts`
- `pages_read_engagement`

Et parfois des permissions complémentaires selon le périmètre exact de l'app et le workflow retenu.

## 6. Ce qui manque aujourd'hui dans le projet

Le bouton "Se connecter via Facebook" dans l'interface redirige vers :

```text
/api/auth/oauth/facebook
```

Mais cette route n'existe pas dans le repo actuel.

Le bouton de configuration est défini dans [src/components/settings/channels-settings-client.tsx](/Users/jordanchekroun/Documents/Yad/src/components/settings/channels-settings-client.tsx:78).

Donc si tu cliques sur "Se connecter via Facebook", ça ne peut pas finir correctement tant que cette partie n'est pas développée.

## 7. Solution qui fonctionne tout de suite

En l'état actuel du code, la façon la plus directe de faire fonctionner Facebook est :

1. créer l'app Meta ;
2. récupérer un token de page valide côté Meta ;
3. récupérer le `pageId` ;
4. enregistrer ce `accessToken` et ce `pageId` dans la table `Channel` pour le canal `FACEBOOK`.

Les champs disponibles en base sont définis dans [prisma/schema.prisma](/Users/jordanchekroun/Documents/Yad/prisma/schema.prisma:116).

## 8. Comment enregistrer le token et le pageId

L'API du projet permet déjà de sauvegarder un canal avec :

- `accessToken`
- `pageId`
- `isConnected`
- `isActive`

Routes concernées :

- [src/app/api/channels/route.ts](/Users/jordanchekroun/Documents/Yad/src/app/api/channels/route.ts:1)
- [src/app/api/channels/[id]/route.ts](/Users/jordanchekroun/Documents/Yad/src/app/api/channels/[id]/route.ts:1)

Tu peux donc :

- soit injecter ces valeurs en base ;
- soit ajouter une petite UI manuelle pour Facebook ;
- soit implémenter la vraie route OAuth.

## 9. Exemple de configuration minimale

Dans `.env.local` :

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

OPENROUTER_API_KEY="sk-or-v1-..."

META_APP_ID="123456789012345"
META_APP_SECRET="xxxxxxxxxxxxxxxx"
```

Puis, pour le canal Facebook en base :

```text
type = FACEBOOK
accessToken = token_de_page_meta
pageId = id_de_la_page
isConnected = true
isActive = true
```

## 10. Comment vérifier que ça marche

Une publication Facebook fonctionnera seulement si :

- le canal Facebook a un `accessToken` ;
- le canal Facebook a un `pageId` ;
- le token n'est pas expiré ;
- le token a bien les permissions Meta nécessaires.

Sinon, le code retournera une erreur ou un fallback manuel.

## 11. En résumé

Pour "bien remplir le `.env`" côté Facebook :

- renseigne `META_APP_ID`
- renseigne `META_APP_SECRET`

Mais pour "que tout fonctionne", il faut aussi :

- un token de page Facebook valide ;
- le `pageId` ;
- une route OAuth Facebook, ou une saisie manuelle du token dans l'app.

Sans ça, la publication automatique Facebook ne sera pas complètement opérationnelle.
