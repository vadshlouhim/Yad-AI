import type { Database, Json, Tables } from "@/types/database.types";

export type PresetWithClientTypes = Tables<"AutomationPreset">;

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
  "RESTAURANT",
  "CATERER",
  "SPORT_COACH",
  "COMMERCE",
  "BUSINESS",
  "CONTENT_CREATOR",
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
  preset: Pick<Tables<"AutomationPreset">, "clientTypes">,
  community: { communityType: string }
) {
  return preset.clientTypes.includes(community.communityType as never);
}

export function getGenerateAction(actions: unknown): { contentType?: string; channels?: string[] } | null {
  if (!Array.isArray(actions)) return null;
  const action = actions.find((entry) => entry && typeof entry === "object" && (entry as { type?: string }).type === "GENERATE_CONTENT");
  if (!action || typeof action !== "object") return null;
  return action as { contentType?: string; channels?: string[] };
}
