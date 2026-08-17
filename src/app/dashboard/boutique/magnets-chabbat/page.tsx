import type { Metadata } from "next";
import { Magnet } from "lucide-react";
import { BoutiqueImageCarousel } from "@/components/boutique/boutique-image-carousel";
import { BoutiqueProductPage } from "@/components/boutique/boutique-product-page";

const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20les%20Magnets%20de%20Chabbat.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

const MAGNET_IMAGES = [
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/2.png", alt: "Exemple rose des magnets de Chabbat" },
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/1.png", alt: "Exemple bleu et orange des magnets de Chabbat" },
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/3.png", alt: "Exemple orange des magnets de Chabbat" },
] as const;

export const metadata: Metadata = {
  title: "Magnets de Chabbat — EasyCom IA",
  description: "Découvrez plusieurs exemples de magnets avec les horaires de Chabbat et des fêtes.",
};

export default function ShabbatMagnetsPage() {
  return (
    <BoutiqueProductPage
      title="Magnets de Chabbat"
      description="Découvrez plusieurs exemples de magnets réunissant les horaires de Chabbat et des fêtes pour votre communauté."
      info="Vous souhaitez obtenir plus d’informations ou préparer vos magnets ? Contactez-nous directement sur WhatsApp."
      whatsappUrl={WHATSAPP_URL}
      icon={Magnet}
      tone="blue"
    >
      <BoutiqueImageCarousel images={MAGNET_IMAGES} label="Exemples des magnets de Chabbat" tone="blue" />
    </BoutiqueProductPage>
  );
}
