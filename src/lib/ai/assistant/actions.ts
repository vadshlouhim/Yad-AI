import type { createAdminClient } from "@/lib/supabase/admin";
import { sendCommunityEmail } from "@/lib/email/send-community-email";
import { generateContent } from "@/lib/ai/engine";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
import { resolveCommunityPhones, sendWhatsAppMessages, sanitizePhone } from "@/lib/whatsapp/send";
import { fromZonedTime } from "date-fns-tz";

type Admin = ReturnType<typeof createAdminClient>;

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

// Calcule une date de départ pour l'agenda à partir de la config de déclenchement.
// Retourne null si aucune date concrète n'est déterminable (on n'inscrit alors rien).
function computeAutomationStart(trigger: string, cfg: Record<string, unknown>, timezone: string): Date | null {
  const rawTime = typeof cfg.time === "string" && /^\d{1,2}:\d{2}$/.test(cfg.time) ? cfg.time : "09:00";
  const time = rawTime.length === 4 ? `0${rawTime}` : rawTime;
  const at = (ymd: string) => fromZonedTime(`${ymd}T${time}:00`, timezone);
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (typeof cfg.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cfg.date)) return at(cfg.date);

  if (Array.isArray(cfg.days) && cfg.days.length > 0) {
    const targets = cfg.days.map((d) => WEEKDAY_MAP[String(d).toLowerCase()]).filter((n) => n !== undefined);
    if (targets.length > 0) {
      const now = new Date();
      for (let i = 0; i < 14; i++) {
        const cand = new Date(now);
        cand.setDate(now.getDate() + i);
        if (targets.includes(cand.getDay())) return at(ymd(cand));
      }
    }
  }

  if (typeof cfg.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cfg.startDate)) return at(cfg.startDate);

  if (cfg.repeat === "daily" || trigger === "DAILY") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return at(ymd(tomorrow));
  }

  return null;
}

// Types d'actions exécutables par l'assistant.
export type ActionKind =
  | "update_community_settings"
  | "create_automation"
  | "toggle_automation"
  | "delete_automation"
  | "send_email"
  | "email_community"
  | "send_whatsapp"
  | "create_event"
  | "generate_content"
  | "publish_content";

// Actions soumises au mode AUTO/CONFIRM (modifient le compte ou sont irréversibles).
// generate_content en est exclu : il ne crée qu'un brouillon, sans effet visible.
export const MUTATING_ACTIONS: ActionKind[] = [
  "update_community_settings",
  "create_automation",
  "toggle_automation",
  "delete_automation",
  "send_email",
  "email_community",
  "send_whatsapp",
  "create_event",
  "publish_content",
];

export function isMutatingAction(kind: string): kind is ActionKind {
  return (MUTATING_ACTIONS as string[]).includes(kind);
}

// Libellés lisibles par type d'action (cartes, emails, notifications).
const ACTION_LABELS: Record<string, string> = {
  create_automation: "Créer une automatisation",
  toggle_automation: "Modifier une automatisation",
  delete_automation: "Supprimer une automatisation",
  update_community_settings: "Modifier les réglages",
  send_email: "Envoyer un email",
  email_community: "Email à la communauté",
  send_whatsapp: "Envoyer un WhatsApp",
  create_event: "Ajouter à l'agenda",
  generate_content: "Générer un contenu",
  publish_content: "Publier un contenu",
};

export function actionLabelFor(kind: string): string {
  return ACTION_LABELS[kind] ?? "Action de l'assistant";
}

export interface ExecuteResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

interface ExecuteContext {
  admin: Admin;
  communityId: string;
  userId: string | null;
}

// Produit un résumé lisible de l'action (affiché sur la carte, l'email, la notif).
export function summarizeAction(kind: string, payload: Record<string, unknown>): string {
  switch (kind) {
    case "update_community_settings": {
      const fields = Object.entries(payload)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k} → ${String(v)}`)
        .join(", ");
      return `Mettre à jour les réglages : ${fields || "(aucun changement)"}.`;
    }
    case "create_automation":
      return `Créer l'automatisation « ${String(payload.name ?? "Sans nom")} » (déclencheur : ${String(payload.trigger ?? "?")}).`;
    case "toggle_automation":
      return payload.isActive ? "Activer une automatisation." : "Mettre en pause une automatisation.";
    case "delete_automation":
      return "Supprimer définitivement une automatisation.";
    case "send_email":
      return `Envoyer un email à ${String(payload.to ?? "?")} — objet : « ${String(payload.subject ?? "")} ».`;
    case "email_community":
      return `Envoyer un email à toute la communauté — objet : « ${String(payload.subject ?? "")} ».`;
    case "send_whatsapp": {
      const cible =
        payload.target === "phone" && payload.phone
          ? `au ${String(payload.phone)}`
          : "à tous les contacts opt-in WhatsApp";
      return `Envoyer un message WhatsApp ${cible}.`;
    }
    case "create_event":
      return `Ajouter à l'agenda : « ${String(payload.title ?? "")} »${payload.date ? ` le ${String(payload.date)}${payload.time ? ` à ${String(payload.time)}` : ""}` : ""}.`;
    case "generate_content":
      return `Générer un contenu ${String(payload.contentType ?? "GENERAL")}${payload.instructions ? ` : ${String(payload.instructions)}` : ""}.`;
    case "publish_content": {
      const channels = Array.isArray(payload.channelTypes) ? (payload.channelTypes as string[]).join(", ") : "?";
      return `Publier le contenu sur : ${channels}.`;
    }
    default:
      return "Action de l'assistant.";
  }
}

// Exécute réellement une action. Utilisé immédiatement en mode AUTO,
// ou après validation utilisateur en mode CONFIRM.
export async function executeAction(
  ctx: ExecuteContext,
  kind: string,
  payload: Record<string, unknown>
): Promise<ExecuteResult> {
  const { admin, communityId } = ctx;

  try {
    switch (kind) {
      case "update_community_settings": {
        const allowed = ["tone", "signature", "name", "city"] as const;
        const update: Record<string, unknown> = {};
        for (const key of allowed) {
          if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
            update[key] = payload[key];
          }
        }
        if (Object.keys(update).length === 0) {
          return { success: false, message: "Aucun réglage valide à modifier." };
        }
        await admin.from("Community").update(update).eq("id", communityId);
        return { success: true, message: "Réglages mis à jour." };
      }

      case "create_automation": {
        const id = crypto.randomUUID();
        const nowIso = new Date().toISOString();
        const triggerConfig =
          payload.triggerConfig && typeof payload.triggerConfig === "object"
            ? (payload.triggerConfig as Record<string, unknown>)
            : {};
        const trigger = String(payload.trigger ?? "CUSTOM_SCHEDULE");
        const automationData = {
          id,
          communityId,
          presetId: null,
          name: String(payload.name ?? "Automatisation"),
          description: typeof payload.description === "string" ? payload.description : null,
          trigger,
          triggerConfig,
          actions: Array.isArray(payload.actions) ? payload.actions : [],
          isActive: true,
          status: "ACTIVE",
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await admin.from("Automation").insert(automationData);

        // Inscription dans l'Agenda connecté IA si une date concrète est déterminable.
        let addedToAgenda = false;
        try {
          const { data: community } = await admin.from("Community").select("timezone").eq("id", communityId).single();
          const timezone = (community as { timezone?: string } | null)?.timezone ?? "Europe/Paris";
          const start = computeAutomationStart(trigger, triggerConfig, timezone);
          if (start) {
            const eventId = crypto.randomUUID();
            const isRecurring = ["weekly", "monthly", "daily", "custom"].includes(String(triggerConfig.repeat));
            await admin.from("Event").insert({
              id: eventId,
              communityId,
              title: automationData.name,
              description: automationData.description ?? "Automatisation programmée depuis l'assistant IA.",
              startDate: start.toISOString(),
              endDate: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
              category: "OTHER",
              status: "DRAFT",
              isRecurring,
              isPublic: false,
              notes: "Créé automatiquement depuis l'assistant IA (automatisation).",
              createdAt: nowIso,
              updatedAt: nowIso,
            });
            await admin.from("Automation").update({ eventId }).eq("id", id);
            addedToAgenda = true;
          }
        } catch (e) {
          console.error("[create_automation] Inscription agenda échouée:", (e as Error).message);
        }

        return {
          success: true,
          message: addedToAgenda
            ? `Automatisation « ${automationData.name} » créée et ajoutée à votre agenda.`
            : `Automatisation « ${automationData.name} » créée.`,
          data: { id },
        };
      }

      case "toggle_automation": {
        if (!payload.automationId) return { success: false, message: "automationId manquant." };
        await admin.from("Automation").update({ isActive: Boolean(payload.isActive) }).eq("id", payload.automationId).eq("communityId", communityId);
        return { success: true, message: payload.isActive ? "Automatisation activée." : "Automatisation mise en pause." };
      }

      case "delete_automation": {
        if (!payload.automationId) return { success: false, message: "automationId manquant." };
        await admin.from("Automation").delete().eq("id", payload.automationId).eq("communityId", communityId);
        return { success: true, message: "Automatisation supprimée." };
      }

      case "send_email": {
        const result = await sendCommunityEmail(admin, communityId, {
          to: String(payload.to ?? ""),
          subject: String(payload.subject ?? ""),
          bodyText: String(payload.body ?? payload.bodyText ?? ""),
        });
        return result.success
          ? { success: true, message: `Email envoyé à ${payload.to} (via ${result.provider}).` }
          : { success: false, message: result.error ?? "Échec de l'envoi de l'email." };
      }

      case "email_community": {
        const subject = String(payload.subject ?? "");
        const body = String(payload.body ?? payload.bodyText ?? "");
        if (!subject || !body) return { success: false, message: "Sujet ou corps de l'email manquant." };
        const { data: members } = await admin
          .from("CommunityMember")
          .select("email")
          .eq("communityId", communityId)
          .eq("optInEmail", true)
          .not("email", "is", null)
          .limit(500);
        const emails = Array.from(
          new Set((members ?? []).map((m: { email: string | null }) => m.email).filter(Boolean))
        ) as string[];
        if (emails.length === 0) return { success: false, message: "Aucun contact avec email (opt-in) trouvé." };
        let sent = 0;
        for (const to of emails.slice(0, 200)) {
          const r = await sendCommunityEmail(admin, communityId, { to, subject, bodyText: body });
          if (r.success) sent++;
        }
        return { success: sent > 0, message: `Email envoyé à ${sent} contact${sent > 1 ? "s" : ""}.` };
      }

      case "send_whatsapp": {
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
          phones = await resolveCommunityPhones(admin, communityId);
          if (phones.length === 0) return { success: false, message: "Aucun contact opt-in WhatsApp dans la communauté." };
          cibleLabel = `à ${phones.length} contact${phones.length > 1 ? "s" : ""}`;
        }

        const result = await sendWhatsAppMessages({ communityId, phones, text, admin });
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
      }

      case "create_event": {
        const title = String(payload.title ?? "").trim();
        if (!title) return { success: false, message: "Titre de l'événement manquant." };
        const { data: community } = await admin.from("Community").select("timezone").eq("id", communityId).single();
        const timezone = (community as { timezone?: string } | null)?.timezone ?? "Europe/Paris";
        const dateStr = typeof payload.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.date) ? payload.date : null;
        const rawTime = typeof payload.time === "string" && /^\d{1,2}:\d{2}$/.test(payload.time) ? payload.time : "10:00";
        const timeStr = rawTime.length === 4 ? `0${rawTime}` : rawTime;
        const start = dateStr
          ? fromZonedTime(`${dateStr}T${timeStr}:00`, timezone)
          : new Date(Date.now() + 24 * 60 * 60 * 1000);
        const nowIso = new Date().toISOString();
        const eventId = crypto.randomUUID();
        await admin.from("Event").insert({
          id: eventId,
          communityId,
          title,
          description: typeof payload.description === "string" ? payload.description : null,
          startDate: start.toISOString(),
          endDate: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
          category: "OTHER",
          status: "DRAFT",
          isRecurring: false,
          isPublic: false,
          notes: "Ajouté depuis l'assistant IA.",
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        return { success: true, message: `« ${title} » ajouté à votre agenda.`, data: { eventId } };
      }

      case "generate_content": {
        const result = await generateContent({
          communityId,
          contentType: (payload.contentType ?? "GENERAL") as never,
          eventId: (payload.eventId as string | undefined) ?? undefined,
          customInstructions: payload.instructions as string | undefined,
        });
        const { data: draft } = await admin
          .from("ContentDraft")
          .insert({
            id: crypto.randomUUID(),
            communityId,
            body: result.body,
            title: null,
            hashtags: result.hashtags ?? [],
            contentType: (payload.contentType ?? "GENERAL") as never,
            status: "AI_PROPOSAL",
            aiGenerated: true,
            aiPromptUsed: (payload.instructions as string | undefined) ?? null,
            updatedAt: new Date().toISOString(),
          })
          .select("id")
          .single();
        return {
          success: true,
          message: "Contenu généré et enregistré en brouillon.",
          data: { draftId: (draft as { id?: string } | null)?.id, body: result.body, hashtags: result.hashtags },
        };
      }

      case "publish_content": {
        const draftId = payload.draftId as string | undefined;
        const channelTypes = Array.isArray(payload.channelTypes) ? (payload.channelTypes as string[]) : [];
        if (!draftId || channelTypes.length === 0) {
          return { success: false, message: "draftId ou channelTypes manquant pour la publication." };
        }
        const { data: channels } = await admin
          .from("Channel")
          .select("id")
          .eq("communityId", communityId)
          .in("type", channelTypes)
          .eq("isActive", true);
        const channelIds = (channels ?? []).map((c: { id: string }) => c.id);
        if (channelIds.length === 0) {
          return { success: false, message: "Aucun canal actif trouvé pour ces plateformes." };
        }
        await createPublicationsFromDraft({ draftId, communityId, channelIds });
        publishToAllChannels(draftId, channelIds).catch(console.error);
        return { success: true, message: `Publication lancée sur ${channelIds.length} canal(aux).` };
      }

      default:
        return { success: false, message: `Action inconnue : ${kind}.` };
    }
  } catch (error) {
    return { success: false, message: `Erreur : ${(error as Error).message}` };
  }
}
