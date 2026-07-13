import { generateContent } from "@/lib/ai/engine";
import { learnUserStylePreference } from "@/lib/ai/style-memory";
import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { frDateTime, panelId, truncate } from "./shared";

// Brouillons de contenu : génération IA, lecture, modification, suppression.

const DRAFT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  AI_PROPOSAL: "Proposition IA",
  READY_TO_PUBLISH: "Prêt à publier",
  PENDING_VALIDATION: "En validation",
  APPROVED: "Approuvé",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
};

export const generateContentTool: AssistantToolDef = {
  name: "generate_content",
  label: "Générer un contenu",
  summarize: (payload) =>
    `Générer un contenu ${String(payload.contentType ?? "GENERAL")}${payload.instructions ? ` : ${String(payload.instructions)}` : ""}.`,
  schema: {
    type: "function",
    function: {
      name: "generate_content",
      description: "Génère un contenu (post/annonce) et l'enregistre comme brouillon. Sans danger, à utiliser librement.",
      parameters: {
        type: "object",
        properties: {
          contentType: {
            type: "string",
            description: "GENERAL, SHABBAT_TIMES, EVENT_ANNOUNCEMENT, HOLIDAY_GREETING, COURSE_ANNOUNCEMENT, FUNDRAISING…",
          },
          instructions: { type: "string", description: "Instructions précises pour le contenu" },
          eventId: { type: "string" },
        },
        required: ["contentType"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const result = await generateContent({
      communityId: ctx.communityId,
      contentType: (payload.contentType ?? "GENERAL") as never,
      eventId: (payload.eventId as string | undefined) ?? undefined,
      customInstructions: payload.instructions as string | undefined,
    });
    const { data: draft } = await ctx.admin
      .from("ContentDraft")
      .insert({
        id: crypto.randomUUID(),
        communityId: ctx.communityId,
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
  },
};

export const listDrafts: AssistantToolDef = {
  name: "list_drafts",
  label: "Consulter les brouillons",
  summarize: () => "Consulter les brouillons de contenu.",
  schema: {
    type: "function",
    function: {
      name: "list_drafts",
      description: "Liste les brouillons de contenu de la communauté (les plus récents d'abord). Filtre optionnel par statut.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "DRAFT, AI_PROPOSAL, READY_TO_PUBLISH, APPROVED, PUBLISHED" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    let query = ctx.admin
      .from("ContentDraft")
      .select("id, title, body, status, contentType, updatedAt")
      .eq("communityId", ctx.communityId)
      .order("updatedAt", { ascending: false })
      .limit(15);
    if (typeof args.status === "string" && args.status) query = query.eq("status", args.status);
    const { data } = await query;
    const drafts = data ?? [];

    const items: PanelItem[] = drafts.map((d) => ({
      id: d.id,
      title: d.title || truncate(d.body, 60),
      subtitle: `${d.contentType} · ${frDateTime(d.updatedAt)}`,
      badge: DRAFT_STATUS_LABELS[d.status] ?? d.status,
      fields: [
        { key: "title", label: "Titre", value: d.title ?? "", editable: true, inputType: "text" as const },
        { key: "body", label: "Contenu", value: d.body ?? "", editable: true, inputType: "textarea" as const },
      ],
      actions: [
        { id: `save-${d.id}`, label: "Enregistrer", style: "primary" as const, kind: "execute_tool" as const, toolKind: "update_draft", payload: { draftId: d.id } },
        { id: `pub-${d.id}`, label: "Publier…", style: "default" as const, kind: "send_message" as const, message: `Publie le brouillon ${d.id} — sur quels canaux me conseilles-tu ?` },
        { id: `del-${d.id}`, label: "Supprimer", style: "danger" as const, kind: "execute_tool" as const, toolKind: "delete_draft", payload: { draftId: d.id }, confirm: true },
      ],
    }));

    return {
      llmResult: {
        drafts: drafts.map((d) => ({ id: d.id, title: d.title, status: d.status, contentType: d.contentType, excerpt: truncate(d.body, 120) })),
      },
      panel: {
        id: panelId("drafts"),
        panelType: "entity_list",
        entity: "draft",
        title: `Brouillons — ${drafts.length}`,
        emptyText: "Aucun brouillon pour l'instant.",
        items,
        meta: { total: drafts.length },
      },
    };
  },
};

export const updateDraft: AssistantToolDef = {
  name: "update_draft",
  label: "Modifier un brouillon",
  summarize: (payload) =>
    `Modifier le brouillon${payload.title ? ` « ${truncate(String(payload.title), 50)} »` : ""}.`,
  schema: {
    type: "function",
    function: {
      name: "update_draft",
      description: "Modifie un brouillon de contenu (titre, corps, hashtags, statut). Utilise list_drafts pour trouver le draftId.",
      parameters: {
        type: "object",
        properties: {
          draftId: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          status: { type: "string", description: "DRAFT, READY_TO_PUBLISH, APPROVED, ARCHIVED" },
        },
        required: ["draftId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const draftId = String(payload.draftId ?? "");
    if (!draftId) return { success: false, message: "draftId manquant." };
    const { data: existing } = await ctx.admin
      .from("ContentDraft")
      .select("id, body")
      .eq("id", draftId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Brouillon introuvable." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (payload.title !== undefined) update.title = payload.title;
    if (typeof payload.body === "string") update.body = payload.body;
    if (Array.isArray(payload.hashtags)) update.hashtags = payload.hashtags;
    if (typeof payload.status === "string" && payload.status) update.status = payload.status;

    await ctx.admin.from("ContentDraft").update(update).eq("id", draftId).eq("communityId", ctx.communityId);

    if (typeof payload.body === "string") {
      await learnUserStylePreference({
        communityId: ctx.communityId,
        originalBody: existing.body as string,
        updatedBody: payload.body,
      }).catch(() => {});
    }
    return { success: true, message: "Brouillon mis à jour." };
  },
};

export const deleteDraft: AssistantToolDef = {
  name: "delete_draft",
  label: "Supprimer un brouillon",
  summarize: () => "Supprimer définitivement un brouillon de contenu.",
  schema: {
    type: "function",
    function: {
      name: "delete_draft",
      description: "Supprime définitivement un brouillon de contenu. Utilise list_drafts pour trouver le draftId.",
      parameters: {
        type: "object",
        properties: { draftId: { type: "string" } },
        required: ["draftId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const draftId = String(payload.draftId ?? "");
    if (!draftId) return { success: false, message: "draftId manquant." };
    const { data: existing } = await ctx.admin
      .from("ContentDraft")
      .select("id")
      .eq("id", draftId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Brouillon introuvable." };
    await ctx.admin.from("ContentDraft").delete().eq("id", draftId).eq("communityId", ctx.communityId);
    return { success: true, message: "Brouillon supprimé." };
  },
};

export const contentTools: AssistantToolDef[] = [generateContentTool, listDrafts, updateDraft, deleteDraft];
