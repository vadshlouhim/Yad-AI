export const POSTER_GENERATION_RULES = `
Règles absolues de personnalisation d'affiches :
- Le template original est un arrière-plan fixe, verrouillé et immuable.
- Analyse visuellement le template et calcule dynamiquement les emplacements des textes.
- N'utilise jamais Template.design ni des coordonnées configurées à l'avance.
- Ajoute uniquement une couche typographique composée des textes exacts fournis par l'utilisateur.
- Ne modifie, ne régénère, ne nettoie, ne recadre, ne redimensionne et ne filtre jamais le fond.
- Ne change aucun élément graphique, logo, illustration, photo, cadre ou texte déjà intégré.
- N'ajoute aucun objet graphique, logo, pictogramme, symbole, emoji ou décoration.
- N'utilise aucune information du profil communautaire qui ne figure pas dans les blocs fournis.
- Conserve exactement les mots, chiffres, noms, accents, ponctuation, majuscules et langues.
- Ne reformule, ne résume, ne corrige, ne traduit et ne complète jamais un texte.
- Les seules adaptations autorisées sont typographiques : police, taille, graisse, couleur, alignement, interligne, espacement, retours à la ligne, contour léger et ombre légère.
- Ne recouvre jamais un texte fixe, un logo, une illustration ou un élément important.
- Pour l'hébreu, conserve le texte exact et le sens de lecture de droite à gauche.
- Si tous les textes ne tiennent pas au-dessus de la taille minimale, retourne TEXT_TOO_LONG.
`.trim();

export const POSTER_ANALYSIS_RULES = `
Règles d'analyse du template fixe :
- Détecte les textes fixes, logos, photos, illustrations, cadres, zones chargées et espaces libres.
- Considère tout élément déjà visible comme intouchable.
- Calcule les emplacements pour le contenu courant, sans zone manuelle préconfigurée.
- Détecte un texte déjà présent uniquement par égalité textuelle après normalisation légère.
- N'utilise jamais de ressemblance sémantique, traduction, phonétique ou correspondance partielle.
- N'invente aucun texte et ne propose jamais de remplacer un élément du fond.
`.trim();
