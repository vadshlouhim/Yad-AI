import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TemplatesClient } from "@/components/templates/templates-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Templates d'affiches — Yad.ia" };

export default async function TemplatesPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: templates }, { data: community }] = await Promise.all([
    admin
      .from("Template")
      .select("*")
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
      .order("category", { ascending: true })
      .order("usageCount", { ascending: false }),
    admin
      .from("Community")
      .select("id, name, city, tone, phone, email, website, address, religiousStream, plan")
      .eq("id", communityId)
      .single(),
  ]);

  return (
    <TemplatesClient
      templates={(templates ?? []) as Parameters<typeof TemplatesClient>[0]["templates"]}
      community={community!}
      plan={community?.plan ?? "FREE_TRIAL"}
    />
  );
}
