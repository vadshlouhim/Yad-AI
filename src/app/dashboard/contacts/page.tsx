import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UsersRound } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { ContactsManager } from "@/components/settings/contacts-manager";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "CRM Inteligent IA — EasyCom IA" };

export default async function ContactsPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:py-8">
      <AgentPageBanner
        eyebrow="CRM communautaire"
        title="CRM Inteligent IA"
        description="Bientôt, l’IA pourra classer intelligemment vos contacts selon leur récurrence, les sommes des dons données, les mots clés, la ville et les amis."
        icon={UsersRound}
        tone="emerald"
        flat
      />
      <ContactsManager />
    </div>
  );
}
