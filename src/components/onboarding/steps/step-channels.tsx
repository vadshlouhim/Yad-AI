"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Radio, ChevronRight, ChevronLeft, CheckCircle2, Info, ExternalLink, Loader2, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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
    type: "WHATSAPP",
    label: "WhatsApp",
    logo: "/logo/whatsapp-svgrepo-com.svg",
    logoBg: "bg-green-50 border border-green-100",
    description: "Canal ou groupe broadcast",
    needsHandle: false,
    handlePlaceholder: "",
    oauthProvider: null,
    canConnectNow: false,
  },
  {
    type: "TELEGRAM",
    label: "Telegram",
    logo: "/logo/telegram-svgrepo-com.svg",
    logoBg: "bg-sky-50 border border-sky-100",
    description: "Canal ou groupe",
    needsHandle: true,
    handlePlaceholder: "@votre_canal",
    oauthProvider: null,
    canConnectNow: false,
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

export function StepChannels({ data, updateData, onNext, onPrev, communityId, simulationMode = false }: Props) {
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [oauthNotice, setOauthNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [connected, setConnected] = useState<ConnectedStatus>({ INSTAGRAM: false, FACEBOOK: false, EMAIL: false });

  useEffect(() => {
    function handleOAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "meta_oauth_success" && event.data?.type !== "meta_oauth_error") return;

      const oauth = event.data.oauth as string | undefined;
      const provider = event.data.provider as string | undefined;
      setConnecting(null);

      if (event.data.type === "meta_oauth_success" && provider) {
        const providerKey = provider.toUpperCase() as keyof ConnectedStatus;
        setConnected((prev) => ({ ...prev, [providerKey]: true }));

        const channelDef = AVAILABLE_CHANNELS.find((channel) => channel.type === providerKey);
        if (channelDef && !data.channels.find((channel) => channel.type === providerKey)) {
          updateData({
            channels: [...data.channels, { type: providerKey, name: channelDef.label, handle: "" }],
          });
        }
        setOauthNotice({ type: "success", message: `${channelDef?.label ?? provider} connecté avec succès ! ✓` });
        return;
      }

      setOauthNotice({
        type: "error",
        message: OAUTH_ERROR_MESSAGES[oauth ?? "error"] ?? "Erreur inconnue lors de la connexion.",
      });
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [data.channels, updateData]);

  // Lire le résultat OAuth au retour (param ?oauth=...)
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const provider = searchParams.get("provider");
    if (!oauth) return;

    const timer = window.setTimeout(() => {
    if (oauth === "gmail_success" || (oauth === "success" && provider === "gmail")) {
      setConnected((prev) => ({ ...prev, EMAIL: true }));
      const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === "EMAIL");
      if (channelDef && !data.channels.find((c) => c.type === "EMAIL")) {
        updateData({ channels: [...data.channels, { type: "EMAIL", name: channelDef.label, handle: "" }] });
      }
      setOauthNotice({ type: "success", message: "Gmail connecté avec succès ! ✓" });
    } else if (oauth === "success" && provider) {
      const providerKey = provider.toUpperCase() as keyof ConnectedStatus;
      setConnected((prev) => ({ ...prev, [providerKey]: true }));

      // Ajouter automatiquement le canal dans la sélection
      const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === providerKey);
      if (channelDef && !data.channels.find((c) => c.type === providerKey)) {
        updateData({
          channels: [...data.channels, { type: providerKey, name: channelDef.label, handle: "" }],
        });
      }
      setOauthNotice({ type: "success", message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} connecté avec succès ! ✓` });
    } else if (!oauth.startsWith("gmail_success") && oauth !== "success") {
      setOauthNotice({
        type: "error",
        message: OAUTH_ERROR_MESSAGES[oauth] ?? "Erreur inconnue lors de la connexion.",
      });
    }

    // Nettoyer les params de l'URL sans reload
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth");
    url.searchParams.delete("provider");
    window.history.replaceState({}, "", url.toString());

    }, 0);

    return () => window.clearTimeout(timer);
  }, [data.channels, searchParams, updateData]);

  function toggleChannel(type: string) {
    const exists = data.channels.find((c) => c.type === type);
    if (exists) {
      updateData({ channels: data.channels.filter((c) => c.type !== type) });
    } else {
      const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === type)!;
      updateData({
        channels: [...data.channels, { type, name: channelDef.label, handle: "" }],
      });
    }
  }

  function updateHandle(type: string, handle: string) {
    updateData({
      channels: data.channels.map((c) =>
        c.type === type ? { ...c, handle } : c
      ),
    });
  }

  function isSelected(type: string) {
    return data.channels.some((c) => c.type === type);
  }

  function getHandle(type: string) {
    return data.channels.find((c) => c.type === type)?.handle ?? "";
  }

  function handleOAuthConnect(provider: "facebook" | "instagram" | "gmail") {
    setConnecting(provider);
    if (simulationMode) {
      window.setTimeout(() => {
        const providerKey = (provider === "gmail" ? "EMAIL" : provider.toUpperCase()) as keyof ConnectedStatus;
        setConnected((prev) => ({ ...prev, [providerKey]: true }));
        const channelDef = AVAILABLE_CHANNELS.find((channel) => channel.type === providerKey);
        if (channelDef && !data.channels.find((channel) => channel.type === providerKey)) {
          updateData({
            channels: [...data.channels, { type: providerKey, name: channelDef.label, handle: "" }],
          });
        }
        setOauthNotice({ type: "success", message: `${channelDef?.label ?? provider} connecte en simulation.` });
        setConnecting(null);
      }, 350);
      return;
    }

    let url: URL;
    if (provider === "gmail") {
      url = new URL("/api/email/gmail/auth", window.location.origin);
    } else {
      url = new URL(`/api/auth/oauth/${provider}`, window.location.origin);
    }
    if (communityId) url.searchParams.set("communityId", communityId);
    // Retour vers l'onboarding (pas les Settings)
    url.searchParams.set("returnTo", provider === "gmail" ? "onboarding" : "meta_popup");

    if (provider === "gmail") {
      window.location.assign(url.toString());
      return;
    }

    const popup = window.open(
      url.toString(),
      `meta_oauth_${provider}`,
      "width=560,height=720,left=220,top=80,toolbar=0,menubar=0,location=0"
    );

    if (!popup) {
      url.searchParams.set("returnTo", "onboarding");
      window.location.assign(url.toString());
      return;
    }

    const timer = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(timer);
        setConnecting(null);
      }
    }, 700);
  }

  function disconnectChannel(type: string) {
    const providerKey = type as keyof ConnectedStatus;
    setConnected((prev) => ({ ...prev, [providerKey]: false }));
    updateData({ channels: data.channels.filter((c) => c.type !== type) });
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
          <Radio className="size-6 text-green-600" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-xl">Vos canaux de diffusion</CardTitle>
          <span className="text-xs font-medium text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
        </div>
        <CardDescription>
          Connectez vos réseaux sociaux maintenant ou plus tard depuis les Paramètres.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bandeau résultat OAuth */}
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
                  {/* Logo */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 p-2",
                    channel.logoBg
                  )}>
                    <img
                      src={channel.logo}
                      alt={`Logo ${channel.label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Infos */}
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

                  {/* Action à droite */}
                  <div className="flex-shrink-0">
                    {channel.canConnectNow ? (
                      isConnected ? (
                        /* Bouton déconnecter */
                        <button
                          type="button"
                          onClick={() => disconnectChannel(channel.type)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Unlink className="size-3.5" />
                          Déconnecter
                        </button>
                      ) : (
                        /* Bouton connecter via OAuth */
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
                          {isConnecting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="size-3.5" />
                          )}
                          {isConnecting ? (simulationMode ? "Simulation..." : "Redirection...") : simulationMode ? "Simuler" : "Connecter"}
                        </Button>
                      )
                    ) : (
                      /* Toggle simple pour les autres canaux */
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

                {/* Champ handle si canal sélectionné et besoin de handle */}
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

        {data.channels.length === 0 && Object.values(connected).every((v) => !v) && (
          <p className="text-xs text-slate-400 text-center py-2">
            Vous pouvez passer cette étape et connecter vos canaux depuis les Paramètres.
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onNext}>
            Continuer
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


