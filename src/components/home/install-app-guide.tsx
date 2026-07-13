"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, CheckCircle2, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";

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
  const detectedPlatformLabel = platform === "ios" ? "Vous êtes sur iPhone" : platform === "android" ? "Vous êtes sur Android" : "Sur iPhone et Android";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="absolute left-[-8rem] top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute bottom-[-9rem] right-[-6rem] h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
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
          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-300/25 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-100">
            <CheckCircle2 className="size-4 text-cyan-300" />
            {detectedPlatformLabel} : le raccourci s&apos;ajoute directement à votre écran d&apos;accueil.
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

        <div className="grid items-center gap-5 md:grid-cols-[minmax(15rem,0.78fr)_1.22fr]">
            <div className="relative flex min-h-[36rem] items-center justify-center px-2 pt-16">
              <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/25 blur-3xl" />
              <div className="absolute inset-x-1 top-0 z-10 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/95 p-3 text-slate-950 shadow-xl shadow-blue-950/20 backdrop-blur">
                <Image src="/easycom-ai-logo.png" alt="" width={36} height={36} className="size-9 rounded-xl border border-blue-100 bg-white p-1" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black">Installer EasyCom IA</p>
                  <p className="truncate text-[10px] font-medium text-slate-500">Sur {selectedGuide === "ios" ? "iPhone" : "Android"} · écran d&apos;accueil</p>
                </div>
                <span className={`flex size-7 items-center justify-center overflow-hidden rounded-full ${selectedGuide === "ios" ? "bg-slate-950" : "bg-emerald-600"}`}>
                  <Image
                    src={selectedGuide === "ios" ? APPLE_LOGO_URL : "/logo/android-white.svg"}
                    alt=""
                    width={22}
                    height={22}
                    className={selectedGuide === "ios" ? "scale-[2.35]" : "size-4"}
                  />
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white">Ajouter</span>
              </div>
              <Image
                src="/images/easycom-phone-mendy-transparent.png"
                alt="EasyCom IA ajoutée comme application sur un smartphone"
                width={941}
                height={1672}
                sizes="(max-width: 768px) 90vw, 31vw"
                className="relative h-auto w-[148%] max-w-none drop-shadow-[0_34px_45px_rgba(2,12,44,0.6)]"
              />
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-sm sm:p-7">
              <div className="mb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Installation guidée</p>
                  <h3 className="mt-2 text-xl font-black text-white">Votre raccourci en moins d&apos;une minute</h3>
                </div>
              </div>
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
                  <article className="rounded-[1.4rem] border border-emerald-300/30 bg-emerald-400/10 p-5 backdrop-blur">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-400/15"><Image src="/logo/android-white.svg" alt="Logo Android" width={22} height={22} /></span>
                      <div><p className="text-xs font-bold text-emerald-200">Avec Chrome</p><h4 className="text-lg font-black">Installer sur Android</h4></div>
                    </div>
                    <ol className="space-y-3 text-sm leading-6 text-slate-300">
                      <li><span className="mr-2 font-black text-white">1.</span>Ouvrez EasyCom IA dans <span className="font-bold text-white">Chrome</span>.</li>
                      <li><span className="mr-2 font-black text-white">2.</span>Appuyez sur <span className="font-bold text-white">Installer en un clic</span> quand le bouton apparaît.</li>
                      <li className="flex gap-2"><MoreVertical className="mt-1 size-4 shrink-0 text-emerald-200" /><span>Sinon, menu puis <span className="font-bold text-white">Ajouter à l&apos;écran d&apos;accueil</span>.</span></li>
                    </ol>
                  </article>
                ) : (
                  <article className="rounded-[1.4rem] border border-blue-300/30 bg-blue-400/10 p-5 backdrop-blur">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-slate-950"><Image src={APPLE_LOGO_URL} alt="Logo Apple" width={34} height={34} className="scale-[2.15]" /></span>
                      <div><p className="text-xs font-bold text-blue-200">Avec Safari</p><h4 className="text-lg font-black">Installer sur iPhone</h4></div>
                    </div>
                    <ol className="space-y-3 text-sm leading-6 text-slate-300">
                      <li><span className="mr-2 font-black text-white">1.</span>Ouvrez EasyCom IA dans <span className="font-bold text-white">Safari</span>.</li>
                      <li className="flex gap-2"><Share className="mt-1 size-4 shrink-0 text-blue-200" /><span>Appuyez sur <span className="font-bold text-white">Partager</span>, en bas de l&apos;écran.</span></li>
                      <li className="flex gap-2"><PlusSquare className="mt-1 size-4 shrink-0 text-blue-200" /><span>Choisissez <span className="font-bold text-white">Sur l&apos;écran d&apos;accueil</span>, puis <span className="font-bold text-white">Ajouter</span>.</span></li>
                    </ol>
                  </article>
                )}
              </div>
            </div>
        </div>
      </div>
    </section>
  );
}
