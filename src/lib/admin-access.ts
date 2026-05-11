import type { Tables } from "@/types/database.types";

const ADMIN_EMAILS = new Set(["chlomitaieb@gmail.com", "peravjojo@gmail.com"]);

export function canAccessAdmin(profile: Pick<Tables<"profiles">, "email" | "role"> | null | undefined) {
  if (!profile) return false;
  return profile.role === "SUPER_ADMIN" || ADMIN_EMAILS.has(profile.email.toLowerCase());
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.has(email.toLowerCase()));
}
