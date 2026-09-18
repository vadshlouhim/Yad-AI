import type { Metadata } from "next";
import { EasyComHome } from "@/components/home/easycom-home";
import { resolveHomeMainVideo } from "@/lib/home-main-video";

export const metadata: Metadata = {
  title: "EasyCom AI — Toute la communication de votre synagogue",
  description:
    "Publiez, créez, automatisez. Toute la communication de votre synagogue, Beth Habad ou association au même endroit, avec vos agents IA.",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  return <EasyComHome mainVideoSource={await resolveHomeMainVideo()} />;
}
