"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

const FOOTER_LINKS = [
  { href: "/contact", namespace: "nav", label: "contact" },
  { href: "/site-map", namespace: "footer", label: "siteMap" },
  { href: "/privacy", namespace: "footer", label: "privacy" },
  { href: "/legal/terms", namespace: "footer", label: "terms" },
  { href: "/cookies", namespace: "footer", label: "cookies" },
  { href: "/data-deletion", namespace: "footer", label: "deleteData" },
] as const;

export function PublicFooter({ platformStyle = false }: { platformStyle?: boolean }) {
  const year = new Date().getFullYear();
  const t = useTranslations("footer");
  const nav = useTranslations("nav");

  return (
    <footer className={`border-t border-slate-200 px-4 py-10 text-slate-600 sm:px-6 lg:px-8 ${platformStyle ? "bg-[#fffaf4] [&_nav_a:hover]:text-[#421388]" : "bg-slate-50"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 border-b border-slate-200 pb-8 md:grid-cols-[1fr_1.4fr] md:items-start">
          <Link href="/" className="flex max-w-sm items-center gap-3">
            <Image src="/easycom-ai-logo.png" alt="" width={42} height={42} sizes="42px" className="h-10 w-10 rounded-xl border border-slate-200 bg-white object-cover p-1 shadow-sm" />
            <div>
              <p className="text-sm font-black tracking-tight text-slate-950">EasyCom IA</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{t("description")}</p>
            </div>
          </Link>

          <nav className="grid gap-3 text-sm font-semibold sm:grid-cols-2 lg:grid-cols-3" aria-label={t("linksLabel")}>
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-slate-500 transition hover:text-slate-950 hover:underline">
                {link.namespace === "nav" ? nav(link.label) : t(link.label)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-center text-xs text-slate-500 md:grid md:grid-cols-3 md:items-center md:text-start">
          <p>{t("rights", { year })}</p>
          <p className="md:text-center">
            {t("madeBy")}{" "}
            <a href="https://www.webfityou.com" target="_blank" rel="noreferrer" className="font-black text-slate-950 underline decoration-slate-950/40 underline-offset-4 transition hover:text-blue-700">WebFitYou</a>
          </p>
          <p className="md:text-end">{t("responsible")}</p>
        </div>
      </div>
    </footer>
  );
}
