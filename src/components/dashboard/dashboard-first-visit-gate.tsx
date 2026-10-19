"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowDownToLine,
  BellRing,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import {
  enablePushNotificationsDetailed,
  getPushPermission,
  isPushSupported,
} from "@/lib/push/client";
import { useLocale } from "next-intl";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type Platform = "ios" | "android" | "desktop";

const PUSH_SETUP_KEY = "easycom:dashboard-push-setup:v1";
const DISMISSED_SESSION_KEY = "easycom:dashboard-setup-dismissed:v1";
const INSTALL_HELP_VIDEO_URL = "https://youtube.com/shorts/VU-N2UbVqzc?si=MH7zQPAbBGH1J280";
const subscribeToHydration = () => () => undefined;

function getPlatform(): Platform {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
}

function isStandalone() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

function pushFailureMessage(reason: string, locale: string, message?: string) {
  if (reason === "permission-denied") {
    return locale === "he" ? "ההתראות חסומות. אפשרו אותן בהגדרות המכשיר וחזרו לכאן." : "Les notifications sont bloquées. Autorisez-les dans les réglages de votre appareil, puis revenez ici.";
  }
  if (reason === "unsupported") {
    return locale === "he" ? "הדפדפן הזה אינו תומך בהתראות בדחיפה. פתחו את EasyCom IA ב־Safari ב־iPhone או ב־Chrome ב־Android ובמחשב." : "Ce navigateur ne permet pas les notifications push. Ouvrez EasyCom IA avec Safari sur iPhone ou Chrome sur Android et ordinateur.";
  }
  if (reason === "missing-vapid-key") {
    return locale === "he" ? "שירות ההתראות עדיין לא הוגדר. פנו לתמיכת EasyCom IA." : "Le service de notifications n'est pas encore configuré. Contactez l'assistance EasyCom IA.";
  }
  return message || (locale === "he" ? "ההפעלה לא הושלמה. בדקו את החיבור ונסו שוב." : "L'activation n'a pas abouti. Vérifiez votre connexion puis réessayez.");
}

export function DashboardFirstVisitGate({ userId }: { userId: string }) {
  const locale = useLocale();
  const he = locale === "he";
  const pushSetupKey = `${PUSH_SETUP_KEY}:${userId}`;
  const dismissedSessionKey = `${DISMISSED_SESSION_KEY}:${userId}`;
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [platform] = useState<Platform>(() =>
    typeof window === "undefined" ? "desktop" : getPlatform()
  );
  const [installed, setInstalled] = useState(
    () => typeof window !== "undefined" && isStandalone()
  );
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    getPushPermission()
  );
  const [pushSetupComplete, setPushSetupComplete] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      getPushPermission() === "granted" &&
      window.localStorage.getItem(pushSetupKey) === "complete"
    );
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
        currentPermission === "granted" &&
          window.localStorage.getItem(pushSetupKey) === "complete"
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
        setMessage(he ? "לא ניתן היה להכין את ההתקנה. בדקו את החיבור וטענו מחדש את הדף." : "L'installation n'a pas pu être préparée. Vérifiez votre connexion puis rechargez la page.");
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("focus", syncDeviceState);
      document.removeEventListener("visibilitychange", syncDeviceState);
    };
  }, [he, pushSetupKey]);

  async function installApplication() {
    setMessage(null);
    if (!installPrompt) {
      window.open(INSTALL_HELP_VIDEO_URL, "_blank", "noopener,noreferrer");
      return;
    }

    setInstalling(true);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    } else {
      setMessage(he ? "יש להתקין את האפליקציה כדי לקבל כראוי את ההתראות החשובות שלכם." : "L'installation est nécessaire pour recevoir correctement vos alertes importantes.");
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
      setMessage(pushFailureMessage(result.reason, locale, result.message));
    }
    setEnablingPush(false);
  }

  function dismiss() {
    window.sessionStorage.setItem(dismissedSessionKey, "true");
    setDismissed(true);
  }

  if (!hydrated || dismissed || (installed && permission === "granted" && pushSetupComplete)) {
    return null;
  }

  const installationStep = !installed;
  const pushBlocked = permission === "denied";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[#170534]/65 p-3 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-visit-title"
        className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-sm overflow-y-auto rounded-3xl border border-white/70 bg-[#fffaf4] shadow-[0_30px_100px_rgba(23,5,52,0.42)]"
      >
        <header className="flex items-center gap-3 bg-gradient-to-br from-[#6d2bc1] to-[#210763] px-4 py-4 text-white">
          <Smartphone className="size-7 shrink-0" aria-hidden="true" />
          <h1 id="first-visit-title" className="flex-1 text-lg font-black leading-tight">
            {he ? "התקינו את EasyCom IA" : "Installez EasyCom IA"}
          </h1>
          <button type="button" onClick={dismiss} aria-label={he ? "סגירה" : "Fermer"} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/12 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-3 p-4">
          <article className="rounded-2xl border border-blue-100 bg-white p-3">
            <div className="flex items-center gap-2">
              {installed ? <CheckCircle2 className="size-5 text-emerald-600" /> : <Smartphone className="size-5 text-[#0878ee]" />}
              <h2 className="text-sm font-bold text-slate-950">{he ? "אפליקציה" : "Application"}</h2>
              {installed && <span className="ms-auto text-xs font-bold text-emerald-700">{he ? "מותקנת" : "Installée"}</span>}
            </div>
            {!installed && <>
              {!installPrompt && <p className="mt-2 text-xs leading-5 text-slate-600">
                {he ? (platform === "ios" ? "Safari: שיתוף ← הוספה למסך הבית." : "תפריט הדפדפן ← התקנת האפליקציה.") : (platform === "ios" ? "Safari : Partager → Sur l’écran d’accueil." : "Menu du navigateur → Installer l’application.")}
              </p>}
              <button type="button" onClick={() => void installApplication()} disabled={installing} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0878ee] px-3 text-sm font-bold text-white hover:bg-[#0668d8] disabled:opacity-60">
                <ArrowDownToLine className="size-4" />
                {he ? (installing ? "בהתקנה…" : installPrompt ? "התקנת האפליקציה" : "איך מתקינים") : (installing ? "Installation…" : installPrompt ? "Installer l’application" : "Voir comment installer")}
              </button>
            </>}
          </article>

          <article className="rounded-2xl border border-rose-100 bg-white p-3">
            <div className="flex items-center gap-2">
              {pushSetupComplete ? <CheckCircle2 className="size-5 text-emerald-600" /> : <BellRing className="size-5 text-[#d92d7c]" />}
              <h2 className="text-sm font-bold text-slate-950">{he ? "התראות" : "Notifications"}</h2>
              {pushSetupComplete && <span className="ms-auto text-xs font-bold text-emerald-700">{he ? "פעילות" : "Activées"}</span>}
            </div>
            {!pushSetupComplete && <>
              {(pushBlocked || !isPushSupported() || installationStep) && <p className="mt-2 text-xs leading-5 text-slate-600">
                {he ? (pushBlocked ? "אפשרו אותן בהגדרות המכשיר." : !isPushSupported() ? "השתמשו ב־Safari או ב־Chrome." : "יש להפעיל לאחר ההתקנה.") : (pushBlocked ? "Autorisez-les dans les réglages de votre appareil." : !isPushSupported() ? "Utilisez Safari ou Chrome." : "À activer après l’installation.")}
              </p>}
              <button type="button" onClick={() => void activatePush()} disabled={installationStep || enablingPush || pushBlocked || !isPushSupported()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#d92d7c] px-3 text-sm font-bold text-white hover:bg-[#bf256d] disabled:cursor-not-allowed disabled:opacity-45">
                <BellRing className="size-4" />
                {he ? (enablingPush ? "בהפעלה…" : "הפעלת התראות") : (enablingPush ? "Activation…" : "Activer les notifications")}
              </button>
              {pushBlocked && <button type="button" onClick={() => setPermission(getPushPermission())} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[#d92d7c]">
                <RefreshCw className="size-4" /> {he ? "בדיקה חוזרת" : "Vérifier à nouveau"}
              </button>}
            </>}
          </article>

          {message && <p role="status" className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">{message}</p>}
          <button type="button" onClick={dismiss} className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-bold text-slate-500 hover:bg-white hover:text-[#421388]">{he ? "מאוחר יותר" : "Plus tard"}</button>
        </div>
      </section>
    </div>
  );
}
