export const POSTER_ANALYSIS_RULES = `
Règles d'analyse de l'affiche :
- Identifie les textes visibles que l'utilisateur pourrait vouloir actualiser : titre, date, heure, lieu, intervenants et appel à l'action.
- Distingue ces textes des logos, photos, illustrations, cadres et autres éléments graphiques.
- Ne propose jamais de modifier le style général, la composition ou l'identité visuelle.
- Ne déduis pas une information absente de la demande utilisateur.
- Conserve exactement les noms propres, nombres, accents, ponctuation et textes en hébreu.
`.trim();
