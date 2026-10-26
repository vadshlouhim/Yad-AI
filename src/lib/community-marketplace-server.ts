import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCommunityAccess } from "@/lib/billing/subscription-policy";

export async function getMarketplaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email, avatarUrl, role, communityId")
    .eq("id", user.id)
    .single();
  if (!profile?.communityId) return null;

  const { data: community } = await admin
    .from("Community")
    .select("id, name, plan, createdAt")
    .eq("id", profile.communityId)
    .single();
  if (!community) return null;

  return { user, profile, community, admin };
}

export function marketplaceError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function isPublishingPlan(community: { plan?: string | null; createdAt?: string | null }) {
  return hasCommunityAccess(community);
}
