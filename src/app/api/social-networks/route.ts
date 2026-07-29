import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import { TIER_LIMITS, assertPaidFeature, getBillingGate, getBillingUsage, paywallResponse, tierLimitMessage } from "@/lib/billing";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

const SOCIAL_CHANNELS = ["FACEBOOK", "INSTAGRAM", "WHATSAPP"] as const;
const LIMITED_SOCIAL_CHANNELS = new Set(["FACEBOOK", "INSTAGRAM"]);
const postSchema = z.object({
  text: z.string().min(1),
  mediaUrls: z.array(z.string().url()).default([]),
  channelTypes: z.array(z.enum(SOCIAL_CHANNELS)).min(1),
  scheduledAt: z.string().datetime().nullable().optional(),
  whatsappRecipientIds: z.array(z.string()).default([]),
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
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return null;

  return { admin, userId: user.id, communityId: profile.communityId };
}

export async function GET() {
  const context = await getSessionContext();
  if (!context) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

  const { admin, communityId } = context;

  const [channelsResult, membersResult, publicationsResult] = await Promise.all([
    admin
      .from("Channel")
      .select("id,type,name,handle,isConnected,isActive,settings")
      .eq("communityId", communityId)
      .in("type", SOCIAL_CHANNELS),
    admin
      .from("CommunityMember")
      .select("id,displayName,phone,tags,optInWhatsapp")
      .eq("communityId", communityId)
      .not("phone", "is", null)
      .order("displayName", { ascending: true }),
    admin
      .from("Publication")
      .select("id,draftId,channelType,content,scheduledAt,status,createdAt,updatedAt,mediaUrls")
      .eq("communityId", communityId)
      .in("channelType", SOCIAL_CHANNELS)
      .order("createdAt", { ascending: false })
      .limit(60),
  ]);

  if (channelsResult.error) return NextResponse.json({ error: channelsResult.error.message }, { status: 500 });
  if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 });
  if (publicationsResult.error) return NextResponse.json({ error: publicationsResult.error.message }, { status: 500 });

  return NextResponse.json({
    channels: (channelsResult.data ?? []).map((channel) => {
      const settings = (channel.settings as Record<string, unknown> | null) ?? {};
      return {
        ...channel,
        isConnected: channel.type === "WHATSAPP" && settings.mode === "personal"
          ? true
          : channel.isConnected,
      };
    }),
    whatsappContacts: (membersResult.data ?? []).filter((member) => member.optInWhatsapp),
    publications: publicationsResult.data ?? [],
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
    const { text, mediaUrls, channelTypes, scheduledAt, whatsappRecipientIds } = parsed.data;
    const cleanText = text.trim();
    const uniqueChannelTypes = Array.from(new Set(channelTypes));
    const requestedSocialCount = uniqueChannelTypes.filter((channelType) => LIMITED_SOCIAL_CHANNELS.has(channelType)).length;

    const gate = await getBillingGate(admin, context.userId);
    if (!gate.isSuperAdmin && requestedSocialCount > 0) {
      const usage = await getBillingUsage(admin, communityId, gate.tier);
      if (usage.socialPublications + requestedSocialCount > TIER_LIMITS[gate.tier].socialPublications) {
        return paywallResponse(
          "social_publications",
          tierLimitMessage(gate.tier, "socialPublications"),
          { socialPublications: usage.socialPublications },
          TIER_LIMITS[gate.tier]
        );
      }
    }

    if (uniqueChannelTypes.includes("WHATSAPP")) {
      const paid = await assertPaidFeature(
        admin,
        context.userId,
        "whatsapp",
        "WhatsApp est reserve au mode payant. Passez a l'abonnement pour envoyer des messages."
      );
      if (!paid.ok) return paid.response;
    }

    if (uniqueChannelTypes.includes("INSTAGRAM") && mediaUrls.length === 0) {
      return NextResponse.json({ error: "Instagram requiert une image avant publication." }, { status: 400 });
    }

    const { data: channels, error: channelsError } = await admin
      .from("Channel")
      .select("*")
      .eq("communityId", communityId)
      .in("type", uniqueChannelTypes)
      .eq("isActive", true);

    if (channelsError) throw channelsError;

    const connectedTypes = new Set(
      (channels ?? [])
        .filter((channel) => {
          const settings = (channel.settings as Record<string, unknown> | null) ?? {};
          return channel.isConnected || (channel.type === "WHATSAPP" && settings.mode === "personal");
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

    let whatsappRecipientPhones: string[] = [];
    if (uniqueChannelTypes.includes("WHATSAPP") && whatsappRecipientIds.length > 0) {
      const { data: recipients, error: recipientsError } = await admin
        .from("CommunityMember")
        .select("phone")
        .eq("communityId", communityId)
        .in("id", whatsappRecipientIds)
        .eq("optInWhatsapp", true)
        .not("phone", "is", null);

      if (recipientsError) throw recipientsError;
      whatsappRecipientPhones = (recipients ?? [])
        .map((recipient) => recipient.phone?.replace(/[^\d]/g, "") ?? "")
        .filter((phone) => phone.length >= 8);

      if (whatsappRecipientPhones.length === 0) {
        return NextResponse.json({ error: "Selectionnez au moins un contact WhatsApp valide." }, { status: 400 });
      }
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
      status: scheduledAt ? "AI_PROPOSAL" : "READY_TO_PUBLISH",
      aiGenerated: true,
      aiPromptUsed: "social-networks-page",
      updatedAt: now,
    });

    for (const channelType of uniqueChannelTypes) {
      const metadata: Record<string, unknown> = {
        mediaUrls,
        source: "social-networks-page",
      };
      if (channelType === "WHATSAPP") {
        metadata.whatsappRecipientPhones = whatsappRecipientPhones;
      }

      await admin.from("ChannelAdaptation").upsert(
        {
          draftId,
          channelType,
          body: cleanText,
          imageUrl: primaryImageUrl,
          metadata,
          updatedAt: now,
        },
        { onConflict: "draftId,channelType" }
      );
    }

    const publications = await createPublicationsFromDraft({
      draftId,
      communityId,
      channelIds: (channels ?? []).map((channel) => channel.id),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    const publishResults: Record<string, unknown> = {};
    if (!scheduledAt) {
      const { data: fullPublications } = await admin
        .from("Publication")
        .select("*, channel:Channel(*)")
        .eq("draftId", draftId)
        .eq("communityId", communityId);

      for (const publication of fullPublications ?? []) {
        publishResults[publication.channelType] = await publishToChannel(
          publication as Publication & { channel: Channel }
        );
      }
    }

    return NextResponse.json({ draftId, publications, publishResults }, { status: scheduledAt ? 201 : 200 });
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
