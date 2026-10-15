import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContactsManager } from "@/components/settings/contacts-manager";
import { ContactsTools } from "@/components/settings/contacts-tools";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "CRM intelligent — EasyCom IA" };

export default async function ContactsPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");
  return <div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 px-3 py-4 pb-28 sm:px-6 md:pb-6">
    <ContactsManager />
    <ContactsTools />
  </div>;
}
