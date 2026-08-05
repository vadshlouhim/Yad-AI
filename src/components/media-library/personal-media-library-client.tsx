"use client";
/* eslint-disable @next/next/no-img-element */

import { Download, Image as ImageIcon, Share2 } from "lucide-react";
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
      window.alert("Lien de l’image copié. Vous pouvez le coller dans un email ou une publication.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      window.open(image.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Bibliothèque personnelle</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Mes créations</h1>
        <p className="mt-2 text-sm text-slate-600">Retrouvez, téléchargez et partagez les affiches que vous avez choisi de conserver.</p>
      </div>
      {images.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-slate-500"><ImageIcon className="mx-auto size-12" /><p className="mt-3 font-semibold">Aucune création enregistrée</p><p className="mt-1 text-sm">Générez une affiche puis choisissez « Enregistrer dans ma bibliothèque ».</p></CardContent></Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <Card key={image.id} className="overflow-hidden">
              <img src={image.url} alt={image.name} className="aspect-[3/4] w-full bg-slate-100 object-contain" />
              <CardContent className="space-y-3 p-4">
                <div><p className="line-clamp-2 font-bold text-slate-900">{image.name}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(image.createdAt))}</p></div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(image.url, "_blank", "noopener,noreferrer")}><Download className="mr-2 size-4" />Ouvrir</Button>
                  <Button size="sm" onClick={() => void shareImage(image)}><Share2 className="mr-2 size-4" />Partager</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
