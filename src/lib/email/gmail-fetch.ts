import { getGmailClient } from "@/lib/gmail";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(input: string): string {
  if (!input) return input;
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (Number.isNaN(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function hasAttachment(payload: { filename?: string | null; parts?: Array<{ filename?: string | null; parts?: unknown[] }> } | null | undefined): boolean {
  if (!payload) return false;
  if (payload.filename) return true;
  if (!Array.isArray(payload.parts)) return false;
  return payload.parts.some((part) =>
    Boolean(part.filename) ||
    (Array.isArray(part.parts) &&
      part.parts.some((child) => Boolean((child as { filename?: string | null }).filename)))
  );
}

export interface GmailFetchedMessage {
  id: string;
  threadId: string | null;
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  date: string;
  timestamp: number;
  read: boolean;
  hasAttachment: boolean;
  history: Array<{
    role: "user" | "assistant";
    body: string;
    date: string;
  }>;
}

export async function fetchGmailMessages(refreshToken: string, maxResults = 15): Promise<GmailFetchedMessage[]> {
  const gmail = getGmailClient(refreshToken);
  const res = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const messages = await Promise.all(
    (res.data.messages || []).map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const headers = detail.data.payload?.headers;
      const subject = decodeHtmlEntities(headers?.find((h) => h.name === "Subject")?.value || "Sans sujet");
      const from = decodeHtmlEntities(headers?.find((h) => h.name === "From")?.value || "Inconnu");
      const date = headers?.find((h) => h.name === "Date")?.value || "";
      const body = decodeHtmlEntities(detail.data.snippet || "");

      return {
        id: msg.id!,
        threadId: detail.data.threadId ?? null,
        sender: from.split("<")[0].trim() || from,
        senderEmail: from.match(/<([^>]+)>/)?.[1] || from,
        subject,
        body,
        date: new Date(date).toLocaleDateString("fr-FR"),
        timestamp: new Date(date).getTime(),
        read: !detail.data.labelIds?.includes("UNREAD"),
        hasAttachment: hasAttachment(detail.data.payload),
        history: [{ role: "user" as const, body, date: new Date(date).toLocaleTimeString("fr-FR") }],
      };
    })
  );

  return messages.sort((a, b) => b.timestamp - a.timestamp);
}
