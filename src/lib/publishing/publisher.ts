import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/database.types";
import { publishToFacebook } from "./adapters/facebook";
import { publishToInstagram } from "./adapters/instagram";
import { publishToTelegram } from "./adapters/telegram";
import { prepareEmailFallback } from "./adapters/email";
import { prepareWhatsAppFallback } from "./adapters/whatsapp";

type Publication = Tables<"Publication">;
type Channel = Tables<"Channel">;

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

export async function publishToChannel(
  publication: Publication & { channel: Channel }
): Promise<PublishResult> {
  const supabase = createAdminClient();
  const { channel } = publication;

  await supabase
    .from("Publication")
    .update({ status: "PUBLISHING", updatedAt: new Date().toISOString() })
    .eq("id", publication.id);

  try {
    const payload: PublishPayload = {
      content: publication.content,
      mediaUrls: publication.mediaUrls ?? undefined,
    };

    let result: PublishResult;

    switch (channel.type) {
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
        result = await prepareWhatsAppFallback(channel, payload, publication.communityId);
        break;
      case "EMAIL":
        result = await prepareEmailFallback(channel, payload, publication.communityId);
        break;
      default:
        result = { success: false, error: `Canal ${channel.type} non supporté` };
    }

    await supabase
      .from("Publication")
      .update({
        status: result.success ? "PUBLISHED" : result.fallbackUsed ? "FALLBACK_READY" : "FAILED",
        publishedAt: result.success ? new Date().toISOString() : null,
        externalId: result.externalId ?? null,
        externalUrl: result.externalUrl ?? null,
        error: result.error ?? null,
        fallbackUsed: result.fallbackUsed ?? false,
        fallbackType: (result.fallbackType as never) ?? null,
        metadata: result.fallbackData ? { fallbackData: result.fallbackData } : (publication.metadata ?? undefined),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", publication.id);

    await createPublicationNotification(publication, result);
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";

    const { data: pub } = await supabase
      .from("Publication")
      .select("retryCount")
      .eq("id", publication.id)
      .single();

    await supabase
      .from("Publication")
      .update({
        status: "FAILED",
        error: errorMsg,
        retryCount: (pub?.retryCount ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", publication.id);

    return { success: false, error: errorMsg };
  }
}

export async function publishToAllChannels(
  draftId: string,
  channelIds: string[]
): Promise<Record<string, PublishResult>> {
  const supabase = createAdminClient();
  const { data: publications } = await supabase
    .from("Publication")
    .select("*, channel:Channel(*)")
    .eq("draftId", draftId)
    .in("channelId", channelIds);

  const results: Record<string, PublishResult> = {};

  for (const pub of publications ?? []) {
    results[pub.channelId] = await publishToChannel(pub as Publication & { channel: Channel });
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

export async function retryFailedPublication(publicationId: string): Promise<PublishResult> {
  const supabase = createAdminClient();
  const { data: publication } = await supabase
    .from("Publication")
    .select("*, channel:Channel(*)")
    .eq("id", publicationId)
    .single();

  if (!publication) return { success: false, error: "Publication introuvable" };
  if (publication.retryCount >= 3) return { success: false, error: "Nombre maximum de tentatives atteint" };

  return publishToChannel(publication as Publication & { channel: Channel });
}

async function createPublicationNotification(publication: Publication, result: PublishResult) {
  const supabase = createAdminClient();
  const { data: adminUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("communityId", publication.communityId)
    .limit(1)
    .maybeSingle();

  if (!adminUser) return;

  await supabase.from("Notification").insert({
    id: crypto.randomUUID(),
    userId: adminUser.id,
    communityId: publication.communityId,
    type: result.success ? "PUBLICATION_SUCCESS" : result.fallbackUsed ? "PUBLICATION_SCHEDULED" : "PUBLICATION_FAILED",
    title: result.success ? "Publication réussie" : result.fallbackUsed ? "Export prêt" : "Échec de publication",
    body: result.success
      ? `Votre contenu a été publié sur ${publication.channelType}.`
      : result.fallbackUsed
      ? `Votre contenu est prêt à être copié-collé sur ${publication.channelType}.`
      : `La publication sur ${publication.channelType} a échoué : ${result.error}`,
    link: `/dashboard/publications/${publication.id}`,
  });
}

export async function createPublicationsFromDraft(params: {
  draftId: string;
  communityId: string;
  channelIds: string[];
  scheduledAt?: Date;
}): Promise<Publication[]> {
  const { draftId, communityId, channelIds, scheduledAt } = params;
  const supabase = createAdminClient();

  const [{ data: draft }, { data: channels }] = await Promise.all([
    supabase.from("ContentDraft").select("*, channelAdaptations:ChannelAdaptation(*)").eq("id", draftId).single(),
    supabase.from("Channel").select("*").in("id", channelIds).eq("communityId", communityId),
  ]);

  if (!draft) throw new Error("Brouillon introuvable");

  const publications: Publication[] = [];

  for (const channel of channels ?? []) {
    const adaptation = (draft.channelAdaptations as Array<{ channelType: string; body: string }>)?.find(
      (a) => a.channelType === channel.type
    );

    const { data: pub } = await supabase
      .from("Publication")
      .insert({
        id: crypto.randomUUID(),
        communityId,
        draftId,
        eventId: draft.eventId ?? null,
        channelId: channel.id,
        channelType: channel.type,
        content: adaptation?.body ?? draft.body,
        mediaUrls: [],
        status: scheduledAt ? "SCHEDULED" : "PENDING",
        scheduledAt: scheduledAt?.toISOString() ?? null,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (pub) publications.push(pub);
  }

  return publications;
}
