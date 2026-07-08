import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adaptContentForChannel } from "@/lib/ai/engine";
import { publishToChannel } from "@/lib/publishing/publisher";
import { TIER_LIMITS, getBillingGate, getBillingUsage, paywallResponse, tierLimitMessage } from "@/lib/billing";
import type { Tables } from "@/types/database.types";

type Channel = Tables<"Channel">;
type Publication = Tables<"Publication">;
const LIMITED_SOCIAL_CHANNELS = new Set(["INSTAGRAM", "FACEBOOK", "TELEGRAM"]);

const publishSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().min(1).max(5000),
  channelIds: z.array(z.string()).min(1),
  title: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const { imageUrl, caption, channelIds, title } = parsed.data;
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", user.id)
      .single();

    if (!profile?.communityId) {
      return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    }

    const { data: channels } = await admin
      .from("Channel")
      .select("*")
      .eq("communityId", profile.communityId)
      .eq("isActive", true)
      .in("id", channelIds);

    if (!channels?.length) {
      return NextResponse.json({ error: "Aucun canal valide sélectionné" }, { status: 400 });
    }

    const requestedSocialCount = channels.filter((channel) => LIMITED_SOCIAL_CHANNELS.has(String(channel.type))).length;
    const gate = await getBillingGate(admin, user.id);
    if (!gate.isSuperAdmin && requestedSocialCount > 0) {
      const usage = await getBillingUsage(admin, profile.communityId, gate.tier);
      if (usage.socialPublications + requestedSocialCount > TIER_LIMITS[gate.tier].socialPublications) {
        return paywallResponse(
          "social_publications",
          tierLimitMessage(gate.tier, "socialPublications"),
          { socialPublications: usage.socialPublications },
          TIER_LIMITS[gate.tier]
        );
      }
    }

    const sourceContent = title ? `${title}\n\n${caption}` : caption;
    const adaptedChannels = await Promise.all(
      channels.map(async (channel) => {
        try {
          const adapted = await adaptContentForChannel({
            communityId: profile.communityId,
            originalContent: sourceContent,
            targetChannel: channel.type,
          });

          return {
            channel,
            content: adapted.body?.trim() || caption,
            hashtags: adapted.hashtags ?? [],
            cta: adapted.cta ?? null,
          };
        } catch (error) {
          console.error("[Templates Publish] Adaptation fallback", channel.type, error);
          return {
            channel,
            content: caption,
            hashtags: [],
            cta: null,
          };
        }
      })
    );

    const publications: Publication[] = [];

    for (const { channel, content, hashtags, cta } of adaptedChannels) {
      const { data: publication } = await admin
        .from("Publication")
        .insert({
          id: crypto.randomUUID(),
          communityId: profile.communityId,
          draftId: null,
          eventId: null,
          channelId: channel.id,
          channelType: channel.type,
          content,
          mediaUrls: [imageUrl],
          metadata: {
            title: title ?? null,
            hashtags,
            cta,
            source: "template_poster",
          },
          status: "PENDING",
          scheduledAt: null,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (publication) {
        publications.push(publication);
      }
    }

    const results = await Promise.all(
      publications.map(async (publication) => {
        const channel = channels.find((entry) => entry.id === publication.channelId) as Channel;
        const result = await publishToChannel({
          ...publication,
          channel,
        } as Publication & { channel: Channel });
        return {
          publicationId: publication.id,
          channelId: publication.channelId,
          channelName: channel.name,
          channelType: channel.type,
          ...result,
        };
      })
    );

    return NextResponse.json({ publications, results });
  } catch (error) {
    console.error("[Templates Publish] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
