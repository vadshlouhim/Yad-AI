import type { Tables } from "@/types/database.types";

export function canAccessAdmin(profile: Pick<Tables<"profiles">, "email" | "role"> | null | undefined) {
  if (!profile) return false;
  return profile.role === "SUPER_ADMIN";
}
