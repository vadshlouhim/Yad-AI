import { ASSISTANT_SETTINGS_FIELDS, TONE_VALUES } from "@/lib/community/settings-fields";
import { getDailyRoutine, saveDailyRoutine, type DailyRoutineItem } from "@/lib/community/daily-routine";
import type { AssistantToolDef } from "../types";
import type { PanelField } from "../panels";
import { panelId, truncate } from "./shared";

// Réglages : lecture/écriture des paramètres de la communauté (hors vocabulary/logo),
// profil utilisateur, routine quotidienne.

const TONE_LABELS: Record<string, string> = {
  MODERN: "Moderne",
  TRADITIONAL: "Traditionnel",
  FORMAL: "Formel",
  FRIENDLY: "Convivial",
  RELIGIOUS: "Religieux",
};

const SETTINGS_FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  description: "Description",
  city: "Ville",
  country: "Pays",
  timezone: "Fuseau horaire",
  phone: "Téléphone",
  email: "Email public",
  website: "Site web",
  address: "Adresse",
  postalCode: "Code postal",
  tone: "Ton éditorial",
  language: "Langue",
  signature: "Signature",
  hashtags: "Hashtags",
  mentions: "Mentions",
  editorialRules: "Règles éditoriales",
};

export const getCommunitySettings: AssistantToolDef = {
  name: "get_community_settings",
  label: "Consulter les réglages",
  summarize: () => "Consulter les réglages de la communauté.",
  schema: {
    type: "function",
    function: {
      name: "get_community_settings",
      description: "Affiche les réglages actuels de la communauté (identité, contact, ton éditorial, signature, hashtags…).",
      parameters: { type: "object", properties: {} },
    },
  },
  read: async (ctx) => {
    const { data } = await ctx.admin
      .from("Community")
      .select("name, description, city, country, timezone, phone, email, website, address, postalCode, tone, language, signature, hashtags, mentions, editorialRules")
      .eq("id", ctx.communityId)
      .single();
    const c = (data ?? {}) as Record<string, unknown>;

    const fields: PanelField[] = ASSISTANT_SETTINGS_FIELDS.map((key) => {
      const raw = c[key];
      const value = Array.isArray(raw) ? raw.join(" ") : raw == null ? "" : String(raw);
      const base: PanelField = {
        key,
        label: SETTINGS_FIELD_LABELS[key] ?? key,
        value: key === "tone" ? (TONE_LABELS[value] ?? value) : value,
        editable: true,
        inputType: key === "description" || key === "editorialRules" ? "textarea" : "text",
      };
      if (key === "tone") {
        base.inputType = "select";
        base.options = [...TONE_VALUES];
        base.value = value;
      }
      return base;
    });

    return {
      llmResult: { settings: Object.fromEntries(ASSISTANT_SETTINGS_FIELDS.map((k) => [k, c[k] ?? null])) },
      panel: {
        id: panelId("settings"),
        panelType: "settings_view",
        entity: "settings",
        title: "Réglages de la communauté",
        fields,
        actions: [
          { id: "save-settings", label: "Enregistrer les modifications", style: "primary", kind: "execute_tool", toolKind: "update_community_settings", payload: {} },
        ],
      },
    };
  },
};

export const updateCommunitySettings: AssistantToolDef = {
  name: "update_community_settings",
  label: "Modifier les réglages",
  summarize: (payload) => {
    const fields = Object.entries(payload)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${SETTINGS_FIELD_LABELS[k] ?? k} → ${truncate(Array.isArray(v) ? v.join(" ") : String(v), 60)}`)
      .join(", ");
    return `Mettre à jour les réglages : ${fields || "(aucun changement)"}.`;
  },
  schema: {
    type: "function",
    function: {
      name: "update_community_settings",
      description:
        "Modifie les réglages de la communauté : identité (name, description, city, country, address, postalCode), contact (phone, email, website), éditorial (tone, language, signature, hashtags, mentions, editorialRules), timezone.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          timezone: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          address: { type: "string" },
          postalCode: { type: "string" },
          tone: { type: "string", description: "MODERN, TRADITIONAL, FORMAL, FRIENDLY ou RELIGIOUS" },
          language: { type: "string" },
          signature: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          mentions: { type: "array", items: { type: "string" } },
          editorialRules: { type: "string" },
        },
      },
    },
  },
  execute: async (ctx, payload) => {
    const update: Record<string, unknown> = {};
    for (const key of ASSISTANT_SETTINGS_FIELDS) {
      const value = payload[key];
      if (value === undefined || value === null || value === "") continue;
      if (key === "tone" && !TONE_VALUES.includes(String(value) as (typeof TONE_VALUES)[number])) continue;
      if ((key === "hashtags" || key === "mentions") && !Array.isArray(value)) continue;
      update[key] = value;
    }
    if (Object.keys(update).length === 0) {
      return { success: false, message: "Aucun réglage valide à modifier." };
    }
    update.updatedAt = new Date().toISOString();
    await ctx.admin.from("Community").update(update).eq("id", ctx.communityId);
    return { success: true, message: "Réglages mis à jour." };
  },
};

export const updateUserProfile: AssistantToolDef = {
  name: "update_user_profile",
  label: "Modifier le profil",
  summarize: (payload) => `Modifier le profil utilisateur : nom → « ${String(payload.name ?? "")} ».`,
  schema: {
    type: "function",
    function: {
      name: "update_user_profile",
      description: "Modifie le nom affiché du profil de l'utilisateur connecté.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
    },
  },
  execute: async (ctx, payload) => {
    if (!ctx.userId) return { success: false, message: "Utilisateur inconnu." };
    const name = String(payload.name ?? "").trim();
    if (!name) return { success: false, message: "Nom manquant." };
    await ctx.admin.from("profiles").update({ name, updatedAt: new Date().toISOString() }).eq("id", ctx.userId);
    return { success: true, message: `Profil mis à jour : ${name}.` };
  },
};

export const getDailyRoutineTool: AssistantToolDef = {
  name: "get_daily_routine",
  label: "Consulter la routine",
  summarize: () => "Consulter la routine quotidienne configurée.",
  schema: {
    type: "function",
    function: {
      name: "get_daily_routine",
      description: "Affiche la routine de communication quotidienne configurée (actions récurrentes, fréquences, canaux).",
      parameters: { type: "object", properties: {} },
    },
  },
  read: async (ctx) => {
    const routine = await getDailyRoutine(ctx.admin, ctx.communityId);
    if (!routine || !routine.configured) {
      return {
        llmResult: { configured: false, note: "Aucune routine configurée. Propose à l'utilisateur d'en définir une." },
      };
    }
    return {
      llmResult: {
        configured: true,
        summary: routine.summary,
        items: routine.items.map((i) => ({ label: i.label, frequency: i.frequency, channels: i.channels, day: i.day, time: i.time })),
      },
      panel: {
        id: panelId("routine"),
        panelType: "entity_list",
        entity: "settings",
        title: "Routine quotidienne",
        emptyText: "Aucune action récurrente configurée.",
        items: routine.items.map((item, index) => ({
          id: `routine-${index}`,
          title: item.label,
          subtitle: `${item.frequency}${item.day ? ` · ${item.day}` : ""}${item.time ? ` à ${item.time}` : ""}`,
          badge: item.channels.join(", "),
        })),
      },
    };
  },
};

export const updateDailyRoutine: AssistantToolDef = {
  name: "update_daily_routine",
  label: "Modifier la routine",
  summarize: (payload) => {
    const items = Array.isArray(payload.items) ? payload.items.length : 0;
    return `Mettre à jour la routine quotidienne (${items} action${items > 1 ? "s" : ""} récurrente${items > 1 ? "s" : ""}).`;
  },
  schema: {
    type: "function",
    function: {
      name: "update_daily_routine",
      description:
        "Remplace la routine de communication quotidienne (actions récurrentes synchronisées dans l'agenda). Fournis la liste complète des actions souhaitées.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Résumé de la routine en 2-3 phrases" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                frequency: { type: "string", description: "Ex : Chaque vendredi, Quotidien, Mensuel" },
                channels: { type: "array", items: { type: "string" }, description: "WHATSAPP, INSTAGRAM, FACEBOOK, TELEGRAM, EMAIL" },
                day: { type: "string", description: "Lundi…Dimanche" },
                time: { type: "string", description: "HH:MM" },
                notes: { type: "string" },
              },
              required: ["label", "frequency", "channels"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const items = Array.isArray(payload.items) ? (payload.items as DailyRoutineItem[]) : [];
    const routine = await saveDailyRoutine(ctx.admin, ctx.communityId, {
      summary: typeof payload.summary === "string" ? payload.summary : "",
      items,
    });
    return {
      success: true,
      message: `Routine quotidienne mise à jour (${routine.items.length} action${routine.items.length > 1 ? "s" : ""}), synchronisée dans l'agenda.`,
    };
  },
};

export const settingsTools: AssistantToolDef[] = [
  getCommunitySettings,
  updateCommunitySettings,
  updateUserProfile,
  getDailyRoutineTool,
  updateDailyRoutine,
];
