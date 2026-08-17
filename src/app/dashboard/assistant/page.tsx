import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJewishHolidays } from "@/lib/automation/hebcal";
import { AssistantClient } from "@/components/assistant/assistant-client";
import { getCommunityProfileDisplayLabel } from "@/lib/community/profile-labels";
import { getBillingConfig } from "@/lib/billing";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agents intelligents — EasyCom IA" };

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ channelTypes?: string; draftId?: string; eventId?: string; prefill?: string; agent?: string }>;
}) {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const now = new Date();

  const [{ data: community }, { data: channels }, { data: upcomingEvents }, currentYearHolidays, nextYearHolidays, billingConfig] = await Promise.all([
    admin
      .from("Community")
      .select("name, tone, logoUrl, hashtags, language, communityType, religiousStream")
      .eq("id", communityId)
      .single(),
    admin
      .from("Channel")
      .select("id, type, name, isActive, isConnected")
      .eq("communityId", communityId)
      .eq("isActive", true)
      .order("type", { ascending: true }),
    admin
      .from("Event")
      .select("title, startDate, location, category")
      .eq("communityId", communityId)
      .gte("startDate", now.toISOString())
      .neq("status", "ARCHIVED")
      .order("startDate", { ascending: true })
      .limit(5),
    getJewishHolidays({ year: now.getFullYear() }),
    getJewishHolidays({ year: now.getFullYear() + 1 }),
    getBillingConfig(admin),
  ]);

  const nextHoliday = [...currentYearHolidays, ...nextYearHolidays]
    .filter((holiday) => new Date(holiday.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const programContext = upcomingEvents?.length
    ? upcomingEvents
        .map((event) => {
          const eventDate = new Date(event.startDate).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          return `- ${event.title}, ${eventDate}${event.location ? `, ${event.location}` : ""}`;
        })
        .join("\n")
    : "Aucun événement précis n'est encore listé. Propose une trame de programme communautaire adaptable.";

  const quickActionPrompts = [
    {
      label: "Communication automatique",
      description: "EasyCom IA peut préparer, programmer et publier vos contenus au bon moment",
      prompt: `Explique comment EasyCom IA peut préparer, programmer et publier automatiquement les contenus au bon moment pour ma communauté. Appuie-toi si utile sur ce programme :\n${programContext}`,
    },
    {
      label: "Horaires de Chabbat",
      description: "Recevez chaque vendredi vos horaires de Chabbat préremplis",
      prompt: "Prépare un exemple de contenu d'horaires de Chabbat prérempli pour vendredi, avec texte prêt à publier et structure claire.",
    },
    {
      label: "Assistant personnel",
      description: "EasyCom IA devient votre assistant du quotidien : \"Publier le rappel J-5\"",
      prompt: `Montre comment EasyCom IA peut agir comme assistant du quotidien, par exemple pour publier un rappel J-5, J-1 ou jour J. Programme connu :\n${programContext}`,
    },
    {
      label: "Banque d'affiches",
      description: "Accédez à une banque de +250 affiches préremplies sur tous les thèmes juifs",
      prompt: nextHoliday
        ? `Présente la banque d'affiches de EasyCom IA et propose des affiches pertinentes pour ${nextHoliday.name}.`
        : "Présente la banque de plus de 250 affiches préremplies sur les thèmes juifs et aide-moi à choisir une affiche adaptée.",
    },
  ];

  const params = await searchParams;
  const initialPrompt = typeof params.prefill === "string" ? params.prefill : undefined;
  const requestedChannelTypes = typeof params.channelTypes === "string"
    ? params.channelTypes.split(",").map((channel) => channel.trim()).filter(Boolean)
    : [];
  let approvalDraft = null as {
    id: string;
    title: string | null;
    body: string;
    hashtags: string[] | null;
    status: string;
  } | null;

  if (params.draftId) {
    const result = await admin
      .from("ContentDraft")
      .select("id, title, body, hashtags, status")
      .eq("id", params.draftId)
      .eq("communityId", communityId)
      .single();
    approvalDraft = result.data;
  } else if (params.eventId) {
    const existingDraft = await admin
      .from("ContentDraft")
      .select("id, title, body, hashtags, status")
      .eq("eventId", params.eventId)
      .eq("communityId", communityId)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();
    approvalDraft = existingDraft.data;

    if (!approvalDraft) {
      const { data: event } = await admin
        .from("Event")
        .select("id, title, description, startDate, location")
        .eq("id", params.eventId)
        .eq("communityId", communityId)
        .single();

      if (event) {
        const eventDate = new Date(event.startDate).toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        });
        const body = [
          `Bonjour à tous,`,
          ``,
          `Nous vous rappelons notre événement "${event.title}" prévu ${eventDate}.`,
          event.location ? `Lieu : ${event.location}.` : null,
          event.description ? `` : null,
          event.description,
          ``,
          `Nous serons heureux de vous y retrouver.`,
        ].filter(Boolean).join("\n");

        const { data: createdDraft } = await admin
          .from("ContentDraft")
          .insert({
            id: crypto.randomUUID(),
            communityId,
            eventId: event.id,
            title: event.title,
            body,
            hashtags: community?.hashtags ?? [],
            contentType: "EVENT_ANNOUNCEMENT",
            status: "AI_PROPOSAL",
            aiGenerated: true,
            aiPromptUsed: "Assistant IA depuis Agenda connecté IA",
            updatedAt: new Date().toISOString(),
          })
          .select("id, title, body, hashtags, status")
          .single();
        approvalDraft = createdDraft;
      }
    }
  }
  const defaultChannelTypes = (channels ?? [])
    .filter((channel) => channel.isActive && (channel.isConnected || channel.type === "WHATSAPP" || channel.type === "EMAIL"))
    .map((channel) => channel.type);
  const initialApprovalDraft = approvalDraft
    ? {
        id: approvalDraft.id,
        title: approvalDraft.title,
        body: approvalDraft.body,
        hashtags: approvalDraft.hashtags ?? [],
        status: approvalDraft.status,
        channelTypes: requestedChannelTypes.length > 0 ? requestedChannelTypes : defaultChannelTypes,
      }
    : null;

  return (
    <AssistantClient
      communityName={community?.name ?? "Ma communauté"}
      communityLogoUrl={community?.logoUrl ?? null}
      tone={community?.tone ?? "MODERN"}
      channels={channels ?? []}
      seasonalPrompts={quickActionPrompts}
      initialPrompt={initialPrompt}
      initialAgentSlug={typeof params.agent === "string" ? params.agent : undefined}
      initialApprovalDraft={initialApprovalDraft}
      userName={profile.name ?? ""}
      userAvatar={profile.avatarUrl ?? null}
      communitySubtitle={getCommunityProfileDisplayLabel(community?.communityType)}
      billingConfig={billingConfig}
    />
  );
}
