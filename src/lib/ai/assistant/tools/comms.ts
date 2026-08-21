import { sendCommunityEmail } from "@/lib/email/send-community-email";
import { resolveCommunityPhones, sendWhatsAppMessages, sanitizePhone } from "@/lib/whatsapp/send";
import type { AssistantToolDef, BuildToolsContext } from "../types";
import { resolveGate } from "./shared";

// Communications directes : email individuel (Business), newsletter communauté, WhatsApp (payant).
// Toutes IRREVERSIBLE : validation systématique, même en mode AUTO.

function gmailConnectedDescription(connected: boolean): string {
  return connected
    ? "Prépare et envoie un email depuis la boîte Gmail connectée."
    : "Prépare et envoie un email (via le canal email configuré, fallback Resend).";
}

export const sendEmail: AssistantToolDef = {
  name: "send_email",
  label: "Envoyer un email",
  summarize: (payload) =>
    `Envoyer un email à ${String(payload.to ?? "?")} — objet : « ${String(payload.subject ?? "")} ».`,
  // Aligné sur /api/email/send : la gestion des emails est réservée à l'offre Business.
  availability: (ctx: BuildToolsContext) => ctx.isSuperAdmin || ctx.isPaid,
  schema: {
    type: "function",
    function: {
      name: "send_email",
      description: gmailConnectedDescription(false),
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Adresse email du destinataire" },
          subject: { type: "string" },
          body: { type: "string", description: "Contenu de l'email" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const gate = await resolveGate(ctx);
    if (gate && !gate.isPaid) {
      return {
        success: false,
        message: "La gestion des emails est réservée à l'offre Business.",
        code: "PAYWALL_REQUIRED",
      };
    }
    const result = await sendCommunityEmail(ctx.admin, ctx.communityId, {
      to: String(payload.to ?? ""),
      subject: String(payload.subject ?? ""),
      bodyText: String(payload.body ?? payload.bodyText ?? ""),
    });
    return result.success
      ? { success: true, message: `Email envoyé à ${payload.to} (via ${result.provider}).` }
      : { success: false, message: result.error ?? "Échec de l'envoi de l'email." };
  },
};

export const emailCommunity: AssistantToolDef = {
  name: "email_community",
  label: "Email à la communauté",
  summarize: (payload) =>
    `Envoyer un email à toute la communauté — objet : « ${String(payload.subject ?? "")} ».`,
  schema: {
    type: "function",
    function: {
      name: "email_community",
      description: "Envoie un email à TOUS les contacts de la communauté qui ont accepté les emails (opt-in).",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string" },
          body: { type: "string", description: "Contenu de l'email" },
        },
        required: ["subject", "body"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const subject = String(payload.subject ?? "");
    const body = String(payload.body ?? payload.bodyText ?? "");
    if (!subject || !body) return { success: false, message: "Sujet ou corps de l'email manquant." };
    const { data: members } = await ctx.admin
      .from("CommunityMember")
      .select("email")
      .eq("communityId", ctx.communityId)
      .eq("optInEmail", true)
      .not("email", "is", null)
      .limit(500);
    const emails = Array.from(
      new Set((members ?? []).map((m: { email: string | null }) => m.email).filter(Boolean))
    ) as string[];
    if (emails.length === 0) return { success: false, message: "Aucun contact avec email (opt-in) trouvé." };
    let sent = 0;
    for (const to of emails.slice(0, 200)) {
      const r = await sendCommunityEmail(ctx.admin, ctx.communityId, { to, subject, bodyText: body });
      if (r.success) sent++;
    }
    return { success: sent > 0, message: `Email envoyé à ${sent} contact${sent > 1 ? "s" : ""}.` };
  },
};

export const sendWhatsapp: AssistantToolDef = {
  name: "send_whatsapp",
  label: "Envoyer un WhatsApp",
  summarize: (payload) => {
    const cible =
      payload.target === "phone" && payload.phone
        ? `au ${String(payload.phone)}`
        : "à tous les contacts opt-in WhatsApp";
    return `Envoyer un message WhatsApp ${cible}.`;
  },
  availability: (ctx: BuildToolsContext) => ctx.isSuperAdmin || ctx.isPaid,
  schema: {
    type: "function",
    function: {
      name: "send_whatsapp",
      description:
        "Envoie un message WhatsApp. Par défaut à TOUS les contacts opt-in WhatsApp de la communauté (target='community'), ou à un seul numéro si l'utilisateur le précise (target='phone' + phone). Toujours confirmer la cible (communauté entière vs numéro) si elle est ambiguë.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "Contenu du message WhatsApp prêt à envoyer" },
          target: {
            type: "string",
            enum: ["community", "phone"],
            description: "community = tous les contacts opt-in ; phone = un seul numéro",
          },
          phone: { type: "string", description: "Numéro au format international si target='phone'" },
        },
        required: ["text"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const gate = await resolveGate(ctx);
    if (gate && !gate.isPaid) {
      return {
        success: false,
        message: "WhatsApp est réservé aux offres payantes. Passez à l'offre Pro ou Business pour utiliser cette fonctionnalité.",
        code: "PAYWALL_REQUIRED",
      };
    }

    const text = String(payload.text ?? "").trim();
    if (!text) return { success: false, message: "Message WhatsApp vide." };

    let phones: string[];
    let cibleLabel: string;
    if (payload.target === "phone") {
      const phone = sanitizePhone(String(payload.phone ?? ""));
      if (!phone) return { success: false, message: "Numéro de téléphone invalide." };
      phones = [phone];
      cibleLabel = `au ${String(payload.phone)}`;
    } else {
      phones = await resolveCommunityPhones(ctx.admin, ctx.communityId);
      if (phones.length === 0) return { success: false, message: "Aucun contact opt-in WhatsApp dans la communauté." };
      cibleLabel = `à ${phones.length} contact${phones.length > 1 ? "s" : ""}`;
    }

    const result = await sendWhatsAppMessages({ communityId: ctx.communityId, phones, text, admin: ctx.admin });
    if (!result.configured) {
      return {
        success: false,
        message: "WhatsApp n'est pas configuré (Phone Number ID manquant dans Réglages → Canaux).",
      };
    }
    if (result.sent === 0 && result.templateRequired) {
      return {
        success: false,
        message: "WhatsApp exige un template approuvé hors fenêtre de 24 h. Configurez-le dans Réglages → Canaux.",
      };
    }
    return {
      success: result.sent > 0,
      message:
        result.sent > 0
          ? `Message WhatsApp envoyé ${cibleLabel}.`
          : `Aucun envoi abouti${result.errors[0] ? ` : ${result.errors[0]}` : "."}`,
      data: { sent: result.sent, failed: result.failed, total: result.total },
    };
  },
};

export const commsTools: AssistantToolDef[] = [sendEmail, emailCommunity, sendWhatsapp];
