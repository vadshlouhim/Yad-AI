import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";
import { FREE_LIMITS, getBillingGate, getBillingUsage, paywallResponse } from "@/lib/billing";

const LIMITED_SOCIAL_CHANNELS = new Set(["INSTAGRAM", "FACEBOOK", "TELEGRAM"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
    }

    const body = await request.json();
    const { title, text, channelType } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Le texte de la publication est obligatoire." }, { status: 400 });
    }

    const gate = await getBillingGate(admin, user.id);
    if (!gate.isPaid && LIMITED_SOCIAL_CHANNELS.has(String(channelType))) {
      const usage = await getBillingUsage(admin, profile.communityId);
      if (usage.socialPublications >= FREE_LIMITS.socialPublications) {
        return paywallResponse(
          "social_publications",
          "Le mode gratuit inclut une seule publication Instagram, Facebook ou Telegram. Passez au mode payant pour publier sans limite.",
          { socialPublications: usage.socialPublications }
        );
      }
    }

    // 1. Get the Channel
    const { data: channel } = await admin
      .from("Channel")
      .select("id, isConnected, isActive")
      .eq("communityId", profile.communityId)
      .eq("type", channelType)
      .maybeSingle();

    if (!channel) {
      return NextResponse.json({ error: "Ce réseau social n'est pas configuré pour votre communauté." }, { status: 400 });
    }

    if (!channel.isConnected) {
      return NextResponse.json({ error: "Ce canal n'est pas connecté." }, { status: 400 });
    }

    // 2. Create a ContentDraft record
    const draftId = crypto.randomUUID();
    const now = new Date().toISOString();
    await admin.from("ContentDraft").insert({
      id: draftId,
      communityId: profile.communityId,
      title: title || "Publication manuelle",
      body: text,
      status: "APPROVED",
      contentType: "EVENT_POST",
      createdAt: now,
      updatedAt: now
    });

    // 3. Create publication record
    const publications = await createPublicationsFromDraft({
      draftId,
      communityId: profile.communityId,
      channelIds: [channel.id],
    });

    if (!publications || publications.length === 0) {
      return NextResponse.json({ error: "Impossible de générer la publication." }, { status: 500 });
    }

    // 4. Publish immediately
    const results = await publishToAllChannels(draftId, [channel.id]);
    const result = results[channel.id];

    return NextResponse.json({
      success: true,
      publications,
      publishResult: result
    });
  } catch (error) {
    console.error("[Manual Publish API Error]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur interne du serveur" }, { status: 500 });
  }
}
