"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, CheckCircle2, Globe, MousePointerClick, Share, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function getMobilePlatform() {
  if (typeof window === "undefined") return "desktop";
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  if (isIos) return "ios";
  if (isAndroid) return "android";
  return "desktop";
}

export function InstallAppGuide() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState(() => getMobilePlatform());
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
    return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
  });

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installOnAndroid() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  const primaryLabel = installed
    ? "Application déjà installée"
    : installPrompt
      ? "Installer en un clic"
      : platform === "ios"
        ? "Suivre les étapes iPhone"
        : "Voir le raccourci mobile";

  return (
    <section className="relative overflow-hidden bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-[-9rem] right-[-6rem] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-blue-100">
            <Smartphone className="size-4" />
            Version application mobile
          </p>
          <h2 className="mt-5 max-w-3xl text-[clamp(2rem,7vw,3.75rem)] font-black leading-[1.04] tracking-tight">
            Ajoutez EasyCom IA sur votre écran d&apos;accueil.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Retrouvez EasyCom IA comme une application, sans passer par vos favoris. Un accès direct, plus rapide,
            avec l&apos;interface responsive pensée pour smartphone.
          </p>

          <button
            type="button"
            onClick={installOnAndroid}
            disabled={!installPrompt || installed}
            className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-black text-slate-950 shadow-xl shadow-blue-950/30 transition hover:bg-blue-50 disabled:cursor-default disabled:opacity-80"
          >
            {installed ? <CheckCircle2 className="mr-2 size-4 text-emerald-600" /> : <ArrowDownToLine className="mr-2 size-4 text-blue-600" />}
            {primaryLabel}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
          <div className="relative mx-auto w-full max-w-[17rem] rounded-[2.4rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-blue-950/40 animate-install-float">
            <div className="overflow-hidden rounded-[1.9rem] bg-slate-950 ring-1 ring-white/10">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/10 px-4 py-3">
                <span className="h-2 w-14 rounded-full bg-white/35" />
                <span className="text-[10px] font-bold text-white/70">EasyCom IA</span>
              </div>
              <div className="bg-gradient-to-b from-blue-50 to-white p-4 text-slate-950">
                <div className="mb-4 flex items-center gap-3">
                  <Image src="/easycom-ai-logo.png" alt="Logo EasyCom IA" width={44} height={44} className="rounded-2xl border border-blue-100 bg-white p-1" />
                  <div>
                    <p className="text-sm font-black">EasyCom IA</p>
                    <p className="text-[11px] font-semibold text-slate-500">Sur votre mobile</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {["Ouvrir", "Notifications", "Publier"].map((item, index) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" style={{ animationDelay: `${index * 120}ms` }}>
                      <div className="mb-2 h-1 w-10 rounded-full bg-blue-500" />
                      <p className="text-xs font-black">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -right-3 top-20 rounded-full bg-blue-500 p-3 text-white shadow-lg animate-install-pulse">
              <MousePointerClick className="size-5" />
            </div>
          </div>

          <div className="grid gap-4">
            <article className="rounded-[1.7rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <Globe className="size-5" />
              </div>
              <h3 className="text-lg font-black">Sur Android</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Ouvrez le site avec Chrome. Si le bouton d&apos;installation est disponible, appuyez sur
                <span className="font-bold text-white"> Installer en un clic</span>. Sinon, menu ⋮ puis
                <span className="font-bold text-white"> Ajouter à l&apos;écran d&apos;accueil</span>.
              </p>
            </article>

            <article className="rounded-[1.7rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/15 text-blue-200">
                <Share className="size-5" />
              </div>
              <h3 className="text-lg font-black">Sur iPhone</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Ouvrez EasyCom IA dans Safari, appuyez sur <span className="font-bold text-white">Partager</span>,
                puis choisissez <span className="font-bold text-white">Ajouter à l&apos;écran d&apos;accueil</span>.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
