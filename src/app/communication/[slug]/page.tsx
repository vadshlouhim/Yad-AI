import type { Metadata } from "next";
import { PublicPreferencesClient } from "@/components/targeted-communication/public-preferences-client";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getLocale()) === "he" ? "העדפות תקשורת" : "Préférences de communication", robots: { index: false, follow: false } };
}

export default async function PublicPreferencesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  return <PublicPreferencesClient slug={slug} token={query.token ?? ""} />;
}

