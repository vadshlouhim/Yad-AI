import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";

type Channel = Tables<"Channel">;

const GRAPH_API_BASE = "https://graph.facebook.com/v18.0";

export async function publishToInstagram(
  channel: Channel,
  payload: PublishPayload
): Promise<PublishResult> {
  if (!channel.accessToken || !channel.pageId) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "OPEN_PLATFORM",
      fallbackData: {
        url: "https://www.instagram.com",
        content: formatInstagramContent(payload),
        instructions: "Ouvrez Instagram et créez une publication. Copiez le texte ci-dessous.",
      },
      error: "Token ou Instagram Business Account ID manquant",
    };
  }

  try {
    if (!payload.mediaUrls || payload.mediaUrls.length === 0) {
      return {
        success: false,
        fallbackUsed: true,
        fallbackType: "COPY_PASTE",
        fallbackData: {
          content: formatInstagramContent(payload),
          instructions: "Instagram requiert une image. Ajoutez un visuel depuis la Médiathèque.",
        },
        error: "Instagram requiert au moins une image",
      };
    }

    const formattedCaption = formatInstagramContent(payload);

    const containerResponse = await fetch(`${GRAPH_API_BASE}/${channel.pageId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: payload.mediaUrls[0],
        caption: formattedCaption,
        access_token: channel.accessToken,
      }),
    });

    const containerData = await containerResponse.json();

    if (!containerResponse.ok || containerData.error) {
      if (containerData.error?.code === 190) {
        return {
          success: false,
          fallbackUsed: true,
          fallbackType: "EXPORT_IMAGE",
          fallbackData: {
            content: formattedCaption,
            imageUrl: payload.mediaUrls[0],
            instructions: "Token Instagram expiré. Reconnectez votre compte dans les Paramètres.",
          },
          error: "Token Instagram expiré",
        };
      }
      return { success: false, error: containerData.error?.message ?? "Erreur création container Instagram" };
    }

    const containerReady = await waitForContainerReady(
      channel.pageId,
      containerData.id,
      channel.accessToken
    );

    if (!containerReady) {
      return {
        success: false,
        fallbackUsed: true,
        fallbackType: "EXPORT_IMAGE",
        fallbackData: { content: formattedCaption, imageUrl: payload.mediaUrls[0] },
        error: "Timeout lors de la préparation du média Instagram",
      };
    }

    const publishResponse = await fetch(`${GRAPH_API_BASE}/${channel.pageId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: channel.accessToken,
      }),
    });

    const publishData = await publishResponse.json();

    if (!publishResponse.ok || publishData.error) {
      return { success: false, error: publishData.error?.message ?? "Erreur publication Instagram" };
    }

    return {
      success: true,
      externalId: publishData.id,
      externalUrl: `https://www.instagram.com/p/${publishData.id}`,
    };
  } catch (error) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "COPY_PASTE",
      fallbackData: {
        content: formatInstagramContent(payload),
        instructions: "Erreur réseau. Copiez le contenu et publiez manuellement sur Instagram.",
      },
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

async function waitForContainerReady(
  accountId: string,
  containerId: string,
  accessToken: string,
  maxAttempts = 10
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await response.json();
    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") return false;
  }
  return false;
}

function formatInstagramContent(payload: PublishPayload): string {
  let content = payload.content;
  if (payload.hashtags && payload.hashtags.length > 0) {
    content += "\n\n.\n.\n.\n" + payload.hashtags.join(" ");
  }
  return content;
}
