"use client";

import { useState } from "react";
import { Bell, BellOff, CheckCircle2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { enablePushNotifications, getPushPermission, isPushSupported } from "@/lib/push/client";

export function PushNotificationsCard() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => getPushPermission());
  const [requesting, setRequesting] = useState(false);

  async function enable() {
    setRequesting(true);
    await enablePushNotifications();
    setPermission(getPushPermission());
    setRequesting(false);
  }

  const enabled = permission === "granted";
  const blocked = permission === "denied";

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            {enabled ? <CheckCircle2 className="size-5" /> : blocked ? <BellOff className="size-5" /> : <Bell className="size-5" />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Notifications sur cet appareil</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {enabled
                ? "Actives : vous recevrez les alertes même lorsque l’application est fermée."
                : blocked
                  ? "Bloquées dans les réglages du navigateur ou du téléphone."
                  : isPushSupported()
                    ? "Activez-les après avoir installé l’application sur votre écran d’accueil."
                    : "Cet appareil ou navigateur ne prend pas en charge les notifications web."}
            </p>
            {!enabled && <p className="mt-1 text-[11px] text-slate-500"><Smartphone className="mr-1 inline size-3" />Sur iPhone, ouvrez l’app depuis l’écran d’accueil avant d’activer les notifications.</p>}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Activer les notifications sur cet appareil"
            disabled={enabled || blocked || !isPushSupported() || requesting}
            onClick={() => void enable()}
            className={cn(
              "relative h-8 w-14 rounded-full p-0.5 transition-all duration-300 ease-out focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-default",
              enabled
                ? "bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_4px_12px_rgba(16,185,129,0.3)]"
                : "bg-slate-300 shadow-[inset_0_1px_2px_rgba(15,23,42,0.16)]"
            )}
          >
            <span
              className={cn(
                "block size-7 rounded-full bg-white shadow-[0_2px_7px_rgba(15,23,42,0.28)] transition-transform duration-300 ease-out",
                enabled ? "translate-x-6" : "translate-x-0",
                requesting && "animate-pulse"
              )}
            />
          </button>
          <span className={cn("text-[11px] font-semibold", enabled ? "text-emerald-700" : "text-slate-500")}>
            {enabled ? "Activées" : requesting ? "Activation…" : blocked ? "Bloquées" : "Activer"}
          </span>
        </div>
      </div>
    </div>
  );
}
