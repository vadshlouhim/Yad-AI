import type { Metadata } from "next";
import { Cake } from "lucide-react";
import { BoutiqueImageCarousel } from "@/components/boutique/boutique-image-carousel";
import { BoutiqueProductPage } from "@/components/boutique/boutique-product-page";

const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20le%20tableau%20Anniversaire%20juif.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

const ANNIVERSARY_IMAGES = [
  {
    src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/Anniversaire%20juif%20Excel%20modifiable%20(3).png",
    alt: "Tableau modifiable pour organiser les anniversaires juifs avec les dates civiles et hébraïques",
  },
] as const;

export const metadata: Metadata = {
  title: "Anniversaire juif — EasyCom IA",
  description: "Un tableau Excel modifiable pour suivre les anniversaires, les dates hébraïques et les informations de votre communauté.",
};

export default function JewishAnniversaryPage() {
  return (
    <BoutiqueProductPage
      title="Anniversaire juif"
      description="Un tableau Excel modifiable pour suivre facilement les anniversaires, les dates civiles et hébraïques de votre communauté."
      info="Centralisez les informations essentielles et gardez à portée de main les repères et coutumes de l’anniversaire juif."
      whatsappUrl={WHATSAPP_URL}
      icon={Cake}
      tone="rose"
    >
      <BoutiqueImageCarousel images={ANNIVERSARY_IMAGES} label="Présentation du tableau Anniversaire juif" tone="rose" />
    </BoutiqueProductPage>
  );
}
