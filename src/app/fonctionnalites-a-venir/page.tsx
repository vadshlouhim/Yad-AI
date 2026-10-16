import type { Metadata } from "next";
import { ComingSoonFeatures } from "@/components/coming-soon/coming-soon-features";
import { PublicFooter } from "@/components/layout/public-footer";

export const metadata: Metadata = {
  title: { absolute: "Fonctionnalités à venir | EasyCom IA" },
  description: "Découvrez les six prochains outils EasyCom IA pour simplifier les échanges, les ressources et les projets de votre communauté.",
  alternates: { canonical: "/fonctionnalites-a-venir" },
};

export default function ComingSoonPage() {
  return <><ComingSoonFeatures /><PublicFooter platformStyle /></>;
}
