import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v21.0";

// Codes d'erreur Meta indiquant qu'un message texte libre est refusé hors
// fenêtre de service 24 h : un template approuvé est alors requis.
const TEMPLATE_REQUIRED_CODES = new Set([131047, 131026, 470, 131051]);

type Admin = ReturnType<typeof createAdminClient>;

export interface WhatsAppCredentials {
  token: string | null;
  phoneNumberId: string | null;
  templateName: string | null;
  templateLanguage: string;
}

export interface WhatsAppSendResult {
  configured: boolean;
  sent: number;
  failed: number;
  total: number;
  templateRequired: boolean;
  errors: string[];
}

function adminFrom(admin: Admin) {
  return admin as Admin & { from: (table: string) => ReturnType<Admin["from"]> };
}

export function sanitizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}

export async function getWhatsAppCredentials(
  admin: Admin,
  communityId: string
): Promise<WhatsAppCredentials> {
  const { data: channel } = await adminFrom(admin)
    .from("Channel")
    .select("accessToken,pageId,settings")
    .eq("communityId", communityId)
    .eq("type", "WHATSAPP")
    .maybeSingle();

  const settings = (channel?.settings as Record<string, unknown> | null) ?? {};
  return {
    token: channel?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || null,
    phoneNumberId: channel?.pageId || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    templateName: typeof settings.templateName === "string" ? settings.templateName : null,
    templateLanguage: typeof settings.templateLanguage === "string" ? settings.templateLanguage : "fr",
  };
}

/** Numéros des contacts opt-in WhatsApp de la communauté. */
export async function resolveCommunityPhones(admin: Admin, communityId: string): Promise<string[]> {
  const { data } = await adminFrom(admin)
    .from("CommunityMember")
    .select("phone")
    .eq("communityId", communityId)
    .eq("optInWhatsapp", true)
    .not("phone", "is", null);

  const phones = (data ?? [])
    .map((m: { phone: string | null }) => sanitizePhone(m.phone))
    .filter((p): p is string => Boolean(p));
  return Array.from(new Set(phones));
}

/**
 * Envoie un message WhatsApp via la Cloud API à une liste de numéros.
 * Identifiants résolus depuis le canal WHATSAPP de la communauté (ou l'env).
 */
export async function sendWhatsAppMessages(params: {
  communityId: string;
  phones: string[];
  text: string;
  admin?: Admin;
}): Promise<WhatsAppSendResult> {
  const admin = params.admin ?? createAdminClient();
  const phones = Array.from(
    new Set(params.phones.map((p) => sanitizePhone(p)).filter((p): p is string => Boolean(p)))
  );

  const { token, phoneNumberId, templateName, templateLanguage } = await getWhatsAppCredentials(
    admin,
    params.communityId
  );

  if (!token || !phoneNumberId) {
    return {
      configured: false,
      sent: 0,
      failed: phones.length,
      total: phones.length,
      templateRequired: false,
      errors: ["WhatsApp n'est pas configuré (Phone Number ID ou token manquant)."],
    };
  }

  if (phones.length === 0) {
    return { configured: true, sent: 0, failed: 0, total: 0, templateRequired: false, errors: ["Aucun destinataire valide."] };
  }

  const apiUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  let sent = 0;
  let templateRequired = false;
  const errors: string[] = [];

  for (const to of phones) {
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
          text: { preview_url: true, body: params.text },
        };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

  return {
    configured: true,
    sent,
    failed: phones.length - sent,
    total: phones.length,
    templateRequired,
    errors: Array.from(new Set(errors)).slice(0, 5),
  };
}
