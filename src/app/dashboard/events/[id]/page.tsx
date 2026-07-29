import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAutomationConfigurationHref, getDedicatedAutomationConfigurationHref } from "@/lib/automation/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Événement - EasyCom IA" };

export default async function EventDetailRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireAuth();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("Event")
    .select("id, title, automations:Automation(id, name, trigger, triggerConfig)")
    .eq("id", id)
    .eq("communityId", profile.communityId!)
    .single();

  if (!event) redirect("/dashboard/events");
  const automation = Array.isArray(event.automations) ? event.automations[0] : null;
  if (automation) {
    redirect(getAutomationConfigurationHref({
      id: automation.id,
      name: automation.name,
      trigger: automation.trigger,
      triggerConfig: automation.triggerConfig as Record<string, unknown> | null,
    }));
  }
  const dedicatedHref = getDedicatedAutomationConfigurationHref({ name: event.title, trigger: "MANUAL" });
  if (dedicatedHref) redirect(dedicatedHref);
  redirect(`/dashboard/assistant?eventId=${event.id}`);
}
