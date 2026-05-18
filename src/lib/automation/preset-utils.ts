import type { Database, Json, Tables } from "@/types/database.types";

export type CommunityRhythm = Pick<Tables<"CommunityRhythm">, "id" | "name" | "slug" | "isActive">;

export type PresetWithRhythms = Tables<"AutomationPreset"> & {
  rhythms?: Array<{ rhythm?: CommunityRhythm | null; rhythmId?: string | null }>;
};

export const AUTOMATION_TRIGGERS = new Set<Database["public"]["Enums"]["AutomationTrigger"]>([
  "BEFORE_EVENT",
  "EVENT_DAY",
  "AFTER_EVENT",
  "WEEKLY_SHABBAT",
  "JEWISH_HOLIDAY",
  "DAILY",
  "CUSTOM_SCHEDULE",
  "MANUAL",
]);

export const COMMUNITY_TYPES = new Set<Database["public"]["Enums"]["CommunityType"]>([
  "SYNAGOGUE",
  "ASSOCIATION",
  "SCHOOL",
  "CENTER",
  "OTHER",
]);

export function normalizeClientTypes(value: unknown): Database["public"]["Enums"]["CommunityType"][] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Database["public"]["Enums"]["CommunityType"] =>
    COMMUNITY_TYPES.has(entry as never)
  );
}

export function normalizeJsonObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

export function normalizeJsonArray(value: unknown): Json {
  return Array.isArray(value) ? (value as Json) : [];
}

export function presetAppliesToCommunity(
  preset: Pick<Tables<"AutomationPreset">, "isGlobal" | "clientTypes"> & {
    rhythms?: Array<{ rhythmId?: string | null; rhythm?: { id: string } | null }>;
  },
  community: { communityType: string; rhythmId?: string | null }
) {
  const typeApplies = preset.clientTypes.length === 0 || preset.clientTypes.includes(community.communityType as never);
  if (!typeApplies) return false;

  const rhythmIds = (preset.rhythms ?? [])
    .map((entry) => entry.rhythmId ?? entry.rhythm?.id ?? null)
    .filter(Boolean);

  if (rhythmIds.length === 0) return preset.isGlobal;
  return Boolean(community.rhythmId && rhythmIds.includes(community.rhythmId));
}

export function getGenerateAction(actions: unknown): { contentType?: string; channels?: string[] } | null {
  if (!Array.isArray(actions)) return null;
  const action = actions.find((entry) => entry && typeof entry === "object" && (entry as { type?: string }).type === "GENERATE_CONTENT");
  if (!action || typeof action !== "object") return null;
  return action as { contentType?: string; channels?: string[] };
}
