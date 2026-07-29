import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import { TIER_LIMITS, assertPaidFeature, getBillingGate, getBillingUsage, paywallResponse, tierLimitMessage } from "@/lib/billing";
import type { Tables } from "@/types/database.types";

const channelTypes = ["FACEBOOK", "INSTAGRAM", "WHATSAPP"] as const;
const publishSchema = z.object({
  title: z.string().trim().min(1).max(180),
  body: z.string().trim().min(1),
  channelTypes: z.array(z.enum(channelTypes)).min(1),
});

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return null;

  return { admin, communityId: profile.communityId, userId: user.id };
}

function isConnected(channel: Channel) {
  const settings = (channel.settings as Record<string, unknown> | null) ?? {};
  return channel.isConnected || (channel.type === "WHATSAPP" && settings.mode === "personal");
}

export async function GET() {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data, error } = await context.admin
    .from("Channel")
    .select("id, type, name, isConnected, isActive, settings")
    .eq("communityId", context.communityId)
    .in("type", channelTypes)
    .eq("isActive", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    channels: (data ?? []).filter((channel) => isConnected(channel as Channel)).map((channel) => ({
      type: channel.type,
      name: channel.name,
    })),
  });
}

export async function POST(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const parsed = publishSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Données de publication invalides" }, { status: 400 });

  const uniqueTypes = Array.from(new Set(parsed.data.channelTypes));
  const requestedSocialCount = uniqueTypes.filter((type) => type === "FACEBOOK" || type === "INSTAGRAM").length;
  const gate = await getBillingGate(context.admin, context.userId);
  if (!gate.isSuperAdmin && requestedSocialCount > 0) {
    const usage = await getBillingUsage(context.admin, context.communityId, gate.tier);
    if (usage.socialPublications + requestedSocialCount > TIER_LIMITS[gate.tier].socialPublications) {
      return paywallResponse(
        "social_publications",
        tierLimitMessage(gate.tier, "socialPublications"),
        { socialPublications: usage.socialPublications },
        TIER_LIMITS[gate.tier]
      );
    }
  }
  if (uniqueTypes.includes("WHATSAPP")) {
    const paid = await assertPaidFeature(
      context.admin,
      context.userId,
      "whatsapp",
      "WhatsApp est réservé au mode payant. Passez à l'abonnement pour envoyer des messages."
    );
    if (!paid.ok) return paid.response;
  }

  const { data: channels, error: channelsError } = await context.admin
    .from("Channel")
    .select("*")
    .eq("communityId", context.communityId)
    .in("type", uniqueTypes)
    .eq("isActive", true);

  if (channelsError) return NextResponse.json({ error: channelsError.message }, { status: 500 });

  const connectedChannels = (channels ?? []).filter((channel) => isConnected(channel as Channel));
  const connectedTypes = new Set(connectedChannels.map((channel) => channel.type));
  const missingTypes = uniqueTypes.filter((type) => !connectedTypes.has(type));
  if (missingTypes.length > 0) {
    return NextResponse.json({ error: `Connectez d'abord : ${missingTypes.join(", ")}.` }, { status: 400 });
  }

  const now = new Date().toISOString();
  const draftId = crypto.randomUUID();
  const { error: draftError } = await context.admin.from("ContentDraft").insert({
    id: draftId,
    communityId: context.communityId,
    title: parsed.data.title,
    body: parsed.data.body,
    contentType: "GENERAL",
    status: "READY_TO_PUBLISH",
    aiGenerated: true,
    aiPromptUsed: "torah-course-publication",
    updatedAt: now,
  });

  if (draftError) return NextResponse.json({ error: draftError.message }, { status: 500 });

  const { error: adaptationsError } = await context.admin.from("ChannelAdaptation").upsert(
    connectedChannels.map((channel) => ({
      draftId,
      channelType: channel.type,
      body: parsed.data.body,
      metadata: { source: "torah-course" },
      updatedAt: now,
    })),
    { onConflict: "draftId,channelType" }
  );
  if (adaptationsError) return NextResponse.json({ error: adaptationsError.message }, { status: 500 });

  await createPublicationsFromDraft({
    draftId,
    communityId: context.communityId,
    channelIds: connectedChannels.map((channel) => channel.id),
  });

  const { data: publications } = await context.admin
    .from("Publication")
    .select("*, channel:Channel(*)")
    .eq("communityId", context.communityId)
    .eq("draftId", draftId);

  const results = [];
  for (const publication of publications ?? []) {
    const result = await publishToChannel(publication as Publication & { channel: Channel });
    results.push({ channelType: publication.channelType, ...result });
  }

  return NextResponse.json({ results });
}
