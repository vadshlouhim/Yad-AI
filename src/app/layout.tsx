import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s — Yad.ia",
    default: "Yad.ia — Communication communautaire assistée par IA",
  },
  description:
    "Yad.ia est le copilote IA de communication de votre communauté. Centralisez, préparez et diffusez votre communication sur tous vos canaux.",
  keywords: ["communauté juive", "communication", "IA", "Chabbat", "réseaux sociaux"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  );
}
