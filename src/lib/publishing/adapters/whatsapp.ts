import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";

type Channel = Tables<"Channel">;

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
  return payload.content;
}
