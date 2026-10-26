import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { EasyComHome } from "@/components/home/easycom-home";
import { getShowcasePosters } from "@/lib/templates/showcase";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return {
    title: he ? "EasyCom AI — כל התקשורת של בית הכנסת שלכם" : "EasyCom AI — Toute la communication de votre synagogue",
    description: he
      ? "פרסום, יצירה ואוטומציה לכל התקשורת של בית הכנסת, בית חב״ד או הארגון שלכם, עם עוזר AI."
      : "Publiez, créez, automatisez. Toute la communication de votre synagogue, Beth Habad ou association au même endroit, avec votre assistant IA.",
    alternates: { canonical: "/" },
    openGraph: { locale: he ? "he_IL" : "fr_FR" },
  };
}

export default async function HomePage() {
  const showcase = await getShowcasePosters(await getLocale());
  return <EasyComHome showcase={showcase} />;
}
