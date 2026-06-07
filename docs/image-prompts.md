# Prompts visuels EasyCom AI

Ce document regroupe les prompts liés a la generation, l'adaptation et l'edition des affiches/visuels dans l'application.

Objectif :
- te permettre de les relire facilement
- les ameliorer sans repartir fouiller le code
- identifier rapidement quel prompt agit a quel moment du flow

Note importante :
- certains prompts ne generent pas une image "from scratch"
- dans plusieurs cas, l'IA genere surtout les textes d'une affiche, puis le rendu visuel est applique sur un template existant
- quand il n'y a pas de zones editables techniques dans le template, un prompt d'edition d'image complet est envoye a Fal / Nano Banana

---

## 1. Generation de textes pour une affiche Instagram

Source :
- `src/app/api/publishing/instagram/generate/route.ts`

Usage :
- l'utilisateur ecrit une demande sur la page Instagram
- l'IA choisit une affiche pertinente
- ce prompt sert a remplir les zones texte du template choisi

Prompt :

```txt
Tu prépares une affiche Instagram pour une communauté.

Contexte de la communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Téléphone : ${community?.phone ?? "Non spécifié"}
- Email : ${community?.email ?? "Non spécifié"}
- Site web : ${community?.website ?? "Non spécifié"}
- Adresse : ${community?.address ?? "Non spécifié"}
- Courant : ${community?.religiousStream ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Demande utilisateur :
${userPrompt}

Texte Instagram déjà préparé :
${caption}

Template choisi : "${template.name}" (catégorie : ${template.category})

Zones éditables :
${zonesDescription}

Règles :
- Génère un texte court et percutant pour chaque zone.
- Garde un style cohérent avec Instagram et avec le ton de la communauté.
- Réutilise les informations déjà présentes dans la demande utilisateur et le texte Instagram.
- N'ajoute pas de commentaire hors JSON.
- N'utilise jamais d'astérisques.

Réponds UNIQUEMENT en JSON valide avec la forme :
{ "zoneId": "texte" }
```

---

## 2. Modification IA d'une affiche Instagram

Source :
- `src/app/api/publishing/instagram/edit-poster/route.ts`

Usage :
- l'utilisateur clique sur `Adapter`
- l'IA modifie les textes deja presents sur l'affiche Instagram

Prompt :

```txt
Tu modifies les textes d'une affiche Instagram existante.

Communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Template : ${template.name}

Légende Instagram actuelle :
${caption || "Non fournie"}

Textes actuels de l'affiche :
${zoneContext}

Demande de modification :
${editPrompt}

Règles :
- Modifie uniquement ce qui est nécessaire pour répondre à la demande.
- Garde le même style visuel et la même hiérarchie.
- Génère des textes courts, nets et directement exploitables.
- Ne renvoie aucun commentaire, aucune explication.
- N'utilise jamais d'astérisques.
- Si l'affiche ne contient pas de zones techniques explicites, utilise simplement les ids déjà fournis.

Réponds UNIQUEMENT avec un JSON valide de la forme :
{ "zoneId": "nouveau texte" }
```

---

## 3. Generation de textes pour une affiche Facebook

Source :
- `src/app/api/publishing/facebook/generate/route.ts`

Usage :
- l'utilisateur ecrit une demande sur la page Facebook
- l'IA choisit une affiche pertinente
- ce prompt sert a remplir les zones texte du template choisi

Prompt :

```txt
Tu prépares une affiche Facebook pour une communauté.

Contexte de la communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Téléphone : ${community?.phone ?? "Non spécifié"}
- Email : ${community?.email ?? "Non spécifié"}
- Site web : ${community?.website ?? "Non spécifié"}
- Adresse : ${community?.address ?? "Non spécifié"}
- Courant : ${community?.religiousStream ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Demande utilisateur :
${userPrompt}

Texte Facebook déjà préparé :
${caption}

Template choisi : "${template.name}" (catégorie : ${template.category})

Zones éditables :
${zonesDescription}

Règles :
- Génère un texte court, clair et directement publiable pour chaque zone.
- Garde un style cohérent avec Facebook et avec le ton de la communauté.
- Réutilise les informations déjà présentes dans la demande utilisateur et le texte Facebook.
- N'ajoute pas de commentaire hors JSON.
- N'utilise jamais d'astérisques.

Réponds UNIQUEMENT en JSON valide avec la forme :
{ "zoneId": "texte" }
```

---

## 4. Modification IA d'une affiche Facebook

Source :
- `src/app/api/publishing/facebook/edit-poster/route.ts`

Usage :
- l'utilisateur clique sur `Adapter`
- l'IA modifie les textes deja presents sur l'affiche Facebook

Prompt :

```txt
Tu modifies les textes d'une affiche Facebook existante.

Communauté :
- Nom : ${community?.name ?? "Non spécifié"}
- Ville : ${community?.city ?? "Non spécifié"}
- Ton : ${community?.tone ?? "MODERN"}

Template : ${template.name}

Texte Facebook actuel :
${caption || "Non fourni"}

Textes actuels de l'affiche :
${zoneContext}

Demande de modification :
${editPrompt}

Règles :
- Modifie uniquement ce qui est nécessaire pour répondre à la demande.
- Garde le même style visuel et la même hiérarchie.
- Génère des textes courts, clairs et directement exploitables.
- Ne renvoie aucun commentaire, aucune explication.
- N'utilise jamais d'astérisques.
- Si l'affiche ne contient pas de zones techniques explicites, utilise simplement les ids déjà fournis.

Réponds UNIQUEMENT avec un JSON valide de la forme :
{ "zoneId": "nouveau texte" }
```

---

## 5. Prompt de rendu d'affiche avec zones editables

Source :
- `src/lib/templates/render.ts`
- fonction `buildPosterEditPrompt`

Usage :
- utilise quand le template contient des zones techniques definies
- l'image n'est pas regenee entierement
- le systeme conserve le template et remplace le texte dans les zones

Prompt :

```txt
Édite cette affiche "${template.name}" en gardant l'image strictement identique hors texte.

Remplace uniquement les contenus textuels existants, sans changer :
- le fond
- les couleurs de fond
- les personnages ou objets
- les logos
- la composition générale

Conserve la hiérarchie visuelle et l'emplacement des blocs de texte.
N'invente aucun nouvel élément graphique.

Textes à remplacer :
${zoneDescription}
```

---

## 6. Prompt de rendu d'affiche sans zones editables

Source :
- `src/lib/templates/render.ts`
- fonction `buildPosterEditPromptWithoutZones`

Usage :
- utilise quand le template n'a pas de zones techniques explicites
- l'image est envoyee a `fal-ai/nano-banana/edit`
- c'est actuellement le prompt le plus proche d'un vrai prompt d'edition d'image

Prompt :

```txt
Edit this poster named "${template.name}" by replacing only the visible text content.

Keep absolutely everything else unchanged:
- same background
- same colors
- same people, objects and decorative elements
- same logo placement
- same overall composition
- same typography spirit and visual hierarchy as closely as possible

Do not redesign the poster. Do not add new graphic elements. Only swap the textual information so the poster matches these new details:
${replacementLines || "- Use the user's confirmed event information."}

Important:
- preserve the original language style when appropriate
- replace outdated dates, times, titles, locations and calls to action
- keep the poster clean, readable and natural
- output a single edited poster
```

---

## 7. Prompt de personnalisation libre d'un template

Source :
- `src/app/api/templates/generate/route.ts`

Usage :
- sert a remplir les zones d'un template quand l'utilisateur personnalise une affiche de facon plus libre
- ce n'est pas specifique Instagram/Facebook, mais c'est bien un prompt visuel de generation de contenu d'affiche

Prompt :

```txt
Tu es un expert en communication pour les communautes juives.

Contexte de la communaute :
- Nom : ${community?.name}
- Ville : ${community?.city ?? "Non specifie"}
- Telephone : ${community?.phone ?? "Non specifie"}
- Email : ${community?.email ?? "Non specifie"}
- Site web : ${community?.website ?? "Non specifie"}
- Adresse : ${(community as Record<string, unknown>)?.address ?? "Non specifie"}
- Courant : ${community?.religiousStream ?? "Non specifie"}
- Ton : ${community?.tone ?? "MODERN"}

Informations fournies librement par l'utilisateur pour personnaliser l'affiche :
${Object.entries(answers).map(([key, value]) => `- ${key} : ${value}`).join("\n")}

Template choisi : "${template.name}" (categorie : ${template.category})

Zones editables de l'affiche :
${zonesDescription}

Pour chaque zone editable, genere le texte personnalise adapte. Le texte doit etre :
- Court et percutant, adapte a une affiche
- En accord avec le ton de la communaute
- Capable d'extraire et de comprendre les informations donnees librement par l'utilisateur
- Coherent avec le type d'evenement, la date, l'heure, le lieu, le public et les consignes eventuelles

Reponds UNIQUEMENT en JSON valide, avec un objet dont les cles sont les IDs des zones et les valeurs le texte personnalise. Exemple :
{ "title": "Soiree Chabbat Speciale", "date": "Vendredi 20 Avril 2026", "lieu": "Beth Habad Paris" }
```

---

## 8. Variables dynamiques les plus importantes

Tu les retrouveras dans les prompts ci-dessus :

- `${userPrompt}` : la demande libre de l'utilisateur
- `${caption}` : le texte social deja genere pour le post
- `${community?...}` : les infos de la communaute
- `${template.name}` / `${template.category}` : le template retenu
- `${zonesDescription}` : la liste structurée des zones editables
- `${zoneContext}` : les textes actuels de l'affiche lors d'une adaptation
- `${replacementLines}` : liste de remplacement envoyee au moteur d'edition d'image sans zones techniques

---

## 9. Prompts probablement a ameliorer en priorite

Si ton objectif est d'ameliorer la qualite des visuels, je te conseille de commencer par ceux-ci :

1. `buildPosterEditPromptWithoutZones`
- c'est celui qui influence le plus l'edition reelle d'image quand le template n'a pas de zones techniques

2. `generatePosterTexts` pour Instagram
- il determine la qualite et la pertinence du texte injecte dans l'affiche

3. `generatePosterTexts` pour Facebook
- meme logique, mais avec un ton plus adapte a Facebook

4. les prompts `edit-poster`
- ils influencent beaucoup la qualite des adaptations successives quand l'utilisateur clique sur `Adapter`

---

## 10. Proposition de suite

Si tu veux, je peux faire le deuxieme fichier :
- `docs/image-prompts-improved-draft.md`

Dedans, je te preparerai une version ameliorée de chaque prompt avec :
- consignes plus strictes
- meilleure prise en compte de la DA
- meilleure lisibilite affiche
- meilleure priorisation du titre, sous-titre, date, lieu, CTA
- contraintes explicites pour eviter les textes trop longs ou trop vagues
