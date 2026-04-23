import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptContentForChannel } from "@/lib/ai/engine";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json();
  const { draftId, channelTypes } = body;

  const { data: draft } = await admin
    .from("ContentDraft")
    .select("*")
    .eq("id", draftId)
    .eq("communityId", profile.communityId)
    .single();

  if (!draft) return NextResponse.json({ error: "Brouillon introuvable" }, { status: 404 });

  const results = await Promise.all(
    (channelTypes as string[]).map(async (channelType) => {
      const adapted = await adaptContentForChannel({
        communityId: profile.communityId!,
        originalContent: draft.body,
        targetChannel: channelType as never,
      });

      await admin.from("ChannelAdaptation").upsert(
        {
          draftId,
          channelType: channelType as never,
          body: adapted.body,
          hashtags: adapted.hashtags ?? [],
          cta: adapted.cta ?? null,
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "draftId,channelType" }
      );

      return { channelType, ...adapted };
    })
  );

  return NextResponse.json({ adaptations: results });
}
