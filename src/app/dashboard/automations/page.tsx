import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AutomationsClient } from "@/components/automations/automations-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Automatisations — Shalom IA" };

export default async function AutomationsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

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
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <p className="text-sm text-slate-100">
          Les automatisations pilotent uniquement vos publications programmées (J-10, J-5, J-1, jour J).
        </p>
      </div>
      <AutomationsClient
        automations={(automations ?? []) as Parameters<typeof AutomationsClient>[0]["automations"]}
        recentRuns={(runs ?? []) as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
      />
    </div>
  );
}
