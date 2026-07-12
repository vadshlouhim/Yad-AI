import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContactsManager } from "@/components/settings/contacts-manager";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes contacts — EasyCom IA" };

export default async function ContactsPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
      <ContactsManager />
    </div>
  );
}
