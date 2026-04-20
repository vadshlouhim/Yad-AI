import type { Channel } from "@prisma/client";
import type { PublishPayload, PublishResult } from "../publisher";

// Adaptateur Facebook — Meta Graph API v18+

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

export async function publishToFacebook(
  channel: Channel,
  payload: PublishPayload
): Promise<PublishResult> {
  if (!channel.accessToken || !channel.pageId) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "OPEN_PLATFORM",
      fallbackData: {
        url: `https://www.facebook.com`,
        content: payload.content,
        instructions: "Ouvrez votre page Facebook et créez une publication manuellement.",
      },
      error: "Token ou Page ID manquant — connexion OAuth requise",
    };
  }

  try {
    const formattedContent = formatFacebookContent(payload);

    // Si on a des médias, upload d'abord
    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      return await publishFacebookWithMedia(channel, payload, formattedContent);
    }

    // Publication texte seul
    const response = await fetch(
      `${GRAPH_API_BASE}/${channel.pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: formattedContent,
          access_token: channel.accessToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message ?? "Erreur API Facebook";

      // Token expiré → fallback
      if (data.error?.code === 190) {
        return {
          success: false,
          fallbackUsed: true,
          fallbackType: "COPY_PASTE",
          fallbackData: {
            content: formattedContent,
            instructions: "Votre token Facebook a expiré. Reconnectez votre page dans les Paramètres.",
          },
          error: "Token Facebook expiré",
        };
      }

      return { success: false, error: errorMsg };
    }

    return {
      success: true,
      externalId: data.id,
      externalUrl: `https://www.facebook.com/${data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "COPY_PASTE",
      fallbackData: {
        content: formatFacebookContent(payload),
        instructions: "Erreur réseau. Copiez le contenu ci-dessous et publiez manuellement.",
      },
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

async function publishFacebookWithMedia(
  channel: Channel,
  payload: PublishPayload,
  formattedContent: string
): Promise<PublishResult> {
  try {
    const photoIds: string[] = [];

    // Upload de chaque image
    for (const mediaUrl of payload.mediaUrls ?? []) {
      const uploadResponse = await fetch(
        `${GRAPH_API_BASE}/${channel.pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: mediaUrl,
            published: false, // Upload sans publier
            access_token: channel.accessToken,
          }),
        }
      );

      const uploadData = await uploadResponse.json();
      if (uploadData.id) {
        photoIds.push(uploadData.id);
      }
    }

    // Publication avec médias
    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    const response = await fetch(
      `${GRAPH_API_BASE}/${channel.pageId}/feed`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: formattedContent,
          attached_media: attachedMedia,
          access_token: channel.accessToken,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message ?? "Erreur publication" };
    }

    return {
      success: true,
      externalId: data.id,
      externalUrl: `https://www.facebook.com/${data.id}`,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erreur upload" };
  }
}

function formatFacebookContent(payload: PublishPayload): string {
  let content = payload.content;
  if (payload.hashtags && payload.hashtags.length > 0) {
    content += "\n\n" + payload.hashtags.slice(0, 5).join(" ");
  }
  return content;
}
