import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getJewishHolidays } from "@/lib/automation/hebcal";
import { AssistantClient } from "@/components/assistant/assistant-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assistant IA — Shalom IA" };

export default async function AssistantPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const now = new Date();

  const [{ data: community }, { data: channels }, { data: upcomingEvents }, currentYearHolidays, nextYearHolidays] = await Promise.all([
    admin
      .from("Community")
      .select("name, tone, hashtags, language, communityType, religiousStream")
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
  ]);

  const nextHoliday = [...currentYearHolidays, ...nextYearHolidays]
    .filter((holiday) => new Date(holiday.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    [0];

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

  const demoVideoUrl = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ?? "/demo";

  const demoPrompt = {
    label: "Voir tout ce que je peux faire",
    prompt: "Présente-moi en clair tout ce que Shalom IA peut faire pour ma communauté, comme une démonstration guidée et concrète.",
    href: demoVideoUrl,
  };

  const quickActionPrompts = [
    {
      label: "Communication automatique",
      description: "Shalom IA peut préparer, programmer et publier vos contenus au bon moment",
      prompt: `Explique comment Shalom IA peut préparer, programmer et publier automatiquement les contenus au bon moment pour ma communauté. Appuie-toi si utile sur ce programme :\n${programContext}`,
    },
    {
      label: "Horaires de Chabbat",
      description: "Recevez chaque vendredi vos horaires de Chabbat préremplis",
      prompt: "Prépare un exemple de contenu d'horaires de Chabbat prérempli pour vendredi, avec texte prêt à publier et structure claire.",
    },
    {
      label: "Assistant personnel",
      description: "Shalom IA devient votre assistant du quotidien : \"Publier le rappel J-5\"",
      prompt: `Montre comment Shalom IA peut agir comme assistant du quotidien, par exemple pour publier un rappel J-5, J-1 ou jour J. Programme connu :\n${programContext}`,
    },
    {
      label: "Banque d'affiches",
      description: "Accédez à une banque de +250 affiches préremplies sur tous les thèmes juifs",
      prompt: nextHoliday
        ? `Présente la banque d'affiches de Shalom IA et propose des affiches pertinentes pour ${nextHoliday.name}.`
        : "Présente la banque de plus de 250 affiches préremplies sur les thèmes juifs et aide-moi à choisir une affiche adaptée.",
    },
  ];

  return (
    <AssistantClient
      communityName={community?.name ?? "Ma communauté"}
      tone={community?.tone ?? "MODERN"}
      channels={channels ?? []}
      demoPrompt={demoPrompt}
      seasonalPrompts={quickActionPrompts}
    />
  );
}
