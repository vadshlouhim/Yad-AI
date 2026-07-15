import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { ContactsManager } from "@/components/settings/contacts-manager";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes contacts — EasyCom IA" };

export default async function ContactsPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:py-8">
      <AgentPageBanner
        eyebrow="CRM communautaire"
        title="Contacts"
        description="Bientôt, l’IA pourra classer intelligemment vos contacts selon leur récurrence, le montant total des dons effectués dans l’année, ainsi que de nombreux autres critères pertinents."
        icon={UsersRound}
        tone="slate"
      />
      <ContactsManager />
    </div>
  );
}
