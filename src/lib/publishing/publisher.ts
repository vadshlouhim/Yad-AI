// ============================================================
// Yad.ia — Moteur de diffusion multicanale
// Architecture : publisher central + adaptateurs par canal
// ============================================================

import { prisma } from "@/lib/prisma";
import type { Publication, Channel, ChannelType } from "@prisma/client";
import { publishToFacebook } from "./adapters/facebook";
import { publishToInstagram } from "./adapters/instagram";
import { publishToTelegram } from "./adapters/telegram";
import { prepareEmailFallback } from "./adapters/email";
import { prepareWhatsAppFallback } from "./adapters/whatsapp";

// ============================================================
// TYPES
// ============================================================

export interface PublishResult {
  success: boolean;
  externalId?: string;
  externalUrl?: string;
  error?: string;
  fallbackUsed?: boolean;
  fallbackType?: string;
  fallbackData?: unknown;
}

export interface PublishPayload {
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================
// PUBLISHER PRINCIPAL
// ============================================================

export async function publishToChannel(
  publication: Publication & { channel: Channel }
): Promise<PublishResult> {
  const { channel } = publication;

  // Mise à jour statut → PUBLISHING
  await prisma.publication.update({
    where: { id: publication.id },
    data: { status: "PUBLISHING" },
  });

  try {
    let result: PublishResult;

    const payload: PublishPayload = {
      content: publication.content,
      mediaUrls: publication.mediaUrls,
    };

    switch (channel.type as ChannelType) {
      case "FACEBOOK":
        result = await publishToFacebook(channel, payload);
        break;

      case "INSTAGRAM":
        result = await publishToInstagram(channel, payload);
        break;

      case "TELEGRAM":
        result = await publishToTelegram(channel, payload);
        break;

      case "WHATSAPP":
        // WhatsApp : pas d'API directe — fallback guidé
        result = await prepareWhatsAppFallback(channel, payload);
        break;

      case "EMAIL":
        result = await prepareEmailFallback(channel, payload, publication.communityId);
        break;

      default:
        result = {
          success: false,
          error: `Canal ${channel.type} non supporté`,
        };
    }

    // Mise à jour résultat
    await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: result.success ? "PUBLISHED" : result.fallbackUsed ? "FALLBACK_READY" : "FAILED",
        publishedAt: result.success ? new Date() : null,
        externalId: result.externalId ?? null,
        externalUrl: result.externalUrl ?? null,
        error: result.error ?? null,
        fallbackUsed: result.fallbackUsed ?? false,
        fallbackType: result.fallbackType as never ?? null,
        metadata: result.fallbackData
          ? { fallbackData: result.fallbackData }
          : publication.metadata ?? undefined,
      },
    });

    // Notification
    await createPublicationNotification(publication, result);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

    await prisma.publication.update({
      where: { id: publication.id },
      data: {
        status: "FAILED",
        error: errorMsg,
        retryCount: { increment: 1 },
      },
    });

    return { success: false, error: errorMsg };
  }
}

// ============================================================
// PUBLICATION GROUPÉE (plusieurs canaux)
// ============================================================

export async function publishToAllChannels(
  draftId: string,
  channelIds: string[]
): Promise<Record<string, PublishResult>> {
  const publications = await prisma.publication.findMany({
    where: { draftId, channelId: { in: channelIds } },
    include: { channel: true },
  });

  const results: Record<string, PublishResult> = {};

  // Publication séquentielle avec délai pour éviter les rate limits
  for (const pub of publications) {
    results[pub.channelId] = await publishToChannel(pub);
    // Petit délai entre chaque publication
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

// ============================================================
// RETRY en cas d'échec
// ============================================================

export async function retryFailedPublication(publicationId: string): Promise<PublishResult> {
  const publication = await prisma.publication.findUnique({
    where: { id: publicationId },
    include: { channel: true },
  });

  if (!publication) {
    return { success: false, error: "Publication introuvable" };
  }

  if (publication.retryCount >= 3) {
    return { success: false, error: "Nombre maximum de tentatives atteint" };
  }

  return publishToChannel(publication);
}

// ============================================================
// NOTIFICATION après publication
// ============================================================

async function createPublicationNotification(
  publication: Publication,
  result: PublishResult
) {
  const userId = await prisma.user
    .findFirst({ where: { communityId: publication.communityId } })
    .then((u) => u?.id);

  if (!userId) return;

  await prisma.notification.create({
    data: {
      userId,
      communityId: publication.communityId,
      type: result.success
        ? "PUBLICATION_SUCCESS"
        : result.fallbackUsed
        ? "PUBLICATION_SCHEDULED"
        : "PUBLICATION_FAILED",
      title: result.success
        ? "Publication réussie"
        : result.fallbackUsed
        ? "Export prêt"
        : "Échec de publication",
      body: result.success
        ? `Votre contenu a été publié sur ${publication.channelType}.`
        : result.fallbackUsed
        ? `Votre contenu est prêt à être copié-collé sur ${publication.channelType}.`
        : `La publication sur ${publication.channelType} a échoué : ${result.error}`,
      link: `/dashboard/publications/${publication.id}`,
    },
  });
}

// ============================================================
// CRÉER UNE PUBLICATION depuis un brouillon
// ============================================================

export async function createPublicationsFromDraft(params: {
  draftId: string;
  communityId: string;
  channelIds: string[];
  scheduledAt?: Date;
}): Promise<Publication[]> {
  const { draftId, communityId, channelIds, scheduledAt } = params;

  const [draft, channels] = await Promise.all([
    prisma.contentDraft.findUnique({
      where: { id: draftId },
      include: { channelAdaptations: true },
    }),
    prisma.channel.findMany({
      where: { id: { in: channelIds }, communityId },
    }),
  ]);

  if (!draft) throw new Error("Brouillon introuvable");

  const publications = await Promise.all(
    channels.map((channel) => {
      // Chercher une adaptation spécifique au canal
      const adaptation = draft.channelAdaptations.find(
        (a) => a.channelType === channel.type
      );

      return prisma.publication.create({
        data: {
          communityId,
          draftId,
          eventId: draft.eventId ?? null,
          channelId: channel.id,
          channelType: channel.type,
          content: adaptation?.body ?? draft.body,
          mediaUrls: [],
          status: scheduledAt ? "SCHEDULED" : "PENDING",
          scheduledAt: scheduledAt ?? null,
        },
      });
    })
  );

  return publications;
}
