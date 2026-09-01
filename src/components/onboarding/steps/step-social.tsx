"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import {
  Radio, ChevronRight, ChevronLeft, CheckCircle2, Info, ExternalLink, Loader2, Unlink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  communityId?: string;
  simulationMode?: boolean;
  saving?: boolean;
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
  saving = false,
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
                    "flex w-full flex-col items-stretch gap-3 rounded-xl border-2 px-4 py-3 transition-all sm:flex-row sm:items-center sm:gap-4",
                    isConnected
                      ? "border-green-500 bg-green-50"
                      : selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white"
                  )}>
                    <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                      <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl p-2", channel.logoBg)}>
                        <img src={channel.logo} alt={`Logo ${channel.label}`} className="h-full w-full object-contain" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn(
                            "text-sm font-semibold",
                            isConnected ? "text-green-700" : selected ? "text-blue-700" : "text-slate-800"
                          )}>
                            {channel.label}
                          </p>
                          {isConnected && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Connecté ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{channel.description}</p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 sm:self-center">
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
                    <div className="sm:ml-14">
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
            Cette étape est entièrement facultative. Vous pourrez connecter vos canaux à tout moment depuis les Paramètres.
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="outline" size="lg" onClick={onPrev} className="w-full sm:w-auto" disabled={saving}>
          <ChevronLeft className="size-4" />
          Retour
        </Button>
        <Button
          size="lg"
          className="w-full flex-1"
          onClick={() => void onNext()}
          disabled={saving || connecting !== null}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
          {saving ? "Ouverture de votre espace..." : "Accéder à EasyCom IA"}
        </Button>
      </div>
    </div>
  );
}
