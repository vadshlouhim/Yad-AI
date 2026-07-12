"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, CheckCircle2, CreditCard, LogIn, Menu, MessageCircle, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Accueil", icon: null, tone: "hover:text-blue-700" },
  { href: "/method", label: "Notre Méthode", icon: CheckCircle2, tone: "hover:text-emerald-700" },
  { href: "/blog", label: "Blog", icon: BookOpen, tone: "hover:text-blue-700" },
  { href: "/tarification", label: "Tarification", icon: CreditCard, tone: "hover:text-amber-700" },
  { href: "/contact", label: "Contact", icon: MessageCircle, tone: "hover:text-indigo-700" },
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

    return () => {
      document.body.style.overflow = previous.bodyOverflow;
      document.body.style.position = previous.bodyPosition;
      document.body.style.top = previous.bodyTop;
      document.body.style.width = previous.bodyWidth;
      document.documentElement.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-100"
            aria-label="Se connecter"
            title="Se connecter"
          >
            <LogIn className="size-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 md:hidden"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-[86vw] max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl md:hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex items-center gap-3">
                <Image src="/easycom-ai-logo.png" alt="Logo EasyCom IA" width={38} height={38} className="rounded-xl border border-slate-200 bg-white p-1" />
                <div>
                  <p className="text-sm font-black text-slate-950">EasyCom IA</p>
                  <p className="text-xs font-medium text-slate-500">Menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Fermer le menu"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-5">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      {Icon ? <Icon className="size-5" /> : <span className="text-sm font-black">E</span>}
                    </span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 bg-white p-4">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700"
              >
                <LogIn className="mr-2 size-4" />
                Essayer maintenant
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
