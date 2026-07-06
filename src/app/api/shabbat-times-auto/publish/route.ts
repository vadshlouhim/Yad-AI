import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

const publishSchema = z.object({
  content: z.string().trim().min(1),
  imageUrl: z.string().url().nullable().optional(),
  channels: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
});

function extractHashtags(content: string) {
  return Array.from(new Set(content.match(/#[\p{L}\p{N}_-]+/gu) ?? []));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const parsed = publishSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Données de publication invalides" }, { status: 400 });
    }

    const { content, imageUrl, channels: requestedChannels } = parsed.data;
    if (requestedChannels.includes("INSTAGRAM") && !imageUrl) {
      return NextResponse.json({ error: "Générez l'aperçu de l'affiche avant de publier sur Instagram." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const { data: activeChannels } = await admin
      .from("Channel")
      .select("*")
      .eq("communityId", profile.communityId)
      .in("type", requestedChannels)
      .eq("isActive", true);

    if (!activeChannels?.length) {
      return NextResponse.json({ error: "Aucun compte Instagram ou Facebook actif n'est connecté." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const hashtags = extractHashtags(content);
    const draftId = crypto.randomUUID();

    await admin.from("ContentDraft").insert({
      id: draftId,
      communityId: profile.communityId,
      title: content.slice(0, 120) || "Horaires de Chabbat",
      body: content,
      hashtags,
      imageUrl: imageUrl ?? null,
      contentType: "SHABBAT_TIMES",
      status: "READY_TO_PUBLISH",
      aiGenerated: true,
      aiPromptUsed: "shabbat-times-auto-publish-now",
      updatedAt: now,
    });

    await admin.from("ChannelAdaptation").upsert(
      activeChannels.map((channel) => ({
        draftId,
        channelType: channel.type,
        body: content,
        hashtags,
        imageUrl: imageUrl ?? null,
        metadata: {
          mediaUrls: imageUrl ? [imageUrl] : [],
          source: "shabbat-times-auto-publish-now",
        },
        updatedAt: now,
      })),
      { onConflict: "draftId,channelType" }
    );

    const publications = await createPublicationsFromDraft({
      draftId,
      communityId: profile.communityId,
      channelIds: activeChannels.map((channel) => channel.id),
    });

    const results = [];
    for (const publicationSummary of publications) {
      const { data: publication } = await admin
        .from("Publication")
        .select("*, channel:Channel(*)")
        .eq("id", publicationSummary.id)
        .single();

      if (!publication) continue;

      const publishResult = await publishToChannel(publication as Publication & { channel: Channel });
      results.push({
        channelType: publication.channelType,
        publicationId: publication.id,
        success: publishResult.success,
        externalUrl: publishResult.externalUrl ?? null,
        error: publishResult.error ?? null,
      });
    }

    const successfulChannels = results.filter((result) => result.success).map((result) => result.channelType);
    if (successfulChannels.length === 0) {
      const details = results.map((result) => result.error).filter(Boolean).join(" ");
      return NextResponse.json(
        { error: details || "La publication n'a pas pu être envoyée aux réseaux sélectionnés.", results },
        { status: 502 }
      );
    }

    return NextResponse.json({ draftId, publications, results, successfulChannels });
  } catch (error) {
    console.error("[Shabbat Times Publish]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publication impossible" },
      { status: 500 }
    );
  }
}
