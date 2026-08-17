import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { BoutiqueImageCarousel } from "@/components/boutique/boutique-image-carousel";
import { BoutiqueProductPage } from "@/components/boutique/boutique-product-page";

const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20la%20Plaquette%20Teffilin%20en%206%20%C3%A9tapes.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

const TEFFILIN_IMAGES = [
  {
    src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/teffilin%20brochure.png",
    alt: "Plaquette illustrée expliquant la mise des Teffilin en six étapes",
  },
] as const;

export const metadata: Metadata = {
  title: "Plaquette Teffilin en 6 étapes — EasyCom IA",
  description: "Un support clair et illustré pour apprendre à mettre les Teffilin en six étapes.",
};

export default function TeffilinBrochurePage() {
  return (
    <BoutiqueProductPage
      title="Plaquette Teffilin en 6 étapes"
      description="Un support clair et illustré pour apprendre à mettre les Teffilin, étape par étape, avec les bénédictions essentielles."
      info="Une plaquette pédagogique et pratique, idéale pour accompagner chaque personne simplement dans l’accomplissement de cette mitsva."
      whatsappUrl={WHATSAPP_URL}
      icon={BookOpen}
      tone="teal"
    >
      <BoutiqueImageCarousel images={TEFFILIN_IMAGES} label="Présentation de la plaquette Teffilin en six étapes" tone="teal" />
    </BoutiqueProductPage>
  );
}
