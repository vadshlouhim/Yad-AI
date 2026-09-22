import { notFound, redirect } from "next/navigation";
import { getBillingGate } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeCanvaUrl } from "@/lib/templates/availability";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CanvaTemplateRedirectPage({ params }: Props) {
  const { id } = await params;
  const destination = `/templates/canva/${encodeURIComponent(id)}`;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(destination)}`);
  }

  const admin = createAdminClient();
  const gate = await getBillingGate(admin, user.id);
  const { data: template } = await admin
    .from("Template")
    .select("id, communityId, isGlobal, isActive, canvaUrl")
    .eq("id", id)
    .eq("isActive", true)
    .maybeSingle();

  if (!template || (!template.isGlobal && template.communityId !== gate.communityId)) notFound();
  if (!gate.isPaid) redirect("/dashboard/settings/billing?feature=affiches-canva");

  let canvaUrl: string | null = null;
  try {
    canvaUrl = normalizeCanvaUrl(template.canvaUrl);
  } catch {
    notFound();
  }
  if (!canvaUrl) notFound();
  redirect(canvaUrl);
}
