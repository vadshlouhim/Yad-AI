import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AutomationsClient } from "@/components/automations/automations-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Automatisations — Shalom IA" };

export default async function AutomationsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: automations } = await admin
    .from("Automation")
    .select("*, event:Event(title, startDate), runs:AutomationRun(*)")
    .eq("communityId", communityId)
    .order("createdAt", { ascending: false });

  const { data: communityAutomationIds } = await admin
    .from("Automation")
    .select("id")
    .eq("communityId", communityId);

  const ids = communityAutomationIds?.map((a) => a.id) ?? [];

  const { data: runs } = ids.length
    ? await admin
        .from("AutomationRun")
        .select("*, automation:Automation(name)")
        .in("automationId", ids)
        .gte("startedAt", weekAgo.toISOString())
        .order("startedAt", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <AutomationsClient
      automations={(automations ?? []) as Parameters<typeof AutomationsClient>[0]["automations"]}
      recentRuns={(runs ?? []) as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
    />
  );
}
