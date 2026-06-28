export const POSTER_GENERATION_RULES = `
Règles EasyCom AI pour les affiches :
- Si un modèle ou une référence existe, conserve fortement la composition générale, la hiérarchie visuelle, l'ambiance, les couleurs principales, les typographies proches, la logique des blocs et l'équilibre texte/image.
- Crée une nouvelle affiche indépendante ; ne modifie jamais le fichier source.
- Utilise uniquement les informations données par l'utilisateur ou présentes dans le profil / les réglages de la communauté.
- Ne jamais inventer : date, heure, lieu, adresse, téléphone, email, prix, lien, QR code, intervenant, rabbin, sponsor ou ville.
- Si une date est nécessaire et manque, ne la fabrique pas ; demande-la ou indique "À confirmer" selon le contexte.
- Supprime toute information spécifique du modèle qui n'est pas demandée par l'utilisateur.
- Conserve le logo disponible quand il existe déjà dans le modèle et affiche le nom exact de la structure. Si le logo ne peut pas être utilisé, garde au minimum le nom exact de la structure.
- Ajoute toujours ב''ה en haut à droite, petit, discret et lisible.
- Si le modèle contient un visage, conserve exactement la même photo et la même identité visuelle.
- Garde la logique et le nombre des éléments visuels importants ; ne surcharge pas l'affiche.
- Évite les décorations excessives ; vise un rendu propre, professionnel, lisible et moderne.
- Ne change pas la palette juste pour adapter le logo ; le logo s'intègre à l'affiche, pas l'inverse.
- Les textes hébreux visibles peuvent être conservés s'ils sont présents ; n'en invente jamais de nouveaux.
- Priorité des informations : titre, date, heure, lieu, appel à l'action, logo / nom de structure, contact si fourni, puis détails secondaires.
`.trim();

// Image editors need direct visual instructions. Product workflow rules such as
// asking follow-up questions or preserving the source file are enforced outside
// the model and would make the image prompt contradictory.
export const POSTER_IMAGE_EDIT_RULES = `
Consignes pour l'image finale :
- Utilise l'image jointe comme référence visuelle principale.
- Garde sa composition, sa palette, sa hiérarchie, ses photos, ses visages, son logo et ses éléments décoratifs, sauf modification explicitement demandée.
- Remplace ou retire uniquement les informations concernées par la demande.
- N'invente aucune date, heure, adresse, personne, coordonnée, tarif, lien ou QR code.
- Garde les textes lisibles et correctement placés, sans surcharge ni décoration excessive.
- Ajoute ב''ה, petit et discret, en haut à droite s'il n'est pas déjà visible.
- Retourne exactement une image finale, sans commentaire ni texte hors de l'image.
`.trim();

export const POSTER_ANALYSIS_RULES = `
Règles d'analyse de l'affiche :
- Repère surtout les éléments réellement visibles qu'un utilisateur voudra personnaliser.
- Propose 4 à 7 éléments maximum.
- Priorise le titre, la date, l'heure, le lieu, l'appel à l'action, le logo / nom de structure, puis le contact si fourni.
- N'invente pas de zone qui n'existe probablement pas.
- Si une date semble nécessaire mais manque dans la demande, prépare une question de clarification.
- Les questions doivent rester courtes, concrètes et directement exploitables.
`.trim();
