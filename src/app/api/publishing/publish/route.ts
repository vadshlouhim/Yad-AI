import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToAllChannels } from "@/lib/publishing/publisher";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { draftId, channelTypes, scheduledAt } = body;

  const { data: channels } = await admin
    .from("Channel")
    .select("id")
    .eq("communityId", profile.communityId)
    .in("type", channelTypes)
    .eq("isActive", true);

  if (!channels?.length) {
    return NextResponse.json({ error: "Aucun canal actif trouvé" }, { status: 400 });
  }

  const publications = await createPublicationsFromDraft({
    draftId,
    communityId: profile.communityId,
    channelIds: channels.map((c) => c.id),
    scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
  });

  if (!scheduledAt) {
    publishToAllChannels(draftId, channels.map((c) => c.id)).catch(console.error);
  }

  return NextResponse.json({ publications, count: publications.length });
}
