import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import type { Tables } from "@/types/database.types";
import { z } from "zod";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

const createSchema = z.object({
  draftId: z.string(),
  channelIds: z.array(z.string()),
  scheduledAt: z.string().datetime().optional(),
  publishNow: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { draftId, channelIds, scheduledAt, publishNow } = parsed.data;

    const publications = await createPublicationsFromDraft({
      draftId,
      communityId: profile.communityId,
      channelIds,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    if (publishNow) {
      const results: Record<string, unknown> = {};
      for (const pub of publications) {
        const { data: fullPub } = await admin
          .from("Publication")
          .select("*, channel:Channel(*)")
          .eq("id", pub.id)
          .single();
        if (fullPub) {
          results[pub.channelId] = await publishToChannel(fullPub as Publication & { channel: Channel });
        }
      }
      return NextResponse.json({ publications, results });
    }

    return NextResponse.json({ publications }, { status: 201 });
  } catch (error) {
    console.error("[Publications POST]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Pas de communauté" }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const channelType = searchParams.get("channelType");

    let query = admin
      .from("Publication")
      .select("*, channel:Channel(type, name), event:Event(title, category), draft:ContentDraft(title, contentType)")
      .eq("communityId", profile.communityId)
      .order("scheduledAt", { ascending: false })
      .limit(50);

    if (status) query = query.eq("status", status);
    if (channelType) query = query.eq("channelType", channelType);

    const { data: publications } = await query;
    return NextResponse.json(publications ?? []);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
