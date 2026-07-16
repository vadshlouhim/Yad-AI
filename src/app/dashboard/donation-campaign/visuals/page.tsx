import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DonationCampaignVisualsClient } from "@/components/donation-campaign/donation-campaign-visuals-client";
import { notifyUser } from "@/lib/notifications/notify";
import { createNotificationOnce } from "@/lib/notifications/create-once";

export const metadata: Metadata = { title: "Visuels & Publications — EasyCom IA" };

export default async function DonationCampaignVisualsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, logoUrl, plan")
    .eq("id", communityId)
    .single();

  const campaignResult = await Promise.resolve(
    admin
      .from("donation_campaigns")
      .select("*")
      .eq("communityId", communityId)
      .in("status", ["draft", "active", "pending_validation"])
      .order("created_at", { ascending: false })
      .limit(1)
  ).catch(() => ({ data: null }));

  const campaign = campaignResult.data?.[0] ?? null;

  const [stepsResult, assetsResult] = await Promise.all([
    campaign
      ? Promise.resolve(admin.from("donation_campaign_steps").select("*").eq("campaign_id", campaign.id).order("step_date")).catch(() => ({ data: null }))
      : Promise.resolve({ data: null }),
    campaign
      ? Promise.resolve(admin.from("donation_campaign_assets").select("*").eq("campaign_id", campaign.id).order("created_at")).catch(() => ({ data: null }))
      : Promise.resolve({ data: null }),
  ]);

  // Vérifier les étapes dont l'heure d'envoi est arrivée
  if (campaign && stepsResult.data) {
    const now = new Date().toISOString();
    const dueSteps = stepsResult.data.filter(
      (s) => s.status === "scheduled" && s.scheduled_publish_at && s.scheduled_publish_at <= now
    );
    if (dueSteps.length > 0) {
      const admin2 = createAdminClient();
      await Promise.allSettled(
        dueSteps.map(async (step) => {
          // Passer le statut à "to_validate" pour ne déclencher le rappel qu'une seule fois
          await admin2.from("donation_campaign_steps").update({
            status: "to_validate",
            updated_at: new Date().toISOString(),
          }).eq("id", step.id);
          const scheduledDate = new Date(step.scheduled_publish_at!).toLocaleString("fr-FR", {
            day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
          });
          const title = `⏰ Il est l'heure — ${step.step_label}`;
          const body = `L'étape "${step.step_label}" était prévue à ${scheduledDate}. Il est temps d'envoyer votre message !`;
          const created = await createNotificationOnce(admin2, {
            userId: profile.id,
            communityId: profile.communityId,
            type: "EVENT_REMINDER",
            title,
            body,
            link: "/dashboard/donation-campaign/visuals",
            data: { stepId: step.id, campaignId: campaign.id },
            dedupeKey: `donation-reminder:${step.id}:${step.scheduled_publish_at}`,
          });
          if (created) {
            await notifyUser(admin2, profile.id, {
              title: `⏰ Il est l'heure — ${step.step_label}`,
              body: `L'étape "${step.step_label}" était prévue à ${scheduledDate}. N'oubliez pas d'envoyer votre message à votre communauté !`,
              link: "/dashboard/donation-campaign/visuals",
            });
          }
        })
      );
      // Recharger les étapes avec les statuts mis à jour
      const { data: refreshedSteps } = await createAdminClient()
        .from("donation_campaign_steps")
        .select("*")
        .eq("campaign_id", campaign.id)
        .order("step_date");
      stepsResult.data = refreshedSteps ?? stepsResult.data;
    }
  }

  return (
    <DonationCampaignVisualsClient
      community={community!}
      campaign={campaign}
      steps={stepsResult.data ?? []}
      assets={assetsResult.data ?? []}
    />
  );
}
