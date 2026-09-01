"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, LogIn, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/method", label: "Notre méthode" },
  { href: "/affiches", label: "Affiches" },
  { href: "/blog", label: "Blog" },
  { href: "/tarification", label: "Tarification" },
  { href: "/contact", label: "Contact" },
] as const;

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
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="EasyCom IA, accueil">
            <Image
              src="/easycom-ai-logo.png"
              alt=""
              width={40}
              height={40}
              sizes="40px"
              className="size-10 shrink-0 rounded-xl border border-slate-200 bg-white object-cover p-1 shadow-sm"
              priority
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold tracking-tight text-slate-950">EasyCom IA</p>
              <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">Communication communautaire</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex" aria-label="Navigation principale">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600">
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/auth/login"
              className="hidden h-10 items-center justify-center rounded-full px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 md:inline-flex"
            >
              Se connecter
            </Link>
            <Link
              href="/auth/register"
              className="hidden h-10 items-center justify-center rounded-full bg-[#070b1d] px-4 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200 sm:inline-flex"
            >
              Essayer gratuitement
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#070b1d] px-3.5 text-xs font-semibold text-white sm:hidden"
            >
              Essayer
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="relative z-[100] inline-flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 lg:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              aria-controls="public-mobile-menu"
            >
              {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] bg-slate-950/25 backdrop-blur-[2px] lg:hidden"
            aria-label="Fermer le menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="public-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="fixed right-4 top-[4.75rem] z-[90] w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/20 lg:hidden"
          >
            <nav className="space-y-1" aria-label="Navigation mobile">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {link.label}
                  <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
                </Link>
              ))}
            </nav>

            <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-800"
              >
                <LogIn className="mr-2 size-4" aria-hidden="true" />
                Se connecter
              </Link>
              <Link
                href="/auth/register"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#070b1d] px-5 text-sm font-semibold text-white"
              >
                Essayer gratuitement
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
