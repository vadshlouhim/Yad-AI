import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { BoutiqueProductPage } from "@/components/boutique/boutique-product-page";

const VIDEO_URL = "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/Copie%20de%20Reel%20video%20instagram%20voyage%20moderne%20minimaliste%20blanc%20et%20jaune%20(4).mp4";
const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20Birkat%20Hachana.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

export const metadata: Metadata = {
  title: "Birkat Hachana — EasyCom IA",
  description: "Découvrez la présentation vidéo de Birkat Hachana.",
};

export default function BirkatHachanaPage() {
  return (
    <BoutiqueProductPage
      title="Birkat Hachana"
      description="Découvrez Birkat Hachana à travers cette présentation vidéo."
      info="Vous souhaitez obtenir plus d’informations ? Contactez-nous directement sur WhatsApp."
      whatsappUrl={WHATSAPP_URL}
      icon={PlayCircle}
      tone="coral"
    >
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border-4 border-white bg-slate-950 p-2 shadow-[0_24px_60px_-30px_rgba(239,63,79,0.45)] sm:p-3">
        <video src={VIDEO_URL} controls autoPlay muted loop playsInline preload="metadata" aria-label="Présentation vidéo de Birkat Hachana" className="aspect-[9/16] max-h-[76vh] w-full rounded-[1.5rem] bg-black object-contain">
          Votre navigateur ne permet pas de lire cette vidéo.
        </video>
      </div>
    </BoutiqueProductPage>
  );
}
