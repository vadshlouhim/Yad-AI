import type { Tables } from "@/types/database.types";

const SUPER_ADMIN_EMAILS = new Set([
  "chlomitaieb@gmail.com",
  "peravjojo@gmail.com",
]);

export function canAccessAdmin(profile: Pick<Tables<"profiles">, "email" | "role"> | null | undefined) {
  if (!profile) return false;
  return profile.role === "SUPER_ADMIN" || SUPER_ADMIN_EMAILS.has(profile.email.toLowerCase());
}
