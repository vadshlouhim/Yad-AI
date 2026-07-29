import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import { JEWISH_HOLIDAYS_AUTOMATION_NAME } from "@/lib/automation/jewish-holidays";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isChannelConnected(channel: { type: string; isConnected: boolean; settings: unknown } | undefined) {
  if (!channel) return false;
  return channel.isConnected || (channel.type === "WHATSAPP" && isRecord(channel.settings) && channel.settings.mode === "personal");
}

function latestUserText(messages: unknown) {
  if (!Array.isArray(messages)) return "";
  return messages
    .filter((item): item is Record<string, unknown> => isRecord(item) && item.role === "user" && typeof item.content === "string")
    .map((item) => String(item.content).trim())
    .filter(Boolean)
    .join("\n\n");
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const admin = createAdminClient();
  const gate = await getBillingGate(admin, user.id);
  if (!gate.isPaid) {
    return {
      error: paywallResponse("holiday_publish", "La publication automatique des fêtes est réservée au mode payant."),
    };
  }

  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };
  return { admin, communityId: profile.communityId };
}

export async function POST() {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const { data: automation } = await auth.admin
      .from("Automation")
      .select("id, triggerConfig")
      .eq("communityId", auth.communityId)
      .eq("trigger", "JEWISH_HOLIDAY")
      .eq("name", JEWISH_HOLIDAYS_AUTOMATION_NAME)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!automation || !isRecord(automation.triggerConfig) || !isRecord(automation.triggerConfig.holidayPoster)) {
      return NextResponse.json({ error: "Configuration introuvable" }, { status: 404 });
    }

    const poster = automation.triggerConfig.holidayPoster;
    const imageUrl = typeof poster.generatedImageUrl === "string" ? poster.generatedImageUrl : "";
    const postText = typeof poster.postText === "string" ? poster.postText.trim() : "";
    const content = postText || latestUserText(poster.assistantMessages);
    const selectedChannels = Array.isArray(poster.selectedChannels)
      ? poster.selectedChannels.map(String).filter(Boolean)
      : [];

    if (!imageUrl) return NextResponse.json({ error: "Générez l'affiche avant de publier." }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Texte de publication manquant." }, { status: 400 });
    if (selectedChannels.length === 0) return NextResponse.json({ error: "Aucun canal sélectionné." }, { status: 400 });

    const idempotencyKey = [
      poster.selectedHolidayId,
      imageUrl,
      content,
      selectedChannels.slice().sort().join(","),
    ].join("|");

    if (poster.publishIdempotencyKey === idempotencyKey && isRecord(poster.publishResults)) {
      return NextResponse.json({ results: poster.publishResults, idempotent: true });
    }

    const { data: channels } = await auth.admin
      .from("Channel")
      .select("id, type, isActive, isConnected, settings")
      .eq("communityId", auth.communityId)
      .in("type", selectedChannels as never[])
      .eq("isActive", true);

    const channelsByType = new Map((channels ?? []).map((channel) => [channel.type, channel]));
    const disconnectedTypes = selectedChannels.filter((type) => !isChannelConnected(channelsByType.get(type)));
    if (disconnectedTypes.length > 0) {
      return NextResponse.json(
        { error: `Connectez les réseaux sélectionnés avant de publier : ${disconnectedTypes.join(", ")}.` },
        { status: 400 }
      );
    }

    if (!channels?.length) {
      return NextResponse.json({ error: "Aucun canal actif trouvé." }, { status: 400 });
    }

    const draftId = crypto.randomUUID();
    const { data: draft, error: draftError } = await auth.admin
      .from("ContentDraft")
      .insert({
        id: draftId,
        communityId: auth.communityId,
        eventId: null,
        title: typeof poster.selectedHolidayName === "string" ? poster.selectedHolidayName : JEWISH_HOLIDAYS_AUTOMATION_NAME,
        body: content,
        bodyHebrew: null,
        hashtags: [],
        cta: null,
        imageUrl,
        contentType: "HOLIDAY_GREETING",
        status: "READY_TO_PUBLISH",
        aiGenerated: true,
        aiModel: "easycom-holiday-assistant",
        updatedAt: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (draftError || !draft) throw new Error(draftError?.message ?? "Brouillon introuvable");

    const channelIds = channels.map((channel) => channel.id);
    await createPublicationsFromDraft({
      draftId: draft.id,
      communityId: auth.communityId,
      channelIds,
    });

    const results = await publishToAllChannels(draft.id, channelIds);
    const resultsByType = Object.fromEntries(
      channels.map((channel) => [channel.type, results[channel.id] ?? { success: false, error: "Publication non exécutée" }])
    );

    await auth.admin
      .from("Automation")
      .update({
        triggerConfig: {
          ...automation.triggerConfig,
          holidayPoster: {
            ...poster,
            publishIdempotencyKey: idempotencyKey,
            publishResults: resultsByType,
            lastPublishedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date().toISOString(),
      })
      .eq("id", automation.id);

    return NextResponse.json({ results: resultsByType });
  } catch (error) {
    console.error("[Jewish Holidays Auto Publish]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publication impossible" }, { status: 500 });
  }
}
