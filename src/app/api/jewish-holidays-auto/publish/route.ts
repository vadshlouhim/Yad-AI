import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;
const schema = z.object({ content: z.string().trim().min(1), imageUrl: z.string().url(), channels: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1), holidayName: z.string().trim().min(1).max(150) });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Données de publication invalides" }, { status: 400 });
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    const { data: activeChannels } = await admin.from("Channel").select("*").eq("communityId", profile.communityId).in("type", parsed.data.channels).eq("isActive", true).eq("isConnected", true);
    if (!activeChannels?.length) return NextResponse.json({ error: "Aucun compte Instagram ou Facebook actif n’est connecté." }, { status: 400 });

    const now = new Date().toISOString();
    const draftId = crypto.randomUUID();
    await admin.from("ContentDraft").insert({ id: draftId, communityId: profile.communityId, title: parsed.data.holidayName, body: parsed.data.content, hashtags: [], imageUrl: parsed.data.imageUrl, contentType: "HOLIDAY_GREETING", status: "READY_TO_PUBLISH", aiGenerated: false, updatedAt: now });
    await admin.from("ChannelAdaptation").upsert(activeChannels.map((channel) => ({ draftId, channelType: channel.type, body: parsed.data.content, hashtags: [], imageUrl: parsed.data.imageUrl, metadata: { mediaUrls: [parsed.data.imageUrl], source: "holiday-times-manual" }, updatedAt: now })), { onConflict: "draftId,channelType" });
    const publications = await createPublicationsFromDraft({ draftId, communityId: profile.communityId, channelIds: activeChannels.map((channel) => channel.id) });
    const results = [];
    for (const summary of publications) {
      const { data: publication } = await admin.from("Publication").select("*, channel:Channel(*)").eq("id", summary.id).single();
      if (!publication) continue;
      const result = await publishToChannel(publication as Publication & { channel: Channel });
      results.push({ channelType: publication.channelType, success: result.success, externalUrl: result.externalUrl ?? null, error: result.error ?? null });
    }
    if (!results.some((result) => result.success)) return NextResponse.json({ error: results.map((result) => result.error).filter(Boolean).join(" ") || "Publication impossible", results }, { status: 502 });
    return NextResponse.json({ draftId, results });
  } catch (error) {
    console.error("[Jewish Holidays Manual Publish]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publication impossible" }, { status: 500 });
  }
}
