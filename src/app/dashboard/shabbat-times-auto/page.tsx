import { TemplatesClient } from "@/components/templates/templates-client";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBillingConfig, getBillingUsage } from "@/lib/billing";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Horaire de Chabbat — EasyCom IA" };

export default async function ShabbatTimesAutoPage() {
  const { profile } = await requireAuth();
  const communityId = profile.communityId!;
  const admin = createAdminClient();

  const [{ data: templates }, { data: community }, billingConfig, billingUsage] = await Promise.all([
    admin
      .from("Template")
      .select("*")
      .eq("isActive", true)
      .or(`isGlobal.eq.true,communityId.eq.${communityId}`)
      .ilike("name", "Horaires de Chabbat")
      .order("usageCount", { ascending: false }),
    admin
      .from("Community")
      .select("id, name, city, tone, phone, email, website, address, religiousStream, plan")
      .eq("id", communityId)
      .single(),
    getBillingConfig(admin),
    getBillingUsage(admin, communityId),
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
      billingConfig={billingConfig}
      billingUsage={billingUsage}
      galleryTitle="Horaire de Chabbat"
      gallerySubtitle="Choisissez un design d'horaires de Chabbat, puis activez une notification hebdomadaire chaque vendredi matin avec les horaire de Chabbat avec votre nom et logo"
      showGalleryFilters={false}
      emptyTitle="Aucune affiche Horaires de Chabbat"
      emptyDescription="Ajoutez ou activez une affiche nommée Horaires de Chabbat depuis l'admin pour la retrouver ici."
    />
  );
}
