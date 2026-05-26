import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Site web - EasyCom AI" };

export default function WebsiteCreationPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-br from-[#12335f] via-[#184779] to-[#2563a8] p-6 shadow-[0_20px_44px_-28px_rgba(17,24,39,0.4)]">
        <div className="max-w-4xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-sky-200/90" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Site web</h1>
          <p className="mt-3 text-sm leading-6 text-sky-50/90">
            Nous creons des sites web professionnels, modernes et elegants pour les Bate Habad et les synagogues,
            avec l&apos;aide de l&apos;IA et l&apos;accompagnement de designers specialises. Que vous ayez deja un site
            ou que vous souhaitiez en creer un nouveau, notre equipe vous accompagne avec une solution claire, rapide
            et adaptee a vos besoins.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 shadow-inner">
            <Globe className="size-7" />
          </div>
          <div className="mb-4 h-1.5 w-10 rounded-full bg-sky-500" />
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Presentez votre communaute, vos evenements, vos horaires et vos informations pratiques dans un site web
            clair, moderne et pense pour inspirer confiance des la premiere visite.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <Link href="mailto:contact@easycom-AI.com" className="w-full sm:w-auto">
              <Button className="h-12 w-full rounded-2xl bg-sky-700 px-6 text-white shadow-[0_12px_28px_rgba(2,132,199,0.22)] transition-transform duration-200 hover:bg-sky-800 hover:shadow-[0_16px_34px_rgba(2,132,199,0.28)] active:scale-[0.98] sm:w-auto">
                <Mail className="size-4" />
                Contactez notre equipe professionnelle
              </Button>
            </Link>

            <Link href="/demo/website" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-sky-200 bg-white px-6 text-sky-700 transition-all duration-200 hover:bg-sky-50 hover:text-sky-800 hover:shadow-sm active:scale-[0.98] sm:w-auto"
              >
                <ArrowRight className="size-4" />
                Voir nos creations web deja creees pour la communaute
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
