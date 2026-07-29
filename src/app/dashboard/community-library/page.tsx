import type { Metadata } from "next";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityLibraryClient } from "@/components/community-library/community-library-client";

export const metadata: Metadata = { title: "Bibliothèque partagée — EasyCom IA" };

export default async function CommunityLibraryPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: community }, resourcesResult, requestsResult] = await Promise.all([
    admin.from("Community").select("id, name, logoUrl, plan, tone").eq("id", communityId).single(),
    Promise.resolve(
      admin
        .from("community_resources")
        .select("*", { count: "exact" })
        .eq("communityId", communityId)
        .eq("status", "published")
        .order("isFeatured", { ascending: false })
        .order("createdAt", { ascending: false })
        .limit(20)
    ).catch(() => ({ data: null, count: null, error: null })),
    Promise.resolve(
      admin
        .from("community_resource_requests")
        .select("*", { count: "exact" })
        .eq("communityId", communityId)
        .eq("status", "open")
        .order("createdAt", { ascending: false })
        .limit(10)
    ).catch(() => ({ data: null, count: null, error: null })),
  ]);

  return (
    <CommunityLibraryClient
      community={community!}
      initialResources={resourcesResult.data ?? []}
      initialTotal={resourcesResult.count ?? 0}
      initialRequests={requestsResult.data ?? []}
    />
  );
}
