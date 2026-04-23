import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AssistantClient } from "@/components/assistant/assistant-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assistant IA — Yad.ia" };

export default async function AssistantPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("name, tone, hashtags, language, communityType, religiousStream")
    .eq("id", communityId)
    .single();

  return (
    <AssistantClient
      communityName={community?.name ?? "Ma communauté"}
      tone={community?.tone ?? "MODERN"}
    />
  );
}
