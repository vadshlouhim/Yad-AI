"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowDownToLine,
  AppWindow,
  BellRing,
  CheckCircle2,
  MoreVertical,
  RefreshCw,
  Share,
  Sparkles,
  Smartphone,
  X,
} from "lucide-react";
import {
  enablePushNotificationsDetailed,
  getPushPermission,
  isPushSupported,
} from "@/lib/push/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "ios" | "android" | "desktop";

const PUSH_SETUP_KEY = "easycom:dashboard-push-setup:v1";
const DISMISSED_SESSION_KEY = "easycom:dashboard-setup-dismissed:v1";
const subscribeToHydration = () => () => undefined;

function getPlatform(): Platform {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function pushFailureMessage(reason: string, message?: string) {
  if (reason === "permission-denied") {
    return "Les notifications sont bloquées. Autorisez-les dans les réglages de votre appareil, puis revenez ici.";
  }
  if (reason === "unsupported") {
    return "Ce navigateur ne permet pas les notifications push. Ouvrez EasyCom IA avec Safari sur iPhone ou Chrome sur Android et ordinateur.";
  }
  if (reason === "missing-vapid-key") {
    return "Le service de notifications n’est pas encore configuré. Contactez l’assistance EasyCom IA.";
  }
  return message || "L’activation n’a pas abouti. Vérifiez votre connexion puis réessayez.";
}

export function DashboardFirstVisitGate({ userId }: { userId: string }) {
  const pushSetupKey = `${PUSH_SETUP_KEY}:${userId}`;
  const dismissedSessionKey = `${DISMISSED_SESSION_KEY}:${userId}`;
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [platform] = useState<Platform>(() => typeof window === "undefined" ? "desktop" : getPlatform());
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => getPushPermission());
  const [pushSetupComplete, setPushSetupComplete] = useState(() => {
    if (typeof window === "undefined") return false;
    return getPushPermission() === "granted" && window.localStorage.getItem(pushSetupKey) === "complete";
  });
  const [installing, setInstalling] = useState(false);
  const [enablingPush, setEnablingPush] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(dismissedSessionKey) === "true";
  });

  useEffect(() => {
    const syncDeviceState = () => {
      const currentPermission = getPushPermission();
      setInstalled(isStandalone());
      setPermission(currentPermission);
      setPushSetupComplete(
        currentPermission === "granted" && window.localStorage.getItem(pushSetupKey) === "complete",
      );
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("focus", syncDeviceState);
    document.addEventListener("visibilitychange", syncDeviceState);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        setMessage("L’installation n’a pas pu être préparée. Vérifiez votre connexion puis rechargez la page.");
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("focus", syncDeviceState);
      document.removeEventListener("visibilitychange", syncDeviceState);
    };
  }, [pushSetupKey]);

  async function installApplication() {
    setMessage(null);
    if (!installPrompt) {
      setMessage(
        platform === "ios"
          ? "Suivez les 3 étapes ci-dessous, puis ouvrez EasyCom IA depuis l’icône ajoutée à votre écran d’accueil."
          : "Utilisez le menu de votre navigateur pour installer l’application, puis ouvrez-la depuis son icône.",
      );
      return;
    }

    setInstalling(true);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    } else {
      setMessage("L’installation est nécessaire pour recevoir correctement vos alertes importantes.");
    }
    setInstallPrompt(null);
    setInstalling(false);
  }

  async function activatePush() {
    setEnablingPush(true);
    setMessage(null);

    const result = await enablePushNotificationsDetailed();
    const currentPermission = getPushPermission();
    setPermission(currentPermission);
    window.dispatchEvent(new Event("push-permission-change"));

    if (result.ok) {
      window.localStorage.setItem(pushSetupKey, "complete");
      setPushSetupComplete(true);
    } else {
      setMessage(pushFailureMessage(result.reason, result.message));
    }
    setEnablingPush(false);
  }

  function dismiss() {
    window.sessionStorage.setItem(dismissedSessionKey, "true");
    setDismissed(true);
  }

  if (!hydrated || dismissed || (installed && permission === "granted" && pushSetupComplete)) return null;

  const installationStep = !installed;
  const pushBlocked = permission === "denied";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#170534]/65 p-3 backdrop-blur-sm sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-visit-title"
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/70 bg-[#fffaf4] shadow-[0_30px_100px_rgba(23,5,52,0.42)]"
      >
        <header className="relative overflow-hidden rounded-b-[42%_1.5rem] bg-[radial-gradient(circle_at_72%_8%,#6d2bc1_0%,#421388_45%,#210763_100%)] px-5 pb-7 pt-6 text-white sm:px-7 sm:pb-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_70%,rgba(146,83,229,0.3),transparent_34%)]" />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-5" />
          </button>
          <div className="relative pr-11">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20">
              <Sparkles className="size-6 fill-[#ffba13] text-[#ffba13]" />
            </span>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-[#ffd04c]">Bienvenue sur EasyCom IA</p>
            <h1 id="first-visit-title" className="mt-1 text-[clamp(1.7rem,7vw,2.25rem)] font-black leading-[1.05] tracking-[-0.04em]">
              Votre application, toujours à portée de main
            </h1>
            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-white/80">
              Deux réglages rapides pour ne rien manquer.
            </p>
          </div>
        </header>

        <div className="space-y-3 p-4 pt-5 sm:p-6">
          <article className="overflow-hidden rounded-[1.6rem] border border-blue-100 bg-white shadow-[0_12px_28px_rgba(6,88,220,0.1)]">
            <div className="flex items-start gap-3 p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#0878ee] text-white shadow-lg shadow-blue-200">
                {installed ? <CheckCircle2 className="size-6" /> : <Smartphone className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black text-slate-950">Installer l’application</h2>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${installed ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                    {installed ? "Installée" : "1 minute"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-600">Ouvrez EasyCom IA directement depuis votre écran d’accueil.</p>
              </div>
            </div>

            {!installed ? (
              <div className="border-t border-blue-50 px-4 pb-4 pt-3">
                {!installPrompt && platform === "ios" ? (
                  <div className="mb-3 grid gap-2 rounded-2xl bg-blue-50/70 p-3">
                    {[
                      { icon: AppWindow, text: "Ouvrez EasyCom IA dans Safari" },
                      { icon: Share, text: "Touchez Partager" },
                      { icon: ArrowDownToLine, text: "Choisissez Sur l’écran d’accueil" },
                    ].map((item, index) => (
                      <div key={item.text} className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-black text-[#0878ee] shadow-sm">{index + 1}</span>
                        <item.icon className="size-4 shrink-0 text-[#0878ee]" />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                ) : !installPrompt ? (
                  <div className="mb-3 flex items-center gap-3 rounded-2xl bg-blue-50/70 p-3 text-sm font-semibold leading-5 text-slate-600">
                    <MoreVertical className="size-5 shrink-0 text-[#0878ee]" />
                    Ouvrez le menu du navigateur puis choisissez « Installer l’application ».
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => void installApplication()}
                  disabled={installing}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0878ee] px-5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-[#0668d8] disabled:opacity-60"
                >
                  <ArrowDownToLine className="size-5" />
                  {installing ? "Installation…" : installPrompt ? "Installer l’application" : "Afficher les instructions"}
                </button>
              </div>
            ) : null}
          </article>

          <article className="overflow-hidden rounded-[1.6rem] border border-rose-100 bg-white shadow-[0_12px_28px_rgba(217,45,124,0.1)]">
            <div className="flex items-start gap-3 p-4">
              <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${pushSetupComplete ? "bg-emerald-500 shadow-emerald-200" : "bg-[#d92d7c] shadow-rose-200"}`}>
                {pushSetupComplete ? <CheckCircle2 className="size-6" /> : <BellRing className="size-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black text-slate-950">Activer les notifications</h2>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${pushSetupComplete ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-[#b91c60]"}`}>
                    {pushSetupComplete ? "Activées" : installationStep ? "Après installation" : "Recommandé"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium leading-5 text-slate-600">Recevez vos rappels et confirmations importantes au bon moment.</p>
              </div>
            </div>

            {!pushSetupComplete ? (
              <div className="border-t border-rose-50 px-4 pb-4 pt-3">
                {pushBlocked ? (
                  <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold leading-5 text-amber-900">Notifications bloquées : autorisez-les dans les réglages de votre appareil.</p>
                ) : !isPushSupported() ? (
                  <p className="mb-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold leading-5 text-amber-900">Ouvrez EasyCom IA avec Safari ou Chrome pour activer les notifications.</p>
                ) : installationStep ? (
                  <p className="mb-3 rounded-2xl bg-rose-50 p-3 text-sm font-semibold leading-5 text-rose-800">Installez d’abord l’application, puis activez les notifications.</p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void activatePush()}
                  disabled={installationStep || enablingPush || pushBlocked || !isPushSupported()}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#d92d7c] px-5 text-sm font-black text-white shadow-lg shadow-rose-200 transition hover:bg-[#bf256d] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <BellRing className="size-5" />
                  {enablingPush ? "Activation en cours…" : "Activer les notifications"}
                </button>

                {pushBlocked ? (
                  <button type="button" onClick={() => setPermission(getPushPermission())} className="mt-3 flex w-full items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-[#d92d7c]">
                    <RefreshCw className="size-4" /> Vérifier à nouveau
                  </button>
                ) : null}
              </div>
            ) : null}
          </article>

          {message && (
            <p role="status" className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold leading-5 text-amber-900">
              {message}
            </p>
          )}

          <button type="button" onClick={dismiss} className="flex min-h-11 w-full items-center justify-center rounded-2xl text-sm font-black text-slate-500 transition hover:bg-white hover:text-[#421388]">
            Plus tard
          </button>
        </div>
      </section>
    </div>
  );
}
