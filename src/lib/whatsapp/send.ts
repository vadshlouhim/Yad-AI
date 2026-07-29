import { createAdminClient } from "@/lib/supabase/admin";

const GRAPH_VERSION = "v21.0";
const SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

// Codes Meta indiquant qu'un template approuvé est requis hors fenêtre 24 h.
const TEMPLATE_REQUIRED_CODES = new Set([131047, 131026, 470, 131051]);

type Admin = ReturnType<typeof createAdminClient>;

export interface WhatsAppCredentials {
  token: string | null;
  phoneNumberId: string | null;
  templateName: string | null;
  templateLanguage: string;
  mode: "cloud" | "personal";
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

// Erreur Puppeteer indiquant que la session WhatsApp Web personnelle est morte
// (frame détaché, contexte détruit, page fermée) → il faut rescanner le QR.
function isDeadSessionError(message: string | null | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("detached frame") ||
    m.includes("execution context was destroyed") ||
    m.includes("session closed") ||
    m.includes("target closed") ||
    m.includes("protocol error") ||
    m.includes("page has been closed")
  );
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
  const mode = settings.mode === "personal" ? "personal" : "cloud";

  return {
    token: channel?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || null,
    phoneNumberId: channel?.pageId || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    templateName: typeof settings.templateName === "string" ? settings.templateName : null,
    templateLanguage: typeof settings.templateLanguage === "string" ? settings.templateLanguage : "fr",
    mode,
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

// ── Mode personnel (whatsapp-web.js) ────────────────────────────────────────

async function sendViaPersonalService(params: {
  communityId: string;
  phones: string[];
  text: string;
  mediaUrls?: string[];
}): Promise<WhatsAppSendResult> {
  if (!SERVICE_URL || !SERVICE_SECRET) {
    return {
      configured: false,
      sent: 0,
      failed: params.phones.length,
      total: params.phones.length,
      templateRequired: false,
      errors: ["WHATSAPP_SERVICE_URL non configuré côté serveur."],
    };
  }

  try {
    const res = await fetch(`${SERVICE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-secret": SERVICE_SECRET,
      },
      body: JSON.stringify({
        communityId: params.communityId,
        phones: params.phones,
        text: params.text,
        mediaUrls: params.mediaUrls ?? [],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (res.status === 409) {
      return {
        configured: true,
        sent: 0,
        failed: params.phones.length,
        total: params.phones.length,
        templateRequired: false,
        errors: ["WhatsApp non connecté. Scannez le QR code dans la page WhatsApp."],
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      console.error("[WhatsApp send] Réponse non-JSON Railway :", res.status, text.slice(0, 200));
      return {
        configured: true,
        sent: 0,
        failed: params.phones.length,
        total: params.phones.length,
        templateRequired: false,
        errors: [`Erreur service (HTTP ${res.status}) — réessayez dans quelques secondes.`],
      };
    }

    const data = (await res.json()) as { sent?: number; failed?: number; total?: number; errors?: string[] };
    // Traduit les erreurs techniques Puppeteer (session WhatsApp Web morte) en
    // message clair invitant à rescanner le QR code.
    const errors = (data.errors ?? []).map((e) =>
      isDeadSessionError(e)
        ? "La session WhatsApp a expiré. Reconnectez votre numéro en scannant le QR code."
        : e
    );
    return {
      configured: true,
      sent: data.sent ?? 0,
      failed: data.failed ?? params.phones.length,
      total: data.total ?? params.phones.length,
      templateRequired: false,
      errors: Array.from(new Set(errors)),
    };
  } catch (err) {
    return {
      configured: true,
      sent: 0,
      failed: params.phones.length,
      total: params.phones.length,
      templateRequired: false,
      errors: [err instanceof Error ? err.message : "Service WhatsApp injoignable."],
    };
  }
}

// ── Mode cloud (Meta Cloud API) ──────────────────────────────────────────────

async function sendViaCloudApi(params: {
  phones: string[];
  text: string;
  mediaUrls?: string[];
  creds: WhatsAppCredentials;
}): Promise<WhatsAppSendResult> {
  const { phones, text, mediaUrls = [], creds } = params;

  if (!creds.token || !creds.phoneNumberId) {
    return {
      configured: false,
      sent: 0,
      failed: phones.length,
      total: phones.length,
      templateRequired: false,
      errors: ["WhatsApp non configuré (Phone Number ID ou token manquant)."],
    };
  }

  const apiUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`;
  let sent = 0;
  let templateRequired = false;
  const errors: string[] = [];

  for (const to of phones) {
    const mediaUrl = mediaUrls[0];
    const body = creds.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: creds.templateName, language: { code: creds.templateLanguage } },
        }
      : mediaUrl
      ? {
          messaging_product: "whatsapp",
          to,
          type: "image",
          image: { link: mediaUrl, caption: text || undefined },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { preview_url: true, body: text },
        };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${creds.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok && (data as { messages?: unknown[] })?.messages?.length) {
        sent += 1;
      } else {
        const code = (data as { error?: { code?: number; message?: string } })?.error?.code;
        if (code && TEMPLATE_REQUIRED_CODES.has(code)) templateRequired = true;
        errors.push((data as { error?: { message?: string } })?.error?.message ?? `HTTP ${response.status}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Erreur réseau");
    }

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

// ── Point d'entrée principal ─────────────────────────────────────────────────

export async function sendWhatsAppMessages(params: {
  communityId: string;
  phones: string[];
  text: string;
  mediaUrls?: string[];
  admin?: Admin;
}): Promise<WhatsAppSendResult> {
  const admin = params.admin ?? createAdminClient();
  const phones = Array.from(
    new Set(params.phones.map((p) => sanitizePhone(p)).filter((p): p is string => Boolean(p)))
  );

  if (phones.length === 0) {
    return { configured: true, sent: 0, failed: 0, total: 0, templateRequired: false, errors: ["Aucun destinataire valide."] };
  }

  const creds = await getWhatsAppCredentials(admin, params.communityId);

  if (creds.mode === "personal") {
    return sendViaPersonalService({ communityId: params.communityId, phones, text: params.text, mediaUrls: params.mediaUrls });
  }

  return sendViaCloudApi({ phones, text: params.text, mediaUrls: params.mediaUrls, creds });
}
