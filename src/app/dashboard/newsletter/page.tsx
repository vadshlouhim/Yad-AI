import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewsletterComingSoon } from "@/components/newsletter/newsletter-coming-soon";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Création de newsletter - EasyCom IA" };

export default async function NewsletterPage() {
  const { profile } = await requireAuth();
  if (!profile.communityId) redirect("/onboarding");

  return <NewsletterComingSoon />;
}
