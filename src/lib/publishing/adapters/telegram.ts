import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";

type Channel = Tables<"Channel">;

export async function publishToTelegram(
  channel: Channel,
  payload: PublishPayload
): Promise<PublishResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const settings = channel.settings as Record<string, string> | null;
  const chatId = settings?.chatId ?? channel.handle;

  if (!botToken || !chatId) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "COPY_PASTE",
      fallbackData: {
        content: formatTelegramContent(payload),
        instructions: "Configurez le Bot Telegram dans les Paramètres pour la publication directe.",
      },
      error: "Bot Telegram ou Chat ID non configuré",
    };
  }

  try {
    const formattedContent = formatTelegramContent(payload);
    const apiBase = `https://api.telegram.org/bot${botToken}`;

    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      const response = await fetch(`${apiBase}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: payload.mediaUrls[0],
          caption: formattedContent.substring(0, 1024),
          parse_mode: "HTML",
        }),
      });
      const data = await response.json();
      if (!data.ok) return { success: false, error: data.description ?? "Erreur Telegram" };
      return { success: true, externalId: data.result.message_id.toString() };
    }

    const response = await fetch(`${apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedContent,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    if (!data.ok) return { success: false, error: data.description ?? "Erreur Telegram" };
    return { success: true, externalId: data.result.message_id.toString() };
  } catch (error) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "COPY_PASTE",
      fallbackData: {
        content: formatTelegramContent(payload),
        instructions: "Erreur réseau. Copiez le message et envoyez-le manuellement sur Telegram.",
      },
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

function formatTelegramContent(payload: PublishPayload): string {
  return payload.content
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>");
}
