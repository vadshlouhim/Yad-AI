import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RequestResourceClient } from "@/components/community-library/request-resource-client";

export const metadata: Metadata = { title: "Demander une ressource — EasyCom IA" };

export default async function RequestResourcePage() {
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

  return <RequestResourceClient />;
}
