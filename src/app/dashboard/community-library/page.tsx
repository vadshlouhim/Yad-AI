import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Annonces & Ressources communautaires — EasyCom IA" };

export default function CommunityLibraryPage() {
  redirect("/dashboard/boutique/communautaire");
}
