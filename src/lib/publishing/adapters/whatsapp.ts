import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessages } from "@/lib/whatsapp/send";

type Channel = Tables<"Channel">;

interface WhatsAppRecipient {
  name: string;
  phone: string | null;
  deepLink: string | null;
}

/**
 * Publication WhatsApp via la Cloud API (cf. `@/lib/whatsapp/send`).
 * Envoie aux contacts opt-in WhatsApp ; bascule sur le repli copier-coller
 * (lien wa.me) si non configuré, sans destinataire, ou si Meta exige un template.
 */
export async function publishToWhatsApp(
  channel: Channel,
  payload: PublishPayload,
  communityId: string
): Promise<PublishResult> {
  const content = formatWhatsAppContent(payload);
  const recipients = await loadOptInRecipients(communityId, content);
  const selectedPhones = Array.isArray(payload.metadata?.whatsappRecipientPhones)
    ? payload.metadata.whatsappRecipientPhones.filter((value): value is string => typeof value === "string")
    : [];
  const phones = selectedPhones.length > 0
    ? selectedPhones
    : recipients.map((r) => r.phone?.replace(/[^\d]/g, "") ?? "").filter((p) => p.length >= 8);

  const result = await sendWhatsAppMessages({ communityId, phones, text: content, mediaUrls: payload.mediaUrls ?? [] });

  if (result.sent > 0) {
    return {
      success: true,
      externalId: `whatsapp:${result.sent}/${result.total}`,
      error: result.failed > 0 ? `${result.failed} envoi(s) en échec` : undefined,
    };
  }

  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "COPY_PASTE",
    fallbackData: {
      content,
      instructions: buildFallbackInstructions(result, channel.name, recipients.length > 0),
      channelName: channel.name,
      recipients: selectedPhones.length > 0
        ? recipients.filter((recipient) => recipient.phone && selectedPhones.includes(recipient.phone.replace(/[^\d]/g, "")))
        : recipients,
      deepLink: `https://wa.me/?text=${encodeURIComponent(content)}`,
    },
    error: result.errors[0] ?? "Envoi WhatsApp indisponible",
  };
}

function buildFallbackInstructions(
  result: { configured: boolean; templateRequired: boolean; errors: string[] },
  channelName: string,
  hasRecipients: boolean
): string[] {
  if (result.templateRequired) {
    return [
      "WhatsApp refuse l'envoi automatique de texte libre hors fenêtre de 24 h.",
      "Configurez un template approuvé dans Meta Business, ou copiez le message ci-dessous pour l'envoyer manuellement.",
    ];
  }
  if (!result.configured) {
    return [
      "1. Copiez le texte ci-dessous",
      "2. Ouvrez WhatsApp sur votre téléphone",
      hasRecipients
        ? "3. Envoyez-le aux contacts de la communauté listés ci-dessous"
        : `3. Accédez à votre canal ou groupe "${channelName}"`,
      "4. Collez et envoyez le message",
    ];
  }
  return [
    "L'envoi automatique a échoué.",
    result.errors[0] ?? "Erreur inconnue",
    "Copiez le message ci-dessous pour l'envoyer manuellement.",
  ];
}

export async function prepareWhatsAppFallback(
  channel: Channel,
  payload: PublishPayload,
  communityId: string
): Promise<PublishResult> {
  const formattedContent = formatWhatsAppContent(payload);
  const recipients = await loadOptInRecipients(communityId, formattedContent);

  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "COPY_PASTE",
    fallbackData: {
      content: formattedContent,
      instructions: [
        "1. Copiez le texte ci-dessous",
        "2. Ouvrez WhatsApp sur votre téléphone",
        recipients.length > 0
          ? "3. Envoyez-le aux contacts de la communauté listés ci-dessous"
          : `3. Accédez à votre canal ou groupe "${channel.name}"`,
        "4. Collez et envoyez le message",
      ],
      channelName: channel.name,
      recipients,
      deepLink: `https://wa.me/?text=${encodeURIComponent(formattedContent)}`,
    },
  };
}

async function loadOptInRecipients(
  communityId: string,
  formattedContent: string
): Promise<WhatsAppRecipient[]> {
  const supabase = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };
  const { data: members } = await supabase
    .from("CommunityMember")
    .select("displayName,phone")
    .eq("communityId", communityId)
    .eq("optInWhatsapp", true)
    .not("phone", "is", null);

  return (members ?? []).map((member: { displayName: string; phone: string | null }) => ({
    name: member.displayName,
    phone: member.phone,
    deepLink: member.phone
      ? `https://wa.me/${member.phone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(formattedContent)}`
      : null,
  }));
}

function formatWhatsAppContent(payload: PublishPayload): string {
  return payload.content;
}
