import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { ComingSoonFeatures } from "@/components/coming-soon/coming-soon-features";
import { PublicFooter } from "@/components/layout/public-footer";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return {
    title: { absolute: he ? "תכונות בקרוב | EasyCom IA" : "Fonctionnalités à venir | EasyCom IA" },
    description: he ? "גלו את ששת הכלים הבאים של EasyCom IA לקהילה שלכם." : "Découvrez les six prochains outils EasyCom IA pour simplifier les échanges, les ressources et les projets de votre communauté.",
    alternates: { canonical: "/fonctionnalites-a-venir" },
    openGraph: { locale: he ? "he_IL" : "fr_FR" },
  };
}

export default function ComingSoonPage() {
  return <><ComingSoonFeatures /><PublicFooter platformStyle /></>;
}
