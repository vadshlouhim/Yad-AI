import type { Metadata } from "next";
import { HayomYomSeferHamitsvotClient } from "@/components/hayom-yom-sefer-hamitsvot/hayom-yom-sefer-hamitsvot-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDailyStudy, getHayomYomAccess, getHayomYomSettings, HAYOM_YOM_AUTOMATION_NAME } from "@/lib/automation/hayom-yom";
import { dateISOInTz } from "@/lib/automation/event-recap";

export const metadata: Metadata = { title: "Hayom Yom et Sefer Hamitsvot — EasyCom IA" };

export default async function HayomYomSeferHamitsvotPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const [{ data: community }, { data: automations }, { data: facebook }, access] = await Promise.all([
    admin.from("Community").select("id, name, timezone, plan").eq("id", communityId).single(),
    admin.from("Automation").select("id, isActive, status, nextRunAt, triggerConfig")
      .eq("communityId", communityId)
      .eq("name", HAYOM_YOM_AUTOMATION_NAME)
      .order("updatedAt", { ascending: false })
      .limit(1),
    admin.from("Channel").select("name, handle, isConnected, isActive")
      .eq("communityId", communityId)
      .eq("type", "FACEBOOK")
      .maybeSingle(),
    getHayomYomAccess({ admin, communityId, profile }),
  ]);
  const automation = automations?.[0] ?? null;
  const settings = getHayomYomSettings(automation?.triggerConfig);
  const timezone = community?.timezone ?? "Europe/Paris";
  const todayISO = dateISOInTz(new Date(), timezone);
  const todayStudy = await fetchDailyStudy(todayISO).catch((error) => {
    console.error("[Hayom Yom Page] Contenu du jour indisponible:", error);
    return null;
  });

  return (
    <HayomYomSeferHamitsvotClient
      communityName={community?.name ?? "Votre communauté"}
      timezone={timezone}
      eligible={access.allowed}
      todayStudy={todayStudy ? {
        dateLabel: todayStudy.dateLabel,
        hayomYom: todayStudy.hayomYom,
        hayomYomUrl: todayStudy.hayomYomUrl,
        seferHamitsvot: todayStudy.seferHamitsvot,
        seferHamitsvotUrl: todayStudy.seferHamitsvotUrl,
      } : null}
      facebook={{
        connected: Boolean(facebook?.isConnected && facebook?.isActive),
        name: facebook?.name ?? facebook?.handle ?? null,
      }}
      initialAutomation={automation ? {
        id: automation.id,
        active: automation.isActive && automation.status === "ACTIVE" && settings?.status === "active",
        days: settings?.days ?? [],
        nextRunAt: automation.nextRunAt,
      } : null}
    />
  );
}
