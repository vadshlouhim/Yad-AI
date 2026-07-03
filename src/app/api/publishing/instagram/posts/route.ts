import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPublicationsFromDraft, publishToChannel } from "@/lib/publishing/publisher";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;

const createSchema = z.object({
  caption: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  imageUrl: z.string().url(),
  publishNow: z.boolean().default(false),
  scheduledAt: z.string().datetime().nullable().optional(),
});

async function getProfileCommunity(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return { admin, communityId: profile?.communityId ?? null };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { admin, communityId } = await getProfileCommunity(user.id);
    if (!communityId) {
      return NextResponse.json({ error: "Pas de communaute" }, { status: 400 });
    }

    const { data: publications, error } = await admin
      .from("Publication")
      .select("id, content, scheduledAt, status, mediaUrls, createdAt")
      .eq("communityId", communityId)
      .eq("channelType", "INSTAGRAM")
      .eq("status", "SCHEDULED")
      .order("scheduledAt", { ascending: true, nullsFirst: false })
      .order("createdAt", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return NextResponse.json({ publications: publications ?? [] });
  } catch (error) {
    console.error("[Instagram Posts GET]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Donnees invalides" }, { status: 400 });
    }

    const { caption, hashtags, imageUrl, publishNow, scheduledAt } = parsed.data;
    const { admin, communityId } = await getProfileCommunity(user.id);

    if (!publishNow && !scheduledAt) {
      return NextResponse.json({ error: "La date de planification est requise." }, { status: 400 });
    }

    if (!communityId) {
      return NextResponse.json({ error: "Pas de communaute" }, { status: 400 });
    }

    const { data: instagramChannel } = await admin
      .from("Channel")
      .select("id")
      .eq("communityId", communityId)
      .eq("type", "INSTAGRAM")
      .eq("isActive", true)
      .maybeSingle();

    if (!instagramChannel?.id) {
      return NextResponse.json({ error: "Aucun canal Instagram connecte" }, { status: 400 });
    }

    const draftId = crypto.randomUUID();
    const now = new Date().toISOString();

    await admin.from("ContentDraft").insert({
      id: draftId,
      communityId,
      title: caption.slice(0, 120),
      body: caption,
      hashtags,
      imageUrl,
      contentType: "GENERAL",
      status: publishNow ? "READY_TO_PUBLISH" : "AI_PROPOSAL",
      aiGenerated: true,
      aiPromptUsed: "instagram-manual-page",
      updatedAt: now,
    });

    await admin.from("ChannelAdaptation").upsert(
      {
        draftId,
        channelType: "INSTAGRAM",
        body: caption,
        hashtags,
        imageUrl,
        metadata: { imageUrl, source: "instagram-manual-page" },
        updatedAt: now,
      },
      { onConflict: "draftId,channelType" }
    );

    const publications = await createPublicationsFromDraft({
      draftId,
      communityId,
      channelIds: [instagramChannel.id],
      scheduledAt: publishNow ? undefined : scheduledAt ? new Date(scheduledAt) : undefined,
    });

    if (publishNow) {
      const { data: publication } = await admin
        .from("Publication")
        .select("*, channel:Channel(*)")
        .eq("id", publications[0]?.id ?? "")
        .single();

      if (!publication) {
        throw new Error("Publication introuvable apres creation.");
      }

      const publishResult = await publishToChannel(publication as Publication & { channel: Channel });
      return NextResponse.json({ publications, publishResult });
    }

    return NextResponse.json({ publications }, { status: 201 });
  } catch (error) {
    console.error("[Instagram Posts POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });
    }

    const { admin, communityId } = await getProfileCommunity(user.id);
    if (!communityId) {
      return NextResponse.json({ error: "Pas de communaute" }, { status: 400 });
    }

    const { error } = await admin
      .from("Publication")
      .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("communityId", communityId)
      .eq("channelType", "INSTAGRAM")
      .eq("status", "SCHEDULED");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Instagram Posts DELETE]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
