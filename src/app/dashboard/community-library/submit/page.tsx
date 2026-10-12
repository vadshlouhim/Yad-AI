import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Publier — Annonces & Ressources communautaires" };

export default function SubmitResourcePage() {
  redirect("/dashboard/boutique/communautaire/publier");
}
