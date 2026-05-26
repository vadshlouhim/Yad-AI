"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    description: "Diffusez via WhatsApp. EasyCom AI génère des textes prêts à envoyer.",
    authType: "manual",
    badge: "Copier-coller",
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
    description: "Connectez votre compte Gmail pour envoyer des emails depuis EasyCom AI.",
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
  gmail_success: { tone: "success", text: "Gmail connecté avec succès ! Vous pouvez maintenant envoyer des emails depuis EasyCom AI." },
  gmail_cancelled: { tone: "error", text: "Connexion Gmail annulée." },
  gmail_missing_code: { tone: "error", text: "Google n'a pas renvoyé de code d'autorisation." },
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

  const channelMap = Object.fromEntries(channels.map((c) => [c.type, c]));
  const oauthStatus = searchParams.get("oauth");
  const oauthMessage = oauthStatus ? OAUTH_MESSAGES[oauthStatus] : null;

  const connectedCount = channels.filter((c) => c.isConnected).length;

  function connectOAuth(type: string) {
    window.location.href = `/api/auth/oauth/${type.toLowerCase()}?communityId=${communityId}`;
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
      await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConnected: false, accessToken: null, refreshToken: null }),
      });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">

      {/* ── En-tête ──────────────────────────────────────────── */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-sm">
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Canaux de diffusion</h1>
            <p className="text-sm text-slate-500">
              Connectez vos réseaux sociaux pour publier directement depuis EasyCom AI
            </p>
          </div>
        </div>
      </div>

      {/* ── Bandeau résultat OAuth ────────────────────────────── */}
      {oauthMessage && (
        <div className={cn(
          "rounded-2xl border p-4 flex items-center gap-3",
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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Canaux disponibles", value: CHANNEL_ORDER.length, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Connectés", value: connectedCount, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Actifs", value: channels.filter((c) => c.isActive && c.isConnected).length, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border p-4 text-center", s.bg)}>
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Info ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 flex gap-3">
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
          const isConnected = channel?.isConnected ?? false;
          const isActive = channel?.isActive ?? false;

          return (
            <div
              key={type}
              className={cn(
                "rounded-2xl border bg-white transition-all duration-200 overflow-hidden",
                isConnected
                  ? "border-emerald-200 shadow-sm shadow-emerald-50"
                  : "border-slate-200 hover:border-slate-300",
                !isActive && channel && "opacity-60"
              )}
            >
              {/* ── Ligne principale ── */}
              <div className="flex items-center gap-4 p-5">

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
                      "flex items-center gap-1.5 text-sm font-medium rounded-xl px-4 py-2 border transition-all",
                      isConnected
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        : "brand-gradient text-white border-transparent shadow-sm hover:opacity-90"
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
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-5 space-y-4">

                  {/* OAuth (Instagram / Facebook) */}
                  {cfg.authType === "oauth" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {cfg.description} La connexion se fait via le dialogue officiel Meta ??? aucun mot de passe n&apos;est stock??.
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
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                              Reconnecter
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
                          className={cn(
                            "flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 bg-gradient-to-r",
                            cfg.brandColor
                          )}
                        >
                          <img src={cfg.logo} alt="" className="w-5 h-5 object-contain brightness-0 invert" />
                          Se connecter via {CHANNEL_LABELS[type]}
                          <ExternalLink className="size-4 ml-1 opacity-80" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Gmail OAuth */}
                  {cfg.authType === "gmail-oauth" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {cfg.description} La connexion passe par le dialogue officiel Google ??? aucun mot de passe n&apos;est stock??.
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
                              onClick={() => window.location.href = `/api/email/gmail/auth?communityId=${communityId}`}
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
                          onClick={() => window.location.href = `/api/email/gmail/auth?communityId=${communityId}`}
                          className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 bg-gradient-to-r from-red-500 to-orange-400"
                        >
                          <img src="/logo/gmail-svgrepo-com.svg" alt="Gmail" className="w-5 h-5 object-contain brightness-0 invert" />
                          Se connecter avec Gmail
                          <ExternalLink className="size-4 ml-1 opacity-80" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Token (Telegram / Email) */}
                  {cfg.authType === "token" && (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">{cfg.description}</p>

                      {type === "TELEGRAM" && (
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
                          className="flex items-center gap-2 brand-gradient text-white text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm hover:opacity-90 transition-all disabled:opacity-60"
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

                  {/* WhatsApp — manuel */}
                  {cfg.authType === "manual" && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
                        <AlertCircle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-amber-800">Mode copier-coller</p>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            WhatsApp ne permet pas la publication automatique sans l&apos;API Business officielle.
                            EasyCom AI génère le contenu optimisé avec un lien <code className="bg-amber-100 rounded px-1">wa.me</code> prêt à partager.
                          </p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex gap-3">
                        <CheckCircle2 className="size-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">
                          Aucune configuration requise ??? WhatsApp est pr??t ?? l&apos;emploi d??s maintenant.
                        </p>
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Info className="size-5 text-slate-500" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">Besoin d&apos;aide pour configurer un canal ?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Consultez notre documentation ou contactez le support. Pour Instagram et Facebook,
            assurez-vous d&apos;avoir un <strong>compte professionnel</strong> et d&apos;??tre <strong>administrateur</strong> de la Page.
          </p>
          <Link
            href="mailto:contact@easycom-AI.com"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium mt-1"
          >
            Contacter le support
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}
