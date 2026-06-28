import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitResourceClient } from "@/components/community-library/submit-resource-client";

export const metadata: Metadata = { title: "Soumettre une ressource — EasyCom IA" };

export default async function SubmitResourcePage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const { data: community } = await admin
    .from("Community")
    .select("id, name, plan")
    .eq("id", communityId)
    .single();

  if (!community || community.plan === "FREE_TRIAL") {
    redirect("/dashboard/community-library");
  }

  return <SubmitResourceClient communityName={community.name} />;
}
