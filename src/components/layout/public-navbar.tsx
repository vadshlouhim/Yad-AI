"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Headphones, Home, LogIn, Menu, Newspaper, Route, WalletCards, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: Home, tone: "hover:text-blue-700", iconTone: "bg-blue-50 text-blue-700 ring-blue-100" },
  { href: "/method", label: "Notre Méthode", icon: Route, tone: "hover:text-emerald-700", iconTone: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  { href: "/blog", label: "Blog", icon: Newspaper, tone: "hover:text-blue-700", iconTone: "bg-sky-50 text-sky-700 ring-sky-100" },
  { href: "/tarification", label: "Tarification", icon: WalletCards, tone: "hover:text-amber-700", iconTone: "bg-amber-50 text-amber-700 ring-amber-100" },
  { href: "/contact", label: "Contact", icon: Headphones, tone: "hover:text-indigo-700", iconTone: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
];

export function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const scrollY = window.scrollY;
    const previous = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previous.bodyOverflow;
      document.body.style.position = previous.bodyPosition;
      document.body.style.top = previous.bodyTop;
      document.body.style.width = previous.bodyWidth;
      document.documentElement.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-cyan-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src="/easycom-ai-logo.png"
            alt="Logo EasyCom IA"
            width={40}
            height={40}
            sizes="40px"
            className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-white object-cover p-1 shadow-sm"
            priority
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-black tracking-tight text-slate-950">EasyCom IA</p>
            <p className="truncate text-xs font-medium text-slate-500">Votre assistant communication IA</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={`inline-flex h-9 items-center gap-2 rounded-full px-1 transition ${link.tone}`}>
                {Icon ? <Icon className="size-4" /> : null}
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/auth/login"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#070b1d] bg-[#070b1d] text-cyan-300 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-300 hover:text-[#070b1d]"
            aria-label="Se connecter"
            title="Se connecter"
          >
            <LogIn className="size-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="relative z-[100] inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 md:hidden"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-slate-950/10 backdrop-blur-[1px] md:hidden"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="fixed right-4 top-[4.75rem] z-[90] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-950/15 backdrop-blur-xl animate-fade-in md:hidden"
          >
            <nav className="space-y-1.5">
              {NAV_LINKS.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
                    style={{ transitionDelay: `${index * 18}ms` }}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ring-1 transition group-hover:-translate-y-0.5 group-hover:scale-105 ${link.iconTone}`}>
                      <Icon className="size-4.5" />
                    </span>
                    <span className="flex-1">{link.label}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-200 transition group-hover:bg-cyan-500" />
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 border-t border-slate-100 pt-2">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#070b1d] px-5 text-sm font-black text-cyan-300 shadow-sm transition hover:bg-cyan-300 hover:text-[#070b1d]"
              >
                <LogIn className="mr-2 size-4" />
                Essayer maintenant
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
