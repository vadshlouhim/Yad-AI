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
  const [{ data: community }, { data: automations }, { data: channels }, access] = await Promise.all([
    admin.from("Community").select("id, name, timezone, plan, logoUrl").eq("id", communityId).single(),
    admin.from("Automation").select("id, isActive, status, nextRunAt, triggerConfig")
      .eq("communityId", communityId)
      .eq("name", HAYOM_YOM_AUTOMATION_NAME)
      .order("updatedAt", { ascending: false })
      .limit(1),
    admin.from("Channel").select("type, name, handle, isConnected, isActive")
      .eq("communityId", communityId)
      .in("type", ["FACEBOOK", "INSTAGRAM"]),
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
      communityLogoUrl={community?.logoUrl ?? null}
      channels={(channels ?? []).map((channel) => ({
        type: channel.type as "FACEBOOK" | "INSTAGRAM",
        connected: Boolean(channel.isConnected && channel.isActive),
        name: channel.name ?? channel.handle ?? null,
      }))}
      initialAutomation={automation ? {
        id: automation.id,
        active: automation.isActive && automation.status === "ACTIVE" && settings?.status === "active",
        days: settings?.days ?? [],
        channels: settings?.channels ?? ["FACEBOOK"],
        nextRunAt: automation.nextRunAt,
      } : null}
    />
  );
}
