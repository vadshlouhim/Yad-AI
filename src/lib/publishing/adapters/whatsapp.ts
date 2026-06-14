import type { Tables } from "@/types/database.types";
import type { PublishPayload, PublishResult } from "../publisher";
import { createAdminClient } from "@/lib/supabase/admin";

type Channel = Tables<"Channel">;

const GRAPH_VERSION = "v21.0";

// Codes d'erreur Meta indiquant qu'un message texte libre est refusé hors
// fenêtre de service 24 h : il faut alors un template approuvé. On bascule
// dans ce cas sur le repli copier-coller plutôt que d'échouer sèchement.
const TEMPLATE_REQUIRED_CODES = new Set([131047, 131026, 470, 131051]);

interface WhatsAppRecipient {
  name: string;
  phone: string | null;
  deepLink: string | null;
}

/**
 * Publication WhatsApp via la Cloud API (graph.facebook.com).
 *
 * Identifiants : `channel.accessToken` (sinon `WHATSAPP_ACCESS_TOKEN`) et
 * `channel.pageId` = Phone Number ID (sinon `WHATSAPP_PHONE_NUMBER_ID`).
 * Destinataires : les `CommunityMember` opt-in WhatsApp ayant un téléphone.
 *
 * Si les identifiants manquent, ou si Meta exige un template hors fenêtre 24 h,
 * on retombe sur le mode copier-coller (lien wa.me).
 */
export async function publishToWhatsApp(
  channel: Channel,
  payload: PublishPayload,
  communityId: string
): Promise<PublishResult> {
  const token = channel.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = channel.pageId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Pas d'identifiants Cloud API → repli copier-coller historique.
  if (!token || !phoneNumberId) {
    return prepareWhatsAppFallback(channel, payload, communityId);
  }

  const content = formatWhatsAppContent(payload);
  const recipients = await loadOptInRecipients(communityId, content);
  const reachable = recipients.filter((r) => r.phone && r.phone.replace(/[^\d]/g, "").length >= 8);

  if (reachable.length === 0) {
    return {
      success: false,
      fallbackUsed: true,
      fallbackType: "COPY_PASTE",
      fallbackData: {
        content,
        instructions: [
          "Aucun contact n'a activé l'opt-in WhatsApp avec un numéro valide.",
          "Ajoutez des contacts opt-in, ou copiez le message ci-dessous pour l'envoyer manuellement.",
        ],
        channelName: channel.name,
        recipients,
        deepLink: `https://wa.me/?text=${encodeURIComponent(content)}`,
      },
      error: "Aucun destinataire opt-in WhatsApp",
    };
  }

  const settings = (channel.settings as Record<string, unknown> | null) ?? {};
  const templateName = typeof settings.templateName === "string" ? settings.templateName : null;
  const templateLanguage =
    typeof settings.templateLanguage === "string" ? settings.templateLanguage : "fr";

  const apiUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;

  let sent = 0;
  let templateRequired = false;
  const errors: string[] = [];

  for (const recipient of reachable) {
    const to = recipient.phone!.replace(/[^\d]/g, "");
    const body = templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: templateName, language: { code: templateLanguage } },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: true, body: content },
        };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (response.ok && data?.messages?.length) {
        sent += 1;
      } else {
        const code = data?.error?.code;
        if (TEMPLATE_REQUIRED_CODES.has(code)) templateRequired = true;
        errors.push(data?.error?.message ?? `HTTP ${response.status}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Erreur réseau");
    }

    // Throttle léger pour rester sous les limites de débit Cloud API.
    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  if (sent > 0) {
    return {
      success: true,
      externalId: `whatsapp:${sent}/${reachable.length}`,
      error: errors.length > 0 ? `${errors.length} envoi(s) en échec` : undefined,
    };
  }

  // Aucun envoi réussi : repli copier-coller, avec message adapté si Meta
  // réclame un template approuvé.
  return {
    success: false,
    fallbackUsed: true,
    fallbackType: "COPY_PASTE",
    fallbackData: {
      content,
      instructions: templateRequired
        ? [
            "WhatsApp refuse l'envoi automatique de texte libre hors fenêtre de 24 h.",
            "Configurez un template approuvé dans Meta Business, ou copiez le message ci-dessous pour l'envoyer manuellement.",
          ]
        : [
            "L'envoi automatique a échoué.",
            errors[0] ?? "Erreur inconnue",
            "Copiez le message ci-dessous pour l'envoyer manuellement.",
          ],
      channelName: channel.name,
      recipients,
      deepLink: `https://wa.me/?text=${encodeURIComponent(content)}`,
    },
    error: errors[0] ?? "Envoi WhatsApp échoué",
  };
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
