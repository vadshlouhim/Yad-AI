import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TargetedAdmin = ReturnType<typeof createAdminClient>;

export function targetedDb(admin: TargetedAdmin) {
  return admin as TargetedAdmin & { from: (table: string) => ReturnType<TargetedAdmin["from"]> };
}

export async function requireTargetedCommunity() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return null;
  return { userId: user.id, communityId: profile.communityId, admin, db: targetedDb(admin) };
}

