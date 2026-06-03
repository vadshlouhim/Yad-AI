import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Assistant IA" };

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
    .select("id")
    .eq("id", id)
    .eq("communityId", profile.communityId!)
    .single();

  if (!event) redirect("/dashboard/events");
  redirect(`/dashboard/assistant?eventId=${event.id}`);
}
