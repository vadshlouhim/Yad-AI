import { fromZonedTime } from "date-fns-tz";
import { TIER_LIMITS, getBillingUsage, tierLimitMessage } from "@/lib/billing";
import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { panelId, resolveGate, truncate } from "./shared";

// Automatisations : lecture, création (quota palier), modification, activation/pause, suppression.

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
};

// Calcule une date de départ pour l'agenda à partir de la config de déclenchement.
// Retourne null si aucune date concrète n'est déterminable (on n'inscrit alors rien).
function computeAutomationStart(trigger: string, cfg: Record<string, unknown>, timezone: string): Date | null {
  // Priorité à eventTime (heure réelle de l'événement) sur time (heure de déclenchement du rappel).
  const rawEventTime = typeof cfg.eventTime === "string" && /^\d{1,2}:\d{2}$/.test(cfg.eventTime) ? cfg.eventTime : null;
  const rawTriggerTime = typeof cfg.time === "string" && /^\d{1,2}:\d{2}$/.test(cfg.time) ? cfg.time : "09:00";
  const rawTime = rawEventTime ?? rawTriggerTime;
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

export const listAutomations: AssistantToolDef = {
  name: "list_automations",
  label: "Consulter les automatisations",
  summarize: () => "Consulter les automatisations de la communauté.",
  schema: {
    type: "function",
    function: {
      name: "list_automations",
      description: "Liste les automatisations existantes de la communauté (actives et en pause).",
      parameters: { type: "object", properties: {} },
    },
  },
  read: async (ctx) => {
    const { data } = await ctx.admin
      .from("Automation")
      .select("id, name, description, trigger, isActive, status, nextRunAt")
      .eq("communityId", ctx.communityId)
      .order("createdAt", { ascending: false })
      .limit(20);
    const automations = data ?? [];

    const items: PanelItem[] = automations.map((a) => ({
      id: a.id,
      title: a.name,
      subtitle: a.description ? truncate(a.description) : `Déclencheur : ${a.trigger}`,
      badge: a.isActive ? "Active" : "En pause",
      actions: [
        {
          id: `toggle-${a.id}`,
          label: a.isActive ? "Mettre en pause" : "Activer",
          style: "default" as const,
          kind: "execute_tool" as const,
          toolKind: "toggle_automation",
          payload: { automationId: a.id, isActive: !a.isActive },
        },
        {
          id: `del-${a.id}`,
          label: "Supprimer",
          style: "danger" as const,
          kind: "execute_tool" as const,
          toolKind: "delete_automation",
          payload: { automationId: a.id },
          confirm: true,
        },
      ],
    }));

    return {
      llmResult: {
        automations: automations.map((a) => ({ id: a.id, name: a.name, trigger: a.trigger, isActive: a.isActive, status: a.status })),
      },
      panel: {
        id: panelId("automations"),
        panelType: "entity_list",
        entity: "automation",
        title: `Automatisations — ${automations.length}`,
        emptyText: "Aucune automatisation pour l'instant.",
        items,
        meta: { total: automations.length },
      },
    };
  },
};

export const createAutomation: AssistantToolDef = {
  name: "create_automation",
  label: "Créer une automatisation",
  summarize: (payload) =>
    `Créer l'automatisation « ${String(payload.name ?? "Sans nom")} » (déclencheur : ${String(payload.trigger ?? "?")}).`,
  schema: {
    type: "function",
    function: {
      name: "create_automation",
      description:
        "Crée une automatisation (envoi d'emails/messages, génération de contenu, notifications, avec récurrence).\n\nRÈGLES CRITIQUES POUR LES RAPPELS :\n1. triggerConfig.time = heure de DÉCLENCHEMENT du rappel (ex: 18:30).\n2. triggerConfig.eventTime = heure RÉELLE de l'événement (ex: 20:30) — OBLIGATOIRE si différente de time. L'agenda utilise eventTime, jamais time.\n3. triggerConfig.eventTitle = titre de l'événement réel dans l'agenda (ex: 'Cours de Torah'), PAS le nom du rappel.\n4. Le corps du message (messageText, emailBody, notificationBody) mentionne toujours l'heure de l'événement (eventTime), jamais l'heure du rappel (time).\n5. Si l'événement réel n'existe pas encore dans l'agenda, appelle create_event séparément avec l'heure eventTime après avoir créé l'automatisation.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          trigger: {
            type: "string",
            enum: ["BEFORE_EVENT", "EVENT_DAY", "AFTER_EVENT", "WEEKLY_SHABBAT", "JEWISH_HOLIDAY", "DAILY", "CUSTOM_SCHEDULE", "MANUAL"],
          },
          triggerConfig: {
            type: "object",
            properties: {
              time: { type: "string", description: "HH:MM — heure de DÉCLENCHEMENT de l'automatisation (ex: 18:30 pour un rappel envoyé 2h avant)" },
              eventTime: { type: "string", description: "HH:MM — heure RÉELLE de l'événement que rappelle cette automatisation (ex: 20:30 pour le cours). Obligatoire si time ≠ heure de l'événement. Quand présent, l'agenda utilise cette heure, pas time." },
              eventTitle: { type: "string", description: "Titre de l'événement RÉEL dans l'agenda (ex: 'Cours de Torah'). Si absent, le nom de l'automatisation est utilisé — souvent trompeur pour un rappel." },
              date: { type: "string", description: "YYYY-MM-DD" },
              repeat: { type: "string", enum: ["none", "weekly", "monthly", "custom"] },
              days: { type: "array", items: { type: "string" } },
              startDate: { type: "string" },
              endDate: { type: "string" },
            },
          },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["GENERATE_CONTENT", "SEND_EMAIL", "SEND_MESSAGE", "CREATE_NOTIFICATION"] },
                contentType: { type: "string" },
                channels: { type: "array", items: { type: "string" } },
                requiresValidation: { type: "boolean" },
                emailSubject: { type: "string" },
                emailBody: { type: "string" },
                messageText: { type: "string" },
                notificationTitle: { type: "string" },
                notificationBody: { type: "string" },
              },
              required: ["type"],
            },
          },
        },
        required: ["name", "trigger", "actions"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const gate = await resolveGate(ctx);
    if (gate && !gate.isSuperAdmin) {
      const usage = await getBillingUsage(ctx.admin, ctx.communityId, gate.tier);
      if (usage.automations >= TIER_LIMITS[gate.tier].automations) {
        return { success: false, message: tierLimitMessage(gate.tier, "automations"), code: "PAYWALL_REQUIRED" };
      }
    }

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const triggerConfig =
      payload.triggerConfig && typeof payload.triggerConfig === "object"
        ? (payload.triggerConfig as Record<string, unknown>)
        : {};
    const trigger = String(payload.trigger ?? "CUSTOM_SCHEDULE");
    const automationData = {
      id,
      communityId: ctx.communityId,
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
    await ctx.admin.from("Automation").insert(automationData);

    // Inscription dans l'Agenda connecté IA uniquement si ce n'est pas un simple rappel.
    // Un rappel (eventTime présent et différent de time) pointe vers un événement existant
    // ou doit être créé séparément via create_event avec l'heure réelle : on n'inscrit pas
    // l'heure de déclenchement comme heure d'événement.
    const isReminderAutomation = typeof triggerConfig.eventTime === "string" && triggerConfig.eventTime !== triggerConfig.time;
    let addedToAgenda = false;
    if (!isReminderAutomation) {
      try {
        const { data: community } = await ctx.admin.from("Community").select("timezone").eq("id", ctx.communityId).single();
        const timezone = (community as { timezone?: string } | null)?.timezone ?? "Europe/Paris";
        const start = computeAutomationStart(trigger, triggerConfig, timezone);
        if (start) {
          const eventId = crypto.randomUUID();
          const isRecurring = ["weekly", "monthly", "daily", "custom"].includes(String(triggerConfig.repeat));
          // Titre de l'événement : eventTitle (heure réelle) prioritaire sur le nom de l'automatisation
          const eventTitle = typeof triggerConfig.eventTitle === "string" && triggerConfig.eventTitle.trim()
            ? triggerConfig.eventTitle.trim()
            : automationData.name;
          await ctx.admin.from("Event").insert({
            id: eventId,
            communityId: ctx.communityId,
            title: eventTitle,
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
          await ctx.admin.from("Automation").update({ eventId }).eq("id", id);
          addedToAgenda = true;
        }
      } catch (e) {
        console.error("[create_automation] Inscription agenda échouée:", (e as Error).message);
      }
    }

    const reminderNote = isReminderAutomation
      ? ` C'est un rappel : si l'événement n'est pas encore dans l'agenda, crée-le via create_event avec l'heure réelle (${String(triggerConfig.eventTime ?? "")}), pas l'heure du rappel.`
      : "";
    return {
      success: true,
      message: addedToAgenda
        ? `Automatisation « ${automationData.name} » créée et ajoutée à votre agenda.`
        : `Automatisation « ${automationData.name} » créée.${reminderNote}`,
      data: { id },
    };
  },
};

export const updateAutomation: AssistantToolDef = {
  name: "update_automation",
  label: "Modifier une automatisation",
  summarize: (payload) => {
    const changes = ["name", "description", "trigger"]
      .filter((k) => payload[k] !== undefined)
      .map((k) => `${k} → ${truncate(String(payload[k]), 40)}`)
      .join(", ");
    return `Modifier l'automatisation : ${changes || "configuration mise à jour"}.`;
  },
  schema: {
    type: "function",
    function: {
      name: "update_automation",
      description: "Modifie une automatisation existante (nom, description, horaire/config de déclenchement, actions). Utilise list_automations pour trouver l'automationId.",
      parameters: {
        type: "object",
        properties: {
          automationId: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          trigger: { type: "string", enum: ["BEFORE_EVENT", "EVENT_DAY", "AFTER_EVENT", "WEEKLY_SHABBAT", "JEWISH_HOLIDAY", "DAILY", "CUSTOM_SCHEDULE", "MANUAL"] },
          triggerConfig: { type: "object", description: "Remplace la config de déclenchement (time, date, repeat, days…)" },
          actions: { type: "array", items: { type: "object" }, description: "Remplace la liste des actions" },
        },
        required: ["automationId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const automationId = String(payload.automationId ?? "");
    if (!automationId) return { success: false, message: "automationId manquant." };

    const { data: existing } = await ctx.admin
      .from("Automation")
      .select("id, name")
      .eq("id", automationId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Automatisation introuvable." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof payload.name === "string" && payload.name.trim()) update.name = payload.name.trim();
    if (typeof payload.description === "string") update.description = payload.description;
    if (typeof payload.trigger === "string" && payload.trigger) update.trigger = payload.trigger;
    if (payload.triggerConfig && typeof payload.triggerConfig === "object") update.triggerConfig = payload.triggerConfig;
    if (Array.isArray(payload.actions)) update.actions = payload.actions;

    await ctx.admin.from("Automation").update(update).eq("id", automationId).eq("communityId", ctx.communityId);
    return { success: true, message: `Automatisation « ${String(update.name ?? existing.name)} » mise à jour.` };
  },
};

export const toggleAutomation: AssistantToolDef = {
  name: "toggle_automation",
  label: "Modifier une automatisation",
  summarize: (payload) => (payload.isActive ? "Activer une automatisation." : "Mettre en pause une automatisation."),
  schema: {
    type: "function",
    function: {
      name: "toggle_automation",
      description: "Active ou met en pause une automatisation existante.",
      parameters: {
        type: "object",
        properties: {
          automationId: { type: "string" },
          isActive: { type: "boolean" },
        },
        required: ["automationId", "isActive"],
      },
    },
  },
  execute: async (ctx, payload) => {
    if (!payload.automationId) return { success: false, message: "automationId manquant." };
    await ctx.admin
      .from("Automation")
      .update({ isActive: Boolean(payload.isActive) })
      .eq("id", payload.automationId)
      .eq("communityId", ctx.communityId);
    return { success: true, message: payload.isActive ? "Automatisation activée." : "Automatisation mise en pause." };
  },
};

export const deleteAutomation: AssistantToolDef = {
  name: "delete_automation",
  label: "Supprimer une automatisation",
  summarize: () => "Supprimer définitivement une automatisation.",
  schema: {
    type: "function",
    function: {
      name: "delete_automation",
      description: "Supprime définitivement une automatisation.",
      parameters: {
        type: "object",
        properties: { automationId: { type: "string" } },
        required: ["automationId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    if (!payload.automationId) return { success: false, message: "automationId manquant." };
    await ctx.admin.from("Automation").delete().eq("id", payload.automationId).eq("communityId", ctx.communityId);
    return { success: true, message: "Automatisation supprimée." };
  },
};

export const automationTools: AssistantToolDef[] = [
  listAutomations,
  createAutomation,
  updateAutomation,
  toggleAutomation,
  deleteAutomation,
];
