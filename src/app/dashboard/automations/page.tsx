import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AutomationsClient } from "@/components/automations/automations-client";
import { presetAppliesToCommunity, type PresetWithRhythms } from "@/lib/automation/preset-utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Automatisations - EasyCom AI" };

export default async function AutomationsPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: automations } = await admin
    .from("Automation")
    .select("*, event:Event(id, title, startDate), runs:AutomationRun(*)")
    .eq("communityId", communityId)
    .order("createdAt", { ascending: false });

  const [{ data: community }, { data: presets }] = await Promise.all([
    admin.from("Community").select("id, communityType, rhythmId, religiousStream").eq("id", communityId).single(),
    admin
      .from("AutomationPreset")
      .select("*, rhythms:AutomationPresetRhythm(id, rhythmId, rhythm:CommunityRhythm(id, name, slug, isActive))")
      .eq("isActive", true)
      .order("sortOrder", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const applicablePresets = ((presets ?? []) as PresetWithRhythms[]).filter((preset) =>
    community ? presetAppliesToCommunity(preset, community) : false
  );

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
      presets={applicablePresets as Parameters<typeof AutomationsClient>[0]["presets"]}
      recentRuns={(runs ?? []) as Parameters<typeof AutomationsClient>[0]["recentRuns"]}
    />
  );
}
