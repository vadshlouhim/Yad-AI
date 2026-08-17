import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles, UsersRound } from "lucide-react";
import { ContactsManager } from "@/components/settings/contacts-manager";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "CRM Inteligent IA — EasyCom IA" };

export default async function ContactsPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:py-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_78%_8%,#8037ce_0%,#421388_48%,#210763_100%)] px-5 py-6 text-white shadow-[0_24px_58px_rgba(49,13,108,0.26)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-blue-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 size-48 rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="relative z-10 flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20"><UsersRound className="size-6" /></span>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.16em] text-white/70"><Sparkles className="size-3.5" />CRM communautaire</p>
            <h1 className="mt-1 text-[clamp(1.8rem,8vw,2.6rem)] font-black leading-none tracking-[-0.04em]">Contacts <span className="inline-flex translate-y-[-0.12em] rounded-lg bg-white px-2 py-1 text-[0.42em] tracking-normal text-[#421388] shadow-sm">AI</span></h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/80">Retrouvez instantanément les bons contacts en décrivant simplement le profil recherché.</p>
          </div>
        </div>
      </section>
      <ContactsManager />
    </div>
  );
}
