"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  CheckCircle2, AlertCircle, ExternalLink,
  Zap, ChevronDown, ChevronUp, Unlink,
  Loader2, Save, Info, ToggleLeft, ToggleRight,
  Wifi, WifiOff,
} from "lucide-react";
import Link from "next/link";
import { cn, CHANNEL_LABELS } from "@/lib/utils";

interface Channel {
  id: string;
  type: string;
  name: string;
  handle: string | null;
  isConnected: boolean;
  isActive: boolean;
  pageId: string | null;
  lastSyncAt: Date | null;
  settings?: Record<string, unknown> | null;
}

interface Props {
  channels: Channel[];
  communityId: string;
}

/* ── Config par réseau ─────────────────────────────────────── */
const CHANNEL_CONFIG: Record<string, {
  logo: string;
  logoBg: string;
  brandColor: string;
  brandBorder: string;
  brandText: string;
  description: string;
  authType: "oauth" | "gmail-oauth" | "token" | "manual";
  badge: string;
  botField?: string;
  tokenField?: string;
}> = {
  INSTAGRAM: {
    logo: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg",
    logoBg: "bg-gradient-to-br from-pink-50 to-orange-50",
    brandColor: "from-pink-500 to-orange-400",
    brandBorder: "border-pink-200",
    brandText: "text-pink-600",
    description: "Publiez des posts et stories sur votre compte Instagram professionnel.",
    authType: "oauth",
    badge: "Meta OAuth",
  },
  FACEBOOK: {
    logo: "/logo/facebook-3-logo-svgrepo-com.svg",
    logoBg: "bg-blue-50",
    brandColor: "from-blue-600 to-blue-500",
    brandBorder: "border-blue-200",
    brandText: "text-blue-600",
    description: "Publiez sur votre Page Facebook. Nécessite un accès administrateur.",
    authType: "oauth",
    badge: "Meta OAuth",
  },
  WHATSAPP: {
    logo: "/logo/whatsapp-svgrepo-com.svg",
    logoBg: "bg-green-50",
    brandColor: "from-green-500 to-emerald-400",
    brandBorder: "border-green-200",
    brandText: "text-green-600",
    description: "Connectez votre numero WhatsApp personnel par QR code ou par code telephone, puis envoyez depuis EasyCom IA.",
    authType: "manual",
    badge: "QR / Code",
  },
  TELEGRAM: {
    logo: "/logo/telegram-svgrepo-com.svg",
    logoBg: "bg-sky-50",
    brandColor: "from-sky-500 to-cyan-400",
    brandBorder: "border-sky-200",
    brandText: "text-sky-600",
    description: "Publiez dans vos groupes et canaux Telegram via un bot.",
    authType: "token",
    badge: "Bot Token",
    botField: "Token du bot Telegram",
    tokenField: "Chat ID du groupe/canal",
  },
  EMAIL: {
    logo: "/logo/gmail-svgrepo-com.svg",
    logoBg: "bg-red-50",
    brandColor: "from-red-500 to-orange-400",
    brandBorder: "border-red-200",
    brandText: "text-red-600",
    description: "Connectez votre compte Gmail pour envoyer des emails depuis EasyCom IA.",
    authType: "gmail-oauth",
    badge: "Gmail OAuth",
  },
};

const CHANNEL_ORDER = ["INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL"];

const OAUTH_MESSAGES: Record<string, { tone: "success" | "error"; text: string }> = {
  // Meta
  success: { tone: "success", text: "Connexion réussie ! Le canal est maintenant actif." },
  missing_code: { tone: "error", text: "Meta n'a pas renvoyé de code de connexion." },
  missing_env: { tone: "error", text: "Configuration Meta manquante côté serveur." },
  expired: { tone: "error", text: "Session expirée. Relancez la connexion." },
  invalid_state: { tone: "error", text: "Erreur de sécurité OAuth. Relancez la connexion." },
  forbidden: { tone: "error", text: "Ce compte ne correspond pas à cette communauté." },
  no_page: { tone: "error", text: "Aucune Page Facebook administrable trouvée." },
  no_instagram_business: { tone: "error", text: "Aucun compte Instagram Pro lié à une Page Facebook." },
  error: { tone: "error", text: "Connexion refusée par Meta. Vérifiez l'URL de redirection." },
  // Gmail
  gmail_success: { tone: "success", text: "Gmail connecté avec succès ! Vous pouvez maintenant envoyer des emails depuis EasyCom IA." },
  gmail_cancelled: { tone: "error", text: "Connexion Gmail annulée." },
  gmail_missing_code: { tone: "error", text: "Google n'a pas renvoyé de code d'autorisation." },
  gmail_missing_env: { tone: "error", text: "Configuration Gmail manquante côté serveur." },
  gmail_invalid_client: { tone: "error", text: "Client Gmail invalide : vérifiez que GMAIL_CLIENT_ID et GMAIL_CLIENT_SECRET correspondent au même client OAuth Google." },
  gmail_invalid_grant: { tone: "error", text: "Code ou refresh token Gmail invalide. Révoquez l'accès Google puis reconnectez Gmail." },
  gmail_redirect_uri_mismatch: { tone: "error", text: "URL de redirection Gmail non autorisée dans Google Cloud." },
  gmail_no_token: { tone: "error", text: "Aucun token reçu de Google. Réessayez avec 'consent' forcé." },
  gmail_no_community: { tone: "error", text: "Communauté introuvable. Vérifiez votre profil." },
  gmail_error: { tone: "error", text: "Erreur lors de la connexion Gmail. Réessayez." },
};

export function ChannelsSettingsClient({ channels, communityId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState<Record<string, string>>({});
  const [oauthPopupProvider, setOauthPopupProvider] = useState<string | null>(null);

  const channelMap = Object.fromEntries(channels.map((c) => [c.type, c]));
  const oauthStatus = searchParams.get("oauth");
  const oauthMessage = oauthStatus ? OAUTH_MESSAGES[oauthStatus] : null;

  function isChannelConnected(channel: Channel | undefined) {
    return !!channel && (channel.isConnected || (channel.type === "WHATSAPP" && channel.settings?.mode === "personal"));
  }

  const connectedCount = CHANNEL_ORDER.filter((type) => isChannelConnected(channelMap[type])).length;

  // Écoute le popup OAuth (Meta ou Gmail) : met à jour l'URL (pour le bandeau de résultat
  // existant, dérivé de `?oauth=`) puis rafraîchit les données serveur (canaux connectés).
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const { type, provider, oauth } = (event.data ?? {}) as { type?: string; provider?: string; oauth?: string };
      if (type !== "meta_oauth_success" && type !== "meta_oauth_error" && type !== "gmail_oauth_success" && type !== "gmail_oauth_error") {
        return;
      }
      const params = new URLSearchParams(window.location.search);
      params.set("oauth", oauth ?? (type.endsWith("success") ? "success" : "error"));
      if (provider) params.set("provider", provider);
      router.replace(`${window.location.pathname}?${params.toString()}`);
      if (type.endsWith("success")) router.refresh();
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  function openOAuthPopup(url: URL, name: string, fallbackUrl: URL) {
    const popup = window.open(
      url.toString(),
      name,
      "width=520,height=660,left=200,top=100,toolbar=0,menubar=0,location=0"
    );
    if (!popup) {
      window.location.href = fallbackUrl.toString();
    }
  }

  function connectOAuth(type: string) {
    const popupUrl = new URL(`/api/auth/oauth/${type.toLowerCase()}`, window.location.origin);
    popupUrl.searchParams.set("communityId", communityId);
    popupUrl.searchParams.set("returnTo", "settings_popup");
    const fallbackUrl = new URL(`/api/auth/oauth/${type.toLowerCase()}`, window.location.origin);
    fallbackUrl.searchParams.set("communityId", communityId);
    fallbackUrl.searchParams.set("returnTo", "settings");
    openOAuthPopup(popupUrl, `${type.toLowerCase()}_oauth`, fallbackUrl);
  }

  function connectGmail() {
    const popupUrl = new URL("/api/email/gmail/auth", window.location.origin);
    popupUrl.searchParams.set("communityId", communityId);
    popupUrl.searchParams.set("returnTo", "settings_gmail_popup");
    const fallbackUrl = new URL("/api/email/gmail/auth", window.location.origin);
    fallbackUrl.searchParams.set("communityId", communityId);
    fallbackUrl.searchParams.set("returnTo", "settings");
    openOAuthPopup(popupUrl, "gmail_oauth", fallbackUrl);
  }

  async function saveManualChannel(type: string) {
    setSaving(type);
    try {
      const existing = channelMap[type];
      const method = existing ? "PATCH" : "POST";
      const url = existing ? `/api/channels/${existing.id}` : "/api/channels";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type, communityId,
          name: CHANNEL_LABELS[type],
          accessToken: tokenInput[`${type}_access`] || undefined,
          pageId: tokenInput[`${type}_pageid`] || undefined,
          isConnected: !!(tokenInput[`${type}_access`] || tokenInput[`${type}_pageid`]),
          isActive: true,
        }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  async function toggleChannel(channel: Channel) {
    setSaving(channel.id);
    try {
      await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  async function disconnectChannel(channel: Channel) {
    if (!confirm(`Déconnecter ${CHANNEL_LABELS[channel.type]} ?`)) return;
    setDeletingId(channel.id);
    try {
      if (channel.type === "WHATSAPP") {
        await fetch("/api/whatsapp/qr", { method: "DELETE" });
      } else {
        await fetch(`/api/channels/${channel.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isConnected: false,
            isActive: false,
            accessToken: null,
            refreshToken: null,
            pageId: null,
          }),
        });
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-w-0 space-y-6 pb-8">

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f1f4d_0%,#17357a_58%,#2351b8_100%)] text-white shadow-[0_22px_50px_rgba(15,23,42,0.22)]">
        <div className="flex items-center gap-4 px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Canaux de diffusion</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100 sm:text-[15px]">
              Rassemblez vos connexions de publication dans un espace clair, moderne et coherent avec le reste du dashboard.
            </p>
            <p className="hidden">
              Connectez vos réseaux sociaux pour publier directement depuis EasyCom IA
            </p>
          </div>
        </div>
      </div>

      {/* ── Bandeau résultat OAuth ────────────────────────────── */}
      {oauthMessage && (
        <div className={cn(
          "flex items-center gap-3 rounded-[1.6rem] border p-4 shadow-sm",
          oauthMessage.tone === "success"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-red-50 border-red-200"
        )}>
          {oauthMessage.tone === "success"
            ? <CheckCircle2 className="size-5 text-emerald-600 flex-shrink-0" />
            : <AlertCircle className="size-5 text-red-600 flex-shrink-0" />}
          <p className={cn(
            "text-sm font-medium",
            oauthMessage.tone === "success" ? "text-emerald-800" : "text-red-800"
          )}>
            {oauthMessage.text}
          </p>
        </div>
      )}

      {/* ── Stat bar ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Canaux disponibles", value: CHANNEL_ORDER.length, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Connectés", value: connectedCount, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Actifs", value: CHANNEL_ORDER.filter((type) => {
            const channel = channelMap[type];
            return !!channel && channel.isActive && isChannelConnected(channel);
          }).length, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-[1.6rem] border bg-white p-4 shadow-sm", s.bg)}>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{s.label}</p>
            <p className={cn("mt-3 text-3xl font-black", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Info ─────────────────────────────────────────────── */}
      <div className="hidden rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex gap-3">
        <Info className="size-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 leading-relaxed">
          Les canaux <strong>Instagram</strong> et <strong>Facebook</strong> se connectent via Meta OAuth en un clic.
          Pour <strong>Telegram</strong> et <strong>Email</strong>, renseignez votre clé API.
          <strong> WhatsApp</strong> fonctionne en mode copier-coller guidé.
        </p>
      </div>

      {/* ── Liste des canaux ──────────────────────────────────── */}
      <div className="space-y-3">
        {CHANNEL_ORDER.map((type) => {
          const channel = channelMap[type];
          const cfg = CHANNEL_CONFIG[type];
          const isExpanded = expandedChannel === type;
          const isWhatsAppPersonal = type === "WHATSAPP" && channel?.settings?.mode === "personal";
          const isConnected = (channel?.isConnected ?? false) || isWhatsAppPersonal;
          const isActive = channel?.isActive ?? false;

          return (
            <div
              key={type}
              className={cn(
                "overflow-hidden rounded-[1.8rem] border bg-white shadow-sm transition-all duration-200",
                isConnected
                  ? "border-emerald-200 shadow-emerald-50/80"
                  : "border-slate-200 hover:border-slate-300",
                !isActive && channel && "opacity-60"
              )}
            >
              {/* ── Ligne principale ── */}
              <div className="flex items-center gap-4 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">

                {/* Logo réseau */}
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 p-2.5",
                  cfg.logoBg
                )}>
                  <img
                    src={cfg.logo}
                    alt={`Logo ${CHANNEL_LABELS[type]}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{CHANNEL_LABELS[type]}</span>

                    {/* Badge type */}
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border",
                      cfg.brandBorder, cfg.brandText,
                      cfg.logoBg
                    )}>
                      {cfg.badge}
                    </span>

                    {/* Badge statut */}
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <Wifi className="size-3" />
                        Connecté
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                        <WifiOff className="size-3" />
                        {channel ? "Non connecté" : "Non configuré"}
                      </span>
                    )}
                  </div>

                  {/* Handle si connecté */}
                  {isConnected && channel?.handle && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      @{channel.handle}
                      {channel.lastSyncAt && (
                        <span className="ml-2 text-slate-400">
                          · sync {new Date(channel.lastSyncAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </p>
                  )}

                  {!isConnected && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{cfg.description}</p>
                  )}
                </div>

                {/* Actions droite */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle actif/inactif */}
                  {isConnected && (
                    <button
                      onClick={() => toggleChannel(channel!)}
                      disabled={saving === channel?.id}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50"
                      title={isActive ? "Désactiver" : "Activer"}
                    >
                      {saving === channel?.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : isActive ? (
                        <ToggleRight className="size-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="size-5 text-slate-400" />
                      )}
                      <span className="hidden sm:inline">{isActive ? "Actif" : "Inactif"}</span>
                    </button>
                  )}

                  {/* Bouton configurer/connecter */}
                  <button
                    onClick={() => setExpandedChannel(isExpanded ? null : type)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition-all",
                      isConnected
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "bg-blue-950 border-blue-950 text-white shadow-sm hover:bg-blue-900"
                    )}
                  >
                    <span>{isConnected ? "Configurer" : "Connecter"}</span>
                    {isExpanded
                      ? <ChevronUp className="size-4" />
                      : <ChevronDown className="size-4" />}
                  </button>
                </div>
              </div>

              {/* ── Panel de configuration ── */}
              {isExpanded && (
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5">

                  {/* OAuth (Instagram / Facebook) */}
                  {cfg.authType === "oauth" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {cfg.description} La connexion se fait via le dialogue officiel Meta — aucun mot de passe n&apos;est stocké.
                      </p>

                      {isConnected ? (
                        <div className="flex items-center justify-between rounded-2xl bg-white border border-emerald-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-9 h-9 rounded-xl p-2 flex items-center justify-center", cfg.logoBg)}>
                              <img src={cfg.logo} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {channel?.handle ? `@${channel.handle}` : channel?.name}
                              </p>
                              {channel?.pageId && (
                                <p className="text-xs text-slate-400">Page ID · {channel.pageId}</p>
                              )}
                            </div>
                            <CheckCircle2 className="size-4 text-emerald-500 ml-1" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => connectOAuth(type)}
                              disabled={oauthPopupProvider === type}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              {oauthPopupProvider === type ? "Ouverture..." : "Reconnecter"}
                            </button>
                            <button
                              onClick={() => disconnectChannel(channel!)}
                              disabled={deletingId === channel?.id}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-xl px-3 py-1.5 transition-all disabled:opacity-50"
                            >
                              {deletingId === channel?.id
                                ? <Loader2 className="size-3 animate-spin" />
                                : <Unlink className="size-3" />}
                              Déconnecter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => connectOAuth(type)}
                          disabled={oauthPopupProvider === type}
                          className={cn(
                            "flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-wait disabled:opacity-70 bg-gradient-to-r",
                            cfg.brandColor
                          )}
                        >
                          {oauthPopupProvider === type ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <img src={cfg.logo} alt="" className="w-5 h-5 object-contain brightness-0 invert" />
                          )}
                          {oauthPopupProvider === type ? "Ouverture de la fenetre..." : `Se connecter via ${CHANNEL_LABELS[type]}`}
                          {oauthPopupProvider !== type && <ExternalLink className="size-4 ml-1 opacity-80" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Gmail OAuth */}
                  {cfg.authType === "gmail-oauth" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {cfg.description} La connexion passe par le dialogue officiel Google — aucun mot de passe n&apos;est stocké.
                      </p>

                      {isConnected ? (
                        <div className="flex items-center justify-between rounded-2xl bg-white border border-emerald-200 p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl p-2 flex items-center justify-center bg-red-50">
                              <img src="/logo/gmail-svgrepo-com.svg" alt="Gmail" className="w-full h-full object-contain" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {channel?.handle || channel?.pageId || "Compte Gmail"}
                              </p>
                              <p className="text-xs text-emerald-600 font-medium">Connecté via OAuth Google</p>
                            </div>
                            <CheckCircle2 className="size-4 text-emerald-500 ml-1" />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={connectGmail}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              Reconnecter
                            </button>
                            <button
                              onClick={() => channel && disconnectChannel(channel)}
                              disabled={deletingId === channel?.id}
                              className="flex items-center gap-1.5 text-xs font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-xl px-3 py-1.5 transition-all disabled:opacity-50"
                            >
                              {deletingId === channel?.id
                                ? <Loader2 className="size-3 animate-spin" />
                                : <Unlink className="size-3" />}
                              Déconnecter
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={connectGmail}
                          className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 bg-gradient-to-r from-red-500 to-orange-400"
                        >
                          <img src="/logo/gmail-svgrepo-com.svg" alt="Gmail" className="w-5 h-5 object-contain brightness-0 invert" />
                          Se connecter avec Gmail
                          <ExternalLink className="size-4 ml-1 opacity-80" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* WhatsApp personnel QR / code */}
                  {cfg.authType === "manual" && type === "WHATSAPP" && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex gap-3">
                        <Info className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-green-900">Connexion WhatsApp personnelle</p>
                          <p className="text-xs leading-relaxed text-green-800">
                            La connexion se fait maintenant depuis la page WhatsApp avec un QR code ou un code telephone.
                            Vous pouvez renouveler le QR ou le code uniquement sur demande.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href="/dashboard/whatsapp"
                          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700"
                        >
                          <Wifi className="size-4" />
                          {isConnected ? "Gerer la connexion" : "Connecter par QR ou code"}
                        </Link>
                        {channel && isConnected && (
                          <button
                            onClick={() => disconnectChannel(channel)}
                            disabled={deletingId === channel.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-xl px-4 py-2.5 transition-all disabled:opacity-50"
                          >
                            {deletingId === channel.id ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" />}
                            Deconnecter
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Token (Telegram / Email) */}
                  {cfg.authType === "token" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">{cfg.description}</p>

                      {type === "TELEGRAM" && (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex gap-3">
                            <Info className="size-5 text-sky-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-sky-900">Comment connecter Telegram ?</p>
                              <div className="space-y-1 text-xs leading-relaxed text-sky-800">
                                <p>
                                  <strong>Token du bot :</strong> ouvrez Telegram, cherchez <strong>@BotFather</strong>,
                                  envoyez <code className="rounded bg-sky-100 px-1">/newbot</code>, puis copiez le token fourni.
                                </p>
                                <p>
                                  <strong>Chat ID :</strong> ajoutez le bot dans votre groupe ou canal, envoyez un message,
                                  puis ouvrez <code className="rounded bg-sky-100 px-1">https://api.telegram.org/botTOKEN/getUpdates</code>
                                  en remplaçant <strong>TOKEN</strong> par le token du bot.
                                </p>
                                <p>
                                  Le Chat ID est la valeur <code className="rounded bg-sky-100 px-1">chat.id</code>.
                                  Pour un groupe ou canal, il commence souvent par <strong>-100</strong>. Gardez le token privé.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Token du bot
                              </label>
                              <input
                                type="password"
                                value={tokenInput[`${type}_access`] ?? (channel?.isConnected ? "••••••••" : "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_access`]: e.target.value }))}
                                placeholder="1234567890:ABCdefGHI..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Chat ID
                              </label>
                              <input
                                type="text"
                                value={tokenInput[`${type}_pageid`] ?? (channel?.pageId ?? "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_pageid`]: e.target.value }))}
                                placeholder="-1001234567890"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {type === "WHATSAPP" && (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex gap-3">
                            <Info className="size-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-green-900">Comment connecter WhatsApp ?</p>
                              <div className="space-y-1 text-xs leading-relaxed text-green-800">
                                <p>
                                  Dans <strong>Meta Business</strong> → <strong>WhatsApp</strong> → <strong>API Setup</strong>,
                                  récupérez le <strong>Phone Number ID</strong> du numéro expéditeur et un <strong>token d&apos;accès permanent</strong> (System User).
                                </p>
                                <p>
                                  Les messages partent vers les contacts ayant activé l&apos;<strong>opt-in WhatsApp</strong>.
                                  Hors fenêtre de 24 h, Meta impose un <strong>template approuvé</strong> : sinon, EasyCom IA bascule automatiquement en copier-coller.
                                </p>
                                <p>
                                  Laissez le token vide pour utiliser celui configuré côté serveur.
                                  Le token reste privé et n&apos;est jamais réaffiché.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                {cfg.botField}
                              </label>
                              <input
                                type="text"
                                value={tokenInput[`${type}_pageid`] ?? (channel?.pageId ?? "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_pageid`]: e.target.value }))}
                                placeholder="1234567890123456"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                {cfg.tokenField}
                              </label>
                              <input
                                type="password"
                                value={tokenInput[`${type}_access`] ?? (channel?.isConnected ? "••••••••" : "")}
                                onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_access`]: e.target.value }))}
                                placeholder="EAAxxxxxxxxxxxx (optionnel)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {type === "EMAIL" && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Clé API Resend
                          </label>
                          <input
                            type="password"
                            value={tokenInput[`${type}_access`] ?? (channel?.isConnected ? "••••••••" : "")}
                            onChange={(e) => setTokenInput((p) => ({ ...p, [`${type}_access`]: e.target.value }))}
                            placeholder="re_xxxxxxxxxxxxxxxx"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <p className="text-xs text-slate-400">
                            Créez une clé sur{" "}
                            <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                              resend.com
                            </a>
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveManualChannel(type)}
                          disabled={saving === type}
                          className="flex items-center gap-2 rounded-2xl bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-900 disabled:opacity-60"
                        >
                          {saving === type
                            ? <Loader2 className="size-4 animate-spin" />
                            : <Save className="size-4" />}
                          Sauvegarder
                        </button>
                        {isConnected && (
                          <button
                            onClick={() => disconnectChannel(channel!)}
                            disabled={deletingId === channel?.id}
                            className="flex items-center gap-1.5 text-sm font-medium text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-xl px-4 py-2.5 transition-all disabled:opacity-50"
                          >
                            <Unlink className="size-4" />
                            Déconnecter
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer aide ──────────────────────────────────────── */}
      <div className="flex items-start gap-4 rounded-[1.8rem] border border-blue-100 bg-[linear-gradient(135deg,#eef4ff_0%,#ffffff_100%)] p-5 shadow-sm">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-950 text-white shadow-sm">
          <Info className="size-5" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-slate-900">Besoin d&apos;aide pour configurer un canal ?</p>
          <p className="text-sm leading-6 text-slate-600">
            Consultez notre documentation ou contactez le support. Pour Instagram et Facebook,
            assurez-vous d&apos;avoir un <strong>compte professionnel</strong> et d&apos;être <strong>administrateur</strong> de la Page.
          </p>
          <Link
            href="https://easycom-ai.com/contact"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 rounded-full bg-blue-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-900"
          >
            Contacter le support
            <ExternalLink className="size-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}
