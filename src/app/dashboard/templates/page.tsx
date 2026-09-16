import { notFound } from "next/navigation";
import { getPosterSource } from "@/lib/templates/edit-source";
import { readPosterEditState } from "@/lib/templates/edit-state";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TemplatesClient } from "@/components/templates/templates-client";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { getBillingConfig, getBillingUsage, planToTier } from "@/lib/billing";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Affiches — EasyCom IA" };

interface Props {
  searchParams: Promise<{ templateId?: string | string[]; mediaId?: string | string[] }>;
}

export default async function TemplatesPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedTemplateId = query.templateId;
  let initialTemplateId = typeof requestedTemplateId === "string" ? requestedTemplateId : undefined;
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();
  const source = typeof query.mediaId === "string" ? await getPosterSource(admin, communityId, query.mediaId).catch(() => null) : null;
  if (query.mediaId && !source) notFound();
  if (source?.templateId) initialTemplateId = source.templateId;

  const [{ data: templates }, { data: community }, billingConfig] = await Promise.all([
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
      .select("id, name, city, logoUrl, tone, phone, email, website, address, religiousStream, timezone, plan")
      .eq("id", communityId)
      .single(),
    getBillingConfig(admin),
  ]);
  const billingUsage = await getBillingUsage(admin, communityId, planToTier(community?.plan));

  const hydratedTemplates = (templates ?? []).map((template) => ({
    ...template,
    originalUrl: resolveTemplateAssetUrl(template.originalUrl),
    thumbnailUrl: resolveTemplateAssetUrl(template.thumbnailUrl),
    previewUrl: resolveTemplateAssetUrl(template.previewUrl),
  }));
  const shabbatTimes = await getStoredShabbatTimes({
    city: community?.city ?? undefined,
    timezone: community?.timezone ?? "Europe/Paris",
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <TemplatesClient
        templates={hydratedTemplates as Parameters<typeof TemplatesClient>[0]["templates"]}
        community={community!}
        shabbatTimes={shabbatTimes}
        plan={community?.plan ?? "FREE_TRIAL"}
        billingConfig={billingConfig}
        billingUsage={billingUsage}
        key={source?.id ?? initialTemplateId ?? "gallery"}
        initialTemplateId={initialTemplateId}
        initialSource={source ? { id: source.id, imageUrl: source.url, editState: readPosterEditState(source.editState) } : null}
      />
    </div>
  );
}
