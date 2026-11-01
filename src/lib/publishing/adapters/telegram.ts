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
    const plainContent = formatTelegramPlainContent(payload);
    const apiBase = `https://api.telegram.org/bot${botToken}`;

    if (payload.mediaUrls && payload.mediaUrls.length > 0) {
      const caption = plainContent.slice(0, 1024);
      const response = await fetch(`${apiBase}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: payload.mediaUrls[0],
          caption,
        }),
      });
      const data = await response.json();
      if (!data.ok) {
        const fallbackResponse = await fetch(`${apiBase}/sendDocument`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            document: payload.mediaUrls[0],
            caption,
          }),
        });
        const fallbackData = await fallbackResponse.json();
        if (!fallbackData.ok) return { success: false, error: fallbackData.description ?? data.description ?? "Erreur Telegram" };
        const followUpError = await sendTelegramTextChunks(apiBase, chatId, plainContent.slice(1024));
        if (followUpError) return { success: false, error: followUpError };
        return { success: true, externalId: fallbackData.result.message_id.toString() };
      }
      const followUpError = await sendTelegramTextChunks(apiBase, chatId, plainContent.slice(1024));
      if (followUpError) return { success: false, error: followUpError };
      return { success: true, externalId: data.result.message_id.toString() };
    }

    if (formattedContent.length > 4096) {
      const chunkError = await sendTelegramTextChunks(apiBase, chatId, plainContent);
      return chunkError ? { success: false, error: chunkError } : { success: true };
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
  let content = payload.content;
  if (payload.hashtags && payload.hashtags.length > 0) {
    content += "\n\n" + payload.hashtags.slice(0, 10).join(" ");
  }

  return content
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>");
}

function formatTelegramPlainContent(payload: PublishPayload): string {
  return [payload.content, payload.hashtags?.slice(0, 10).join(" ")].filter(Boolean).join("\n\n");
}

export function splitTelegramText(text: string, limit = 4096): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit);
    const breakAt = Math.max(candidate.lastIndexOf("\n"), candidate.lastIndexOf(" "));
    const end = breakAt > limit / 2 ? breakAt : limit;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function sendTelegramTextChunks(apiBase: string, chatId: string, text: string): Promise<string | null> {
  for (const chunk of splitTelegramText(text)) {
    const response = await fetch(`${apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk, disable_web_page_preview: false }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) return data.description ?? "Telegram a refusé une partie du message.";
  }
  return null;
}
