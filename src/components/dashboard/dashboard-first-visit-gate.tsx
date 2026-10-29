"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import {
  BellRing,
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
const DISMISSED_UNTIL_KEY = "easycom:dashboard-setup-dismissed-until:v1";
// Closing the reminder hides it for a few days instead of on every visit.
const DISMISS_FOR_MS = 3 * 24 * 60 * 60 * 1000;
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
  const dismissedUntilKey = `${DISMISSED_UNTIL_KEY}:${userId}`;
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
    try {
      return Number(window.localStorage.getItem(dismissedUntilKey)) > Date.now();
    } catch {
      return false;
    }
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

  const [closing, setClosing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
    dragStart.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    if (dragStart.current !== null) setDragY(event.clientY - dragStart.current);
  }

  // A short swipe up is enough to put the card away.
  function endDrag() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragging(false);
    if (dragY < -40) setClosing(true);
    else setDragY(0);
  }

  function close() {
    setClosing(true);
  }

  async function installApplication() {
    setMessage(null);
    if (!installPrompt) {
      setGuideOpen(true);
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
    try {
      window.localStorage.setItem(dismissedUntilKey, String(Date.now() + DISMISS_FOR_MS));
    } catch {
      // Without storage the reminder simply comes back on the next visit.
    }
    setDismissed(true);
  }

  if (!hydrated || dismissed || (installed && permission === "granted" && pushSetupComplete)) {
    return null;
  }

  const installationStep = !installed;
  const pushBlocked = permission === "denied";
  const pushUnavailable = installationStep || pushBlocked || !isPushSupported();
  const pushHint = he
    ? (pushBlocked ? "חסומות בהגדרות המכשיר" : !isPushSupported() ? "השתמשו ב־Safari או ב־Chrome" : installationStep ? "זמין אחרי ההתקנה" : "כדי לא לפספס שום דבר")
    : (pushBlocked ? "Bloquées dans les réglages" : !isPushSupported() ? "Utilisez Safari ou Chrome" : installationStep ? "Disponible après l’installation" : "Pour ne rien manquer");
  const installHint = installPrompt
    ? (he ? "גישה מהירה ממסך הבית" : "Accès direct depuis l’écran d’accueil")
    : he ? (platform === "ios" ? "Safari: שיתוף ← הוספה למסך הבית" : "תפריט הדפדפן ← התקנה") : (platform === "ios" ? "Safari : Partager → Sur l’écran d’accueil" : "Menu du navigateur → Installer");
  const actionClass = "flex h-8 shrink-0 items-center justify-center rounded-full px-3.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";
  const offset = closing ? -160 : Math.min(0, dragY);

  // A small in-app card that slides down from the top. It sits above the top bar (z-900) but below
  // menus and dialogs (z-998+), and closes with the X or a swipe up.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[950] flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-20">
      <div className="animate-setup-toast-in pointer-events-auto w-full max-w-sm">
      <section
        role="status"
        aria-label={he ? "התקנה והתראות" : "Installation et notifications"}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onTransitionEnd={() => { if (closing) dismiss(); }}
        style={{ transform: `translateY(${offset}px)`, opacity: closing ? 0 : 1, transition: !dragging ? "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s" : "none", touchAction: "none" }}
        className="w-full select-none overflow-hidden rounded-[1.25rem] bg-white/95 shadow-[0_18px_50px_-12px_rgba(23,5,52,0.35)] ring-1 ring-black/5 backdrop-blur-xl"
      >
        <header className="flex items-center gap-2.5 px-3.5 pb-1 pt-3">
          <Image src="/apple-touch-icon.png" alt="" width={28} height={28} className="size-7 shrink-0 rounded-lg" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-950">EasyCom IA</p>
          <button type="button" data-no-drag onClick={close} aria-label={he ? "סגירה" : "Fermer"} className="-me-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
            <X className="size-4" />
          </button>
        </header>

        <div className="divide-y divide-slate-100 px-3.5">
          {installationStep && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#0878ee]"><Smartphone className="size-4" aria-hidden="true" /></span>
              <p className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-tight text-slate-900">{he ? "התקינו את האפליקציה" : "Installer l’application"}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{installHint}</span>
              </p>
              <button type="button" data-no-drag onClick={() => void installApplication()} disabled={installing} className={`${actionClass} bg-[#0878ee] text-white hover:bg-[#0668d8]`}>
                {he ? (installing ? "…" : installPrompt ? "התקנה" : "איך?") : (installing ? "…" : installPrompt ? "Installer" : "Comment ?")}
              </button>
            </div>
          )}

          {!pushSetupComplete && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-[#d92d7c]"><BellRing className="size-4" aria-hidden="true" /></span>
              <p className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-tight text-slate-900">{he ? "הפעלת התראות" : "Activer les notifications"}</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">{pushHint}</span>
              </p>
              {pushBlocked
                ? <button type="button" data-no-drag onClick={() => setPermission(getPushPermission())} aria-label={he ? "בדיקה חוזרת" : "Vérifier à nouveau"} className="flex size-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-[#d92d7c]"><RefreshCw className="size-4" /></button>
                : <button type="button" data-no-drag onClick={() => void activatePush()} disabled={enablingPush || pushUnavailable} className={`${actionClass} bg-[#d92d7c] text-white hover:bg-[#bf256d]`}>
                  {he ? (enablingPush ? "…" : "הפעלה") : (enablingPush ? "…" : "Activer")}
                </button>}
            </div>
          )}
        </div>

        {message && <p className="mx-3.5 mb-2 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] leading-4 text-amber-900">{message}</p>}
        <div className="flex justify-center pb-1.5 pt-0.5" aria-hidden="true"><span className="h-1 w-9 rounded-full bg-slate-200" /></div>
      </section>
      </div>
      {guideOpen ? (
        // The illustrated Android / iPhone steps, shown in the app instead of a YouTube video.
        <div className="pointer-events-auto fixed inset-0 z-[1100] flex items-center justify-center bg-[#16052f]/70 p-3 backdrop-blur-sm" onClick={() => setGuideOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label={he ? "איך מתקינים את האפליקציה" : "Comment installer l’application"} className="relative max-h-[92dvh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setGuideOpen(false)} aria-label={he ? "סגירה" : "Fermer"} className="sticky end-2 top-2 z-10 float-end m-2 flex size-9 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow ring-1 ring-slate-200 hover:text-slate-900">
              <X className="size-4" />
            </button>
            <Image src="/media/install-guide.webp" width={1600} height={1407} sizes="(max-width: 768px) 100vw, 768px" alt={he ? "שלבי ההתקנה ב־Android וב־iPhone" : "Étapes pour installer l’application sur Android et iPhone"} className="block h-auto w-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
