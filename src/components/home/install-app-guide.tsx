"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, CheckCircle2, MoreVertical, PlusSquare, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const APPLE_LOGO_URL =
  "https://xicipkwqvuoaavvdgnnb.supabase.co/storage/v1/object/public/Image%20du%20site/logo-apple-installation-easycom-ia.webp";

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
  const [selectedGuide, setSelectedGuide] = useState<"ios" | "android">(() =>
    getMobilePlatform() === "android" ? "android" : "ios"
  );
  const [guideOpen, setGuideOpen] = useState(false);

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

  async function handlePrimaryAction() {
    if (installPrompt) {
      await installOnAndroid();
      return;
    }
    setGuideOpen(true);
  }

  const primaryLabel = installed
    ? "Application déjà installée"
    : installPrompt
      ? "Installer en un clic"
      : platform === "ios"
        ? "Suivre les étapes iPhone"
        : "Voir le raccourci mobile";

  return (
    <section className="relative overflow-hidden border-y border-cyan-400/20 bg-[#0b1230] px-4 py-9 text-white sm:px-6 sm:py-11 lg:px-8">
      <div className="home-ai-grid absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto grid max-w-7xl gap-8 text-center lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="flex flex-col items-center">
          <h2 className="max-w-3xl text-[clamp(1.7rem,5vw,2.8rem)] font-black leading-[1.08] tracking-tight">
            Ajoutez EasyCom IA sur votre écran d&apos;accueil.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Retrouvez EasyCom IA comme une application, sans passer par vos favoris. Un accès direct, plus rapide,
            avec l&apos;interface responsive pensée pour smartphone.
          </p>

          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={installed}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-[#070b1d] shadow-xl shadow-cyan-950/30 transition hover:bg-cyan-200 disabled:cursor-default disabled:opacity-80"
          >
            {installed ? <CheckCircle2 className="mr-2 size-4 text-cyan-700" /> : <ArrowDownToLine className="mr-2 size-4 text-cyan-700" />}
            {primaryLabel}
          </button>
        </div>

        <div className="grid items-center gap-0 md:grid-cols-[minmax(12rem,0.7fr)_1.3fr] md:gap-5">
            <div className="relative flex min-h-[27rem] items-center justify-center px-2 pt-14">
              <div className="absolute inset-x-1 top-0 z-10 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3 text-slate-950 shadow-xl shadow-black/20 backdrop-blur">
                <Image src="/easycom-ai-logo.png" alt="" width={36} height={36} className="size-9 rounded-xl border border-cyan-100 bg-white p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black">Installer EasyCom IA</p>
                  <p className="truncate text-[10px] font-medium text-slate-500">Sur {selectedGuide === "ios" ? "iPhone" : "Android"} · écran d&apos;accueil</p>
                </div>
                <span className={`flex size-7 items-center justify-center overflow-hidden rounded-full ${selectedGuide === "ios" ? "bg-slate-950" : "bg-cyan-600"}`}>
                  <Image
                    src={selectedGuide === "ios" ? APPLE_LOGO_URL : "/logo/android-white.svg"}
                    alt=""
                    width={22}
                    height={22}
                    className={selectedGuide === "ios" ? "scale-[2.35]" : "size-4"}
                  />
                </span>
                <span className="rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-black text-white">Ajouter</span>
              </div>
              <Image
                src="/images/easycom-phone-mendy-transparent.png"
                alt="EasyCom IA ajoutée comme application sur un smartphone"
                width={941}
                height={1672}
                sizes="(max-width: 768px) 90vw, 31vw"
                className="relative h-auto w-[116%] max-w-none drop-shadow-[0_28px_38px_rgba(2,12,44,0.6)]"
              />
            </div>

            <details
              open={guideOpen}
              onToggle={(event) => setGuideOpen((event.currentTarget as HTMLDetailsElement).open)}
              className="group rounded-[1.5rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Installation guidée</p>
                  <h3 className="mt-1 text-lg font-black text-white">Votre raccourci en moins d&apos;une minute</h3>
                </div>
                <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-black text-white transition group-open:bg-white group-open:text-slate-950">Voir les étapes</span>
              </summary>
              <div className="mt-5">
              <div className="mb-4 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/20 p-1.5">
                {([
                  { value: "ios" as const, label: "iPhone", logo: APPLE_LOGO_URL },
                  { value: "android" as const, label: "Android", logo: "/logo/android-white.svg" },
                ]).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setSelectedGuide(item.value)}
                    aria-pressed={selectedGuide === item.value}
                    className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black transition ${selectedGuide === item.value ? "bg-white text-slate-950 shadow-lg" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                  >
                    <span className={`flex size-8 items-center justify-center overflow-hidden rounded-lg ${selectedGuide === item.value ? "bg-slate-950" : "bg-white/10"}`}>
                      <Image src={item.logo} alt={`Logo ${item.label}`} width={24} height={24} className={item.value === "ios" ? "scale-[2.35]" : "size-[18px] object-contain"} />
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3">
                {selectedGuide === "android" ? (
                  <article className="rounded-[1.4rem] border border-cyan-300/30 bg-cyan-300/10 p-5 backdrop-blur">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300/20"><Image src="/logo/android-white.svg" alt="Logo Android" width={22} height={22} /></span>
                      <div><p className="text-xs font-bold text-cyan-300">Avec Chrome</p><h4 className="text-lg font-black">Installer sur Android</h4></div>
                    </div>
                    <ol className="space-y-3 text-sm leading-6 text-slate-300">
                      <li><span className="mr-2 font-black text-white">1.</span>Ouvrez EasyCom IA dans <span className="font-bold text-white">Chrome</span>.</li>
                      <li><span className="mr-2 font-black text-white">2.</span>Appuyez sur <span className="font-bold text-white">Installer en un clic</span> quand le bouton apparaît.</li>
                      <li className="flex gap-2"><MoreVertical className="mt-1 size-4 shrink-0 text-cyan-300" /><span>Sinon, menu puis <span className="font-bold text-white">Ajouter à l&apos;écran d&apos;accueil</span>.</span></li>
                    </ol>
                  </article>
                ) : (
                  <article className="rounded-[1.4rem] border border-slate-300/30 bg-slate-400/10 p-5 backdrop-blur">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950"><Image src={APPLE_LOGO_URL} alt="Logo Apple" width={34} height={34} className="scale-[2.15]" /></span>
                      <div><p className="text-xs font-bold text-slate-200">Avec Safari</p><h4 className="text-lg font-black">Installer sur iPhone</h4></div>
                    </div>
                    <ol className="space-y-3 text-sm leading-6 text-slate-300">
                      <li><span className="mr-2 font-black text-white">1.</span>Ouvrez EasyCom IA dans <span className="font-bold text-white">Safari</span>.</li>
                      <li className="flex gap-2"><Share className="mt-1 size-4 shrink-0 text-slate-200" /><span>Appuyez sur <span className="font-bold text-white">Partager</span>, en bas de l&apos;écran.</span></li>
                      <li className="flex gap-2"><PlusSquare className="mt-1 size-4 shrink-0 text-slate-200" /><span>Choisissez <span className="font-bold text-white">Sur l&apos;écran d&apos;accueil</span>, puis <span className="font-bold text-white">Ajouter</span>.</span></li>
                    </ol>
                  </article>
                )}
              </div>
              </div>
            </details>
        </div>
      </div>
    </section>
  );
}
