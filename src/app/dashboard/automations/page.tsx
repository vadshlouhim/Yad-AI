import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AutomationsClient } from "@/components/automations/automations-client";
import { presetAppliesToCommunity, type PresetWithClientTypes } from "@/lib/automation/preset-utils";
import {
  GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS,
  GENERAL_DEFAULT_PUBLICATION_CATEGORY,
  getDefaultAutomationPublicationsForProfile,
} from "@/lib/automation/suggested-publications";
import { getCommunityProfileDisplayLabel, getCommunityProfileLabel } from "@/lib/community/profile-labels";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Publications Automatisées IA - EasyCom AI" };

const INVALID_PROFILE_VALUES = new Set([
  "",
  "OTHER",
  "STRUCTURE",
  "PROFIL",
  "PROFILS",
  "PROFIL UTILISATEUR",
  "PROFILS UTILISATEUR",
  "AUTRE PROFIL",
  "AUTRES PROFILS",
  "VOTRE PROFIL",
]);

function normalizeProfileValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferProfileType(community: {
  communityType?: string | null;
  religiousStream?: string | null;
  name?: string | null;
  description?: string | null;
} | null | undefined, savedProfileType: string) {
  const saved = normalizeProfileValue(savedProfileType);
  if (!INVALID_PROFILE_VALUES.has(saved)) return savedProfileType;

  const communityType = normalizeProfileValue(community?.communityType);
  if (!INVALID_PROFILE_VALUES.has(communityType)) return community?.communityType ?? "";

  const text = normalizeProfileValue([
    community?.religiousStream,
    community?.name,
    community?.description,
  ].filter(Boolean).join(" "));

  if (/(SYNAGOGUE|BETH|HABAD|HABBAD|LOUBAVITCH)/.test(text)) return "SYNAGOGUE";
  if (/(RESTAURANT|RESTO|CAFE|BISTRO)/.test(text)) return "RESTAURANT";
  if (/(TRAITEUR|CATERER)/.test(text)) return "CATERER";
  if (/(COACH|SPORT)/.test(text)) return "SPORT_COACH";
  if (/(ASSOCIATION|ASSO|ONG)/.test(text)) return "ASSOCIATION";
  if (/(ECOLE|FORMATION|SCHOOL)/.test(text)) return "SCHOOL";
  if (/(COMMERCE|BOUTIQUE|MAGASIN|STORE)/.test(text)) return "COMMERCE";
  if (/(ENTREPRISE|BUSINESS|SOCIETE)/.test(text)) return "BUSINESS";

  return "";
}

function inferProfileLabelFromCommunity(community: {
  communityType?: string | null;
  religiousStream?: string | null;
  name?: string | null;
  description?: string | null;
} | null | undefined) {
  const inferredType = inferProfileType(community, "");
  const inferredLabel = getCommunityProfileDisplayLabel(inferredType);
  if (inferredLabel) return inferredLabel;

  const name = community?.name?.trim();
  return name && !INVALID_PROFILE_VALUES.has(normalizeProfileValue(name)) ? name : "Profil personnalisé";
}

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
    admin.from("Community").select("id, name, description, communityType, religiousStream, vocabulary").eq("id", communityId).single(),
    admin
      .from("AutomationPreset")
      .select("*")
      .eq("isActive", true)
      .order("sortOrder", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  const vocabulary = community?.vocabulary && typeof community.vocabulary === "object" && !Array.isArray(community.vocabulary)
    ? community.vocabulary as { automationValidationMode?: unknown; manualValidationBeforeSend?: unknown; hiddenAutomationPresetIds?: unknown; communityProfileType?: unknown; communityProfileLabel?: unknown }
    : {};
  const hiddenPresetIds = Array.isArray(vocabulary.hiddenAutomationPresetIds)
    ? vocabulary.hiddenAutomationPresetIds.map(String)
    : [];
  const requiresValidationDefault = vocabulary.automationValidationMode === "automatic" || vocabulary.manualValidationBeforeSend === false
    ? false
    : true;
  const savedProfileType = typeof vocabulary.communityProfileType === "string" ? vocabulary.communityProfileType.trim() : "";
  const profileType = inferProfileType(community, savedProfileType);
  const savedProfileLabel = typeof vocabulary.communityProfileLabel === "string" ? vocabulary.communityProfileLabel.trim() : "";
  const savedProfileLabelKey = normalizeProfileValue(savedProfileLabel);
  const inferredProfileLabel = profileType ? getCommunityProfileLabel(profileType, "plural") : "";
  const profileLabel = inferredProfileLabel || (
    savedProfileLabel && !INVALID_PROFILE_VALUES.has(savedProfileLabelKey)
      ? savedProfileLabel
      : getCommunityProfileDisplayLabel(community?.communityType) || inferProfileLabelFromCommunity(community)
  );
  const visibleDbPresets = ((presets ?? []) as PresetWithClientTypes[]).filter((preset) =>
    community ? presetAppliesToCommunity(preset, community) && !hiddenPresetIds.includes(preset.id) : false
  );
  const profileSpecificPresets = visibleDbPresets.filter((preset) => preset.category !== GENERAL_DEFAULT_PUBLICATION_CATEGORY);
  const dbDefaultPresets = visibleDbPresets.filter((preset) => preset.category === GENERAL_DEFAULT_PUBLICATION_CATEGORY);
  const fallbackProfilePresets = getDefaultAutomationPublicationsForProfile(profileType || community?.communityType)
    .filter((preset) => !hiddenPresetIds.includes(preset.id));
  const fallbackGeneralPresets = GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS
    .filter((preset) => !hiddenPresetIds.includes(preset.id));
  const profilePresets = profileSpecificPresets.length > 0 ? profileSpecificPresets : fallbackProfilePresets;
  const generalPresets = dbDefaultPresets.length > 0 ? dbDefaultPresets : fallbackGeneralPresets;
  const applicablePresets = profilePresets.length > 0
    ? [...profilePresets, ...generalPresets]
    : generalPresets;

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
      requiresValidationDefault={requiresValidationDefault}
      communityType={profileType || community?.communityType || "OTHER"}
      profileLabel={profileLabel}
    />
  );
}
