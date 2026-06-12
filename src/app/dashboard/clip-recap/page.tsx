import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Clip video - Yad.ia" };

export default function ClipRecapPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-[#5b1423] via-[#7a1d31] to-[#a02d42] p-6 shadow-[0_20px_44px_-28px_rgba(127,29,29,0.35)]">
        <div className="max-w-3xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-rose-200/90" />
          <h1 className="text-3xl font-bold tracking-tight text-white">CLIP VIDÉO</h1>
          <p className="mt-3 text-sm leading-6 text-rose-50/90">
            Nous vous proposons de créer des mini-clips récapitulatifs de vos événements : envoyez-nous vos photos
            et vidéos par WhatsApp, et notre équipe réalise un montage prêt à publier sur vos réseaux.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 shadow-sm">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="mb-4 h-1.5 w-10 rounded-full bg-rose-500" />
          <p className="text-sm text-slate-500">
            Envoyez-nous vos contenus, nous nous chargeons du montage et de la livraison d&apos;un clip prêt à publier.
          </p>

          <div className="mt-8 flex w-full flex-col items-center gap-4">
            <Link href="https://wa.me/33668508898" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button className="h-12 w-full rounded-2xl bg-rose-600 px-6 text-white shadow-[0_12px_28px_rgba(190,24,93,0.22)] hover:bg-rose-700 active:bg-rose-800 sm:w-auto">
                <MessageCircle className="size-4" />
                Contactez-nous via WhatsApp
              </Button>
            </Link>

            <Link
              href="https://www.youtube.com/@tsh5431"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                className="h-12 w-full rounded-2xl border-rose-200 bg-white px-6 text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-auto"
              >
                <PlayCircle className="size-4" />
                Voir nos créations vidéo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
