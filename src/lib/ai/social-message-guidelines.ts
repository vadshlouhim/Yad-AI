export const SOCIAL_MESSAGE_GUIDELINES = `Consignes de redaction obligatoires :
- Ne souligne pas en rouge et ne signale pas comme erreurs les mots absents du dictionnaire.
- Ajoute toujours des emojis adaptes au message.
- Separe les sujets du message par des sauts de ligne clairs, avec une ligne vide entre les blocs lorsque c'est naturel.
- Ces sauts de ligne priment sur la limite de 3 lignes si le message contient plusieurs sujets.`;

export function appendSocialMessageGuidelines(userPrompt: string) {
  return `${userPrompt}\n\n${SOCIAL_MESSAGE_GUIDELINES}`;
}
