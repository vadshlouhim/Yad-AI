import type { Channel } from "@prisma/client";
import type { PublishPayload, PublishResult } from "../publisher";

// Adaptateur WhatsApp
// Stratégie V1 : fallback guidé avec copier-coller
// (WhatsApp Business API requiert approbation Meta — complexe pour V1)

export async function prepareWhatsAppFallback(
  channel: Channel,
  payload: PublishPayload
): Promise<PublishResult> {
  const formattedContent = formatWhatsAppContent(payload);

  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "COPY_PASTE",
    fallbackData: {
      content: formattedContent,
      instructions: [
        "1. Copiez le texte ci-dessous",
        "2. Ouvrez WhatsApp sur votre téléphone",
        `3. Accédez à votre canal ou groupe "${channel.name}"`,
        "4. Collez et envoyez le message",
      ],
      channelName: channel.name,
      deepLink: `https://wa.me/?text=${encodeURIComponent(formattedContent)}`,
    },
  };
}

function formatWhatsAppContent(payload: PublishPayload): string {
  // WhatsApp utilise ses propres formatages :
  // *gras*, _italique_, ~barré~
  return payload.content;
}
