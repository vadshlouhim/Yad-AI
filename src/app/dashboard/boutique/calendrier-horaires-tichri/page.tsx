import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { BoutiqueImageCarousel } from "@/components/boutique/boutique-image-carousel";
import { BoutiqueProductPage } from "@/components/boutique/boutique-product-page";

const WHATSAPP_URL = "https://wa.me/33668508898?text=Je%20suis%20int%C3%A9ress%C3%A9%28e%29%20par%20le%20calendrier%20des%20horaires%20de%20Tichri.%20Pouvez-vous%20m%27en%20dire%20plus%2C%20s%27il%20vous%20pla%C3%AEt%20%3F";

const CALENDAR_IMAGES = [
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/4.webp", alt: "Exemple rouge du calendrier des horaires de Tichri" },
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/5.webp", alt: "Exemple bleu du calendrier des horaires de Tichri" },
  { src: "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/Boutique%20et%20articles/6%20(1).webp", alt: "Exemple bordeaux du calendrier des horaires de Tichri" },
] as const;

export const metadata: Metadata = {
  title: "Calendrier des Horaires de Tichri — EasyCom IA",
  description: "Découvrez plusieurs exemples de calendriers des horaires de Tichri.",
};

export default function TichriCalendarPage() {
  return (
    <BoutiqueProductPage
      title="Calendrier des Horaires de Tichri"
      description="Découvrez plusieurs exemples de calendriers réunissant les horaires et les temps forts du mois de Tichri."
      info="Vous souhaitez obtenir plus d’informations ou préparer votre calendrier ? Contactez-nous directement sur WhatsApp."
      whatsappUrl={WHATSAPP_URL}
      icon={CalendarDays}
      tone="amber"
    >
      <BoutiqueImageCarousel images={CALENDAR_IMAGES} label="Exemples du calendrier de Tichri" tone="amber" />
    </BoutiqueProductPage>
  );
}
