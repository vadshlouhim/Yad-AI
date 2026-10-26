import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import type { Tables } from "@/types/database.types";
import { isPublishDryRun } from "@/lib/publishing/dry-run";
import { getJewishHolidays, getUpcomingShabbatTimes } from "@/lib/automation/hebcal";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

const SOCIAL_CHANNELS = ["FACEBOOK", "INSTAGRAM"] as const;
const LIMITED_SOCIAL_CHANNELS = new Set(["FACEBOOK", "INSTAGRAM"]);
const postSchema = z.object({
  text: z.string().min(1),
  texts: z.object({
    FACEBOOK: z.string().min(1).max(63_206),
    INSTAGRAM: z.string().min(1).max(2_200),
  }).optional(),
  mediaUrls: z.array(z.string().url()).default([]),
  channelTypes: z.array(z.enum(SOCIAL_CHANNELS)).min(1),
  scheduledAt: z.string().datetime().nullable().optional(),
  scheduledDates: z.array(z.string().datetime()).min(1).max(52).optional(),
  repeatWeekly: z.boolean().default(false),
});

const patchSchema = z.object({
  publicationIds: z.array(z.string()).min(1),
  content: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId,locale").eq("id", user.id).single();
  if (!profile?.communityId) return null;

  return { admin, userId: user.id, communityId: profile.communityId, locale: profile.locale ?? "fr" };
}

function getChannelProfileUrl(channel: Channel): string | null {
  if (channel.type === "INSTAGRAM" && channel.handle) {
    return `https://www.instagram.com/${encodeURIComponent(channel.handle)}/`;
  }
  if (channel.type === "FACEBOOK" && channel.pageId) {
    return `https://www.facebook.com/${encodeURIComponent(channel.pageId)}`;
  }
  if (channel.type === "WHATSAPP") return "https://web.whatsapp.com/";
  return null;
}

export async function GET() {
  const context = await getSessionContext();
  if (!context) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { admin, communityId, locale } = context;

  const [channelsResult, publicationsResult, communityResult, eventsResult] = await Promise.all([
    admin
      .from("Channel")
      .select("id,type,name,handle,isConnected,isActive,settings")
      .eq("communityId", communityId)
      .in("type", SOCIAL_CHANNELS),
    admin
      .from("Publication")
      .select("id,draftId,channelType,content,scheduledAt,status,createdAt,updatedAt,mediaUrls")
      .eq("communityId", communityId)
      .in("channelType", SOCIAL_CHANNELS)
      .order("createdAt", { ascending: false })
      .limit(60),
    admin.from("Community").select("city,country,timezone").eq("id", communityId).single(),
    admin.from("Event").select("title,startAt").eq("communityId", communityId).gte("startAt", new Date().toISOString()).order("startAt", { ascending: true }).limit(3),
  ]);

  if (channelsResult.error) return NextResponse.json({ error: channelsResult.error.message }, { status: 500 });
  if (publicationsResult.error) return NextResponse.json({ error: publicationsResult.error.message }, { status: 500 });

  const outputLocale = locale === "he" ? "he" : locale === "en" ? "en" : "fr";
  const [shabbat, holidays] = await Promise.all([
    communityResult.data ? getUpcomingShabbatTimes({ ...communityResult.data, outputLocale, count: 1 }) : Promise.resolve([]),
    getJewishHolidays({ year: new Date().getFullYear(), outputLocale }),
  ]);
  const nextHoliday = holidays.find((holiday) => new Date(`${holiday.date}T23:59:59`) >= new Date());

  return NextResponse.json({
    channels: (channelsResult.data ?? []).map((channel) => {
      const settings = (channel.settings as Record<string, unknown> | null) ?? {};
      return {
        ...channel,
        isActive: isPublishDryRun() ? true : channel.isActive,
        isConnected: isPublishDryRun() || (channel.type === "WHATSAPP" && settings.mode === "personal")
          ? true
          : channel.isConnected,
      };
    }),
    publications: publicationsResult.data ?? [],
    ideas: {
      parasha: shabbat[0]?.parasha ?? null,
      holiday: nextHoliday?.name ?? null,
      events: (eventsResult.data ?? []).map((event) => event.title),
    },
  });
}

export async function POST(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const parsed = postSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
    }

    const { admin, communityId } = context;
    const dryRun = isPublishDryRun();
    const { text, texts, mediaUrls, channelTypes, scheduledAt, scheduledDates } = parsed.data;
    const cleanText = text.trim();
    const uniqueChannelTypes = Array.from(new Set(channelTypes));
    const scheduleDates = Array.from(new Set(scheduledDates?.length ? scheduledDates : scheduledAt ? [scheduledAt] : []))
      .map((value) => new Date(value))
      .sort((a, b) => a.getTime() - b.getTime());
    const hasSchedule = scheduleDates.length > 0;
    const requestedSocialCount =
      uniqueChannelTypes.filter((channelType) => LIMITED_SOCIAL_CHANNELS.has(channelType)).length *
      Math.max(scheduleDates.length, 1);

    if (scheduleDates.some((date) => Number.isNaN(date.getTime()) || date.getTime() <= Date.now())) {
      return NextResponse.json({ error: "Choisissez uniquement des dates de planification futures." }, { status: 400 });
    }

    const gate = await getBillingGate(admin, context.userId);
    if (!dryRun && !gate.isSuperAdmin && requestedSocialCount > 0) {
      if (!gate.isPaid) return paywallResponse("social_publications");
    }

    if (uniqueChannelTypes.includes("INSTAGRAM") && mediaUrls.length === 0) {
      return NextResponse.json({ error: "Instagram requiert une image avant publication." }, { status: 400 });
    }

    let channelsQuery = admin
      .from("Channel")
      .select("*")
      .eq("communityId", communityId)
      .in("type", uniqueChannelTypes);
    if (!dryRun) channelsQuery = channelsQuery.eq("isActive", true);
    const { data: channels, error: channelsError } = await channelsQuery;

    if (channelsError) throw channelsError;

    const connectedTypes = new Set(
      (channels ?? [])
        .filter((channel) => {
          const settings = (channel.settings as Record<string, unknown> | null) ?? {};
          return dryRun || channel.isConnected || (channel.type === "WHATSAPP" && settings.mode === "personal");
        })
        .map((channel) => channel.type)
    );
    const missingTypes = uniqueChannelTypes.filter((type) => !connectedTypes.has(type));
    if (missingTypes.length > 0) {
      return NextResponse.json(
        { error: `Connectez d'abord : ${missingTypes.join(", ")}.` },
        { status: 400 }
      );
    }

    const draftId = crypto.randomUUID();
    const now = new Date().toISOString();
    const primaryImageUrl = mediaUrls[0] ?? null;

    await admin.from("ContentDraft").insert({
      id: draftId,
      communityId,
      title: cleanText.slice(0, 120) || "Publication tous reseaux",
      body: cleanText,
      imageUrl: primaryImageUrl,
      contentType: "GENERAL",
      status: hasSchedule ? "AI_PROPOSAL" : "READY_TO_PUBLISH",
      aiGenerated: true,
      aiPromptUsed: "social-networks-page",
      updatedAt: now,
    });

    for (const channelType of uniqueChannelTypes) {
      const metadata: Record<string, unknown> = {
        mediaUrls,
        source: "social-networks-page",
      };

      await admin.from("ChannelAdaptation").upsert(
        {
          draftId,
          channelType,
          body: texts?.[channelType] ?? cleanText,
          imageUrl: primaryImageUrl,
          metadata,
          updatedAt: now,
        },
        { onConflict: "draftId,channelType" }
      );
    }

    const publications = hasSchedule
      ? (await Promise.all(
          scheduleDates.map((date) =>
            createPublicationsFromDraft({
              draftId,
              communityId,
              channelIds: (channels ?? []).map((channel) => channel.id),
              scheduledAt: date,
            })
          )
        )).flat()
      : await createPublicationsFromDraft({
          draftId,
          communityId,
          channelIds: (channels ?? []).map((channel) => channel.id),
        });

    const publishResults: Record<string, unknown> = {};
    if (!hasSchedule) {
      const { data: fullPublications } = await admin
        .from("Publication")
        .select("*, channel:Channel(*)")
        .eq("draftId", draftId)
        .eq("communityId", communityId);

      for (const publication of fullPublications ?? []) {
        const fullPublication = publication as Publication & { channel: Channel };
        const result = await publishToChannel(fullPublication);
        publishResults[publication.channelType] = {
          ...result,
          externalUrl: result.externalUrl ?? (result.success ? getChannelProfileUrl(fullPublication.channel) : null),
        };
      }
    }

    return NextResponse.json({ draftId, publications, publishResults }, { status: hasSchedule ? 201 : 200 });
  } catch (error) {
    console.error("[Social Networks POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });

    const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content.trim();
    if (parsed.data.scheduledAt !== undefined) updateData.scheduledAt = parsed.data.scheduledAt;

    const { error } = await context.admin
      .from("Publication")
      .update(updateData)
      .eq("communityId", context.communityId)
      .eq("status", "SCHEDULED")
      .in("id", parsed.data.publicationIds);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Social Networks PATCH]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getSessionContext();
    if (!context) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const ids = new URL(request.url).searchParams.get("ids")?.split(",").filter(Boolean) ?? [];
    if (ids.length === 0) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

    const { error } = await context.admin
      .from("Publication")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("communityId", context.communityId)
      .eq("status", "SCHEDULED")
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Social Networks DELETE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
