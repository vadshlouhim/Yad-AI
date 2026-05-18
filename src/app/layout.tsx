import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s - EasyCom AI",
    default: "EasyCom AI - Communication communautaire assistee par IA",
  },
  description:
    "EasyCom AI est le copilote IA de communication de votre communaute. Centralisez, preparez et diffusez votre communication sur tous vos canaux.",
  keywords: ["communaute juive", "communication", "IA", "Chabbat", "reseaux sociaux"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  );
}
