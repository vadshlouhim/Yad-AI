"use client";
/* eslint-disable @next/next/no-img-element */

import { Download, Image as ImageIcon, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PersonalImage = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  width: number | null;
  height: number | null;
};

export function PersonalMediaLibraryClient({ images }: { images: PersonalImage[] }) {
  async function shareImage(image: PersonalImage) {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const file = new File([blob], `${image.name}.png`, { type: blob.type || "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: image.name, files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: image.name, url: image.url });
        return;
      }
      await navigator.clipboard.writeText(image.url);
      window.alert("Lien de l'image copie. Vous pouvez le coller dans un email ou une publication.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.open(image.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <section className="overflow-hidden rounded-[2rem] bg-[#421388] text-white shadow-[0_24px_60px_rgba(66,19,136,0.28)]">
        <div className="relative px-5 pb-12 pt-5 sm:px-7 sm:pb-14 sm:pt-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_left_center,rgba(255,255,255,0.10),transparent_24%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
              <Sparkles className="size-3.5" />
              Bibliotheque personnelle
            </div>
            <h1 className="mt-4 max-w-[15rem] text-[2rem] font-black leading-none sm:max-w-none sm:text-4xl">
              Mes creations
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/88 sm:text-base">
              Retrouvez vos affiches enregistrees, ouvrez-les rapidement et partagez-les en un geste.
            </p>
          </div>
        </div>
        <div className="h-7 bg-[#f7f2ea]" style={{ borderTopLeftRadius: "44% 100%", borderTopRightRadius: "44% 100%" }} />
      </section>

      {images.length === 0 ? (
        <Card className="overflow-hidden rounded-[1.75rem] border-0 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <CardContent className="px-5 py-14 text-center text-slate-500 sm:py-16">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-[#f2ebff] text-[#421388]">
              <ImageIcon className="size-8" />
            </div>
            <p className="mt-4 text-lg font-black text-slate-900">Aucune creation enregistree</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Generez une affiche puis choisissez &quot;Enregistrer dans ma bibliotheque&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="overflow-hidden rounded-[1.6rem] border-0 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="bg-[linear-gradient(180deg,#f6f1ff_0%,#ffffff_100%)] p-2.5">
                <div className="overflow-hidden rounded-[1.15rem] bg-slate-100">
                  <img src={image.url} alt={image.name} className="aspect-[3/4] w-full bg-slate-100 object-contain" />
                </div>
              </div>

              <CardContent className="space-y-3 px-3 pb-3 pt-1 sm:p-4">
                <div>
                  <p className="line-clamp-2 text-sm font-black leading-5 text-slate-900 sm:text-base">{image.name}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(image.createdAt))}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")}
                    className="h-10 rounded-2xl border-[#d6c7f2] bg-white text-xs font-black text-[#421388] hover:bg-[#f8f3ff]"
                  >
                    <Download className="mr-2 size-4" />
                    Ouvrir
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void shareImage(image)}
                    className="h-10 rounded-2xl bg-[#421388] text-xs font-black text-white hover:bg-[#34106d]"
                  >
                    <Share2 className="mr-2 size-4" />
                    Partager
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
