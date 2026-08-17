"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, CheckCircle2, ChevronRight, MoreVertical, PlusSquare, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const APPLE_LOGO_URL = "/images/logo-apple-installation-easycom-ia.webp";

function getMobilePlatform() {
  if (typeof window === "undefined") return "desktop";
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
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
    getMobilePlatform() === "android" ? "android" : "ios",
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
        : "Voir le guide d’installation";

  return (
    <section className="bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="install-title">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-[#0b1230] text-white shadow-[0_28px_80px_rgba(15,23,42,0.14)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(34,211,238,0.16),transparent_28%)]"
          aria-hidden="true"
        />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:p-10 xl:p-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Toujours à portée de main</p>
            <h2 id="install-title" className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ajoutez EasyCom IA à votre écran d’accueil.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Accédez à votre espace comme à une application, sans passer par vos favoris. L’installation prend moins
              d’une minute sur iPhone ou Android.
            </p>

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={installed}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#070b1d] transition hover:bg-cyan-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-200/60 disabled:cursor-default disabled:opacity-75"
            >
              {installed ? <CheckCircle2 className="mr-2 size-4 text-cyan-700" aria-hidden="true" /> : <ArrowDownToLine className="mr-2 size-4 text-cyan-700" aria-hidden="true" />}
              {primaryLabel}
            </button>

          </div>

          <div className="rounded-[1.5rem] border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm sm:p-5">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3 text-slate-950 shadow-lg shadow-black/15">
              <Image src="/easycom-ai-logo.png" alt="" width={38} height={38} className="size-9 rounded-xl border border-cyan-100 bg-white p-1" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">Installer EasyCom IA</p>
                <p className="truncate text-[11px] text-slate-500">Sur {selectedGuide === "ios" ? "iPhone" : "Android"} · écran d’accueil</p>
              </div>
              <span className={`flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full ${selectedGuide === "ios" ? "bg-slate-950" : "bg-cyan-600"}`}>
                <Image
                  src={selectedGuide === "ios" ? APPLE_LOGO_URL : "/logo/android-white.svg"}
                  alt=""
                  width={22}
                  height={22}
                  className={selectedGuide === "ios" ? "scale-[2.35]" : "size-4"}
                />
              </span>
              <span className="hidden rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-semibold text-white sm:inline-flex">Ajouter</span>
            </div>

            <details
              open={guideOpen}
              onToggle={(event) => setGuideOpen(event.currentTarget.open)}
              className="group mt-4 rounded-2xl border border-white/10 bg-slate-950/20 p-4 sm:p-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Installation guidée</p>
                  <h3 className="mt-1 text-base font-semibold text-white sm:text-lg">Votre raccourci en moins d’une minute</h3>
                </div>
                <ChevronRight className="size-5 shrink-0 text-cyan-300 transition group-open:rotate-90" aria-hidden="true" />
              </summary>

              <div className="mt-5 border-t border-white/10 pt-5">
                <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-950/30 p-1">
                  {([
                    { value: "ios" as const, label: "iPhone", logo: APPLE_LOGO_URL },
                    { value: "android" as const, label: "Android", logo: "/logo/android-white.svg" },
                  ]).map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSelectedGuide(item.value)}
                      aria-pressed={selectedGuide === item.value}
                      className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${selectedGuide === item.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
                    >
                      <span className={`flex size-7 items-center justify-center overflow-hidden rounded-lg ${selectedGuide === item.value ? "bg-slate-950" : "bg-white/10"}`}>
                        <Image src={item.logo} alt="" width={22} height={22} className={item.value === "ios" ? "scale-[2.3]" : "size-4 object-contain"} />
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>

                {selectedGuide === "android" ? (
                  <ol className="space-y-3 text-sm leading-6 text-slate-300">
                    <li><span className="mr-2 font-semibold text-white">1.</span>Ouvrez EasyCom IA dans <strong className="text-white">Chrome</strong>.</li>
                    <li><span className="mr-2 font-semibold text-white">2.</span>Utilisez le bouton <strong className="text-white">Installer en un clic</strong> lorsqu’il apparaît.</li>
                    <li className="flex gap-2"><MoreVertical className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden="true" /><span>Sinon, ouvrez le menu puis choisissez <strong className="text-white">Ajouter à l’écran d’accueil</strong>.</span></li>
                  </ol>
                ) : (
                  <ol className="space-y-3 text-sm leading-6 text-slate-300">
                    <li><span className="mr-2 font-semibold text-white">1.</span>Ouvrez EasyCom IA dans <strong className="text-white">Safari</strong>.</li>
                    <li className="flex gap-2"><Share className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden="true" /><span>Appuyez sur <strong className="text-white">Partager</strong> en bas de l’écran.</span></li>
                    <li className="flex gap-2"><PlusSquare className="mt-1 size-4 shrink-0 text-cyan-300" aria-hidden="true" /><span>Choisissez <strong className="text-white">Sur l’écran d’accueil</strong>, puis <strong className="text-white">Ajouter</strong>.</span></li>
                  </ol>
                )}
              </div>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}
