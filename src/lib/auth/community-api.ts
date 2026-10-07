import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CommunityApiContext = {
  userId: string;
  communityId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "VIEWER";
};

export async function getCommunityApiContext(): Promise<CommunityApiContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId, role").eq("id", user.id).maybeSingle();
  if (!profile?.communityId) return null;
  return { userId: user.id, communityId: profile.communityId, role: profile.role };
}

export function canManageCommunity(role: CommunityApiContext["role"]) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
