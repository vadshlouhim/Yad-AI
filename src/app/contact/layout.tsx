import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const he = (await getLocale()) === "he";
  return {
    title: he ? "יצירת קשר — EasyCom IA" : "Contact — EasyCom IA",
    description: he ? "צרו קשר עם צוות EasyCom IA לקבלת מידע, הדגמה או עזרה בהגדרה." : "Contactez l’équipe EasyCom IA pour une question, une démonstration ou un besoin de configuration.",
    alternates: { canonical: "/contact" },
    openGraph: { locale: he ? "he_IL" : "fr_FR" },
  };
}

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
