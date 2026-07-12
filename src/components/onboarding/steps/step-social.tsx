"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { enablePushNotifications } from "@/lib/push/client";
import {
  Radio, ChevronRight, ChevronLeft, CheckCircle2, Info, ExternalLink, Loader2, Unlink, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
  communityId?: string;
  simulationMode?: boolean;
}

type ConnectedStatus = {
  INSTAGRAM: boolean;
  FACEBOOK: boolean;
  EMAIL: boolean;
};

const AVAILABLE_CHANNELS = [
  {
    type: "INSTAGRAM",
    label: "Instagram",
    logo: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg",
    logoBg: "bg-gradient-to-br from-pink-50 to-orange-50 border border-pink-100",
    description: "Publications + Stories",
    needsHandle: false,
    handlePlaceholder: "@votre_compte",
    oauthProvider: "instagram" as const,
    canConnectNow: true,
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    logo: "/logo/facebook-3-logo-svgrepo-com.svg",
    logoBg: "bg-blue-50 border border-blue-100",
    description: "Posts sur votre Page",
    needsHandle: false,
    handlePlaceholder: "Nom de votre Page",
    oauthProvider: "facebook" as const,
    canConnectNow: true,
  },
  {
    type: "EMAIL",
    label: "Email",
    logo: "/logo/gmail-svgrepo-com.svg",
    logoBg: "bg-red-50 border border-red-100",
    description: "Envoi depuis votre boîte Gmail",
    needsHandle: false,
    handlePlaceholder: "",
    oauthProvider: "gmail" as const,
    canConnectNow: true,
  },
];

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  missing_code: "Connexion annulée.",
  missing_env: "Configuration Meta manquante côté serveur.",
  expired: "Session expirée, veuillez réessayer.",
  invalid_state: "Erreur de sécurité, veuillez réessayer.",
  no_instagram_business: "Aucun compte Instagram Pro lié à cette Page Facebook.",
  no_page: "Aucune Page Facebook trouvée sur ce compte.",
  forbidden: "Accès non autorisé.",
  error: "Une erreur est survenue lors de la connexion.",
  gmail_cancelled: "Connexion Gmail annulée.",
  gmail_error: "Erreur lors de la connexion Gmail.",
  gmail_missing_env: "Configuration Gmail manquante côté serveur.",
  gmail_invalid_client: "Client Gmail invalide : vérifiez GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET.",
  gmail_invalid_grant: "Code ou refresh token Gmail invalide. Révoquez l'accès Google puis reconnectez Gmail.",
  gmail_redirect_uri_mismatch: "URL de redirection Gmail non autorisée dans Google Cloud.",
  gmail_no_community: "Veuillez d'abord finaliser l'onboarding.",
  gmail_no_token: "Aucun token Gmail reçu, réessayez.",
  gmail_missing_code: "Connexion Gmail annulée.",
};

export function StepSocial({
  data,
  updateData,
  onNext,
  onPrev,
  communityId,
  simulationMode = false,
}: Props) {
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [connected, setConnected] = useState<ConnectedStatus>({ INSTAGRAM: false, FACEBOOK: false, EMAIL: false });

  // Toujours à jour, lus depuis le listener "message" sans re-déclencher son effet.
  const dataRef = useRef(data);
  const updateDataRef = useRef(updateData);
  useEffect(() => {
    dataRef.current = data;
    updateDataRef.current = updateData;
  });

  function connectChannelFromOAuth(providerKey: keyof ConnectedStatus, label: string) {
    setConnected((prev) => ({ ...prev, [providerKey]: true }));
    const currentData = dataRef.current;
    if (!currentData.channels.find((c) => c.type === providerKey)) {
      updateDataRef.current({ channels: [...currentData.channels, { type: providerKey, name: label, handle: "" }] });
    }
  }

  // Écoute la popup OAuth (Meta + Gmail) : c'est le chemin principal de connexion.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = (event.data ?? {}) as { type?: string; provider?: string; oauth?: string };
      const { type, provider, oauth } = payload;

      if (type === "gmail_oauth_success") {
        const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === "EMAIL")!;
        connectChannelFromOAuth("EMAIL", channelDef.label);
        setOauthNotice({ type: "success", message: "Gmail connecté avec succès ! ✓" });
        setConnecting(null);
      } else if (type === "gmail_oauth_error") {
        setOauthNotice({ type: "error", message: OAUTH_ERROR_MESSAGES[oauth ?? ""] ?? "Erreur inconnue lors de la connexion." });
        setConnecting(null);
      } else if (type === "meta_oauth_success" && provider) {
        const providerKey = provider.toUpperCase() as keyof ConnectedStatus;
        const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === providerKey);
        if (channelDef) connectChannelFromOAuth(providerKey, channelDef.label);
        setOauthNotice({ type: "success", message: `${channelDef?.label ?? provider} connecté avec succès ! ✓` });
        setConnecting(null);
      } else if (type === "meta_oauth_error") {
        setOauthNotice({ type: "error", message: OAUTH_ERROR_MESSAGES[oauth ?? ""] ?? "Erreur inconnue lors de la connexion." });
        setConnecting(null);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Filet de secours si la popup a été bloquée par le navigateur (retour en plein écran).
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const provider = searchParams.get("provider");
    if (!oauth) return;

    const timer = window.setTimeout(() => {
      if (oauth === "gmail_success" || (oauth === "success" && provider === "gmail")) {
        const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === "EMAIL")!;
        connectChannelFromOAuth("EMAIL", channelDef.label);
        setOauthNotice({ type: "success", message: "Gmail connecté avec succès ! ✓" });
      } else if (oauth === "success" && provider) {
        const providerKey = provider.toUpperCase() as keyof ConnectedStatus;
        const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === providerKey);
        if (channelDef) connectChannelFromOAuth(providerKey, channelDef.label);
        setOauthNotice({ type: "success", message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connecté avec succès ! ✓` });
      } else if (!oauth.startsWith("gmail_success") && oauth !== "success") {
        setOauthNotice({ type: "error", message: OAUTH_ERROR_MESSAGES[oauth] ?? "Erreur inconnue lors de la connexion." });
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      url.searchParams.delete("provider");
      window.history.replaceState({}, "", url.toString());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  function toggleChannel(type: string) {
    const exists = data.channels.find((c) => c.type === type);
    if (exists) {
      updateData({ channels: data.channels.filter((c) => c.type !== type) });
    } else {
      const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === type)!;
      updateData({ channels: [...data.channels, { type, name: channelDef.label, handle: "" }] });
    }
  }

  function updateHandle(type: string, handle: string) {
    updateData({ channels: data.channels.map((c) => (c.type === type ? { ...c, handle } : c)) });
  }

  function isSelected(type: string) {
    return data.channels.some((c) => c.type === type);
  }

  function getHandle(type: string) {
    return data.channels.find((c) => c.type === type)?.handle ?? "";
  }

  function disconnectChannel(type: string) {
    const providerKey = type as keyof ConnectedStatus;
    setConnected((prev) => ({ ...prev, [providerKey]: false }));
    updateData({ channels: data.channels.filter((c) => c.type !== type) });
  }

  function handleOAuthConnect(provider: "facebook" | "instagram" | "gmail") {
    setConnecting(provider);

    if (simulationMode) {
      window.setTimeout(() => {
        const providerKey = (provider === "gmail" ? "EMAIL" : provider.toUpperCase()) as keyof ConnectedStatus;
        const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === providerKey);
        if (channelDef) connectChannelFromOAuth(providerKey, channelDef.label);
        setOauthNotice({ type: "success", message: `${channelDef?.label ?? provider} connecté en simulation.` });
        setConnecting(null);
      }, 350);
      return;
    }

    function buildUrl(returnTo: string) {
      const url = provider === "gmail"
        ? new URL("/api/email/gmail/auth", window.location.origin)
        : new URL(`/api/auth/oauth/${provider}`, window.location.origin);
      if (communityId) url.searchParams.set("communityId", communityId);
      url.searchParams.set("returnTo", returnTo);
      return url;
    }

    const popupReturnTo = provider === "gmail" ? "email_popup" : "onboarding_popup";
    const popup = window.open(
      buildUrl(popupReturnTo).toString(),
      `${provider}_oauth`,
      "width=520,height=660,left=200,top=100,toolbar=0,menubar=0,location=0"
    );

    if (!popup) {
      setConnecting(null);
      // Popup bloquée : on retombe sur le flux plein écran (retour direct sur /onboarding).
      window.location.assign(buildUrl("onboarding").toString());
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-blue-100 shadow-xl shadow-blue-100/70">
        <CardHeader className="pb-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100">
            <Radio className="size-6 text-blue-600" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">Connectez vos canaux</CardTitle>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Facultatif</span>
          </div>
          <CardDescription>
            Connectez Instagram, Facebook ou votre boîte Gmail maintenant. Vous pourrez aussi le faire plus tard depuis les Paramètres.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {oauthNotice && (
            <div className={cn(
              "rounded-lg border p-3 flex gap-2.5 text-sm",
              oauthNotice.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            )}>
              {oauthNotice.type === "success"
                ? <CheckCircle2 className="size-4 flex-shrink-0 mt-0.5" />
                : <Info className="size-4 flex-shrink-0 mt-0.5" />}
              <p>{oauthNotice.message}</p>
            </div>
          )}

          <div className="space-y-3">
            {AVAILABLE_CHANNELS.map((channel) => {
              const selected = isSelected(channel.type);
              const isConnected = connected[channel.type as keyof ConnectedStatus] ?? false;
              const isConnecting = connecting === channel.oauthProvider;

              return (
                <div key={channel.type} className="space-y-2">
                  <div className={cn(
                    "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 transition-all",
                    isConnected
                      ? "border-green-500 bg-green-50"
                      : selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white"
                  )}>
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 p-2", channel.logoBg)}>
                      <img src={channel.logo} alt={`Logo ${channel.label}`} className="w-full h-full object-contain" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm font-semibold",
                          isConnected ? "text-green-700" : selected ? "text-blue-700" : "text-slate-800"
                        )}>
                          {channel.label}
                        </p>
                        {isConnected && (
                          <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Connecté ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{channel.description}</p>
                    </div>

                    <div className="flex-shrink-0">
                      {channel.canConnectNow ? (
                        isConnected ? (
                          <button
                            type="button"
                            onClick={() => disconnectChannel(channel.type)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Unlink className="size-3.5" />
                            Déconnecter
                          </button>
                        ) : (
                          <Button
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className={cn(
                              "text-xs h-8 px-3 gap-1.5",
                              channel.type === "INSTAGRAM" && !selected && "border-pink-200 text-pink-700 hover:bg-pink-50",
                              channel.type === "FACEBOOK" && !selected && "border-blue-200 text-blue-700 hover:bg-blue-50",
                              channel.type === "EMAIL" && !selected && "border-red-200 text-red-700 hover:bg-red-50",
                            )}
                            onClick={() => handleOAuthConnect(channel.oauthProvider!)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
                            {isConnecting ? (simulationMode ? "Simulation..." : "Connexion...") : simulationMode ? "Simuler" : "Se connecter"}
                          </Button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleChannel(channel.type)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            selected ? "border-blue-600 bg-blue-600" : "border-slate-300 hover:border-slate-400"
                          )}
                        >
                          {selected && <CheckCircle2 className="size-4 text-white" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {selected && channel.needsHandle && !isConnected && (
                    <div className="ml-14">
                      <input
                        type="text"
                        value={getHandle(channel.type)}
                        onChange={(e) => updateHandle(channel.type, e.target.value)}
                        placeholder={channel.handlePlaceholder}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-center text-xs leading-relaxed text-blue-800">
            Cette étape est entièrement facultative : vous pourrez connecter vos canaux et régler vos automatisations à tout moment depuis les Paramètres.
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <CardHeader className="pb-4">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-sky-100">
            <Calendar className="size-6 text-blue-700" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-xl">Automatisations de vos réseaux sociaux</CardTitle>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-400">
              Facultatif
            </span>
          </div>
          <CardDescription>
            L&apos;IA préparera automatiquement vos contenus et publications selon vos préférences ci-dessous.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <p className="text-sm font-semibold text-slate-800">Préférences d&apos;automatisation</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Vous pourrez modifier ces réglages à tout moment dans les paramètres.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Notification
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.25"
                    step="0.25"
                    value={data.automationNotificationLeadHours}
                    onChange={(event) =>
                      updateData({ automationNotificationLeadHours: Math.max(0.25, Number(event.target.value) || 2) })
                    }
                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <span className="text-sm text-slate-500">h avant</span>
                </div>
                <p className="text-xs text-slate-400">Par défaut : 2 heures avant.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Validation
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    { value: "manual" as const, title: "Valider avant envoi", description: "Recommandé : l'IA prépare les contenus, vous les confirmez avant publication." },
                    { value: "automatic" as const, title: "Envoyer automatiquement", description: "Les publications automatiques sont envoyées seules à l'heure prévue." },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        updateData({ automationValidationMode: option.value });
                        if (option.value === "manual") void enablePushNotifications();
                      }}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        data.automationValidationMode === option.value
                          ? "border-blue-300 bg-white text-blue-800 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white/70 text-slate-700 hover:bg-white"
                      )}
                    >
                      <span className="block text-sm font-bold">{option.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0">
          <ChevronLeft className="size-4" />
          Retour
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={onNext}>
          Passer pour l&apos;instant
        </Button>
        <Button size="lg" className="flex-1" onClick={onNext}>
          Continuer
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
