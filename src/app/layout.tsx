import type { Metadata, Viewport } from "next";
import { DisableSpellcheck } from "@/components/ui/disable-spellcheck";
import "./globals.css";

const SITE_NAME = "EasyCom IA";
const SITE_TITLE = "EasyCom IA - Communication communautaire assistée par IA";
const SITE_DESCRIPTION =
  "EasyCom IA est le copilote IA de communication de votre communauté. Centralisez, préparez et diffusez automatiquement votre communication sur Instagram, Facebook, WhatsApp et email.";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://easycom-ai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: "%s - EasyCom IA",
    default: SITE_TITLE,
  },
  description: SITE_DESCRIPTION,
  keywords: ["communaute juive", "communication", "IA", "Chabbat", "reseaux sociaux", "synagogue", "Beth Habad"],
  applicationName: SITE_NAME,
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-slate-50" spellCheck={false}>
        <DisableSpellcheck />
        {children}
      </body>
    </html>
  );
}
