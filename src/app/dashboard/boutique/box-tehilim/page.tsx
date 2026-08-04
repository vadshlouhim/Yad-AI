import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const VIDEO_URL = "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/Reel%20video%20instagram%20voyage%20moderne%20minimaliste%20blanc%20et%20jaune.mp4";
const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20la%20Box%20de%20Tehilim.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

export const metadata: Metadata = {
  title: "Box de Tehilim — EasyCom IA",
  description: "Découvrez la présentation vidéo de la Box de Tehilim.",
};

export default function BoxTehilimPage() {
  return (
    <div className="space-y-7 pb-8">
      <Link href="/dashboard/assistant" className="inline-flex">
        <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-950">
          <ArrowLeft className="size-4" />
          Retour vers l’accueil
        </Button>
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-orange-100 bg-gradient-to-br from-white via-orange-50/60 to-amber-100/60 p-6 shadow-[0_24px_60px_-42px_rgba(124,45,18,0.35)] sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(360px,1.15fr)] lg:items-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-orange-700 shadow-sm">
              <PlayCircle className="size-4" />
              Boutiques et Articles
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Box de Tehilim
            </h1>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Découvrez la Box de Tehilim à travers cette présentation vidéo.
            </p>

            <div className="mt-7 rounded-2xl border border-orange-200 bg-white/80 p-4 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
              Vous souhaitez obtenir plus d’informations ? Contactez-nous directement sur WhatsApp.
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#128C7E] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/15 transition hover:-translate-y-0.5 hover:bg-[#0f7a6f] focus:outline-none focus:ring-4 focus:ring-emerald-200 sm:w-auto"
            >
              <MessageCircle className="size-5" />
              Demander plus d’informations
              <ExternalLink className="size-4" />
            </a>
          </div>

          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-orange-100 bg-slate-950 p-2 shadow-[0_24px_60px_-38px_rgba(124,45,18,0.45)] sm:p-3">
            <video
              src={VIDEO_URL}
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Présentation vidéo de la Box de Tehilim"
              className="aspect-[9/16] max-h-[76vh] w-full rounded-[1.5rem] bg-black object-contain"
            >
              Votre navigateur ne permet pas de lire cette vidéo.
            </video>
          </div>
        </div>
      </section>
    </div>
  );
}
