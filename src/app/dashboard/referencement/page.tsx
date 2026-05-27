import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Referencement - EasyCom AI" };

const whatsappMessage = encodeURIComponent(
  "Bonjour, je souhaite en savoir plus sur le referencement Google et IA avec EasyCom AI.",
);

export default function ReferencementPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-[#12335f] via-[#184779] to-[#2563a8] p-6 shadow-[0_20px_44px_-28px_rgba(17,24,39,0.4)]">
        <div className="max-w-4xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-sky-200/90" />
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Referencement sur Google et les agents IA
          </h1>
          <p className="mt-3 text-sm leading-6 text-sky-50/90">
            Nous travaillons depuis des annees pour reussir a referencer correctement et naturellement votre activite
            sur Google et sur les agents IA. Par exemple: demandez a une IA &quot;je cherche un avocat a Paris&quot;, elle pourra
            proposer votre structure dans les suggestions pertinentes.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-inner">
            <Search className="size-7" />
          </div>
          <div className="mb-4 h-1.5 w-10 rounded-full bg-sky-500" />
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Nous construisons une presence claire, coherent et durable pour aider les moteurs de recherche et les IA a
            comprendre qui vous etes, ce que vous proposez, et pourquoi vous recommander au bon moment.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <Link href={`https://wa.me/?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button className="h-12 w-full rounded-2xl bg-emerald-600 px-6 text-white shadow-[0_12px_28px_rgba(5,150,105,0.22)] transition-transform duration-200 hover:bg-emerald-700 hover:shadow-[0_16px_34px_rgba(5,150,105,0.28)] active:scale-[0.98] sm:w-auto">
                <MessageCircle className="size-4" />
                Contactez-nous via WhatsApp
              </Button>
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-700">
              <Sparkles className="size-3.5" />
              Google, SEO local, agents IA et visibilite naturelle
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
