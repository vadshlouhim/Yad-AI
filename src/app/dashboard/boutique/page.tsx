import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Boutique - EasyCom IA" };

export default function BoutiquePage() {
  redirect("https://linktr.ee/Yadshlouhim");
}
