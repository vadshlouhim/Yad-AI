"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Users,
  UserRound,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Target = "community" | "contacts" | "phone";
type WaStatus = "disconnected" | "initializing" | "qr_pending" | "authenticated" | "connected" | "auth_failure" | "error" | "unreachable";
type WaMode = "cloud" | "personal";

interface Member {
  id: string;
  displayName: string;
  phone: string | null;
  optInWhatsapp: boolean;
}

interface SendResult {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  templateRequired: boolean;
  errors: string[];
}

const AUTOMATION_SCENARIOS = [
  { label: "Horaires de Chabbat", description: "Préparez le message hebdomadaire avec validation avant envoi.", status: "Disponible" },
  { label: "Activités", description: "Annoncez vos activités régulières ou ponctuelles par WhatsApp.", status: "Paramétrable" },
  { label: "Cours réguliers", description: "Planifiez les rappels de cours avec un message adapté.", status: "Paramétrable" },
  { label: "Messages automatiques", description: "Préparez un message quotidien ou communautaire à envoyer.", status: "Paramétrable" },
  { label: "Notifications importantes", description: "Centralisez les messages importants prêts à valider.", status: "Paramétrable" },
];

const DEFAULT_MESSAGE =
  "Annonce le cours de Torah de mardi soir à 20h30 au Beth Habad, ton chaleureux et professionnel.";

// ── Bloc connexion WhatsApp Web ──────────────────────────────────────────────

function WhatsAppConnect() {
  const [mode, setMode] = useState<WaMode>("cloud");
  const [status, setStatus] = useState<WaStatus>("disconnected");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Charge le statut initial
  useEffect(() => {
    fetch("/api/whatsapp/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { mode: WaMode; status: WaStatus } | null) => {
        if (data) {
          setMode(data.mode);
          setStatus(data.status);
        }
      })
      .catch(() => {});
  }, []);

  // Polling du statut quand en mode personnel et pas encore connecté
  useEffect(() => {
    if (mode !== "personal" || status === "connected") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      fetch("/api/whatsapp/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { mode: WaMode; status: WaStatus } | null) => {
          if (data?.status) setStatus(data.status);
        })
        .catch(() => {});
    }, 3_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [mode, status]);

  const activatePersonal = useCallback(async () => {
    setLoading(true);
    setQrDataUrl(null);
    try {
      // 1. Bascule le canal en mode personnel
      await fetch("/api/whatsapp/status", { method: "POST" });
      setMode("personal");
      setStatus("initializing");

      // 2. Déclenche la génération du QR (long-poll 30 s)
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json() as { status: WaStatus; qr?: string };
      setStatus(data.status);
      if (data.qr) setQrDataUrl(data.qr);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQr = useCallback(async () => {
    setLoading(true);
    setQrDataUrl(null);
    try {
      const res = await fetch("/api/whatsapp/qr");
      const data = await res.json() as { status: WaStatus; qr?: string };
      setStatus(data.status);
      if (data.qr) setQrDataUrl(data.qr);
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/whatsapp/qr", { method: "DELETE" });
      setMode("cloud");
      setStatus("disconnected");
      setQrDataUrl(null);
    } catch {} finally {
      setDisconnecting(false);
    }
  }, []);

  // ── Mode cloud (pas de session personnelle) ───────────────────────────────
  if (mode === "cloud") {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="size-5 text-emerald-700" />
              <h2 className="text-base font-semibold text-slate-950">Connexion WhatsApp depuis votre téléphone</h2>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Connectez votre numéro WhatsApp personnel en scannant un QR code depuis votre téléphone — sans compte Business ni paiement. Les messages sont envoyés depuis votre propre numéro.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
              <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-emerald-500" /> Votre numéro habituel, pas un numéro Business</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-emerald-500" /> Aucun frais Meta ni compte payant requis</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-emerald-500" /> Reconnexion automatique entre les sessions</li>
            </ul>
          </div>
          <Button
            onClick={activatePersonal}
            disabled={loading}
            className="h-11 w-full shrink-0 rounded-2xl bg-emerald-700 px-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.2)] transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98] sm:w-auto"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
            {loading ? "Chargement du QR…" : "Connecter mon WhatsApp"}
          </Button>
        </div>
      </section>
    );
  }

  // ── Mode personnel connecté ───────────────────────────────────────────────
  if (status === "connected") {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-inner">
              <CheckCircle2 className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">WhatsApp connecté</p>
              <p className="text-xs text-emerald-700">Messages envoyés depuis votre numéro personnel.</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={disconnect}
            disabled={disconnecting}
            className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-sm text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
          >
            {disconnecting ? <Loader2 className="size-3.5 animate-spin" /> : <WifiOff className="size-3.5" />}
            Déconnecter
          </Button>
        </div>
      </section>
    );
  }

  // ── QR en attente de scan ─────────────────────────────────────────────────
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Smartphone className="size-5 text-emerald-700" />
        <h2 className="text-base font-semibold text-slate-950">Scannez le QR code avec WhatsApp</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* QR code */}
        <div className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <Image src={qrDataUrl} alt="QR code WhatsApp" width={220} height={220} unoptimized />
            </div>
          ) : (
            <div className="flex size-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              {loading ? (
                <Loader2 className="size-8 animate-spin text-emerald-500" />
              ) : (
                <p className="px-4 text-center text-xs text-slate-400">QR non disponible</p>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshQr}
            disabled={loading}
            className="h-8 rounded-xl border-slate-200 px-3 text-xs text-slate-600 hover:border-emerald-200"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Nouveau QR
          </Button>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              { n: 1, text: "Ouvrez WhatsApp sur votre téléphone" },
              { n: 2, text: 'Appuyez sur ⋮ puis sur "Appareils connectés"' },
              { n: 3, text: 'Appuyez sur "Connecter un appareil"' },
              { n: 4, text: "Scannez le QR code ci-contre avec votre téléphone" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {n}
                </span>
                <p className="text-sm leading-6 text-slate-700">{text}</p>
              </div>
            ))}
          </div>

          {status === "authenticated" && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Loader2 className="size-4 animate-spin" />
              QR scanné — finalisation de la connexion…
            </div>
          )}

          {(status === "auth_failure" || status === "error") && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Connexion échouée. Générez un nouveau QR code.
            </div>
          )}

          <Button
            variant="outline"
            onClick={disconnect}
            className="h-9 rounded-xl border-slate-200 px-4 text-sm text-slate-500 hover:border-red-200 hover:text-red-600"
          >
            Annuler
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Page WhatsApp principale ─────────────────────────────────────────────────

export function WhatsAppClient() {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const [target, setTarget] = useState<Target>("community");
  const [phone, setPhone] = useState("");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (target !== "contacts" || members !== null) return;
    setMembersLoading(true);
    fetch("/api/community/members")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Member[]) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setMembersLoading(false));
  }, [target, members]);

  const optInMembers = useMemo(() => (members ?? []).filter((m) => m.phone && m.optInWhatsapp), [members]);
  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return optInMembers;
    return optInMembers.filter(
      (m) => m.displayName.toLowerCase().includes(q) || (m.phone ?? "").includes(q)
    );
  }, [optInMembers, search]);

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generateWithAI() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError("Indiquez d'abord le message ou les informations à préparer.");
      return;
    }
    setError("");
    setGenerating(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/whatsapp/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de génération");
      setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de génération IA.");
    } finally {
      setGenerating(false);
    }
  }

  function targetSummary(): string {
    if (target === "phone") return phone.trim() ? `au ${phone.trim()}` : "à un numéro";
    if (target === "contacts") return `à ${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""}`;
    return "à toute la communauté (opt-in)";
  }

  async function sendViaApi() {
    const text = (message.trim() || prompt.trim()).trim();
    if (!text) {
      setError("Préparez ou écrivez un message avant l'envoi.");
      return;
    }
    if (target === "phone" && !phone.trim()) {
      setError("Saisissez un numéro de téléphone.");
      return;
    }
    if (target === "contacts" && selectedIds.size === 0) {
      setError("Sélectionnez au moins un contact.");
      return;
    }

    setError("");
    setSendResult(null);
    setSending(true);
    try {
      const payload: Record<string, unknown> = { text, target };
      if (target === "phone") payload.phone = phone.trim();
      if (target === "contacts") payload.contactIds = Array.from(selectedIds);

      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'envoi");
      setSendResult(data as SendResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'envoi WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  function openCopyPaste() {
    const text = (message.trim() || prompt.trim()).trim();
    if (!text) {
      setError("Préparez ou écrivez un message avant d'ouvrir WhatsApp.");
      return;
    }
    const base = target === "phone" && phone.trim() ? `https://wa.me/${phone.replace(/[^\d]/g, "")}` : "https://wa.me/";
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* En-tête */}
      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f9f6e] p-5 shadow-[0_20px_44px_-28px_rgba(6,78,59,0.42)] sm:p-6">
        <div className="max-w-4xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-200/90" />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">WhatsApp</h1>
          <p className="mt-3 text-sm leading-6 text-emerald-50/90">
            Connectez votre numéro personnel ou votre compte Business pour envoyer des messages à toute votre communauté depuis EasyCom IA.
          </p>
        </div>
      </section>

      {/* Bloc connexion WhatsApp Web */}
      <WhatsAppConnect />

      {/* Assistant IA + envoi */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-inner sm:size-12">
              <Sparkles className="size-5 sm:size-6" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Assistant IA WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Décrivez votre annonce, l'IA rédige un message WhatsApp prêt à envoyer. Vous validez les destinataires avant l'envoi.
            </p>
          </div>

          <Link href="/dashboard/automations" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl border-emerald-200 bg-white px-5 text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 active:scale-[0.98] sm:w-auto"
            >
              <Zap className="size-4" />
              Créer une automatisation
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:gap-5">
          {/* Colonne gauche : rédaction + destinataires */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
              <label htmlFor="whatsapp-prompt" className="text-sm font-semibold text-slate-900">
                Votre demande
              </label>
              <textarea
                id="whatsapp-prompt"
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setError("");
                }}
                placeholder={DEFAULT_MESSAGE}
                className="mt-3 min-h-28 w-full resize-none rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />
              <Button
                type="button"
                onClick={generateWithAI}
                disabled={generating}
                className="mt-3 h-11 w-full rounded-2xl bg-emerald-700 px-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.2)] transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98] sm:w-auto"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Génération…" : "Générer avec l'IA"}
              </Button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <label htmlFor="whatsapp-message" className="text-sm font-semibold text-slate-900">
                Message à envoyer
              </label>
              <textarea
                id="whatsapp-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Le message généré par l'IA apparaîtra ici. Vous pouvez le modifier librement avant l'envoi."
                className="mt-3 min-h-40 w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            {/* Sélecteur de destinataires */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Destinataires</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TargetButton active={target === "community"} onClick={() => setTarget("community")} icon={<Users className="size-4" />} label="Toute la communauté" />
                <TargetButton active={target === "contacts"} onClick={() => setTarget("contacts")} icon={<UserRound className="size-4" />} label="Contacts choisis" />
                <TargetButton active={target === "phone"} onClick={() => setTarget("phone")} icon={<Phone className="size-4" />} label="Un numéro" />
              </div>

              {target === "phone" && (
                <div className="mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Numéro (format international)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              )}

              {target === "contacts" && (
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un contact…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100">
                    {membersLoading ? (
                      <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                        <Loader2 className="size-4 animate-spin" /> Chargement des contacts…
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">
                        Aucun contact opt-in WhatsApp avec numéro.{" "}
                        <Link href="/dashboard/settings?section=contacts" className="font-semibold text-emerald-700 hover:underline">
                          Ajouter des contacts
                        </Link>
                      </p>
                    ) : (
                      filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => toggleMember(m.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 border-b border-slate-50 px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-emerald-50/50",
                            selectedIds.has(m.id) && "bg-emerald-50"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-800">{m.displayName}</span>
                            <span className="block truncate text-xs text-slate-400">{m.phone}</span>
                          </span>
                          <span
                            className={cn(
                              "flex size-5 flex-shrink-0 items-center justify-center rounded-md border",
                              selectedIds.has(m.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
                            )}
                          >
                            {selectedIds.has(m.id) && <CheckCircle2 className="size-3.5" />}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  {selectedIds.size > 0 && (
                    <p className="text-xs font-medium text-emerald-700">{selectedIds.size} contact(s) sélectionné(s)</p>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={sendViaApi}
                disabled={sending}
                className="h-11 flex-1 rounded-2xl bg-emerald-700 px-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.2)] transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98]"
              >
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {sending ? "Envoi…" : "Envoyer maintenant"}
              </Button>
              <Button
                type="button"
                onClick={openCopyPaste}
                variant="outline"
                className="h-11 rounded-2xl border-emerald-200 bg-white px-5 text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 active:scale-[0.98]"
              >
                <MessageCircle className="size-4" />
                Ouvrir WhatsApp
              </Button>
            </div>
          </div>

          {/* Colonne droite : aperçu + résultat */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-950">Aperçu du message</h3>
              <div className="mt-3 min-h-40 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                {message.trim() || prompt.trim() || (
                  <span className="text-slate-400">Votre message apparaîtra ici.</span>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500">Envoi {targetSummary()}.</p>
            </div>

            {sendResult && (
              <div
                className={cn(
                  "rounded-2xl border p-4 text-sm",
                  sendResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                <div className="flex items-start gap-2">
                  {sendResult.success ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" /> : <Clipboard className="mt-0.5 size-4 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold">
                      {sendResult.success
                        ? `Message envoyé à ${sendResult.sent}/${sendResult.total} destinataire(s).`
                        : "Aucun message envoyé."}
                    </p>
                    {sendResult.templateRequired && (
                      <p className="mt-1 text-xs">
                        WhatsApp exige un template approuvé hors fenêtre de 24 h. Connectez votre numéro personnel ci-dessus, ou configurez un template dans Réglages → Canaux.
                      </p>
                    )}
                    {sendResult.errors.length > 0 && !sendResult.templateRequired && (
                      <p className="mt-1 text-xs">{sendResult.errors[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Automatisations */}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-500" />
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Automatisations WhatsApp</h2>
            <p className="mt-2 text-sm text-slate-600">
              Retrouvez les publications IA déjà présentes dans Mes automatisations, prêtes à être paramétrées pour WhatsApp.
            </p>
          </div>
          <Link href="/dashboard/automations" className="w-full sm:w-auto">
            <Button className="h-11 w-full rounded-2xl bg-emerald-700 px-5 text-white transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98] sm:w-auto">
              <CalendarClock className="size-4" />
              Paramétrer les envois
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AUTOMATION_SCENARIOS.map((scenario) => (
            <article
              key={scenario.label}
              className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-emerald-200 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{scenario.label}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{scenario.description}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {scenario.status}
                </span>
              </div>
              <Link
                href="/dashboard/automations"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
              >
                Configurer
                <ArrowRight className="size-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TargetButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/40"
      )}
    >
      <span className={cn("flex-shrink-0", active ? "text-emerald-600" : "text-slate-400")}>{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}
