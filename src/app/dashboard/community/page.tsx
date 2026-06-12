import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CommunityClient } from "@/components/community/community-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ma communauté — Yad.ia" };

export default async function CommunityPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [
    { data: community },
    { data: users },
    { data: channels },
    eventCount,
    publicationCount,
    draftCount,
    mediaCount,
  ] = await Promise.all([
    admin.from("Community").select("*").eq("id", communityId).single(),
    admin.from("profiles").select("id, name, email, role, avatarUrl").eq("communityId", communityId).order("createdAt", { ascending: true }),
    admin.from("Channel").select("id, type, name, isConnected, isActive").eq("communityId", communityId),
    admin.from("Event").select("*", { count: "exact", head: true }).eq("communityId", communityId).then(r => r.count ?? 0),
    admin.from("Publication").select("*", { count: "exact", head: true }).eq("communityId", communityId).then(r => r.count ?? 0),
    admin.from("ContentDraft").select("*", { count: "exact", head: true }).eq("communityId", communityId).then(r => r.count ?? 0),
    admin.from("MediaFile").select("*", { count: "exact", head: true }).eq("communityId", communityId).then(r => r.count ?? 0),
  ]);

  const fullCommunity = {
    ...community,
    users: users ?? [],
    channels: channels ?? [],
    _count: {
      events: eventCount,
      publications: publicationCount,
      contentDrafts: draftCount,
      mediaFiles: mediaCount,
    },
  };

  return <CommunityClient community={fullCommunity!} />;
}
