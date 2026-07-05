"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  Loader2,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { cn } from "@/lib/utils";
import type { BillingConfig } from "@/lib/billing";

type RepeatFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";
type WaStatus = "disconnected" | "initializing" | "qr_pending" | "authenticated" | "connected" | "auth_failure" | "error" | "unreachable";
type WaMode = "cloud" | "personal";
type WaPairingMethod = "qr" | "code";

interface Member {
  id: string;
  displayName: string;
  phone: string | null;
  tags?: string[];
  optInWhatsapp: boolean;
}

interface UploadedAttachment {
  url: string;
  name: string;
  type: string;
  isImage: boolean;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  templateRequired: boolean;
  errors: string[];
}

interface ScheduledSend {
  id: string;
  content: string;
  attachments: UploadedAttachment[];
  contactIds: string[];
  listTags: string[];
  groups: string[];
  manualNumbers: string[];
  scheduledDate: string;
  scheduledTime: string;
  repeatConfig: {
    frequency: RepeatFrequency;
    days: string[];
    startDate: string;
    endDate: string;
  };
  status: "Active" | "Programmée" | "En cours" | "Envoyée";
  createdAt: string;
}

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Dim"];
const STORAGE_KEY = "easycom-whatsapp-scheduled-sends";

function formatPreviewText(value: string) {
  if (!value) return <span className="text-slate-400">Votre message apparaîtra ici.</span>;

  let html = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*(.*?)\*/g, "<strong>$1</strong>");
  html = html.replace(/\n/g, "<br />");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function buildOutgoingText(message: string, attachments: UploadedAttachment[]) {
  const cleanMessage = message.trim();
  if (attachments.length === 0) return cleanMessage;

  const attachmentLines = attachments.map((attachment) => `${attachment.name}: ${attachment.url}`);
  return [cleanMessage, "Pièces jointes:", ...attachmentLines].filter(Boolean).join("\n\n");
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function WhatsAppConnectionPanel({
  isPaid,
  isCloudConfigured,
  isPersonalMode,
  onUpgradeRequired,
  onConnectionChange,
}: {
  isPaid: boolean;
  isCloudConfigured: boolean;
  isPersonalMode: boolean;
  onUpgradeRequired: () => void;
  onConnectionChange?: (state: { connected: boolean; canDisconnect: boolean; status: WaStatus; mode: WaMode }) => void;
}) {
  const [mode, setMode] = useState<WaMode>(isPersonalMode ? "personal" : "cloud");
  const [status, setStatus] = useState<WaStatus>(isCloudConfigured ? "connected" : "disconnected");
  const [pairingMethod, setPairingMethod] = useState<WaPairingMethod>("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { mode?: WaMode; status?: WaStatus } | null) => {
        if (!data) return;
        if (data.mode) setMode(data.mode);
        if (data.status) setStatus(data.status);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (mode !== "personal" || status === "connected") return;
    const statusPoll = setInterval(() => {
      fetch("/api/whatsapp/status")
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { status?: WaStatus } | null) => {
          if (data?.status) setStatus(data.status);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(statusPoll);
  }, [mode, status]);

  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, []);

  function stopQrPoll() {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
  }

  function startQrPoll() {
    stopQrPoll();
    setLoading(true);
    setConnectionError("");
    let errorStreak = 0;

    const fetchQr = async () => {
      try {
        const response = await fetch("/api/whatsapp/qr");
        if (!response.ok) {
          const data = await response.json().catch(() => null) as { error?: string } | null;
          setConnectionError(data?.error ?? `Erreur QR HTTP ${response.status}`);
          errorStreak += 1;
          if (errorStreak >= 3) {
            setStatus("unreachable");
            setLoading(false);
          }
          return;
        }

        const data = (await response.json()) as { status?: WaStatus; qr?: string; error?: string };
        if (data.status) setStatus(data.status);
        if (data.status === "error") {
          errorStreak += 1;
          setConnectionError(data.error ?? "Le service WhatsApp n'a pas encore fourni de QR code.");
          if (errorStreak >= 3) {
            setStatus("unreachable");
            setLoading(false);
            stopQrPoll();
          }
          return;
        }
        errorStreak = 0;
        if (data.qr) {
          setQrDataUrl(data.qr);
          setConnectionError("");
          setLoading(false);
          stopQrPoll();
        }
        if (data.status === "connected" || data.status === "auth_failure") {
          setLoading(false);
          stopQrPoll();
        }
      } catch {
        errorStreak += 1;
        if (errorStreak >= 3) {
          setStatus("unreachable");
          setLoading(false);
        }
      }
    };

    void fetchQr();
    qrPollRef.current = setInterval(fetchQr, 2000);
  }

  async function connectPersonal() {
    if (!isPaid) {
      onUpgradeRequired();
      return;
    }

    setLoading(true);
    setConnectionError("");
    setQrDataUrl(null);
    try {
      const statusResponse = await fetch("/api/whatsapp/status", { method: "POST" });
      if (!statusResponse.ok) {
        const data = await statusResponse.json().catch(() => null) as { error?: string; code?: string } | null;
        if (data?.code === "PAYWALL_REQUIRED") onUpgradeRequired();
        throw new Error(data?.error ?? "Connexion impossible.");
      }
      setMode("personal");
      setStatus("initializing");
      const startResponse = await fetch("/api/whatsapp/qr", { method: "POST" });
      if (!startResponse.ok) {
        const data = await startResponse.json().catch(() => null) as { error?: string; code?: string } | null;
        if (data?.code === "PAYWALL_REQUIRED") onUpgradeRequired();
        throw new Error(data?.error ?? "Démarrage du QR impossible.");
      }
      startQrPoll();
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Connexion WhatsApp impossible.");
      setStatus("error");
      setLoading(false);
    }
  }

  async function renewQrCode() {
    stopQrPoll();
    setQrDataUrl(null);
    setPairingCode(null);
    await fetch("/api/whatsapp/qr", { method: "DELETE" });
    await connectPersonal();
  }

  async function generatePairingCode() {
    if (!isPaid) {
      onUpgradeRequired();
      return;
    }

    const phoneNumber = pairingPhone.replace(/[^\d]/g, "");
    if (phoneNumber.length < 8) {
      setConnectionError("Saisissez un numero WhatsApp au format international, par exemple 33612345678.");
      return;
    }

    stopQrPoll();
    setLoading(true);
    setConnectionError("");
    setQrDataUrl(null);
    setPairingCode(null);
    setPairingMethod("code");
    try {
      const statusResponse = await fetch("/api/whatsapp/status", { method: "POST" });
      if (!statusResponse.ok) {
        const data = await statusResponse.json().catch(() => null) as { error?: string; code?: string } | null;
        if (data?.code === "PAYWALL_REQUIRED") onUpgradeRequired();
        throw new Error(data?.error ?? "Connexion impossible.");
      }
      setMode("personal");
      setStatus("initializing");

      const response = await fetch("/api/whatsapp/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await response.json().catch(() => null) as { status?: WaStatus | "code_pending"; code?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Generation du code impossible.");
      }
      if (data?.status === "connected") {
        setStatus("connected");
        return;
      }
      if (!data?.code) {
        throw new Error("Code d'appairage indisponible, reessayez.");
      }
      setPairingCode(data.code);
      setStatus("qr_pending");
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Connexion WhatsApp impossible.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/whatsapp/qr", { method: "DELETE" });
      setMode("cloud");
      setStatus("disconnected");
      setQrDataUrl(null);
      setPairingCode(null);
      stopQrPoll();
    } finally {
      setDisconnecting(false);
    }
  }

  const connected = status === "connected" || isCloudConfigured;
  const canDisconnect = connected || mode === "personal" || isPersonalMode;

  useEffect(() => {
    onConnectionChange?.({ connected, canDisconnect, status, mode });
  }, [canDisconnect, connected, mode, onConnectionChange, status]);

  return (
    <section className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
            {connected ? <CheckCircle2 className="size-4" /> : <Smartphone className="size-4" />}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
              {connected ? "WhatsApp connecté" : "Connexion WhatsApp"}
            </p>
            {connected && (
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Votre numéro est prêt pour les envois WhatsApp depuis EasyCom IA.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!connected && (
            <Button
              type="button"
              onClick={() => {
                setPairingMethod("qr");
                void connectPersonal();
              }}
              disabled={loading}
              className="h-9 rounded-xl bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              {loading ? "Generation..." : "Generer un QR"}
            </Button>
          )}
          {canDisconnect && (
            <Button
              type="button"
              variant="outline"
              onClick={disconnect}
              disabled={disconnecting}
              className="h-9 rounded-xl border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              {disconnecting ? <Loader2 className="size-4 animate-spin" /> : <WifiOff className="size-4" />}
              Déconnecter
            </Button>
          )}
        </div>
      </div>

      {!connected && (
        <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPairingMethod("qr")}
            className={cn(
              "rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
              pairingMethod === "qr" ? "bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200" : "text-slate-600 hover:bg-white"
            )}
          >
            QR code
            <span className="mt-1 block text-xs font-medium text-slate-500">Afficher un QR uniquement sur demande.</span>
          </button>
          <button
            type="button"
            onClick={() => setPairingMethod("code")}
            className={cn(
              "rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
              pairingMethod === "code" ? "bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200" : "text-slate-600 hover:bg-white"
            )}
          >
            Code telephone
            <span className="mt-1 block text-xs font-medium text-slate-500">Entrer un numero et generer un code.</span>
          </button>
        </div>
      )}

      {!connected && pairingMethod === "qr" && (qrDataUrl || loading || status === "authenticated" || status === "auth_failure" || status === "unreachable") && (
        <div className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code WhatsApp" width={210} height={210} className="rounded-2xl border border-slate-200 bg-white" />
            ) : (
              <div className="flex size-[210px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
                <Loader2 className="size-7 animate-spin text-emerald-600" />
              </div>
            )}
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Instructions</p>
            <p>Ouvrez WhatsApp, allez dans Appareils connectés, puis scannez ce QR code.</p>
            {status === "authenticated" && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">QR scanné, finalisation en cours...</p>}
            {status === "auth_failure" && <p className="rounded-xl bg-red-50 p-3 text-red-700">Connexion échouée. Générez un nouveau QR code.</p>}
            {status === "unreachable" && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Service WhatsApp personnel inaccessible.</p>}
            {connectionError && <p className="rounded-xl bg-red-50 p-3 text-red-700">{connectionError}</p>}
            <Button type="button" variant="outline" onClick={() => void renewQrCode()} disabled={loading} className="rounded-xl">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              Renouveler
            </Button>
          </div>
        </div>
      )}

      {!connected && pairingMethod === "code" && (
        <div className="mt-5 grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[auto_1fr]">
          <div className="flex size-[210px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 text-center">
            {loading ? (
              <Loader2 className="size-7 animate-spin text-emerald-600" />
            ) : pairingCode ? (
              <p className="font-mono text-3xl font-black tracking-[0.22em] text-slate-950">{pairingCode}</p>
            ) : (
              <p className="text-sm font-medium text-slate-400">Code en attente</p>
            )}
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Connexion par code</p>
            <input
              value={pairingPhone}
              onChange={(event) => setPairingPhone(event.target.value)}
              inputMode="tel"
              placeholder="33612345678"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <p>Dans WhatsApp, choisissez Associer avec un numero de telephone, puis entrez le code affiche.</p>
            {status === "authenticated" && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">Code valide, finalisation en cours...</p>}
            {status === "unreachable" && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Service WhatsApp personnel inaccessible.</p>}
            {connectionError && <p className="rounded-xl bg-red-50 p-3 text-red-700">{connectionError}</p>}
            <Button type="button" onClick={() => void generatePairingCode()} disabled={loading} className="rounded-xl bg-emerald-700 text-white hover:bg-emerald-800">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              {pairingCode ? "Renouveler le code" : "Generer un code"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function LegacyWhatsAppPhonePreview({
  message,
  attachments,
}: {
  message: string;
  attachments: UploadedAttachment[];
}) {
  return (
    <div className="sticky top-6 mx-auto w-full max-w-[340px]">
      <div className="overflow-hidden rounded-[2rem] border-[10px] border-slate-900 bg-[#e5ddd5] shadow-xl">
        <div className="flex items-center gap-2 bg-[#075e54] p-3 pt-4 text-white">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
            YA
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold leading-tight">Yad.ia WhatsApp</p>
            <p className="text-[10px] leading-none text-white/70">en ligne</p>
          </div>
        </div>

        <div className="flex min-h-[520px] flex-col justify-end gap-2 bg-[#efe7dd] p-3 pb-8">
          {(message.trim() || attachments.length > 0) ? (
            <div className="max-w-[88%] self-end rounded-2xl rounded-tr-none bg-[#d9fdd3] p-2.5 text-xs text-slate-800 shadow-sm">
              {attachments.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {attachments.map((attachment) => (
                    <div key={attachment.url} className="overflow-hidden rounded-xl border border-emerald-100 bg-white/65">
                      {attachment.isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={attachment.url} alt={attachment.name} className="h-24 w-full object-cover" />
                      ) : (
                        <div className="flex items-center gap-2 p-2">
                          <FileText className="size-4 text-emerald-700" />
                          <span className="truncate text-[11px] font-medium">{attachment.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="break-words leading-relaxed">{formatPreviewText(message)}</p>
              <span className="mt-1.5 block text-right text-[9px] text-slate-400">Aujourd&apos;hui à 12:00 ✓✓</span>
            </div>
          ) : (
            <div className="max-w-[88%] self-end rounded-2xl rounded-tr-none bg-[#d9fdd3] p-2.5 text-xs text-slate-500 shadow-sm">
              Votre message apparaîtra ici.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

void LegacyWhatsAppPhonePreview;

function WhatsAppPhonePreview({
  message,
  attachments,
}: {
  message: string;
  attachments: UploadedAttachment[];
}) {
  const hasPreviewContent = message.trim() || attachments.length > 0;

  return (
    <div className="mx-auto flex w-full justify-center">
      <div className="relative aspect-[12/25] w-full max-w-[320px] rounded-[3.5rem] border-[1.5px] border-[#b0853e] bg-[#f2935a] p-[4px] shadow-[0_20px_50px_rgba(15,23,42,0.45)]">
        <div className="absolute -left-[5px] top-[110px] h-[30px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[160px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -left-[5px] top-[230px] h-[55px] w-[5px] rounded-l-md border-y border-l border-[#b0853e] bg-[#f2935a]" />
        <div className="absolute -right-[5px] top-[180px] h-[85px] w-[5px] rounded-r-md border-y border-r border-[#b0853e] bg-[#f2935a]" />

        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[3.2rem] bg-[#efe7dd]">
          <div className="flex h-12 w-full flex-shrink-0 items-center justify-between bg-[#075e54] px-6 pt-2 text-white">
            <div className="w-1/3 pl-1 text-[15px] font-semibold">9:41</div>
            <div className="mt-1 h-[30px] w-[120px] rounded-full bg-black" />
            <div className="flex w-1/3 justify-end pr-1 text-xs font-semibold">LTE</div>
          </div>

          <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2 text-white shadow-sm">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-200 to-teal-500 text-[10px] font-black text-emerald-950">
              YA
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold leading-tight">Yad.ia WhatsApp</p>
              <p className="text-[10px] leading-none text-white/75">en ligne</p>
            </div>
            <Video className="size-4 text-white/85" />
            <Phone className="size-4 text-white/85" />
            <MoreVertical className="size-4 text-white/85" />
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden bg-[#efe7dd] px-3 pb-14 pt-4">
            <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_1px_1px,#9a8f82_1px,transparent_0)] [background-size:18px_18px]" />
            <div className="relative mb-3 max-w-[78%] rounded-2xl rounded-tl-none bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-700 shadow-sm">
              Bonjour, voici l&apos;apercu du message avant envoi.
              <span className="mt-1 block text-right text-[9px] text-slate-400">11:58</span>
            </div>

            <div className="relative flex flex-col items-end gap-2">
              {hasPreviewContent ? (
                <div className="max-w-[88%] rounded-2xl rounded-tr-none bg-[#d9fdd3] p-2.5 text-xs text-slate-800 shadow-sm">
                  {attachments.length > 0 && (
                    <div className="mb-2 space-y-1.5">
                      {attachments.map((attachment) => (
                        <div key={attachment.url} className="overflow-hidden rounded-xl border border-emerald-100 bg-white/65">
                          {attachment.isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={attachment.url} alt={attachment.name} className="h-24 w-full object-cover" />
                          ) : (
                            <div className="flex items-center gap-2 p-2">
                              <FileText className="size-4 text-emerald-700" />
                              <span className="truncate text-[11px] font-medium">{attachment.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="break-words leading-relaxed">{message.trim() ? formatPreviewText(message) : "Piece jointe prete a envoyer."}</p>
                  <span className="mt-1.5 block text-right text-[9px] text-emerald-700/70">Aujourd&apos;hui a 12:00 - lu</span>
                </div>
              ) : (
                <div className="max-w-[88%] rounded-2xl rounded-tr-none bg-[#d9fdd3] p-2.5 text-xs text-slate-500 shadow-sm">
                  Votre message apparaitra ici.
                </div>
              )}
            </div>

            <div className="absolute bottom-5 left-3 right-3 flex items-center gap-2">
              <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-white px-3 text-[11px] text-slate-400 shadow-sm">
                <span className="text-base leading-none">:)</span>
                Message
                <Paperclip className="ml-auto size-3.5" />
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-[#00a884] text-white shadow-sm">
                <Send className="size-4" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-2 flex w-full justify-center pb-1">
            <div className="h-[5px] w-[130px] rounded-full bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipientSelector({
  members,
  loading,
  selectedContactIds,
  onToggleContact,
  selectedListTags,
  onToggleList,
  groups,
  setGroups,
  manualNumbers,
  setManualNumbers,
}: {
  members: Member[];
  loading: boolean;
  selectedContactIds: Set<string>;
  onToggleContact: (id: string) => void;
  selectedListTags: Set<string>;
  onToggleList: (tag: string) => void;
  groups: string;
  setGroups: (value: string) => void;
  manualNumbers: string;
  setManualNumbers: (value: string) => void;
}) {
  const [search, setSearch] = useState("");
  const optInMembers = useMemo(() => members.filter((member) => member.phone && member.optInWhatsapp), [members]);
  const listTags = useMemo(() => {
    const tags = optInMembers.flatMap((member) => member.tags ?? []);
    return uniqueValues(tags).sort((a, b) => a.localeCompare(b));
  }, [optInMembers]);
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optInMembers;
    return optInMembers.filter(
      (member) => member.displayName.toLowerCase().includes(q) || (member.phone ?? "").includes(q)
    );
  }, [optInMembers, search]);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Users className="size-4 text-emerald-700" />
          Destinataires
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un contact"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-100 bg-white">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Chargement des contacts...
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">Aucun contact WhatsApp disponible.</p>
          ) : (
            filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleContact(member.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-emerald-50",
                  selectedContactIds.has(member.id) && "bg-emerald-50"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{member.displayName}</span>
                  <span className="block truncate text-xs text-slate-400">{member.phone}</span>
                </span>
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    selectedContactIds.has(member.id)
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white"
                  )}
                >
                  {selectedContactIds.has(member.id) && <Check className="size-3.5" />}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {listTags.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Listes</p>
          <div className="flex flex-wrap gap-2">
            {listTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleList(tag)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  selectedListTags.has(tag)
                    ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Groupes
          </label>
          <textarea
            value={groups}
            onChange={(event) => setGroups(event.target.value)}
            placeholder="Ex: Groupe parents, bénévoles..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Numéros manuels
          </label>
          <textarea
            value={manualNumbers}
            onChange={(event) => setManualNumbers(event.target.value)}
            placeholder="+33612345678, +972..."
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleDialog({
  open,
  onClose,
  initialMessage,
  initialAttachments,
  members,
  membersLoading,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  initialMessage: string;
  initialAttachments: UploadedAttachment[];
  members: Member[];
  membersLoading: boolean;
  onCreate: (send: ScheduledSend) => void;
}) {
  const scheduleFileInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState(initialMessage);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedListTags, setSelectedListTags] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [frequency, setFrequency] = useState<RepeatFrequency>("once");
  const [days, setDays] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function uploadScheduleAttachment(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Pièce jointe trop lourde : maximum 20 Mo.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload impossible.");
      setAttachments((current) => [...current, data as UploadedAttachment]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (scheduleFileInputRef.current) scheduleFileInputRef.current.value = "";
    }
  }

  function toggleContact(id: string) {
    setSelectedContactIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleList(tag: string) {
    setSelectedListTags((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function toggleDay(day: string) {
    setDays((previous) => {
      const next = new Set(previous);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function createSchedule() {
    const manual = uniqueValues(manualNumbers.split(/[\n,;]/));
    const groupValues = uniqueValues(groups.split(/[\n,;]/));
    const hasRecipients = selectedContactIds.size > 0 || selectedListTags.size > 0 || manual.length > 0 || groupValues.length > 0;

    if (!content.trim() && attachments.length === 0) {
      setError("Ajoutez un message ou une pièce jointe.");
      return;
    }
    if (!hasRecipients) {
      setError("Choisissez au moins un destinataire.");
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setError("Choisissez une date et un horaire.");
      return;
    }

    onCreate({
      id: crypto.randomUUID(),
      content,
      attachments,
      contactIds: Array.from(selectedContactIds),
      listTags: Array.from(selectedListTags),
      groups: groupValues,
      manualNumbers: manual,
      scheduledDate,
      scheduledTime,
      repeatConfig: {
        frequency,
        days: Array.from(days),
        startDate,
        endDate,
      },
      status: "Programmée",
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Planifier des envois automatiques</h2>
            <p className="mt-1 text-sm text-slate-500">Le texte manuel est conservé exactement tel qu&apos;il est saisi.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">Message</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={7}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Pièces jointes</p>
              <input
                ref={scheduleFileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => void uploadScheduleAttachment(event.target.files?.[0])}
              />
              <div className="space-y-2">
                {attachments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
                    Aucune pièce jointe pour cette planification.
                  </p>
                ) : (
                  attachments.map((attachment) => (
                    <div key={attachment.url} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <span className="truncate text-sm text-slate-700">{attachment.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Supprimer la pièce jointe"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => scheduleFileInputRef.current?.click()}
                disabled={uploading}
                className="mt-3 h-10 rounded-xl border-emerald-200 text-emerald-800 hover:bg-emerald-50"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
                {uploading ? "Ajout..." : "Ajouter une pièce jointe"}
              </Button>
            </div>

            <RecipientSelector
              members={members}
              loading={membersLoading}
              selectedContactIds={selectedContactIds}
              onToggleContact={toggleContact}
              selectedListTags={selectedListTags}
              onToggleList={toggleList}
              groups={groups}
              setGroups={setGroups}
              manualNumbers={manualNumbers}
              setManualNumbers={setManualNumbers}
            />
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Jour</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Horaire</label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(event) => setScheduledTime(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fréquence</label>
              <select
                value={frequency}
                onChange={(event) => setFrequency(event.target.value as RepeatFrequency)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
              >
                <option value="once">Une fois</option>
                <option value="daily">Tous les jours</option>
                <option value="weekly">Chaque semaine</option>
                <option value="monthly">Chaque mois</option>
                <option value="custom">Personnalisée</option>
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Jours concernés</p>
              <div className="grid grid-cols-3 gap-2">
                {WEEK_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-semibold",
                      days.has(day)
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

            <Button
              type="button"
              onClick={createSchedule}
              className="h-11 w-full rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <CalendarClock className="size-4" />
              Enregistrer la planification
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WhatsAppClient({
  billingConfig,
  isPaid,
  isCloudConfigured = false,
  isPersonalMode = false,
}: {
  billingConfig: BillingConfig;
  isPaid: boolean;
  isCloudConfigured?: boolean;
  isPersonalMode?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [selectedListTags, setSelectedListTags] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledSends, setScheduledSends] = useState<ScheduledSend[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(!isPaid);
  const [, setConnectionState] = useState({
    connected: isCloudConfigured,
    canDisconnect: isCloudConfigured || isPersonalMode,
  });

  const previewMessage = message.trim() ? message : prompt;

  const handleConnectionChange = useCallback((nextState: { connected: boolean; canDisconnect: boolean }) => {
    setConnectionState((current) => {
      if (current.connected === nextState.connected && current.canDisconnect === nextState.canDisconnect) {
        return current;
      }
      return nextState;
    });
  }, []);

  useEffect(() => {
    fetch("/api/community/members")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Member[]) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setScheduledSends(JSON.parse(raw) as ScheduledSend[]);
    } catch {
      setScheduledSends([]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduledSends));
    } catch {}
  }, [scheduledSends]);

  function toggleContact(id: string) {
    setSelectedContactIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleList(tag: string) {
    setSelectedListTags((previous) => {
      const next = new Set(previous);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function uploadAttachment(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Pièce jointe trop lourde : maximum 20 Mo.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload impossible.");
      setAttachments((current) => [...current, data as UploadedAttachment]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload impossible.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function generateWithAI() {
    if (!isPaid) {
      setUpgradeOpen(true);
      return;
    }
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError("Indiquez d'abord votre demande.");
      return;
    }

    setError("");
    setSendResult(null);
    setGenerating(true);
    try {
      const response = await fetch("/api/whatsapp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Erreur de génération.");
      }
      setMessage(data.message);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Erreur de génération IA.");
    } finally {
      setGenerating(false);
    }
  }

  function resolveSelectedContactIds() {
    const fromLists = members
      .filter((member) => (member.tags ?? []).some((tag) => selectedListTags.has(tag)))
      .map((member) => member.id);
    return Array.from(new Set([...Array.from(selectedContactIds), ...fromLists]));
  }

  async function sendNow() {
    if (!isPaid) {
      setUpgradeOpen(true);
      return;
    }

    const text = buildOutgoingText(previewMessage, attachments);
    const contactIds = resolveSelectedContactIds();
    const phones = uniqueValues(manualNumbers.split(/[\n,;]/));
    const groupValues = uniqueValues(groups.split(/[\n,;]/));

    if (!text && attachments.length === 0) {
      setError("Ajoutez un message ou une pièce jointe avant l'envoi.");
      return;
    }
    if (contactIds.length === 0 && phones.length === 0 && groupValues.length === 0) {
      setError("Sélectionnez au moins un destinataire.");
      return;
    }
    if (groupValues.length > 0 && contactIds.length === 0 && phones.length === 0) {
      setError("Ajoutez au moins un contact ou un numéro manuel pour envoyer maintenant.");
      return;
    }

    setError("");
    setSendResult(null);
    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          target: "contacts",
          contactIds,
          phones,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "PAYWALL_REQUIRED") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.error ?? "Échec de l'envoi.");
      }
      setSendResult(data as SendResult);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Échec de l'envoi WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  function removeSchedule(id: string) {
    setScheduledSends((current) => current.filter((send) => send.id !== id));
  }

  return (
    <div className="space-y-7">
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        config={billingConfig}
        featureLabel="WhatsApp"
        title="WhatsApp est inclus dans le mode payant"
        description="Le mode gratuit permet de découvrir EasyCom IA, mais WhatsApp nécessite l'abonnement payant."
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-950">
              WhatsApp
              <span className="inline-flex size-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700">
                AI
              </span>
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Préparez, planifiez et envoyez vos messages WhatsApp avec l&apos;IA.
            </p>
          </div>
        </div>
      </section>

      <WhatsAppConnectionPanel
        isPaid={isPaid}
        isCloudConfigured={isCloudConfigured}
        isPersonalMode={isPersonalMode}
        onUpgradeRequired={() => setUpgradeOpen(true)}
        onConnectionChange={handleConnectionChange}
      />

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white p-0 shadow-sm">
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-green-50 px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Sparkles className="size-4 text-emerald-700" />
                Generer le message avec l&apos;IA
              </h2>
            </div>
            <div className="flex gap-2 p-5">
              <input
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => event.key === "Enter" && generateWithAI()}
                placeholder="Ex: annonce le cours de dimanche avec un ton chaleureux"
                className="h-12 w-full rounded-2xl border border-emerald-100 bg-white px-4 text-sm shadow-inner shadow-emerald-50 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
              <Button
                type="button"
                onClick={generateWithAI}
                disabled={generating}
                className="h-12 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800"
                aria-label="Generer avec l'IA"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="hidden">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="size-5 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">Votre message</h2>
            </div>
            <textarea
              id="whatsapp-prompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setError("");
              }}
              placeholder=""
              rows={7}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => void uploadAttachment(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Ajout en cours..." : "Ajouter une pièce jointe jusqu'à 20 Mo"}
            </button>

            {attachments.length > 0 && (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {attachments.map((attachment) => (
                  <div key={attachment.url} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {attachment.isImage ? <ImageIcon className="size-4 text-emerald-700" /> : <Paperclip className="size-4 text-emerald-700" />}
                      <span className="truncate text-sm text-slate-700">{attachment.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                      className="text-slate-400 hover:text-red-600"
                      aria-label="Supprimer la pièce jointe"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={generateWithAI}
            disabled={generating}
            className="h-11 w-full rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto"
          >
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Génération..." : "Générer avec l'IA"}
          </Button>

          <RecipientSelector
            members={members}
            loading={membersLoading}
            selectedContactIds={selectedContactIds}
            onToggleContact={toggleContact}
            selectedListTags={selectedListTags}
            onToggleList={toggleList}
            groups={groups}
            setGroups={setGroups}
            manualNumbers={manualNumbers}
            setManualNumbers={setManualNumbers}
          />

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

          {sendResult && (
            <div
              className={cn(
                "rounded-xl border p-3 text-sm",
                sendResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
              )}
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <p>
                  {sendResult.success
                    ? `Message envoyé à ${sendResult.sent}/${sendResult.total} destinataire(s).`
                    : sendResult.errors[0] ?? "Aucun message envoyé."}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={sendNow}
              disabled={sending}
              className="h-11 flex-1 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {sending ? "Envoi..." : "Envoyer maintenant"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleOpen(true)}
              className="h-11 flex-1 rounded-2xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            >
              <CalendarClock className="size-4" />
              Planifier des envois automatiques
            </Button>
          </div>
          </div>
        </section>

        <section className="space-y-4">
          <WhatsAppPhonePreview message={previewMessage} attachments={attachments} />

          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-2">
              <label htmlFor="whatsapp-message-edit" className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Modifier le message
              </label>
              <textarea
                id="whatsapp-message-edit"
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError("");
                }}
                placeholder="Le message genere par l'IA apparaitra ici. Vous pouvez le modifier avant l'envoi."
                rows={6}
                className="min-h-[140px] w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => void uploadAttachment(event.target.files?.[0])}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 px-4 py-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? "Ajout en cours..." : "Ajouter une pièce jointe jusqu'à 20 Mo"}
              </button>

              {attachments.length > 0 && (
                <div className="mt-3 grid gap-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.url} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {attachment.isImage ? <ImageIcon className="size-4 text-emerald-700" /> : <Paperclip className="size-4 text-emerald-700" />}
                        <span className="truncate text-sm text-slate-700">{attachment.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachments((current) => current.filter((item) => item.url !== attachment.url))}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Supprimer la piÃ¨ce jointe"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <RecipientSelector
              members={members}
              loading={membersLoading}
              selectedContactIds={selectedContactIds}
              onToggleContact={toggleContact}
              selectedListTags={selectedListTags}
              onToggleList={toggleList}
              groups={groups}
              setGroups={setGroups}
              manualNumbers={manualNumbers}
              setManualNumbers={setManualNumbers}
            />

            {error && <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}

            {sendResult && (
              <div
                className={cn(
                  "rounded-xl border p-3 text-sm",
                  sendResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <p>
                    {sendResult.success
                      ? `Message envoyÃ© Ã  ${sendResult.sent}/${sendResult.total} destinataire(s).`
                      : sendResult.errors[0] ?? "Aucun message envoyÃ©."}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={sendNow}
                disabled={sending}
                className="h-11 flex-1 rounded-2xl bg-emerald-700 text-white hover:bg-emerald-800"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {sending ? "Envoi..." : "Envoyer maintenant"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setScheduleOpen(true)}
                className="h-11 flex-1 rounded-2xl border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
              >
                <CalendarClock className="size-4" />
                Planifier des envois automatiques
              </Button>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Envois automatiques planifiés</h2>
            <p className="mt-1 text-sm text-slate-500">Seules les planifications actives sont affichées.</p>
          </div>
          <Clock3 className="size-5 text-emerald-700" />
        </div>

        {scheduledSends.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            Aucun envoi automatique actif.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {scheduledSends.map((send) => (
              <div key={send.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <p className="line-clamp-2 text-sm text-slate-700">
                  {send.content || `${send.attachments.length} pièce(s) jointe(s)`}
                </p>
                <p className="text-sm font-medium text-slate-600">
                  {send.scheduledDate} {send.scheduledTime}
                </p>
                <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  {send.status}
                </span>
                <button
                  type="button"
                  onClick={() => removeSchedule(send.id)}
                  className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label="Supprimer la planification"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {scheduleOpen && (
        <ScheduleDialog
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          initialMessage={previewMessage}
          initialAttachments={attachments}
          members={members}
          membersLoading={membersLoading}
          onCreate={(send) => setScheduledSends((current) => [send, ...current])}
        />
      )}
    </div>
  );
}
