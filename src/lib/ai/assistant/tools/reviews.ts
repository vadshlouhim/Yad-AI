import { listGmbReviews, replyToGmbReview } from "@/lib/gmb/reviews";
import type { AssistantToolDef, BuildToolsContext } from "../types";
import type { PanelItem } from "../panels";
import { panelId, resolveGate, truncate } from "./shared";

// Avis Google Business : lecture et réponse publique. Réservé à l'offre Business.

const businessOnly = (ctx: BuildToolsContext) => ctx.isSuperAdmin || ctx.isPaid;

export const listReviews: AssistantToolDef = {
  name: "list_reviews",
  label: "Consulter les avis Google",
  summarize: () => "Consulter les avis Google de l'établissement.",
  availability: businessOnly,
  schema: {
    type: "function",
    function: {
      name: "list_reviews",
      description: "Liste les avis Google Business de l'établissement (note, commentaire, réponse éventuelle).",
      parameters: {
        type: "object",
        properties: {
          unansweredOnly: { type: "boolean", description: "Ne montrer que les avis sans réponse" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    const gate = await resolveGate(ctx);
    if (gate && !gate.isPaid) {
      return { llmResult: { error: "La gestion des avis Google est réservée à l'offre Business." } };
    }
    const result = await listGmbReviews(ctx.admin, ctx.communityId);
    if ("error" in result) {
      return { llmResult: { error: result.error } };
    }
    if (result.needsLocationSync) {
      return { llmResult: { reviews: [], note: result.message } };
    }
    let reviews = result.reviews;
    if (args.unansweredOnly) reviews = reviews.filter((r) => !r.answered);
    reviews = reviews.slice(0, 15);

    const items: PanelItem[] = reviews.map((r) => ({
      id: r.id,
      title: `${r.author} — ${"⭐".repeat(Math.max(1, r.rating))}`,
      subtitle: `${truncate(r.comment, 120)} · ${r.relativeTime}`,
      badge: r.answered ? "Répondu" : "Sans réponse",
      imageUrl: r.avatarUrl ?? undefined,
      actions: r.answered
        ? []
        : [
            {
              id: `reply-${r.id}`,
              label: "Faire répondre l'IA",
              style: "primary" as const,
              kind: "send_message" as const,
              message: `Prépare une réponse à l'avis Google de ${r.author} (${r.rating}⭐) : « ${truncate(r.comment, 160)} » (googleReviewName: ${r.googleReviewName})`,
            },
          ],
    }));

    return {
      llmResult: {
        locationDisplayName: result.locationDisplayName,
        reviews: reviews.map((r) => ({
          googleReviewName: r.googleReviewName,
          author: r.author,
          rating: r.rating,
          comment: truncate(r.comment, 160),
          answered: r.answered,
        })),
      },
      panel: {
        id: panelId("reviews"),
        panelType: "entity_list",
        entity: "review",
        title: `Avis Google${result.locationDisplayName ? ` — ${result.locationDisplayName}` : ""}`,
        emptyText: "Aucun avis Google trouvé.",
        items,
        meta: { total: reviews.length },
      },
    };
  },
};

export const replyReview: AssistantToolDef = {
  name: "reply_review",
  label: "Répondre à un avis Google",
  summarize: (payload) =>
    `Publier une réponse publique à un avis Google : « ${truncate(String(payload.replyText ?? ""), 100)} ».`,
  availability: businessOnly,
  schema: {
    type: "function",
    function: {
      name: "reply_review",
      description:
        "Publie une réponse PUBLIQUE à un avis Google Business. Utilise list_reviews pour obtenir le googleReviewName exact.",
      parameters: {
        type: "object",
        properties: {
          googleReviewName: { type: "string", description: "Identifiant complet de l'avis (accounts/…/locations/…/reviews/…)" },
          replyText: { type: "string", description: "Texte de la réponse publique" },
        },
        required: ["googleReviewName", "replyText"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const gate = await resolveGate(ctx);
    if (gate && !gate.isPaid) {
      return {
        success: false,
        message: "La gestion des avis Google est réservée à l'offre Business.",
        code: "PAYWALL_REQUIRED",
      };
    }
    const reviewName = String(payload.googleReviewName ?? "");
    const replyText = String(payload.replyText ?? "").trim();
    if (!reviewName || !replyText) return { success: false, message: "googleReviewName ou replyText manquant." };

    const result = await replyToGmbReview(ctx.admin, ctx.communityId, { reviewName, replyText });
    return result.success
      ? { success: true, message: "Réponse publiée sur l'avis Google." }
      : { success: false, message: result.error ?? "Échec de la publication de la réponse." };
  },
};

export const reviewTools: AssistantToolDef[] = [listReviews, replyReview];
