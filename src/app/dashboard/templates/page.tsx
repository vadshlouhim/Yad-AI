import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TemplatesClient } from "@/components/templates/templates-client";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Affiches — Shalom IA" };

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
      .order("subCategory", { ascending: true })
      .order("usageCount", { ascending: false }),
    admin
      .from("Community")
      .select("id, name, city, tone, phone, email, website, address, religiousStream, plan")
      .eq("id", communityId)
      .single(),
  ]);

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
  }));

  return (
    <TemplatesClient
      templates={hydratedTemplates as Parameters<typeof TemplatesClient>[0]["templates"]}
      community={community!}
      plan={community?.plan ?? "FREE_TRIAL"}
    />
  );
}
