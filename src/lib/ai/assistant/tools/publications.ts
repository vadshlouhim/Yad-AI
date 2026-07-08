import { createPublicationsFromDraft, publishToAllChannels, retryFailedPublication } from "@/lib/publishing/publisher";
import { TIER_LIMITS, getBillingUsage, tierLimitMessage } from "@/lib/billing";
import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { frDateTime, panelId, resolveGate, truncate } from "./shared";

// Publications : lecture, publication d'un brouillon (quota réseaux sociaux),
// relance d'une publication en échec, suppression.

const LIMITED_SOCIAL_CHANNELS = new Set(["INSTAGRAM", "FACEBOOK", "TELEGRAM"]);

const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  SCHEDULED: "Programmée",
  PUBLISHING: "En cours",
  PUBLISHED: "Publiée",
  FAILED: "Échec",
  CANCELLED: "Annulée",
  FALLBACK_READY: "À copier-coller",
};

export const listPublications: AssistantToolDef = {
  name: "list_publications",
  label: "Consulter les publications",
  summarize: () => "Consulter les publications récentes.",
  schema: {
    type: "function",
    function: {
      name: "list_publications",
      description: "Liste les publications récentes (tous canaux). Filtre optionnel par statut (PUBLISHED, FAILED, SCHEDULED, PENDING).",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "PENDING, SCHEDULED, PUBLISHED, FAILED" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    let query = ctx.admin
      .from("Publication")
      .select("id, channelType, status, content, publishedAt, scheduledAt, createdAt, error, externalUrl")
      .eq("communityId", ctx.communityId)
      .order("createdAt", { ascending: false })
      .limit(15);
    if (typeof args.status === "string" && args.status) query = query.eq("status", args.status);
    const { data } = await query;
    const publications = data ?? [];

    const items: PanelItem[] = publications.map((p) => {
      const actions: PanelItem["actions"] = [];
      if (p.status === "FAILED") {
        actions.push({
          id: `retry-${p.id}`,
          label: "Relancer",
          style: "primary" as const,
          kind: "execute_tool" as const,
          toolKind: "retry_publication",
          payload: { publicationId: p.id },
        });
      }
      if (p.status === "PUBLISHED" || p.status === "FAILED") {
        actions.push({
          id: `del-${p.id}`,
          label: "Supprimer",
          style: "danger" as const,
          kind: "execute_tool" as const,
          toolKind: "delete_publication",
          payload: { publicationId: p.id },
          confirm: true,
        });
      }
      if (p.externalUrl) {
        actions.push({ id: `open-${p.id}`, label: "Voir la publication", kind: "navigate" as const, href: p.externalUrl });
      }
      return {
        id: p.id,
        title: truncate(p.content, 70),
        subtitle: `${p.channelType} · ${frDateTime(p.publishedAt ?? p.scheduledAt ?? p.createdAt)}${p.error ? ` · ${truncate(p.error, 60)}` : ""}`,
        badge: PUBLICATION_STATUS_LABELS[p.status] ?? p.status,
        actions,
      };
    });

    return {
      llmResult: {
        publications: publications.map((p) => ({
          id: p.id,
          channel: p.channelType,
          status: p.status,
          excerpt: truncate(p.content, 80),
          error: p.error ? truncate(p.error, 100) : undefined,
        })),
      },
      panel: {
        id: panelId("publications"),
        panelType: "entity_list",
        entity: "publication",
        title: `Publications — ${publications.length} récentes`,
        emptyText: "Aucune publication pour l'instant.",
        items,
        meta: { total: publications.length },
      },
    };
  },
};

export const publishContent: AssistantToolDef = {
  name: "publish_content",
  label: "Publier un contenu",
  summarize: (payload) => {
    const channels = Array.isArray(payload.channelTypes) ? (payload.channelTypes as string[]).join(", ") : "?";
    return `Publier le contenu sur : ${channels}.`;
  },
  schema: {
    type: "function",
    function: {
      name: "publish_content",
      description: "Publie un brouillon existant (draftId) sur les canaux indiqués. Action publique.",
      parameters: {
        type: "object",
        properties: {
          draftId: { type: "string" },
          channelTypes: {
            type: "array",
            items: { type: "string" },
            description: "INSTAGRAM, FACEBOOK, WHATSAPP, TELEGRAM, EMAIL…",
          },
        },
        required: ["draftId", "channelTypes"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const draftId = payload.draftId as string | undefined;
    const channelTypes = Array.isArray(payload.channelTypes) ? (payload.channelTypes as string[]) : [];
    if (!draftId || channelTypes.length === 0) {
      return { success: false, message: "draftId ou channelTypes manquant pour la publication." };
    }
    const gate = await resolveGate(ctx);
    const requestedSocialCount = channelTypes.filter((channelType) => LIMITED_SOCIAL_CHANNELS.has(String(channelType))).length;
    if (gate && !gate.isSuperAdmin && requestedSocialCount > 0) {
      const usage = await getBillingUsage(ctx.admin, ctx.communityId, gate.tier);
      if (usage.socialPublications + requestedSocialCount > TIER_LIMITS[gate.tier].socialPublications) {
        return { success: false, message: tierLimitMessage(gate.tier, "socialPublications"), code: "PAYWALL_REQUIRED" };
      }
    }
    const { data: channels } = await ctx.admin
      .from("Channel")
      .select("id")
      .eq("communityId", ctx.communityId)
      .in("type", channelTypes)
      .eq("isActive", true);
    const channelIds = (channels ?? []).map((c: { id: string }) => c.id);
    if (channelIds.length === 0) {
      return { success: false, message: "Aucun canal actif trouvé pour ces plateformes." };
    }
    await createPublicationsFromDraft({ draftId, communityId: ctx.communityId, channelIds });
    publishToAllChannels(draftId, channelIds).catch(console.error);
    return { success: true, message: `Publication lancée sur ${channelIds.length} canal(aux).` };
  },
};

export const retryPublication: AssistantToolDef = {
  name: "retry_publication",
  label: "Relancer une publication",
  summarize: () => "Relancer une publication en échec.",
  schema: {
    type: "function",
    function: {
      name: "retry_publication",
      description: "Relance une publication en échec (statut FAILED). Utilise list_publications pour trouver le publicationId.",
      parameters: {
        type: "object",
        properties: { publicationId: { type: "string" } },
        required: ["publicationId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const publicationId = String(payload.publicationId ?? "");
    if (!publicationId) return { success: false, message: "publicationId manquant." };
    const { data: publication } = await ctx.admin
      .from("Publication")
      .select("id, status")
      .eq("id", publicationId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!publication) return { success: false, message: "Publication introuvable." };
    if (publication.status !== "FAILED") {
      return { success: false, message: "Seules les publications en échec peuvent être relancées." };
    }
    const result = await retryFailedPublication(publicationId);
    return result.success
      ? { success: true, message: "Publication relancée avec succès." }
      : { success: false, message: `Relance échouée : ${result.error ?? "erreur inconnue"}.` };
  },
};

export const deletePublication: AssistantToolDef = {
  name: "delete_publication",
  label: "Supprimer une publication",
  summarize: () => "Supprimer une publication de l'historique.",
  schema: {
    type: "function",
    function: {
      name: "delete_publication",
      description: "Supprime une publication envoyée ou en échec de l'historique EasyCom (ne retire pas le post du réseau social).",
      parameters: {
        type: "object",
        properties: { publicationId: { type: "string" } },
        required: ["publicationId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const publicationId = String(payload.publicationId ?? "");
    if (!publicationId) return { success: false, message: "publicationId manquant." };
    const { data: publication } = await ctx.admin
      .from("Publication")
      .select("id, status")
      .eq("id", publicationId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!publication) return { success: false, message: "Publication introuvable." };
    if (publication.status !== "PUBLISHED" && publication.status !== "FAILED") {
      return { success: false, message: "Seules les publications envoyées ou en échec peuvent être supprimées." };
    }
    await ctx.admin.from("Publication").delete().eq("id", publicationId).eq("communityId", ctx.communityId);
    return { success: true, message: "Publication supprimée de l'historique." };
  },
};

export const publicationTools: AssistantToolDef[] = [listPublications, publishContent, retryPublication, deletePublication];
