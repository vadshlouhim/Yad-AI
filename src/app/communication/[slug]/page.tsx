import type { Metadata } from "next";
import { PublicPreferencesClient } from "@/components/targeted-communication/public-preferences-client";

export const metadata: Metadata = { title: "Préférences de communication", robots: { index: false, follow: false } };

export default async function PublicPreferencesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <PublicPreferencesClient slug={slug} token={query.token ?? ""} />;
}

