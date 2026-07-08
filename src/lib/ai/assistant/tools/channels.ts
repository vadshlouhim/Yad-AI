import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { panelId } from "./shared";

// Canaux de diffusion : état des connexions, activation/désactivation, suppression.
// Les connexions OAuth (Instagram/Facebook/Gmail/Google Business) ne sont PAS faisables
// ici : l'assistant guide vers Réglages → Canaux (popup OAuth requis).

const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  TELEGRAM: "Telegram",
  EMAIL: "Email",
  WEB: "Site web",
  GOOGLE_BUSINESS: "Google Business",
};

export const checkChannels: AssistantToolDef = {
  name: "check_channels",
  label: "Vérifier les canaux",
  summarize: () => "Vérifier l'état des canaux connectés.",
  schema: {
    type: "function",
    function: {
      name: "check_channels",
      description: "Vérifie l'état des canaux connectés (réseaux sociaux, email…) et ce qui reste à configurer.",
      parameters: { type: "object", properties: {} },
    },
  },
  read: async (ctx) => {
    const { data } = await ctx.admin
      .from("Channel")
      .select("id, type, isConnected, isActive, handle")
      .eq("communityId", ctx.communityId);
    const channels = data ?? [];

    const items: PanelItem[] = channels.map((c) => ({
      id: c.id,
      title: CHANNEL_LABELS[c.type] ?? c.type,
      subtitle: c.handle ? `@${c.handle}` : c.isConnected ? "Connecté" : "Non connecté",
      badge: c.isConnected ? (c.isActive ? "Actif" : "En pause") : "Non connecté",
      actions: c.isConnected
        ? [
            {
              id: `toggle-${c.id}`,
              label: c.isActive ? "Désactiver" : "Activer",
              kind: "execute_tool" as const,
              toolKind: "update_channel",
              payload: { channelId: c.id, isActive: !c.isActive },
            },
          ]
        : [
            {
              id: `connect-${c.id}`,
              label: "Connecter dans Réglages",
              style: "primary" as const,
              kind: "navigate" as const,
              href: "/dashboard/settings/channels",
            },
          ],
    }));

    return {
      llmResult: { channels: channels.map((c) => ({ id: c.id, type: c.type, isConnected: c.isConnected, isActive: c.isActive, handle: c.handle })) },
      panel: {
        id: panelId("channels"),
        panelType: "entity_list",
        entity: "channel",
        title: "Canaux de diffusion",
        emptyText: "Aucun canal configuré. Rendez-vous dans Réglages → Canaux pour connecter vos réseaux.",
        items,
        meta: { total: channels.length },
      },
    };
  },
};

export const updateChannel: AssistantToolDef = {
  name: "update_channel",
  label: "Modifier un canal",
  summarize: (payload) => {
    if (payload.isActive !== undefined) {
      return payload.isActive ? "Activer un canal de diffusion." : "Désactiver un canal de diffusion.";
    }
    return "Modifier la configuration d'un canal de diffusion.";
  },
  schema: {
    type: "function",
    function: {
      name: "update_channel",
      description:
        "Active/désactive un canal de diffusion ou modifie son nom/handle. Ne permet PAS de connecter un compte (OAuth requis → Réglages → Canaux).",
      parameters: {
        type: "object",
        properties: {
          channelId: { type: "string" },
          isActive: { type: "boolean" },
          name: { type: "string" },
          handle: { type: "string" },
        },
        required: ["channelId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const channelId = String(payload.channelId ?? "");
    if (!channelId) return { success: false, message: "channelId manquant." };
    const { data: existing } = await ctx.admin
      .from("Channel")
      .select("id, type")
      .eq("id", channelId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Canal introuvable." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof payload.isActive === "boolean") update.isActive = payload.isActive;
    if (typeof payload.name === "string" && payload.name.trim()) update.name = payload.name.trim();
    if (typeof payload.handle === "string") update.handle = payload.handle.trim() || null;

    await ctx.admin.from("Channel").update(update).eq("id", channelId).eq("communityId", ctx.communityId);
    const label = CHANNEL_LABELS[existing.type] ?? existing.type;
    if (typeof payload.isActive === "boolean") {
      return { success: true, message: payload.isActive ? `Canal ${label} activé.` : `Canal ${label} désactivé.` };
    }
    return { success: true, message: `Canal ${label} mis à jour.` };
  },
};

export const deleteChannel: AssistantToolDef = {
  name: "delete_channel",
  label: "Supprimer un canal",
  summarize: () => "Supprimer un canal de diffusion (déconnexion définitive).",
  schema: {
    type: "function",
    function: {
      name: "delete_channel",
      description: "Supprime définitivement un canal de diffusion (perd la connexion et les tokens associés).",
      parameters: {
        type: "object",
        properties: { channelId: { type: "string" } },
        required: ["channelId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const channelId = String(payload.channelId ?? "");
    if (!channelId) return { success: false, message: "channelId manquant." };
    const { data: existing } = await ctx.admin
      .from("Channel")
      .select("id, type")
      .eq("id", channelId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Canal introuvable." };
    await ctx.admin.from("Channel").delete().eq("id", channelId).eq("communityId", ctx.communityId);
    return { success: true, message: `Canal ${CHANNEL_LABELS[existing.type] ?? existing.type} supprimé.` };
  },
};

export const channelTools: AssistantToolDef[] = [checkChannels, updateChannel, deleteChannel];
